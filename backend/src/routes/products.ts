import { Router } from 'express';
import { supabase } from '../lib/supabaseClient';
import { requireAuth, AuthedRequest } from '../middleware/requireAuth';

export const productsRouter = Router();
productsRouter.use(requireAuth);

/** GET /api/products?search=... — plain ILIKE search over the merchant's own catalog, for the manual-order product picker. */
productsRouter.get('/', async (req, res) => {
  const { merchantId } = req as AuthedRequest;
  const search = (req.query.search as string | undefined)?.trim();

  let query = supabase
    .from('products')
    .select('id, name, description, image_url, price, currency, stock_qty, options')
    .eq('merchant_id', merchantId)
    .eq('is_active', true)
    .order('name', { ascending: true })
    .limit(25);

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ products: data });
});
