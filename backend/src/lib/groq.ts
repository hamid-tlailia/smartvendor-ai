import Groq from 'groq-sdk';
import { toFile } from 'groq-sdk/uploads';
import { env } from '../config/env';

const groq = new Groq({ apiKey: env.groqApiKey() });

/**
 * Transcribes an Arabic voice note (ogg/mp3/m4a buffer) using Groq's hosted
 * Whisper Large v3. `language: 'ar'` pins recognition to Arabic/Darja audio.
 */
export async function transcribeVoiceNote(audioBuffer: Buffer, filename: string): Promise<string> {
  const file = await toFile(audioBuffer, filename);

  const transcription = await groq.audio.transcriptions.create({
    file,
    model: env.groqWhisperModel,
    language: 'ar',
    response_format: 'text',
    temperature: 0,
  });

  return typeof transcription === 'string' ? transcription.trim() : String(transcription).trim();
}
