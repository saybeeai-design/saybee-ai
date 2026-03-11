import { getGeminiModel } from './geminiClient';

export interface TTSResult {
  /** Base64-encoded audio data (when using a real TTS provider) */
  audioBase64?: string;
  /** Plain URL to the audio file if using cloud TTS */
  audioUrl?: string;
  /** The original text that was converted */
  text: string;
  /** Whether a real TTS provider was used */
  isStub: boolean;
}

/**
 * Converts text to speech.
 *
 * Priority:
 * 1. Google Cloud TTS (if GOOGLE_TTS_API_KEY is set)
 * 2. Stub mode — returns the original text for client-side Web Speech API usage
 *
 * In stub mode the frontend can use the Web Speech API (SpeechSynthesis) 
 * to speak the returned text string directly, so the interview still works 
 * end-to-end without a backend TTS key.
 */
export async function textToSpeech(
  text: string,
  languageCode = 'en-US'
): Promise<TTSResult> {
  const googleTtsKey = process.env.GOOGLE_TTS_API_KEY;

  // ── Google Cloud TTS (when key is provided) ───────────────────────────────
  if (googleTtsKey) {
    const requestBody = {
      input: { text },
      voice: { languageCode, ssmlGender: 'FEMALE' },
      audioConfig: { audioEncoding: 'MP3' },
    };

    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${googleTtsKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Google TTS error ${response.status}: ${err}`);
    }

    const data = (await response.json()) as { audioContent: string };
    return {
      audioBase64: data.audioContent,
      text,
      isStub: false,
    };
  }

  // ── Stub mode ─────────────────────────────────────────────────────────────────
  console.warn('[TextToSpeech] No GOOGLE_TTS_API_KEY found — returning stub (use Web Speech API on client)');
  return {
    text,
    isStub: true,
  };
}

// Map SayBee AI language names to BCP-47 codes
export const LANGUAGE_CODES: Record<string, string> = {
  English: 'en-US',
  Hindi: 'hi-IN',
  Assamese: 'as-IN',
  Tamil: 'ta-IN',
  Bengali: 'bn-IN',
};

export function getLanguageCode(languageName: string): string {
  return LANGUAGE_CODES[languageName] ?? 'en-US';
}
