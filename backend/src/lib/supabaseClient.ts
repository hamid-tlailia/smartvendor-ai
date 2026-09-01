import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';

/**
 * Server-side Supabase client using the service role key — bypasses RLS.
 * Never ship this key to the frontend; the checkout PWA talks to our own
 * Express API, never to Supabase directly.
 */
export const supabase = createClient(env.supabaseUrl(), env.supabaseServiceRoleKey(), {
  auth: { persistSession: false, autoRefreshToken: false },
});
