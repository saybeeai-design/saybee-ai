import fetch from 'node-fetch';
import { logger } from '../utils/logger';

export type AiProviderName =
  | 'groq'
  | 'groq-whisper'
  | 'gemini'
  | 'openrouter'
  | 'browser-speechSynthesis'
  | 'fallback';

export interface StandardAiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

interface RetryOptions {
  attempts?: number;
  label: string;
  provider: AiProviderName;
  retryDelayMs?: number;
}

export const DEFAULT_TIMEOUT_MS = 8000;
export const FAST_TIMEOUT_MS = 5000;
export const STT_TIMEOUT_MS = 15000;

export function aiResponse<T>(
  input: StandardAiResponse<T> & { provider: AiProviderName; startedAt: number }
): StandardAiResponse<T> {
  return {
    success: input.success,
    data: input.data,
    error: input.error,
  };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const attempts = options.attempts ?? 2;
  const retryDelayMs = options.retryDelayMs ?? 350;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const startedAt = Date.now();
      const result = await operation();
      logger.info('ai.provider.success', {
        attempt,
        durationMs: Date.now() - startedAt,
        label: options.label,
        provider: options.provider,
      });
      return result;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);

      if (attempt < attempts) {
        logger.warn('ai.provider.retry', {
          attempt,
          label: options.label,
          provider: options.provider,
          retryDelayMs,
          error: message,
        });
        await sleep(retryDelayMs);
        continue;
      }

      logger.error('ai.provider.failed', {
        attempts,
        label: options.label,
        provider: options.provider,
        error: message,
      });
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`${options.label} failed`);
}

export async function fetchWithTimeout(
  url: string,
  options: Record<string, unknown>,
  timeoutMs: number,
  label: string
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    } as any);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`${label} timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function stripCodeFences(text: string): string {
  return text.replace(/^```json\s*|^```\s*|\s*```$/g, '').trim();
}
