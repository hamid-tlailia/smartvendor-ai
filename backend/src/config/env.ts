import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? 'http://localhost:4000',
  checkoutBaseUrl: process.env.CHECKOUT_BASE_URL ?? 'http://localhost:5173',

  supabaseUrl: () => required('SUPABASE_URL'),
  supabaseServiceRoleKey: () => required('SUPABASE_SERVICE_ROLE_KEY'),

  geminiApiKey: () => required('GEMINI_API_KEY'),
  geminiModel: process.env.GEMINI_MODEL ?? 'gemini-1.5-flash',
  geminiEmbeddingModel: process.env.GEMINI_EMBEDDING_MODEL ?? 'text-embedding-004',

  groqApiKey: () => required('GROQ_API_KEY'),
  groqWhisperModel: process.env.GROQ_WHISPER_MODEL ?? 'whisper-large-v3',

  whatsapp: {
    appSecret: process.env.WHATSAPP_APP_SECRET ?? '',
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN ?? '',
    graphApiVersion: process.env.META_GRAPH_API_VERSION ?? 'v20.0',
  },
  meta: {
    appSecret: process.env.META_APP_SECRET ?? '', // shared by Instagram + Messenger
    verifyToken: process.env.META_VERIFY_TOKEN ?? '',
  },
  tiktok: {
    appSecret: process.env.TIKTOK_APP_SECRET ?? '',
    verifyToken: process.env.TIKTOK_VERIFY_TOKEN ?? '',
    accessToken: process.env.TIKTOK_ACCESS_TOKEN ?? '',
  },

  vectorMatchThreshold: Number(process.env.VECTOR_MATCH_THRESHOLD ?? 0.72),
  vectorMatchCount: Number(process.env.VECTOR_MATCH_COUNT ?? 5),

  jwtSecret: () => required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',

  supabaseReceiptsBucket: process.env.SUPABASE_RECEIPTS_BUCKET ?? 'receipts',
  // Path to a Chromium/Chrome binary for puppeteer-core, used to render the
  // Arabic RTL receipt (PDF/PNG). Leave unset locally if a system Chrome is
  // discoverable; most hosts (Fly.io, Render, Docker) need this set explicitly.
  puppeteerExecutablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
};
