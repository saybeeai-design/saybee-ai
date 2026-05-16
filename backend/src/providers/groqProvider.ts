import { Readable } from 'stream';
import { fetchWithTimeout, FAST_TIMEOUT_MS, withRetry } from './providerUtils';

export const GROQ_CHAT_MODEL = process.env.GROQ_CHAT_MODEL || 'llama-3.1-8b-instant';
const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GroqTextOptions {
  label?: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

function getGroqApiKey(): string {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('Missing GROQ_API_KEY');
  }
  return apiKey;
}

function normalizeMessages(input: string | ChatMessage[]): ChatMessage[] {
  if (typeof input !== 'string') {
    return input;
  }

  return [{ role: 'user', content: input }];
}

async function requestGroqChat(
  input: string | ChatMessage[],
  options: GroqTextOptions,
  stream: boolean
) {
  const response = await fetchWithTimeout(
    GROQ_CHAT_URL,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getGroqApiKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_CHAT_MODEL,
        messages: normalizeMessages(input),
        temperature: options.temperature ?? 0.65,
        max_tokens: options.maxTokens ?? 700,
        stream,
      }),
    },
    options.timeoutMs ?? FAST_TIMEOUT_MS,
    options.label ?? 'groq.chat'
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq chat error ${response.status}: ${error}`);
  }

  return response;
}

export async function generateGroqText(
  input: string | ChatMessage[],
  options: GroqTextOptions = {}
): Promise<string> {
  const label = options.label ?? 'groq.chat';

  return withRetry(
    async () => {
      const response = await requestGroqChat(input, options, false);
      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = data.choices?.[0]?.message?.content?.trim() ?? '';
      if (!text) {
        throw new Error(`${label} returned an empty response`);
      }
      return text;
    },
    { attempts: 2, label, provider: 'groq' }
  );
}

export async function streamGroqText(
  input: string | ChatMessage[],
  onToken: (token: string) => void,
  options: GroqTextOptions = {}
): Promise<string> {
  const label = options.label ?? 'groq.chat.stream';

  return withRetry(
    async () => {
      const response = await requestGroqChat(input, options, true);
      const body = response.body as Readable | null;

      if (!body) {
        throw new Error(`${label} returned an empty stream`);
      }

      let buffered = '';
      let fullText = '';

      await new Promise<void>((resolve, reject) => {
        body.on('data', (chunk: Buffer) => {
          buffered += chunk.toString('utf8');
          const lines = buffered.split('\n');
          buffered = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data:')) {
              continue;
            }

            const payload = trimmed.replace(/^data:\s*/, '');
            if (payload === '[DONE]') {
              resolve();
              return;
            }

            try {
              const parsed = JSON.parse(payload) as {
                choices?: Array<{ delta?: { content?: string } }>;
              };
              const token = parsed.choices?.[0]?.delta?.content ?? '';
              if (token) {
                fullText += token;
                onToken(token);
              }
            } catch {
              // Ignore partial provider chunks; the next data event will carry the rest.
            }
          }
        });
        body.on('end', () => resolve());
        body.on('error', reject);
      });

      if (!fullText.trim()) {
        throw new Error(`${label} streamed an empty response`);
      }

      return fullText.trim();
    },
    { attempts: 1, label, provider: 'groq' }
  );
}
