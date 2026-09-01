import axios from 'axios';

export interface FetchedMedia {
  buffer: Buffer;
  mimeType: string;
}

/**
 * Downloads a media asset (voice note or image) from a channel's CDN/Graph API.
 * `authHeader` carries the bearer token required by WhatsApp Cloud API and
 * Meta Graph API media URLs; TikTok media URLs are typically pre-signed and
 * need no auth header.
 */
export async function fetchMedia(url: string, authHeader?: string): Promise<FetchedMedia> {
  const response = await axios.get<ArrayBuffer>(url, {
    responseType: 'arraybuffer',
    headers: authHeader ? { Authorization: authHeader } : undefined,
    timeout: 15_000,
  });

  const mimeType = (response.headers['content-type'] as string | undefined) ?? 'application/octet-stream';
  return { buffer: Buffer.from(response.data), mimeType };
}

/**
 * WhatsApp Cloud API stores media behind an opaque media id — the actual
 * download URL must be resolved first via a GET to /{media-id}.
 */
export async function resolveWhatsAppMediaUrl(mediaId: string, accessToken: string, graphApiVersion: string): Promise<string> {
  const { data } = await axios.get<{ url: string }>(
    `https://graph.facebook.com/${graphApiVersion}/${mediaId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  return data.url;
}

export function bufferToBase64(buffer: Buffer): string {
  return buffer.toString('base64');
}
