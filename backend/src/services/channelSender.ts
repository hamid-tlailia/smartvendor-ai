import axios from 'axios';
import { env } from '../config/env';
import { Cart, Merchant, ReceiptFormat } from '../types';

/**
 * Sends the generated receipt (already uploaded to public storage — see
 * storageService.ts) back to the customer, using the outbound Send API of
 * whichever channel the order originated from. Falls back to WhatsApp
 * (routes/orders.ts resolves that fallback) when the origin channel has no
 * addressable recipient, e.g. a manually entered order.
 */
export async function sendReceiptOnChannel(
  merchant: Merchant,
  channel: Cart['channel'],
  recipientId: string,
  fileUrl: string,
  format: ReceiptFormat,
): Promise<void> {
  if (channel === 'whatsapp') return sendWhatsAppReceipt(merchant, recipientId, fileUrl, format);
  if (channel === 'messenger') return sendMetaSendApiReceipt(merchant.page_access_token, 'me', recipientId, fileUrl, format);
  if (channel === 'instagram') {
    if (!merchant.instagram_page_id) throw new Error('merchant has no instagram_page_id configured');
    return sendMetaSendApiReceipt(merchant.page_access_token, merchant.instagram_page_id, recipientId, fileUrl, format);
  }
  if (channel === 'tiktok') return sendTikTokReceipt(fileUrl);
  throw new Error(`no outbound sender configured for channel "${channel}"`);
}

async function sendWhatsAppReceipt(merchant: Merchant, toPhone: string, fileUrl: string, format: ReceiptFormat): Promise<void> {
  if (!merchant.whatsapp_phone_id || !merchant.whatsapp_token) {
    throw new Error('merchant has no WhatsApp Cloud API credentials configured');
  }

  const body =
    format === 'pdf'
      ? { type: 'document', document: { link: fileUrl, filename: 'receipt.pdf', caption: 'إيصال طلبكم' } }
      : { type: 'image', image: { link: fileUrl, caption: 'إيصال طلبكم' } };

  await axios.post(
    `https://graph.facebook.com/${env.whatsapp.graphApiVersion}/${merchant.whatsapp_phone_id}/messages`,
    { messaging_product: 'whatsapp', to: normalizePhone(toPhone), ...body },
    { headers: { Authorization: `Bearer ${merchant.whatsapp_token}` } },
  );
}

/** Shared by Messenger and Instagram — both ride the Meta Send API, just against a different page/IG-scoped id. */
async function sendMetaSendApiReceipt(
  pageAccessToken: string | null,
  senderPath: string,
  recipientId: string,
  fileUrl: string,
  format: ReceiptFormat,
): Promise<void> {
  if (!pageAccessToken) throw new Error('merchant has no page_access_token configured');

  await axios.post(
    `https://graph.facebook.com/${env.whatsapp.graphApiVersion}/${senderPath}/messages`,
    {
      recipient: { id: recipientId },
      message: {
        attachment: {
          type: format === 'pdf' ? 'file' : 'image',
          payload: { url: fileUrl, is_reusable: false },
        },
      },
    },
    { params: { access_token: pageAccessToken } },
  );
}

async function sendTikTokReceipt(_fileUrl: string): Promise<void> {
  // TikTok's Direct Message send API is still in limited/early access at the
  // time of writing and its file-attachment shape is not yet finalized —
  // wire this up once your TikTok for Business app has DM send access.
  throw new Error('TikTok receipt delivery is not yet supported by the TikTok DM API — send via WhatsApp instead');
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}
