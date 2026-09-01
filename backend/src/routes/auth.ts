import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabaseClient';
import { comparePassword, hashPassword, signAuthToken } from '../lib/auth';
import { requireAuth, AuthedRequest } from '../middleware/requireAuth';
import { AdminUser, Merchant } from '../types';

export const authRouter = Router();

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9؀-ۿ]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const registerSchema = z.object({
  merchantName: z.string().min(2),
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  defaultCurrency: z.string().min(2).max(6).default('DZD'),
});

/** POST /api/auth/register — creates the merchant tenant + its first (owner) admin account. */
authRouter.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid payload', details: parsed.error.flatten() });
  const { merchantName, fullName, email, password, defaultCurrency } = parsed.data;

  const { data: existing } = await supabase.from('admin_users').select('id').eq('email', email).maybeSingle();
  if (existing) return res.status(409).json({ error: 'email already registered' });

  const baseSlug = slugify(merchantName) || 'store';
  let slug = baseSlug;
  for (let i = 1; ; i += 1) {
    const { data: slugTaken } = await supabase.from('merchants').select('id').eq('slug', slug).maybeSingle();
    if (!slugTaken) break;
    slug = `${baseSlug}-${i}`;
  }

  const { data: merchant, error: merchantError } = await supabase
    .from('merchants')
    .insert({ name: merchantName, slug, default_currency: defaultCurrency })
    .select('*')
    .single();
  if (merchantError) return res.status(500).json({ error: merchantError.message });

  const passwordHash = await hashPassword(password);
  const { data: adminUser, error: adminError } = await supabase
    .from('admin_users')
    .insert({ merchant_id: merchant.id, email, password_hash: passwordHash, full_name: fullName, role: 'owner' })
    .select('*')
    .single();
  if (adminError) {
    await supabase.from('merchants').delete().eq('id', merchant.id); // roll back the orphaned merchant
    return res.status(500).json({ error: adminError.message });
  }

  const token = signAuthToken({ adminUserId: adminUser.id, merchantId: merchant.id });
  res.status(201).json({ token, merchant, admin: toPublicAdmin(adminUser as AdminUser) });
});

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

/** POST /api/auth/login */
authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid payload' });
  const { email, password } = parsed.data;

  const { data: adminUser } = await supabase.from('admin_users').select('*').eq('email', email).maybeSingle();
  if (!adminUser || !(await comparePassword(password, adminUser.password_hash))) {
    return res.status(401).json({ error: 'invalid email or password' });
  }

  const { data: merchant, error: merchantError } = await supabase
    .from('merchants')
    .select('*')
    .eq('id', adminUser.merchant_id)
    .single();
  if (merchantError) return res.status(500).json({ error: merchantError.message });

  const token = signAuthToken({ adminUserId: adminUser.id, merchantId: merchant.id });
  res.json({ token, merchant, admin: toPublicAdmin(adminUser as AdminUser) });
});

/** GET /api/auth/me — resolves the current session, used to restore state on frontend reload. */
authRouter.get('/me', requireAuth, async (req, res) => {
  const { merchantId, adminUserId } = req as AuthedRequest;

  const [{ data: merchant, error: merchantError }, { data: adminUser, error: adminError }] = await Promise.all([
    supabase.from('merchants').select('*').eq('id', merchantId).single(),
    supabase.from('admin_users').select('*').eq('id', adminUserId).single(),
  ]);
  if (merchantError || adminError) return res.status(404).json({ error: 'account not found' });

  res.json({ merchant: merchant as Merchant, admin: toPublicAdmin(adminUser as AdminUser) });
});

const updateMerchantSchema = z.object({
  name: z.string().min(2).optional(),
  defaultCurrency: z.string().min(2).max(6).optional(),
});

/** PATCH /api/auth/merchant — basic account settings (store name, currency). */
authRouter.patch('/merchant', requireAuth, async (req, res) => {
  const parsed = updateMerchantSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid payload' });

  const { merchantId } = req as AuthedRequest;
  const { data, error } = await supabase
    .from('merchants')
    .update({
      ...(parsed.data.name ? { name: parsed.data.name } : {}),
      ...(parsed.data.defaultCurrency ? { default_currency: parsed.data.defaultCurrency } : {}),
    })
    .eq('id', merchantId)
    .select('*')
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ merchant: data });
});

function toPublicAdmin(admin: AdminUser) {
  const { password_hash: _omit, ...publicAdmin } = admin;
  return publicAdmin;
}
