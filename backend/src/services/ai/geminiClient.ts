import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import OpenAI from 'openai';
import { logger } from '../../utils/logger';

export const GEMINI_MODEL_NAME = process.env.GEMINI_MODEL_NAME || 'gemini-1.5-flash';
export const OPENROUTER_GEMINI_MODEL_NAME =
  process.env.OPENROUTER_GEMINI_MODEL_NAME || 'google/gemini-2.0-flash-001';
export const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
export const GEMINI_TIMEOUT_MS = 8000;
export const GEMINI_RETRY_DELAY_MS = 500;
export const GEMINI_MAX_ATTEMPTS = 2;
export const GEMINI_CACHE_TTL_MS = 5 * 60 * 1000;
export const GEMINI_FALLBACK_RESPONSE = {
  success: false,
  error: 'AI temporarily unavailable',
  data: {
    message: "Let's continue your interview. Tell me about yourself.",
  },
} as const;

let genAI: GoogleGenerativeAI | null = null;
let openRouterClient: OpenAI | null = null;
const geminiPromptCache = new Map<string, { value: string; expiresAt: number }>();

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const getCachedGeminiResponse = (prompt: string): string | null => {
  const cached = geminiPromptCache.get(prompt);

  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    geminiPromptCache.delete(prompt);
    return null;
  }

  return cached.value;
};

const setCachedGeminiResponse = (prompt: string, value: string): void => {
  geminiPromptCache.set(prompt, {
    value,
    expiresAt: Date.now() + GEMINI_CACHE_TTL_MS,
  });
};

export function getGeminiApiKey(): string {
  const apiKey = (process.env.GEMINI_API_KEY || process.env.OPENROUTER_API_KEY)?.trim();

  if (!apiKey) {
    throw new Error(
      'Missing GEMINI_API_KEY. Set GEMINI_API_KEY or OPENROUTER_API_KEY in the backend environment before calling Gemini.'
    );
  }

  return apiKey;
}

function shouldUseOpenRouter(): boolean {
  const provider = process.env.GEMINI_PROVIDER?.trim().toLowerCase();

  if (provider === 'openrouter') {
    return true;
  }

  if (provider === 'google') {
    return false;
  }

  return getGeminiApiKey().startsWith('sk-or-') || Boolean(process.env.OPENROUTER_API_KEY);
}

export function getGeminiClient(): GoogleGenerativeAI {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(getGeminiApiKey());
  }
  return genAI;
}

export function getOpenRouterClient(): OpenAI {
  if (!openRouterClient) {
    openRouterClient = new OpenAI({
      apiKey: getGeminiApiKey(),
      baseURL: OPENROUTER_BASE_URL,
      timeout: GEMINI_TIMEOUT_MS,
      defaultHeaders: {
        'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:3000',
        'X-Title': 'SayBee AI',
      },
    });
  }
  return openRouterClient;
}

export function getGeminiModel(
  modelName = GEMINI_MODEL_NAME,
  timeoutMs = GEMINI_TIMEOUT_MS
): GenerativeModel {
  return getGeminiClient().getGenerativeModel({ model: modelName }, { timeout: timeoutMs });
}

export interface GenerateGeminiTextOptions {
  label?: string;
  modelName?: string;
  timeoutMs?: number;
}

export async function generateGeminiText(
  prompt: string,
  options: GenerateGeminiTextOptions = {}
): Promise<string> {
  const {
    label = 'Gemini request',
    modelName = GEMINI_MODEL_NAME,
    timeoutMs = GEMINI_TIMEOUT_MS,
  } = options;
  const trimmedPrompt = prompt.trim();

  if (!trimmedPrompt) {
    throw new Error(`${label} requires a non-empty prompt.`);
  }

  const cachedResponse = getCachedGeminiResponse(prompt);
  if (cachedResponse) {
    logger.info('ai.gemini.cache_hit', { label });
    return cachedResponse;
  }

  let lastError: unknown;

  for (let attempt = 1; attempt <= GEMINI_MAX_ATTEMPTS; attempt += 1) {
    try {
      const text = shouldUseOpenRouter()
        ? await generateOpenRouterGeminiText(trimmedPrompt, {
            label,
            modelName: process.env.OPENROUTER_GEMINI_MODEL_NAME || modelName,
            timeoutMs,
          })
        : await generateGoogleGeminiText(trimmedPrompt, {
            label,
            modelName,
            timeoutMs,
          });

      if (!text) {
        throw new Error(`${label} returned an empty response.`);
      }

      setCachedGeminiResponse(prompt, text);
      return text;
    } catch (error) {
      lastError = error;

      if (attempt < GEMINI_MAX_ATTEMPTS) {
        logger.warn('ai.gemini.retry', {
          attempt,
          label,
          maxAttempts: GEMINI_MAX_ATTEMPTS,
          retryDelayMs: GEMINI_RETRY_DELAY_MS,
          error: error instanceof Error ? error.message : String(error),
        });
        await sleep(GEMINI_RETRY_DELAY_MS);
        continue;
      }

      logger.error('ai.gemini.failed', {
        label,
        maxAttempts: GEMINI_MAX_ATTEMPTS,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`${label} failed.`);
}

async function generateGoogleGeminiText(
  prompt: string,
  options: Required<GenerateGeminiTextOptions>
): Promise<string> {
  const model = getGeminiModel(options.modelName, options.timeoutMs);
  const result = await model.generateContent(prompt, { timeout: options.timeoutMs });
  return result.response.text().trim();
}

async function generateOpenRouterGeminiText(
  prompt: string,
  options: Required<GenerateGeminiTextOptions>
): Promise<string> {
  const modelName =
    options.modelName === GEMINI_MODEL_NAME ? OPENROUTER_GEMINI_MODEL_NAME : options.modelName;
  const result = await getOpenRouterClient().chat.completions.create(
    {
      model: modelName,
      messages: [{ role: 'user', content: prompt }],
    },
    { timeout: options.timeoutMs }
  );

  return result.choices[0]?.message?.content?.trim() || '';
}
