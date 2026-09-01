import { supabase } from '../lib/supabaseClient';
import { env } from '../config/env';
import { createNotification } from './notificationService';
import { Cart, CartChannel, CartItem, ExtractedOrder, ProductMatch } from '../types';

const CHANNEL_LABEL_AR: Record<CartChannel, string> = {
  whatsapp: 'واتساب',
  instagram: 'إنستغرام',
  messenger: 'ماسنجر',
  tiktok: 'تيك توك',
  web: 'الموقع',
  manual: 'إدخال يدوي',
};

export interface CreateCartInput {
  merchantId: string;
  channel: CartChannel;
  channelThreadId: string;
  currency: string;
  sourceMessage: string;
  extraction: ExtractedOrder;
  matchedItems: Array<{
    query: string;
    match: ProductMatch | null;
    quantity: number;
    selectedOptions?: Record<string, string>;
  }>;
}

/**
 * Persists an AI-extracted order as a cart + cart_items row set (upserting
 * onto any still-`open` cart for the same conversation thread so repeated
 * messages in one chat accumulate into a single checkout), and returns the
 * shareable checkout URL. Cart totals are recomputed automatically by the
 * `recalc_cart_totals` trigger.
 */
export async function createCartFromExtraction(input: CreateCartInput): Promise<{ cart: Cart; unmatchedQueries: string[] }> {
  const { data: existing } = await supabase
    .from('carts')
    .select('*')
    .eq('merchant_id', input.merchantId)
    .eq('channel', input.channel)
    .eq('channel_thread_id', input.channelThreadId)
    .eq('status', 'open')
    .maybeSingle();

  let cart = existing as Cart | null;

  if (!cart) {
    const { data, error } = await supabase
      .from('carts')
      .insert({
        merchant_id: input.merchantId,
        channel: input.channel,
        channel_thread_id: input.channelThreadId,
        status: 'pending_confirmation',
        customer_name: input.extraction.customer_name,
        customer_phone: input.extraction.phone,
        customer_city: input.extraction.city,
        customer_address: input.extraction.address,
        payment_method: input.extraction.payment_method ?? 'cod',
        currency: input.currency,
        source_message: input.sourceMessage,
        ai_raw_extraction: input.extraction,
      })
      .select('*')
      .single();
    if (error) throw error;
    cart = data as Cart;
  } else {
    const { data, error } = await supabase
      .from('carts')
      .update({
        status: 'pending_confirmation',
        customer_name: input.extraction.customer_name ?? cart.customer_name,
        customer_phone: input.extraction.phone ?? cart.customer_phone,
        customer_city: input.extraction.city ?? cart.customer_city,
        customer_address: input.extraction.address ?? cart.customer_address,
        payment_method: input.extraction.payment_method ?? cart.payment_method,
        source_message: input.sourceMessage,
        ai_raw_extraction: input.extraction,
      })
      .eq('id', cart.id)
      .select('*')
      .single();
    if (error) throw error;
    cart = data as Cart;
  }

  const unmatchedQueries: string[] = [];
  const rows = input.matchedItems
    .map((item) => {
      if (!item.match) {
        unmatchedQueries.push(item.query);
        return null;
      }
      return {
        cart_id: cart!.id,
        product_id: item.match.id,
        name_snapshot: item.match.name,
        image_snapshot: item.match.image_url,
        unit_price: item.match.price,
        quantity: item.quantity,
        selected_options: item.selectedOptions ?? {},
        match_score: item.match.similarity,
      };
    })
    .filter(Boolean);

  if (rows.length > 0) {
    const { error } = await supabase.from('cart_items').insert(rows as any[]);
    if (error) throw error;
  }

  const { data: refreshed, error: refreshError } = await supabase
    .from('carts')
    .select('*')
    .eq('id', cart.id)
    .single();
  if (refreshError) throw refreshError;

  await createNotification(
    input.merchantId,
    'new_order',
    `طلب جديد عبر ${CHANNEL_LABEL_AR[input.channel]}`,
    refreshed.customer_name ? `من ${refreshed.customer_name}` : undefined,
    refreshed.id,
  );

  return { cart: refreshed as Cart, unmatchedQueries };
}

export function buildCheckoutUrl(cartId: string): string {
  return `${env.checkoutBaseUrl}/checkout/${cartId}`;
}

export async function getCartWithItems(cartId: string): Promise<{ cart: Cart; items: CartItem[] } | null> {
  const { data: cart, error: cartError } = await supabase.from('carts').select('*').eq('id', cartId).maybeSingle();
  if (cartError) throw cartError;
  if (!cart) return null;

  const { data: items, error: itemsError } = await supabase
    .from('cart_items')
    .select('*')
    .eq('cart_id', cartId)
    .order('created_at', { ascending: true });
  if (itemsError) throw itemsError;

  return { cart: cart as Cart, items: (items ?? []) as CartItem[] };
}

export interface ConfirmCartInput {
  customerName: string;
  customerPhone: string;
  customerCity: string;
  customerAddress: string;
  paymentMethod: 'cod' | 'online' | 'bank_transfer';
}

export async function confirmCart(cartId: string, input: ConfirmCartInput): Promise<Cart> {
  const { data, error } = await supabase
    .from('carts')
    .update({
      customer_name: input.customerName,
      customer_phone: input.customerPhone,
      customer_city: input.customerCity,
      customer_address: input.customerAddress,
      payment_method: input.paymentMethod,
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
    })
    .eq('id', cartId)
    .select('*')
    .single();

  if (error) throw error;

  await createNotification(
    data.merchant_id,
    'order_confirmed',
    'تم تأكيد الطلب',
    `${input.customerName} — ${data.total} ${data.currency}`,
    data.id,
  );

  return data as Cart;
}

/** Directly creates a fully-confirmed order from the dashboard's "new manual order" form — no AI extraction involved. */
export async function createManualOrder(input: {
  merchantId: string;
  source: CartChannel;
  currency: string;
  customerName: string;
  customerPhone: string;
  customerCity: string;
  customerAddress: string;
  paymentMethod: 'cod' | 'online' | 'bank_transfer';
  items: Array<{ productId: string; quantity: number; unitPrice: number; name: string; imageUrl: string | null; selectedOptions?: Record<string, string> }>;
}): Promise<Cart> {
  const { data: cart, error } = await supabase
    .from('carts')
    .insert({
      merchant_id: input.merchantId,
      channel: input.source,
      channel_thread_id: input.customerPhone,
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
      customer_name: input.customerName,
      customer_phone: input.customerPhone,
      customer_city: input.customerCity,
      customer_address: input.customerAddress,
      payment_method: input.paymentMethod,
      currency: input.currency,
      source_message: 'أُدخل يدوياً من لوحة التحكم',
    })
    .select('*')
    .single();
  if (error) throw error;

  const rows = input.items.map((item) => ({
    cart_id: cart.id,
    product_id: item.productId,
    name_snapshot: item.name,
    image_snapshot: item.imageUrl,
    unit_price: item.unitPrice,
    quantity: item.quantity,
    selected_options: item.selectedOptions ?? {},
    match_score: null,
  }));
  if (rows.length > 0) {
    const { error: itemsError } = await supabase.from('cart_items').insert(rows);
    if (itemsError) throw itemsError;
  }

  const { data: refreshed, error: refreshError } = await supabase.from('carts').select('*').eq('id', cart.id).single();
  if (refreshError) throw refreshError;

  await createNotification(
    input.merchantId,
    'manual_order',
    `طلب يدوي جديد (${CHANNEL_LABEL_AR[input.source]})`,
    `${input.customerName} — ${refreshed.total} ${refreshed.currency}`,
    refreshed.id,
  );

  return refreshed as Cart;
}
