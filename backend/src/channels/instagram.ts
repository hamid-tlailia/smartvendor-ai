import { NormalizedMessage } from '../types';

/**
 * Parses an Instagram Messaging webhook payload (delivered via the Meta
 * Graph API, `object: "instagram"`) into normalized messages.
 * Ref: https://developers.facebook.com/docs/messenger-platform/instagram/webhook-events
 */
export function parseInstagramPayload(body: any): NormalizedMessage[] {
  const messages: NormalizedMessage[] = [];

  for (const entry of body?.entry ?? []) {
    const igAccountId: string | undefined = entry?.id;

    for (const event of entry?.messaging ?? []) {
      if (!igAccountId || !event?.message || event.message.is_echo) continue;

      const base = {
        channel: 'instagram' as const,
        channelAccountId: igAccountId,
        senderId: event.sender?.id,
        timestamp: new Date(Number(event.timestamp ?? Date.now())).toISOString(),
      };

      const attachment = event.message.attachments?.[0];
      if (attachment?.type === 'image') {
        messages.push({ ...base, type: 'image', mediaUrl: attachment.payload?.url, text: event.message.text });
      } else if (attachment?.type === 'audio') {
        messages.push({ ...base, type: 'audio', mediaUrl: attachment.payload?.url });
      } else if (event.message.text) {
        messages.push({ ...base, type: 'text', text: event.message.text });
      }
    }
  }

  return messages;
}
