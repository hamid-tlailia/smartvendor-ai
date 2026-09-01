import { Router } from 'express';
import { z } from 'zod';
import { confirmCart, getCartWithItems } from '../services/cartService';

export const checkoutRouter = Router();

/** GET /api/checkout/:cartId — order breakdown for the Micro-PWA checkout page. */
checkoutRouter.get('/:cartId', async (req, res) => {
  const result = await getCartWithItems(req.params.cartId);
  if (!result) return res.status(404).json({ error: 'cart not found' });
  res.json(result);
});

const confirmSchema = z.object({
  customerName: z.string().min(2),
  customerPhone: z.string().min(6),
  customerCity: z.string().min(2),
  customerAddress: z.string().min(4),
  paymentMethod: z.enum(['cod', 'online', 'bank_transfer']),
});

/** POST /api/checkout/:cartId/confirm — customer submits the "تأكيد وإرسال الطلب" form. */
checkoutRouter.post('/:cartId/confirm', async (req, res) => {
  const parsed = confirmSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid payload', details: parsed.error.flatten() });
  }

  try {
    const cart = await confirmCart(req.params.cartId, parsed.data);
    res.json({ cart });
  } catch (err) {
    console.error('[checkout] confirm failed', err);
    res.status(500).json({ error: 'failed to confirm order' });
  }
});
