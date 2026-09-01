// Shared domain types for the SmartVendor AI backend.

export type Channel = 'whatsapp' | 'instagram' | 'messenger' | 'tiktok';

export type InboundMediaType = 'text' | 'audio' | 'image';

/**
 * The unified shape every channel adapter (routes/webhooks.ts + channels/*)
 * normalizes raw provider payloads into, before the AI pipeline ever sees them.
 */
export interface NormalizedMessage {
  channel: Channel;
  /** Provider-specific id used to resolve the merchant (phone_number_id, page id, shop id). */
  channelAccountId: string;
  /** The customer's id on that channel (wa_id, IGSID, PSID, tiktok open_id). */
  senderId: string;
  senderName?: string;
  type: InboundMediaType;
  text?: string;
  mediaUrl?: string;
  mediaMimeType?: string;
  timestamp: string; // ISO 8601
}

export interface Merchant {
  id: string;
  name: string;
  slug: string;
  default_currency: string;
  whatsapp_phone_id: string | null;
  whatsapp_token: string | null;
  instagram_page_id: string | null;
  messenger_page_id: string | null;
  tiktok_shop_id: string | null;
  page_access_token: string | null;
  webhook_verify_token: string | null;
  is_active: boolean;
}

export interface ProductMatch {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price: number;
  currency: string;
  stock_qty: number;
  options: Record<string, string[]>;
  similarity: number;
}

/** Structured order extraction returned by Gemini (responseMimeType: application/json). */
export interface ExtractedOrder {
  customer_name: string | null;
  phone: string | null;
  city: string | null;
  address: string | null;
  payment_method: 'cod' | 'online' | 'bank_transfer' | null;
  items: Array<{
    product_query: string; // free-text description of what the customer asked for
    quantity: number;
    selected_options?: Record<string, string>;
  }>;
  notes?: string | null;
}

export type CartChannel = Channel | 'web' | 'manual';
export type CartStatus = 'open' | 'pending_confirmation' | 'confirmed' | 'abandoned' | 'cancelled';
export type PaymentMethod = 'cod' | 'online' | 'bank_transfer';

export interface Cart {
  id: string;
  merchant_id: string;
  channel: CartChannel;
  channel_thread_id: string;
  status: CartStatus;
  customer_name: string | null;
  customer_phone: string | null;
  customer_city: string | null;
  customer_address: string | null;
  payment_method: PaymentMethod;
  currency: string;
  subtotal: number;
  shipping_fee: number;
  total: number;
  source_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string | null;
  name_snapshot: string;
  image_snapshot: string | null;
  unit_price: number;
  quantity: number;
  selected_options: Record<string, string>;
  match_score: number | null;
}

export interface PipelineResult {
  cartId: string;
  checkoutUrl: string;
  matchedItemCount: number;
  unmatchedQueries: string[];
}

export interface AdminUser {
  id: string;
  merchant_id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: 'owner' | 'staff';
}

export type NotificationType =
  | 'new_order'
  | 'order_confirmed'
  | 'manual_order'
  | 'receipt_sent'
  | 'receipt_failed';

export interface Notification {
  id: string;
  merchant_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  related_cart_id: string | null;
  is_read: boolean;
  created_at: string;
}

/** Payload for POST /api/orders/manual — an admin typing in an order taken by phone/DM/in person. */
export interface ManualOrderInput {
  source: CartChannel; // which channel the order actually came from, for record-keeping
  customerName: string;
  customerPhone: string;
  customerCity: string;
  customerAddress: string;
  paymentMethod: PaymentMethod;
  items: Array<{ productId: string; quantity: number; selectedOptions?: Record<string, string> }>;
}

export type ReceiptFormat = 'pdf' | 'image';
export type ReceiptDestination = 'origin' | 'whatsapp';
