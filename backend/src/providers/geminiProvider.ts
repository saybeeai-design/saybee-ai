import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { fetchWithTimeout, stripCodeFences, withRetry } from './providerUtils';

export const GEMINI_MODEL_NAME = process.env.GEMINI_MODEL_NAME || 'gemini-1.5-flash';
export const OPENROUTER_GEMINI_MODEL_NAME =
  process.env.OPENROUTER_GEMINI_MODEL_NAME || 'google/gemini-1.5-flash';
export const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
export const GEMINI_TIMEOUT_MS = 12000;
export const GEMINI_CACHE_TTL_MS = 5 * 60 * 1000;

let genAI: GoogleGenerativeAI | null = null;
const geminiPromptCache = new Map<string, { value: string; expiresAt: number }>();

export interface GenerateGeminiTextOptions {
  label?: string;
  modelName?: string;
  timeoutMs?: number;
  useCache?: boolean;
}

function getGoogleGeminiApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY');
  }
  return apiKey;
}

function getOpenRouterApiKey(): string {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('Missing OPENROUTER_API_KEY');
  }
  return apiKey;
}

function shouldUseOpenRouterFallback(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY?.trim()) && process.env.GEMINI_PROVIDER === 'openrouter';
}

export function getGeminiClient(): GoogleGenerativeAI {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(getGoogleGeminiApiKey());
  }
  return genAI;
}

export function getGeminiModel(
  modelName = GEMINI_MODEL_NAME,
  timeoutMs = GEMINI_TIMEOUT_MS
): GenerativeModel {
  return getGeminiClient().getGenerativeModel({ model: modelName }, { timeout: timeoutMs });
}

function getCachedResponse(prompt: string): string | null {
  const cached = geminiPromptCache.get(prompt);
  if (!cached) {
    return null;
  }
  if (cached.expiresAt <= Date.now()) {
    geminiPromptCache.delete(prompt);
    return null;
  }
  return cached.value;
}

function setCachedResponse(prompt: string, value: string): void {
  geminiPromptCache.set(prompt, {
    value,
    expiresAt: Date.now() + GEMINI_CACHE_TTL_MS,
  });
}

export async function generateGeminiText(
  prompt: string,
  options: GenerateGeminiTextOptions = {}
): Promise<string> {
  const label = options.label ?? 'gemini.generate';
  const trimmedPrompt = prompt.trim();

  if (!trimmedPrompt) {
    throw new Error(`${label} requires a non-empty prompt`);
  }

  if (options.useCache !== false) {
    const cached = getCachedResponse(trimmedPrompt);
    if (cached) {
      return cached;
    }
  }

  const text = await withRetry(
    async () => {
      const result = shouldUseOpenRouterFallback()
        ? await generateOpenRouterGeminiText(trimmedPrompt, options)
        : await generateGoogleGeminiText(trimmedPrompt, options);

      if (!result) {
        throw new Error(`${label} returned an empty response`);
      }

      return result;
    },
    { attempts: 2, label, provider: shouldUseOpenRouterFallback() ? 'openrouter' : 'gemini' }
  );

  if (options.useCache !== false) {
    setCachedResponse(trimmedPrompt, text);
  }

  return text;
}

async function generateGoogleGeminiText(
  prompt: string,
  options: GenerateGeminiTextOptions
): Promise<string> {
  const model = getGeminiModel(options.modelName ?? GEMINI_MODEL_NAME, options.timeoutMs ?? GEMINI_TIMEOUT_MS);
  const result = await model.generateContent(prompt, { timeout: options.timeoutMs ?? GEMINI_TIMEOUT_MS });
  return result.response.text().trim();
}

async function generateOpenRouterGeminiText(
  prompt: string,
  options: GenerateGeminiTextOptions
): Promise<string> {
  const response = await fetchWithTimeout(
    `${OPENROUTER_BASE_URL}/chat/completions`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getOpenRouterApiKey()}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:3000',
        'X-Title': 'SayBee AI',
      },
      body: JSON.stringify({
        model: options.modelName ?? OPENROUTER_GEMINI_MODEL_NAME,
        messages: [{ role: 'user', content: prompt }],
      }),
    },
    options.timeoutMs ?? GEMINI_TIMEOUT_MS,
    options.label ?? 'openrouter.gemini'
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter Gemini error ${response.status}: ${error}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

export function parseJsonFromGemini<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(stripCodeFences(raw)) as T;
  } catch {
    return fallback;
  }
}
