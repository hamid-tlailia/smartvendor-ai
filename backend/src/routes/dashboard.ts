import { Router } from 'express';
import { supabase } from '../lib/supabaseClient';

export const dashboardRouter = Router();

/** GET /api/dashboard/orders?merchantId=... — live order feed across all channels. */
dashboardRouter.get('/orders', async (req, res) => {
  const merchantId = req.query.merchantId as string | undefined;
  if (!merchantId) return res.status(400).json({ error: 'merchantId is required' });

  const { data, error } = await supabase
    .from('carts')
    .select('*, cart_items(*)')
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ orders: data });
});

/** GET /api/dashboard/stats?merchantId=... — quick stat cards (sales, pending, recovered). */
dashboardRouter.get('/stats', async (req, res) => {
  const merchantId = req.query.merchantId as string | undefined;
  if (!merchantId) return res.status(400).json({ error: 'merchantId is required' });

  const { data: carts, error } = await supabase
    .from('carts')
    .select('status, total, channel, created_at')
    .eq('merchant_id', merchantId);

  if (error) return res.status(500).json({ error: error.message });

  const rows = carts ?? [];
  const totalSales = rows.filter((c) => c.status === 'confirmed').reduce((sum, c) => sum + Number(c.total), 0);
  const pendingOrders = rows.filter((c) => c.status === 'pending_confirmation').length;
  const recoveredCarts = rows.filter((c) => c.status === 'abandoned').length;
  const confirmedOrders = rows.filter((c) => c.status === 'confirmed').length;

  const byChannel = rows.reduce<Record<string, number>>((acc, c) => {
    acc[c.channel] = (acc[c.channel] ?? 0) + 1;
    return acc;
  }, {});

  res.json({ totalSales, pendingOrders, recoveredCarts, confirmedOrders, byChannel });
});
