import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { webhooksRouter } from './routes/webhooks';
import { checkoutRouter } from './routes/checkout';
import { dashboardRouter } from './routes/dashboard';
import { authRouter } from './routes/auth';
import { ordersRouter } from './routes/orders';
import { notificationsRouter } from './routes/notifications';
import { productsRouter } from './routes/products';

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));

// Webhook signature verification needs the raw request bytes, so capture
// them on every JSON body before Express parses it.
app.use(
  express.json({
    limit: '5mb',
    verify: (req, _res, buf) => {
      (req as Request & { rawBody?: Buffer }).rawBody = buf;
    },
  }),
);

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'smartvendor-ai-backend' }));

app.use('/api/webhooks', webhooksRouter);
app.use('/api/checkout', checkoutRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/auth', authRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/products', productsRouter);

app.use((req, res) => res.status(404).json({ error: 'not found' }));

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[server] unhandled error', err);
  res.status(500).json({ error: 'internal server error' });
});

app.listen(env.port, () => {
  console.log(`SmartVendor AI backend listening on port ${env.port}`);
});
