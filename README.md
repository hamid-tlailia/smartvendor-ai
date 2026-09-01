# SmartVendor AI (البائع الذكي) — OmniSell AI

AI-powered conversational checkout engine. Customers message a merchant on
**WhatsApp, Instagram, Messenger, or TikTok** — with text, a voice note, or a
product photo — and SmartVendor AI turns that message into a ready-to-pay
order on a lightweight Arabic-first (RTL) checkout page, while the merchant
runs everything from a tabbed dashboard app: live orders, manual order entry,
notifications, and receipt delivery.

```
Customer DM (text / voice / photo)
        │
        ▼
 Multi-channel webhook (Express)
        │  normalize to a common message shape
        ▼
 AI Pipeline
   ├─ Groq Whisper Large v3   → transcribe Arabic voice notes
   ├─ Gemini 1.5 Flash Vision → describe product photos
   ├─ Gemini structured JSON  → extract name/address/items/payment method
   └─ pgvector similarity     → match extracted items to the real catalog
        │
        ▼
 Supabase (Postgres + pgvector): cart + cart_items  →  in-app notification
        │
        ▼
 Micro-PWA checkout  →  https://domain.com/checkout/:cartId
        │
        ▼
 Merchant confirms / sends receipt (PDF or image) back to the customer's
 original channel — or WhatsApp — via each provider's Send API
```

## Monorepo layout

```
smartvendor-ai/
├── db/schema.sql          # Supabase schema: pgvector, admin_users, notifications, match_products RPC
├── backend/                # Express + TypeScript API
│   └── src/
│       ├── routes/webhooks.ts        # /api/webhooks/{whatsapp,instagram,messenger,tiktok}
│       ├── routes/checkout.ts        # public cart read/confirm API for the PWA
│       ├── routes/auth.ts            # admin register/login/me + merchant settings
│       ├── routes/orders.ts          # order feed, manual order entry, send-receipt
│       ├── routes/notifications.ts   # in-app notification feed
│       ├── routes/products.ts        # catalog search for the manual-order picker
│       ├── channels/*.ts             # per-channel payload normalizers
│       ├── services/aiPipeline.ts    # orchestrates transcription/vision/extraction/matching
│       ├── services/vectorSearch.ts  # embeddings + match_products RPC
│       ├── services/cartService.ts   # cart persistence, manual orders, checkout URL
│       ├── services/notificationService.ts
│       ├── services/receiptTemplate.ts / receiptService.ts  # RTL PDF/PNG receipt rendering
│       ├── services/channelSender.ts # delivers the receipt via WhatsApp/Messenger/Instagram Send APIs
│       ├── services/storageService.ts# uploads the rendered receipt to Supabase Storage
│       ├── middleware/requireAuth.ts # JWT auth guard for the dashboard API
│       └── lib/{gemini,groq,auth,supabaseClient}.ts
└── frontend/                # Vite + React + MUI (RTL) — tabbed dashboard app
    └── src/
        ├── theme/            # @emotion/cache + stylis-plugin-rtl RTL setup
        ├── context/AuthContext.jsx
        ├── layouts/AppShell.jsx        # sidebar tabs + topbar (replaces a single scrolling page)
        ├── components/common/NotificationBell.jsx
        ├── components/orders/SendReceiptDialog.jsx
        └── pages/
            ├── CheckoutPage.jsx        # public Micro-PWA checkout
            ├── LoginPage.jsx / RegisterPage.jsx
            ├── DashboardPage.jsx       # stats + live cross-channel order table
            ├── NewOrderPage.jsx        # manual order entry, with a source selector
            ├── NotificationsPage.jsx
            └── AccountSettingsPage.jsx
```

## Tech stack

- **Frontend**: React (Vite) + MUI v5, full RTL via `@emotion/cache` + `stylis-plugin-rtl`.
- **Backend**: Node.js + Express + TypeScript, JWT auth (bcrypt + jsonwebtoken).
- **Database**: Supabase Postgres with `pgvector` for semantic product matching.
- **AI**: Gemini 1.5 Flash (vision + structured JSON extraction), Groq-hosted Whisper Large v3 (Arabic STT).
- **Receipts**: headless Chromium (`puppeteer-core`) rendering an RTL HTML template to PDF/PNG — chosen over a PDF-primitives library specifically so Arabic text shapes and bidi-reorders correctly with no extra font-shaping code.

## Features

- **Multi-channel AI intake** — WhatsApp, Instagram, Messenger, TikTok webhooks → transcription/vision → structured order → vector-matched cart → checkout link.
- **Micro-PWA checkout** — editable order review, RTL MUI form, COD/online/bank-transfer payment.
- **Tabbed merchant dashboard** — a persistent sidebar app shell (Dashboard, New manual order, Notifications, Account), not a single scrolling page.
- **Manual order entry** — an admin can key in an order taken by phone, in person, or from a DM the AI didn't catch, tagging which channel it actually came from.
- **In-app notifications** — a bell with unread badge + full notifications page, fired on new AI-parsed orders, confirmations, manual entries, and receipt delivery outcomes.
- **Admin accounts** — merchant self-registration (creates the tenant + owner login) and JWT-based login; every dashboard API route is scoped to the signed-in merchant.
- **Receipt delivery** — generates a branded RTL PDF or image receipt and sends it back to the customer over the channel the order came from, or over WhatsApp, via each provider's Send API.

## Getting started

### 1. Database

Open the Supabase SQL editor for your project and run `db/schema.sql`. It
enables `pgvector` and creates `merchants`, `products`, `carts`, `cart_items`,
`admin_users`, `notifications`, and the `match_products` RPC.

Also create a **public** Storage bucket named `receipts` (Storage → New
bucket) — generated receipt files are uploaded there so channel Send APIs
have a public URL to attach.

Insert a few products (with `embedding` populated via
`services/vectorSearch.ts#reindexProductEmbedding` or your own seed script)
before testing the AI pipeline end to end. Admin accounts and the merchant
row are created through the app itself — see step 3.

### 2. Backend

```bash
cd backend
cp ../.env.example .env   # keep only the backend section
npm install
npm run dev                # http://localhost:4000
```

Point each channel's webhook configuration at:
- `POST https://<your-domain>/api/webhooks/whatsapp`
- `POST https://<your-domain>/api/webhooks/instagram`
- `POST https://<your-domain>/api/webhooks/messenger`
- `POST https://<your-domain>/api/webhooks/tiktok`

Each also exposes a `GET` handler for the provider's verification handshake.

### 3. Frontend

```bash
cd frontend
cp ../.env.example .env.local   # keep only the frontend section
npm install
npm run dev                      # http://localhost:5173
```

- `/register` — create your store + owner admin account (first run).
- `/login` — admin sign-in.
- `/dashboard`, `/orders/new`, `/notifications`, `/account` — the tabbed dashboard app (auth required).
- `/checkout/:cartId` — the public Micro-PWA checkout page generated by the AI pipeline.

## Notes on production hardening

- Webhook POSTs are signature-verified against `X-Hub-Signature-256` using
  each app's secret (`middleware/verifySignature.ts`); requests are ack'd
  with `200` immediately, then processed async, matching Meta's webhook
  timeout expectations.
- The Supabase **service role key** is used only server-side; the frontend
  never talks to Supabase directly, only to the Express API (itself gated
  by JWT auth on every merchant-scoped route).
- `carts`/`cart_items` totals are kept in sync via a Postgres trigger
  (`recalc_cart_totals`) rather than being computed client-side.
- Sending the generated `checkoutUrl` back to the customer on first contact
  (WhatsApp Cloud API / Messenger Send API / TikTok DM) is left as a `TODO`
  in `routes/webhooks.ts` — wire it to each provider's outbound messaging
  endpoint once you have production tokens. Sending the **order receipt**
  after confirmation is already implemented end-to-end (`routes/orders.ts`
  → `receiptService.ts` → `channelSender.ts`).
- TikTok's DM send API is still limited/early-access; `channelSender.ts`
  throws a clear error for it today so the dashboard can fall back to
  WhatsApp — swap in TikTok's real endpoint once your app has send access.
- Web Push (browser notifications) isn't wired up — the in-app bell +
  notifications page cover the "دعم الإشعارات" requirement for now; the
  frontend already ships as a PWA (`manifest.webmanifest`), so adding a
  service worker + VAPID keys later is a self-contained extension.
