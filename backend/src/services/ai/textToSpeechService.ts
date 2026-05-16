export interface TTSResult {
  audioBase64?: string;
  audioUrl?: string;
  text: string;
  isStub: boolean;
}

export async function textToSpeech(text: string): Promise<TTSResult> {
  return {
    text,
    isStub: true,
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
