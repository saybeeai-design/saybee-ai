import { generateGeminiText, GEMINI_FALLBACK_RESPONSE } from './ai/geminiClient';
import { logger } from '../utils/logger';

export interface AiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export interface ChatReplyData {
  message: string;
}

export const aiSuccess = <T>(data: T): AiResponse<T> => ({
  success: true,
  data,
  error: null,
});

export const aiFailure = <T>(error: string, data: T | null = null): AiResponse<T> => ({
  success: false,
  data,
  error,
});

export const createChatFallbackResponse = (): AiResponse<ChatReplyData> =>
  aiFailure(GEMINI_FALLBACK_RESPONSE.error, {
    message: GEMINI_FALLBACK_RESPONSE.data.message,
  });

export async function generateChatReply(message: string): Promise<AiResponse<ChatReplyData>> {
  const prompt = message.trim();

  if (!prompt) {
    return aiFailure('Message is required', { message: '' });
  }

  try {
    const reply = await generateGeminiText(prompt, { label: 'chat.reply' });
    return aiSuccess({ message: reply });
  } catch (error) {
    logger.error('ai.chat.failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return createChatFallbackResponse();
  }
}
