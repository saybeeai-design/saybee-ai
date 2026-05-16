import { Response } from 'express';
import { generateGeminiText } from '../providers/geminiProvider';
import { type ChatMessage, generateGroqText, streamGroqText } from '../providers/groqProvider';
import { aiResponse, type AiProviderName, type StandardAiResponse } from '../providers/providerUtils';
import { logger } from '../utils/logger';

export type AiResponse<T> = StandardAiResponse<T>;

export interface ChatReplyData {
  message: string;
}

export interface ChatInputMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const aiSuccess = <T>(
  data: T,
  provider: AiProviderName = 'fallback',
  startedAt = Date.now()
): AiResponse<T> =>
  aiResponse({
    success: true,
    data,
    error: null,
    provider,
    startedAt,
  });

export const aiFailure = <T>(
  error: string,
  data: T | null = null,
  provider: AiProviderName = 'fallback',
  startedAt = Date.now()
): AiResponse<T> =>
  aiResponse({
    success: false,
    data,
    error,
    provider,
    startedAt,
  });

export const createChatFallbackResponse = (startedAt = Date.now()): AiResponse<ChatReplyData> =>
  aiFailure(
    'AI temporarily unavailable',
    { message: "Let's continue your interview. Tell me about yourself." },
    'fallback',
    startedAt
  );

function isChatInputMessages(value: unknown): value is ChatInputMessage[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        (item as ChatInputMessage).role &&
        typeof (item as ChatInputMessage).content === 'string'
    )
  );
}

export function buildChatMessages(input: {
  message?: string;
  messages?: unknown;
  mode?: string;
  language?: string;
}): ChatMessage[] {
  const mode = typeof input.mode === 'string' ? input.mode : 'general';
  const language = typeof input.language === 'string' ? input.language : 'English';
  const modeInstruction: Record<string, string> = {
    career: 'You are a career strategist. Help with career planning using practical next steps.',
    general: 'You are SayBee AI, a concise career and interview preparation assistant.',
    interview: 'You are an expert interview coach. Give realistic, human interview practice and feedback.',
    resume: 'You are a resume expert. Help improve resumes with concrete, recruiter-friendly advice.',
  };

  const system = [
    modeInstruction[mode] ?? modeInstruction.general,
    `Reply in ${language} unless the user asks for another language.`,
    'Keep responses clear, practical, and conversational. Use markdown only when it improves readability.',
  ].join('\n');

  if (isChatInputMessages(input.messages)) {
    return [
      { role: 'system', content: system },
      ...input.messages.slice(-12).map((message) => ({
        role: message.role,
        content: message.content,
      })),
    ];
  }

  const prompt = typeof input.message === 'string' ? input.message.trim() : '';
  return [
    { role: 'system', content: system },
    { role: 'user', content: prompt },
  ];
}

export async function generateChatReply(input: {
  message?: string;
  messages?: unknown;
  mode?: string;
  language?: string;
}): Promise<AiResponse<ChatReplyData>> {
  const startedAt = Date.now();
  const messages = buildChatMessages(input);

  if (!messages.some((message) => message.role === 'user' && message.content.trim())) {
    return aiFailure('Message is required', { message: '' }, 'fallback', startedAt);
  }

  try {
    const reply = await generateGroqText(messages, {
      label: 'chat.reply.groq',
      maxTokens: 900,
      timeoutMs: 5000,
    });
    return aiSuccess({ message: reply }, 'groq', startedAt);
  } catch (groqError) {
    logger.warn('ai.chat.groq_failed_using_gemini', {
      error: groqError instanceof Error ? groqError.message : String(groqError),
    });

    try {
      const geminiPrompt = messages.map((message) => `${message.role}: ${message.content}`).join('\n\n');
      const reply = await generateGeminiText(geminiPrompt, {
        label: 'chat.reply.gemini_fallback',
        useCache: false,
      });
      return aiSuccess({ message: reply }, 'gemini', startedAt);
    } catch (geminiError) {
      logger.error('ai.chat.failed', {
        error: geminiError instanceof Error ? geminiError.message : String(geminiError),
      });
      return createChatFallbackResponse(startedAt);
    }
  }
}

export async function streamChatReply(
  res: Response,
  input: { message?: string; messages?: unknown; mode?: string; language?: string }
): Promise<void> {
  const startedAt = Date.now();
  const messages = buildChatMessages(input);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const writeEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const text = await streamGroqText(
      messages,
      (token) => writeEvent('token', { token }),
      {
        label: 'chat.reply.stream.groq',
        maxTokens: 900,
        timeoutMs: 7000,
      }
    );

    writeEvent('done', aiSuccess({ message: text }, 'groq', startedAt));
  } catch (groqError) {
    logger.warn('ai.chat.stream.groq_failed_using_gemini', {
      error: groqError instanceof Error ? groqError.message : String(groqError),
    });

    try {
      const geminiPrompt = messages.map((message) => `${message.role}: ${message.content}`).join('\n\n');
      const text = await generateGeminiText(geminiPrompt, {
        label: 'chat.reply.stream.gemini_fallback',
        useCache: false,
      });
      writeEvent('token', { token: text });
      writeEvent('done', aiSuccess({ message: text }, 'gemini', startedAt));
    } catch {
      writeEvent('done', createChatFallbackResponse(startedAt));
    }
  } finally {
    res.end();
  }
}
