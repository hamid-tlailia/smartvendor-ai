import { Router } from 'express';
import { supabase } from '../lib/supabaseClient';
import { requireAuth, AuthedRequest } from '../middleware/requireAuth';

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

/** GET /api/dashboard/stats — quick stat cards (sales, pending, recovered) for the signed-in merchant. */
dashboardRouter.get('/stats', async (req, res) => {
  const { merchantId } = req as AuthedRequest;

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
