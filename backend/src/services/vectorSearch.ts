import { supabase } from '../lib/supabaseClient';
import { embedText } from '../lib/gemini';
import { env } from '../config/env';
import { ProductMatch } from '../types';

/**
 * Embeds a free-text product query and matches it against a merchant's
 * catalog via the `match_products` pgvector RPC (see db/schema.sql).
 */
export async function matchProductsByText(
  merchantId: string,
  query: string,
  opts: { threshold?: number; count?: number } = {},
): Promise<ProductMatch[]> {
  const embedding = await embedText(query);

  const { data, error } = await supabase.rpc('match_products', {
    query_embedding: embedding,
    match_merchant_id: merchantId,
    match_threshold: opts.threshold ?? env.vectorMatchThreshold,
    match_count: opts.count ?? env.vectorMatchCount,
  });

  if (error) throw error;
  return (data ?? []) as ProductMatch[];
}

/** Generates and stores the embedding for a single product — call after create/update. */
export async function reindexProductEmbedding(productId: string, name: string, description?: string | null) {
  const embedding = await embedText([name, description].filter(Boolean).join(' — '));
  const { error } = await supabase.from('products').update({ embedding }).eq('id', productId);
  if (error) throw error;
}
