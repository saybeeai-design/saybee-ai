import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

export const GEMINI_MODEL_NAME = 'gemini-1.5-flash';
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
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(
      'Missing GEMINI_API_KEY. Set GEMINI_API_KEY in the backend environment before calling Gemini.'
    );
  }

  return apiKey;
}

export function getGeminiClient(): GoogleGenerativeAI {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(getGeminiApiKey());
  }
  return genAI;
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
    console.info(`[Gemini] ${label} cache hit.`);
    return cachedResponse;
  }

  let lastError: unknown;

  for (let attempt = 1; attempt <= GEMINI_MAX_ATTEMPTS; attempt += 1) {
    try {
      const model = getGeminiModel(modelName, timeoutMs);
      const result = await model.generateContent(prompt, { timeout: timeoutMs });
      const text = result.response.text().trim();

      if (!text) {
        throw new Error(`${label} returned an empty response.`);
      }

      setCachedGeminiResponse(prompt, text);
      return text;
    } catch (error) {
      lastError = error;

      if (attempt < GEMINI_MAX_ATTEMPTS) {
        console.warn(
          `[Gemini] ${label} attempt ${attempt}/${GEMINI_MAX_ATTEMPTS} failed. Retrying in ${GEMINI_RETRY_DELAY_MS}ms.`,
          error
        );
        await sleep(GEMINI_RETRY_DELAY_MS);
        continue;
      }

      console.error(`[Gemini] ${label} failed after ${GEMINI_MAX_ATTEMPTS} attempts.`, error);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`${label} failed.`);
}
