import { Router } from 'express';
import { requireAuth, AuthedRequest } from '../middleware/requireAuth';
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '../services/notificationService';

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

/** GET /api/notifications — feed for the dashboard bell menu, newest first. */
notificationsRouter.get('/', async (req, res) => {
  const { merchantId } = req as AuthedRequest;
  try {
    const result = await listNotifications(merchantId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

notificationsRouter.patch('/:id/read', async (req, res) => {
  const { merchantId } = req as unknown as AuthedRequest;
  try {
    await markNotificationRead(merchantId, req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

notificationsRouter.patch('/read-all', async (req, res) => {
  const { merchantId } = req as AuthedRequest;
  try {
    await markAllNotificationsRead(merchantId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
