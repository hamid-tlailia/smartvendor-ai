import { supabase } from '../lib/supabaseClient';
import { Channel, Merchant } from '../types';

const CHANNEL_COLUMN: Record<Channel, keyof Merchant> = {
  whatsapp: 'whatsapp_phone_id',
  instagram: 'instagram_page_id',
  messenger: 'messenger_page_id',
  tiktok: 'tiktok_shop_id',
};

/** Resolves the owning merchant from the channel-specific account id present in every inbound webhook. */
export async function resolveMerchantByChannelAccount(channel: Channel, channelAccountId: string): Promise<Merchant | null> {
  const column = CHANNEL_COLUMN[channel];
  const { data, error } = await supabase
    .from('merchants')
    .select('*')
    .eq(column, channelAccountId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw error;
  return data as Merchant | null;
}
