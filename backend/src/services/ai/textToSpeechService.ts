export interface TTSResult {
  audioBase64?: string;
  audioUrl?: string;
  text: string;
  isStub: boolean;
}

export async function textToSpeech(text: string, languageCode = 'en-US'): Promise<TTSResult> {
  const googleTtsKey = process.env.GOOGLE_TTS_API_KEY;
  if (!googleTtsKey) {
    throw new Error('GOOGLE_TTS_API_KEY is not configured');
  }

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

export const LANGUAGE_CODES: Record<string, string> = {
  English: 'en-US',
  Hindi: 'hi-IN',
  Assamese: 'as-IN',
  Bengali: 'bn-IN',
  Tamil: 'ta-IN',
  Telugu: 'te-IN',
  Marathi: 'mr-IN',
  Gujarati: 'gu-IN',
};

export function getLanguageCode(languageName: string): string {
  return LANGUAGE_CODES[languageName] ?? 'en-US';
}
