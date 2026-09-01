import { NormalizedMessage } from '../types';

/**
 * Parses a TikTok Direct Message webhook payload into normalized messages.
 * TikTok's Business Messaging API shape is newer/less standardized than
 * Meta's; this adapter follows the documented `message.create` event shape
 * (shop_id + conversation participant + content). Adjust field paths if
 * TikTok's payload version changes.
 */
export function parseTikTokPayload(body: any): NormalizedMessage[] {
  const messages: NormalizedMessage[] = [];

  for (const event of body?.events ?? body?.data ?? []) {
    if (event?.type !== 'message.create' && event?.message_type === undefined) continue;

    const shopId: string | undefined = event?.shop_id ?? body?.shop_id;
    const senderId: string | undefined = event?.sender_id ?? event?.from_user_id;
    if (!shopId || !senderId) continue;

    const base = {
      channel: 'tiktok' as const,
      channelAccountId: shopId,
      senderId,
      timestamp: event?.create_time
        ? new Date(Number(event.create_time) * 1000).toISOString()
        : new Date().toISOString(),
    };

    const content = event?.content ?? event?.message ?? {};

    if (content.type === 'image' || content.image_url) {
      messages.push({ ...base, type: 'image', mediaUrl: content.image_url ?? content.url, text: content.caption });
    } else if (content.type === 'audio' || content.audio_url) {
      messages.push({ ...base, type: 'audio', mediaUrl: content.audio_url ?? content.url });
    } else if (content.text ?? content.type === 'text') {
      messages.push({ ...base, type: 'text', text: content.text ?? '' });
    }
  }

  return messages;
}
