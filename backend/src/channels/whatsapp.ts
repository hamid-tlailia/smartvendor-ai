import { NormalizedMessage } from '../types';

/**
 * Parses a WhatsApp Cloud API webhook payload into zero or more normalized
 * messages. Cloud API batches changes, so a single request can carry
 * multiple messages across multiple entries.
 * Ref: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples
 */
export function parseWhatsAppPayload(body: any): NormalizedMessage[] {
  const messages: NormalizedMessage[] = [];

  for (const entry of body?.entry ?? []) {
    for (const change of entry?.changes ?? []) {
      const value = change?.value;
      const phoneNumberId: string | undefined = value?.metadata?.phone_number_id;
      const contacts = value?.contacts ?? [];

      for (const msg of value?.messages ?? []) {
        if (!phoneNumberId) continue;
        const contact = contacts.find((c: any) => c.wa_id === msg.from);
        const base = {
          channel: 'whatsapp' as const,
          channelAccountId: phoneNumberId,
          senderId: msg.from,
          senderName: contact?.profile?.name,
          timestamp: new Date(Number(msg.timestamp) * 1000).toISOString(),
        };

        if (msg.type === 'text') {
          messages.push({ ...base, type: 'text', text: msg.text?.body ?? '' });
        } else if (msg.type === 'audio') {
          messages.push({ ...base, type: 'audio', mediaUrl: msg.audio?.id, mediaMimeType: msg.audio?.mime_type });
        } else if (msg.type === 'image') {
          messages.push({
            ...base,
            type: 'image',
            mediaUrl: msg.image?.id,
            mediaMimeType: msg.image?.mime_type,
            text: msg.image?.caption,
          });
        }
        // Other types (location, sticker, reactions...) are intentionally ignored.
      }
    }
  }

  return messages;
}
