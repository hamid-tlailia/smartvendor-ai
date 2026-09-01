import { NormalizedMessage } from '../types';

/**
 * Parses a Facebook Messenger Platform webhook payload (`object: "page"`)
 * into normalized messages.
 * Ref: https://developers.facebook.com/docs/messenger-platform/webhooks
 */
export function parseMessengerPayload(body: any): NormalizedMessage[] {
  const messages: NormalizedMessage[] = [];

  for (const entry of body?.entry ?? []) {
    const pageId: string | undefined = entry?.id;

    for (const event of entry?.messaging ?? []) {
      if (!pageId || !event?.message || event.message.is_echo) continue;

      const base = {
        channel: 'messenger' as const,
        channelAccountId: pageId,
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
