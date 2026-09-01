import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabaseClient';
import { requireAuth, AuthedRequest } from '../middleware/requireAuth';
import { createManualOrder, getCartWithItems } from '../services/cartService';
import { renderReceipt } from '../services/receiptService';
import { uploadReceiptFile } from '../services/storageService';
import { sendReceiptOnChannel } from '../services/channelSender';
import { createNotification } from '../services/notificationService';
import { Merchant } from '../types';

export const ordersRouter = Router();
ordersRouter.use(requireAuth);

/** GET /api/orders — cross-channel order feed for the dashboard table. */
ordersRouter.get('/', async (req, res) => {
  const { merchantId } = req as AuthedRequest;
  const { data, error } = await supabase
    .from('carts')
    .select('*, cart_items(*)')
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ orders: data });
});

const manualOrderSchema = z.object({
  source: z.enum(['whatsapp', 'instagram', 'messenger', 'tiktok', 'manual']),
  customerName: z.string().min(2),
  customerPhone: z.string().min(6),
  customerCity: z.string().min(2),
  customerAddress: z.string().min(4),
  paymentMethod: z.enum(['cod', 'online', 'bank_transfer']),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().positive(),
        selectedOptions: z.record(z.string()).optional(),
      }),
    )
    .min(1),
});

/** POST /api/orders/manual — admin-entered order (phone call, in-person, DM they answered outside the AI flow). */
ordersRouter.post('/manual', async (req, res) => {
  const parsed = manualOrderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid payload', details: parsed.error.flatten() });

  const { merchantId } = req as AuthedRequest;
  const input = parsed.data;

  const productIds = input.items.map((i) => i.productId);
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, name, image_url, price')
    .eq('merchant_id', merchantId)
    .in('id', productIds);
  if (productsError) return res.status(500).json({ error: productsError.message });

  const byId = new Map((products ?? []).map((p) => [p.id, p]));
  const missing = productIds.filter((id) => !byId.has(id));
  if (missing.length > 0) return res.status(400).json({ error: 'unknown product ids', missing });

  const { data: merchant, error: merchantError } = await supabase.from('merchants').select('default_currency').eq('id', merchantId).single();
  if (merchantError) return res.status(500).json({ error: merchantError.message });

  try {
    const cart = await createManualOrder({
      merchantId,
      source: input.source,
      currency: merchant.default_currency,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerCity: input.customerCity,
      customerAddress: input.customerAddress,
      paymentMethod: input.paymentMethod,
      items: input.items.map((item) => {
        const product = byId.get(item.productId)!;
        return {
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: Number(product.price),
          name: product.name,
          imageUrl: product.image_url,
          selectedOptions: item.selectedOptions,
        };
      }),
    });
    res.status(201).json({ cart });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

const sendReceiptSchema = z.object({
  format: z.enum(['pdf', 'image']).default('pdf'),
  via: z.enum(['origin', 'whatsapp']).default('origin'),
});

/** POST /api/orders/:cartId/send-receipt — render + deliver the order receipt to the customer. */
ordersRouter.post('/:cartId/send-receipt', async (req, res) => {
  const parsed = sendReceiptSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid payload' });
  const { format, via } = parsed.data;

  const { merchantId } = req as unknown as AuthedRequest;
  const result = await getCartWithItems(req.params.cartId);
  if (!result || result.cart.merchant_id !== merchantId) return res.status(404).json({ error: 'order not found' });
  const { cart, items } = result;

  const { data: merchant, error: merchantError } = await supabase.from('merchants').select('*').eq('id', merchantId).single();
  if (merchantError) return res.status(500).json({ error: merchantError.message });

  // "origin" only has an addressable recipient for channels the AI pipeline created a
  // real conversation thread for; a manual/web order (or an explicit "whatsapp" choice)
  // falls back to the customer's phone number over WhatsApp.
  const canUseOrigin = via === 'origin' && ['whatsapp', 'instagram', 'messenger', 'tiktok'].includes(cart.channel);
  const deliveryChannel = canUseOrigin ? cart.channel : 'whatsapp';
  const recipientId = canUseOrigin ? cart.channel_thread_id : cart.customer_phone;

  if (!recipientId) {
    return res.status(400).json({ error: 'order has no phone number on file to deliver a WhatsApp receipt to' });
  }

  try {
    const { buffer, contentType, extension } = await renderReceipt(merchant as Merchant, cart, items, format);
    const fileUrl = await uploadReceiptFile(buffer, `${cart.id}.${extension}`, contentType);
    await sendReceiptOnChannel(merchant as Merchant, deliveryChannel, recipientId, fileUrl, format);

    await createNotification(merchantId, 'receipt_sent', 'تم إرسال الإيصال', `عبر ${deliveryChannel} إلى ${cart.customer_name}`, cart.id);
    res.json({ ok: true, channel: deliveryChannel, fileUrl });
  } catch (err) {
    await createNotification(merchantId, 'receipt_failed', 'فشل إرسال الإيصال', (err as Error).message, cart.id);
    res.status(502).json({ error: (err as Error).message });
  }
});
