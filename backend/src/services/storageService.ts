import { supabase } from '../lib/supabaseClient';
import { env } from '../config/env';

/**
 * Uploads a generated file (receipt PDF/PNG) to the Supabase Storage
 * `receipts` bucket and returns its public URL — needed because outbound
 * channel APIs (WhatsApp document `link`, Messenger/Instagram attachment
 * `url`) require a publicly reachable URL, not raw bytes.
 *
 * Create the bucket once in the Supabase dashboard (Storage -> New bucket
 * -> name it "receipts" -> Public bucket) or via the CLI; this call assumes
 * it already exists.
 */
export async function uploadReceiptFile(buffer: Buffer, filename: string, contentType: string): Promise<string> {
  const path = `${new Date().toISOString().slice(0, 10)}/${filename}`;

  const { error } = await supabase.storage.from(env.supabaseReceiptsBucket).upload(path, buffer, {
    contentType,
    upsert: true,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(env.supabaseReceiptsBucket).getPublicUrl(path);
  return data.publicUrl;
}
