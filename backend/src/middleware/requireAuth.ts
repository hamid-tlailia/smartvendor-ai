import { Request, Response, NextFunction } from 'express';
import { verifyAuthToken } from '../lib/auth';

export interface AuthedRequest extends Request {
  merchantId: string;
  adminUserId: string;
}

/** Protects the dashboard API surface (orders, notifications, products, manual order entry, ...). */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.get('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'missing bearer token' });
  }

  try {
    const payload = verifyAuthToken(token);
    (req as AuthedRequest).merchantId = payload.merchantId;
    (req as AuthedRequest).adminUserId = payload.adminUserId;
    next();
  } catch {
    return res.status(401).json({ error: 'invalid or expired token' });
  }
}
