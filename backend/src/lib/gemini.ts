import { GoogleGenerativeAI, Part, Schema, SchemaType } from '@google/generative-ai';
import { env } from '../config/env';

const client = new GoogleGenerativeAI(env.geminiApiKey());

/** JSON schema Gemini must conform to when extracting a structured order. */
const orderExtractionSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    customer_name: { type: SchemaType.STRING, nullable: true },
    phone: { type: SchemaType.STRING, nullable: true },
    city: { type: SchemaType.STRING, nullable: true },
    address: { type: SchemaType.STRING, nullable: true },
    payment_method: {
      type: SchemaType.STRING,
      enum: ['cod', 'online', 'bank_transfer'],
      nullable: true,
    },
    items: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          product_query: { type: SchemaType.STRING },
          quantity: { type: SchemaType.NUMBER },
          selected_options: {
            type: SchemaType.OBJECT,
            properties: {},
            nullable: true,
          },
        },
        required: ['product_query', 'quantity'],
      },
    },
    notes: { type: SchemaType.STRING, nullable: true },
  },
  required: ['items'],
};

const EXTRACTION_SYSTEM_PROMPT = `You are an order-intake assistant for an Arabic-speaking e-commerce merchant
selling through social media DMs. Given a customer's message (which may mix Arabic,
French, and Arabizi/Darja, and may describe a product from a photo), extract a
structured order. Rules:
- "product_query" must be a short, searchable description of what the customer wants
  (e.g. "حذاء رياضي أسود مقاس 42"), not the raw sentence.
- Infer quantity as 1 if not stated.
- Leave any field null if it cannot be confidently determined from the message.
- Never invent a phone number, address, or product that wasn't mentioned or shown.
- Payment method defaults to null unless the customer explicitly states COD, online
  payment, or bank transfer.`;

const model = client.getGenerativeModel({
  model: env.geminiModel,
  systemInstruction: EXTRACTION_SYSTEM_PROMPT,
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: orderExtractionSchema,
  },
});

const visionModel = client.getGenerativeModel({ model: env.geminiModel });
const embeddingModel = client.getGenerativeModel({ model: env.geminiEmbeddingModel });

export interface GeminiOrderInput {
  text: string;
  imageBase64?: string;
  imageMimeType?: string;
}

/** Runs Gemini 1.5 Flash structured-output extraction on the normalized customer message. */
export async function extractOrderFromMessage(input: GeminiOrderInput) {
  const parts: Part[] = [{ text: input.text }];
  if (input.imageBase64 && input.imageMimeType) {
    parts.push({
      inlineData: { data: input.imageBase64, mimeType: input.imageMimeType },
    });
  }

  const result = await model.generateContent({
    contents: [{ role: 'user', parts }],
  });

  const raw = result.response.text();
  return JSON.parse(raw) as {
    customer_name: string | null;
    phone: string | null;
    city: string | null;
    address: string | null;
    payment_method: 'cod' | 'online' | 'bank_transfer' | null;
    items: Array<{ product_query: string; quantity: number; selected_options?: Record<string, string> }>;
    notes?: string | null;
  };
}

/** Describes a product photo in plain text so it can be embedded and matched against the catalog. */
export async function describeProductImage(imageBase64: string, imageMimeType: string): Promise<string> {
  const result = await visionModel.generateContent({
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: 'Describe the product in this image in one short, searchable phrase (type, color, category). Reply in Arabic. No extra commentary.',
          },
          { inlineData: { data: imageBase64, mimeType: imageMimeType } },
        ],
      },
    ],
  });
  return result.response.text().trim();
}

/** Generates a 768-dim embedding for semantic product search (pgvector). */
export async function embedText(text: string): Promise<number[]> {
  const result = await embeddingModel.embedContent(text);
  return result.embedding.values;
}
