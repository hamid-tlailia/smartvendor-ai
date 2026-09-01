import { env } from '../config/env';
import { transcribeVoiceNote } from '../lib/groq';
import { describeProductImage, extractOrderFromMessage } from '../lib/gemini';
import { bufferToBase64, fetchMedia, resolveWhatsAppMediaUrl } from './mediaFetcher';
import { matchProductsByText } from './vectorSearch';
import { buildCheckoutUrl, createCartFromExtraction } from './cartService';
import { resolveMerchantByChannelAccount } from './merchantResolver';
import { Merchant, NormalizedMessage, PipelineResult } from '../types';

/**
 * Orchestrates the full "message in -> checkout link out" flow:
 *  1. Resolve the merchant that owns this channel account.
 *  2. If the message is audio, transcribe it (Groq Whisper, Arabic).
 *  3. If the message is an image, describe it (Gemini Vision) and fold that
 *     into the text context Gemini uses for extraction.
 *  4. Run Gemini's structured JSON extraction to get customer info + line items.
 *  5. For every extracted line item, run a pgvector similarity search against
 *     the merchant's catalog to resolve it to a real product + price.
 *  6. Persist a cart (creating or updating the open one for this conversation)
 *     and return a checkout URL ready to send back to the customer.
 */
export async function processInboundMessage(message: NormalizedMessage): Promise<PipelineResult | null> {
  const merchant = await resolveMerchantByChannelAccount(message.channel, message.channelAccountId);
  if (!merchant) {
    console.warn(`[aiPipeline] no merchant found for ${message.channel}:${message.channelAccountId}`);
    return null;
  }

  const textContext = await buildTextContext(message, merchant);
  if (!textContext.trim()) return null;

  const extraction = await extractOrderFromMessage({ text: textContext });

  const matchedItems = await Promise.all(
    extraction.items.map(async (item) => {
      const [match] = await matchProductsByText(merchant.id, item.product_query);
      return {
        query: item.product_query,
        match: match ?? null,
        quantity: item.quantity || 1,
        selectedOptions: item.selected_options,
      };
    }),
  );

  const { cart, unmatchedQueries } = await createCartFromExtraction({
    merchantId: merchant.id,
    channel: message.channel,
    channelThreadId: message.senderId,
    currency: merchant.default_currency,
    sourceMessage: textContext,
    extraction,
    matchedItems,
  });

  return {
    cartId: cart.id,
    checkoutUrl: buildCheckoutUrl(cart.id),
    matchedItemCount: matchedItems.length - unmatchedQueries.length,
    unmatchedQueries,
  };
}

/** Resolves the plain-text context Gemini's extractor should read, handling audio/image media. */
async function buildTextContext(message: NormalizedMessage, merchant: Merchant): Promise<string> {
  if (message.type === 'text') {
    return message.text ?? '';
  }

  if (message.type === 'audio') {
    const audio = await downloadChannelMedia(message, merchant);
    if (!audio) return message.text ?? '';
    const transcript = await transcribeVoiceNote(audio.buffer, `voice.${extensionFor(audio.mimeType)}`);
    return transcript;
  }

  if (message.type === 'image') {
    const image = await downloadChannelMedia(message, merchant);
    const caption = message.text ?? '';
    if (!image) return caption;
    const description = await describeProductImage(bufferToBase64(image.buffer), image.mimeType);
    return [caption, description].filter(Boolean).join('. ');
  }

  return '';
}

async function downloadChannelMedia(message: NormalizedMessage, merchant: Merchant) {
  if (!message.mediaUrl) return null;

  if (message.channel === 'whatsapp') {
    if (!merchant.whatsapp_token) return null;
    const url = await resolveWhatsAppMediaUrl(message.mediaUrl, merchant.whatsapp_token, env.whatsapp.graphApiVersion);
    return fetchMedia(url, `Bearer ${merchant.whatsapp_token}`);
  }

  if (message.channel === 'instagram' || message.channel === 'messenger') {
    // IG/Messenger attachment payload.url values are already pre-signed CDN links.
    return fetchMedia(message.mediaUrl);
  }

  if (message.channel === 'tiktok') {
    return fetchMedia(message.mediaUrl);
  }

  return null;
}

function extensionFor(mimeType: string): string {
  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'mp3';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('wav')) return 'wav';
  return 'ogg';
}
