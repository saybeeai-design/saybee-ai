import { GoogleGenerativeAI } from '@google/generative-ai';

export const CHAT_FALLBACK_ERROR = 'AI temporarily unavailable';
export const CHAT_FALLBACK_MESSAGE = "Let's continue your interview. Tell me about yourself.";

const CHAT_GEMINI_MODEL = 'gemini-1.5-flash';
const CHAT_TIMEOUT_MS = 8000;
const CHAT_RETRY_DELAY_MS = 500;
const CHAT_MAX_ATTEMPTS = 2;
const CHAT_CACHE_TTL_MS = 5 * 60 * 1000;

let genAI: GoogleGenerativeAI | null = null;
const chatPromptCache = new Map<string, { value: string; expiresAt: number }>();

export interface ChatReplyResult {
  success: boolean;
  error?: string;
  data: {
    message: string;
  };
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const getCachedChatReply = (prompt: string): string | null => {
  const cached = chatPromptCache.get(prompt);

  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    chatPromptCache.delete(prompt);
    return null;
  }

  return cached.value;
};

const setCachedChatReply = (prompt: string, value: string): void => {
  chatPromptCache.set(prompt, {
    value,
    expiresAt: Date.now() + CHAT_CACHE_TTL_MS,
  });
};

function getGeminiApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(
      'Missing GEMINI_API_KEY. Set GEMINI_API_KEY in the frontend server environment before calling Gemini.'
    );
  }

  return apiKey;
}

function getGeminiClient(): GoogleGenerativeAI {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(getGeminiApiKey());
  }

  return genAI;
}

export function createChatFallbackResponse(): ChatReplyResult {
  return {
    success: false,
    error: CHAT_FALLBACK_ERROR,
    data: {
      message: CHAT_FALLBACK_MESSAGE,
    },
  };
}

export async function generateChatReply(message: string): Promise<ChatReplyResult> {
  const prompt = message.trim();

  if (!prompt) {
    throw new Error('Message is required');
  }

  const cachedReply = getCachedChatReply(prompt);
  if (cachedReply) {
    console.info('[ChatAI] Cache hit for chat prompt.');
    return {
      success: true,
      data: {
        message: cachedReply,
      },
    };
  }

  for (let attempt = 1; attempt <= CHAT_MAX_ATTEMPTS; attempt += 1) {
    try {
      const model = getGeminiClient().getGenerativeModel(
        { model: CHAT_GEMINI_MODEL },
        { timeout: CHAT_TIMEOUT_MS }
      );
      const result = await model.generateContent(prompt, { timeout: CHAT_TIMEOUT_MS });
      const reply = result.response.text().trim();

      if (!reply) {
        throw new Error('Gemini returned an empty chat response.');
      }

      setCachedChatReply(prompt, reply);
      return {
        success: true,
        data: {
          message: reply,
        },
      };
    } catch (error) {
      if (attempt < CHAT_MAX_ATTEMPTS) {
        console.warn(
          `[ChatAI] Attempt ${attempt}/${CHAT_MAX_ATTEMPTS} failed. Retrying in ${CHAT_RETRY_DELAY_MS}ms.`,
          error
        );
        await sleep(CHAT_RETRY_DELAY_MS);
        continue;
      }

      console.error('[ChatAI] Failed to generate chat response after retries:', error);
      return createChatFallbackResponse();
    }
  }

  return createChatFallbackResponse();
}
