import FormData from 'form-data';
import { fetchWithTimeout, STT_TIMEOUT_MS, withRetry } from './providerUtils';

export interface TranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
}

const GROQ_TRANSCRIPTION_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const GROQ_WHISPER_MODEL = process.env.GROQ_WHISPER_MODEL || 'whisper-large-v3';

function getGroqApiKey(): string {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('Missing GROQ_API_KEY');
  }
  return apiKey;
}

export async function transcribeAudioBuffer(
  buffer: Buffer,
  input: { contentType?: string; filename?: string; language?: string } = {}
): Promise<TranscriptionResult> {
  return withRetry(
    async () => {
      const formData = new FormData();
      formData.append('file', buffer, {
        contentType: input.contentType || 'audio/webm',
        filename: input.filename || 'answer.webm',
      });
      formData.append('model', GROQ_WHISPER_MODEL);
      formData.append('response_format', 'verbose_json');

      if (input.language) {
        formData.append('language', input.language);
      }

      const response = await fetchWithTimeout(
        GROQ_TRANSCRIPTION_URL,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${getGroqApiKey()}`,
            ...formData.getHeaders(),
          },
          body: formData,
        },
        STT_TIMEOUT_MS,
        'groq.whisper.transcribe'
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Groq Whisper error ${response.status}: ${error}`);
      }

      const data = (await response.json()) as {
        duration?: number;
        language?: string;
        text?: string;
      };

      return {
        duration: data.duration,
        language: data.language,
        text: data.text?.trim() || '',
      };
    },
    { attempts: 2, label: 'groq.whisper.transcribe', provider: 'groq-whisper', retryDelayMs: 500 }
  );
}
