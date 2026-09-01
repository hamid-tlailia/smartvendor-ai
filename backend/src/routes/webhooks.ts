import { Router, Request, Response } from 'express';
import { env } from '../config/env';
import { verifyMetaSignature } from '../middleware/verifySignature';
import { parseWhatsAppPayload } from '../channels/whatsapp';
import { parseInstagramPayload } from '../channels/instagram';
import { parseMessengerPayload } from '../channels/messenger';
import { parseTikTokPayload } from '../channels/tiktok';
import { processInboundMessage } from '../services/aiPipeline';
import { NormalizedMessage } from '../types';

export const webhooksRouter = Router();

/** Handles the message list produced by a channel parser: run the AI pipeline, don't let one bad message break the batch. */
async function handleNormalizedMessages(messages: NormalizedMessage[]) {
  for (const message of messages) {
    try {
      const result = await processInboundMessage(message);
      if (result) {
        console.log(`[webhooks] cart ${result.cartId} ready -> ${result.checkoutUrl}`);
        // TODO: send `result.checkoutUrl` back to the customer via the channel's Send API.
      }
    } catch (err) {
      console.error('[webhooks] failed to process message', message.channel, message.senderId, err);
    }
  }
}

/** Meta (WhatsApp/Instagram/Messenger) verification handshake: GET with hub.challenge. */
function metaVerifyHandler(verifyToken: string) {
  return (req: Request, res: Response) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === verifyToken && challenge) {
      return res.status(200).send(String(challenge));
    }
    return res.sendStatus(403);
  };
}

// ---------------------------------------------------------------------------
// WhatsApp Cloud API
// ---------------------------------------------------------------------------
webhooksRouter.get('/whatsapp', metaVerifyHandler(env.whatsapp.verifyToken));
webhooksRouter.post('/whatsapp', verifyMetaSignature(env.whatsapp.appSecret), async (req, res) => {
  res.sendStatus(200); // ack immediately; Meta retries on timeout/non-2xx
  const messages = parseWhatsAppPayload(req.body);
  await handleNormalizedMessages(messages);
});

// ---------------------------------------------------------------------------
// Instagram Messaging
// ---------------------------------------------------------------------------
webhooksRouter.get('/instagram', metaVerifyHandler(env.meta.verifyToken));
webhooksRouter.post('/instagram', verifyMetaSignature(env.meta.appSecret), async (req, res) => {
  res.sendStatus(200);
  const messages = parseInstagramPayload(req.body);
  await handleNormalizedMessages(messages);
});

// ---------------------------------------------------------------------------
// Facebook Messenger
// ---------------------------------------------------------------------------
webhooksRouter.get('/messenger', metaVerifyHandler(env.meta.verifyToken));
webhooksRouter.post('/messenger', verifyMetaSignature(env.meta.appSecret), async (req, res) => {
  res.sendStatus(200);
  const messages = parseMessengerPayload(req.body);
  await handleNormalizedMessages(messages);
});

// ---------------------------------------------------------------------------
// TikTok Direct Messaging
// ---------------------------------------------------------------------------
webhooksRouter.get('/tiktok', metaVerifyHandler(env.tiktok.verifyToken));
webhooksRouter.post('/tiktok', verifyMetaSignature(env.tiktok.appSecret), async (req, res) => {
  res.sendStatus(200);
  const messages = parseTikTokPayload(req.body);
  await handleNormalizedMessages(messages);
});
