import crypto from 'node:crypto';
import { Request, Response, NextFunction } from 'express';

/**
 * Verifies the `X-Hub-Signature-256` header Meta (WhatsApp/Instagram/Messenger)
 * signs every webhook POST with, using the app's secret and the raw request
 * body captured by `express.json({ verify })` in server.ts.
 *
 * Skips verification (with a warning) when no secret is configured, so local
 * development against unsigned test payloads still works.
 */
export function verifyMetaSignature(appSecret: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!appSecret) {
      console.warn('[verifySignature] no app secret configured — skipping signature check');
      return next();
    }

    const signatureHeader = req.get('x-hub-signature-256');
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;

    if (!signatureHeader || !rawBody) {
      return res.status(401).json({ error: 'missing signature' });
    }

    const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');

    const a = Buffer.from(signatureHeader);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return res.status(401).json({ error: 'invalid signature' });
    }

    next();
  };
}
