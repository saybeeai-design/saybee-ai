'use client';

import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatApiResponse {
  success?: boolean;
  data?: {
    message?: string;
  };
  error?: string;
  message?: string;
  reply?: string;
}

const markdownComponents: Components = {
  p({ children }) {
    return <p className="whitespace-pre-wrap leading-7 text-[#E5E7EB]">{children}</p>;
  },
  ul({ children }) {
    return <ul className="list-disc space-y-2 pl-5 text-[#E5E7EB]">{children}</ul>;
  },
  ol({ children }) {
    return <ol className="list-decimal space-y-2 pl-5 text-[#E5E7EB]">{children}</ol>;
  },
  li({ children }) {
    return <li>{children}</li>;
  },
  a({ children, href }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="text-[#93C5FD] underline underline-offset-2"
      >
        {children}
      </a>
    );
  },
  pre({ children }) {
    return (
      <pre className="overflow-x-auto rounded-xl border border-[#1F2937] bg-[#0B0F19] p-4 text-sm text-[#E5E7EB]">
        {children}
      </pre>
    );
  },
  code({ className, children, ...props }) {
    if (className) {
      return (
        <code className="text-sm text-[#E5E7EB]" {...props}>
          {children}
        </code>
      );
    }

    return (
      <code className="rounded-md bg-[#0B0F19] px-1.5 py-0.5 text-sm text-[#93C5FD]" {...props}>
        {children}
      </code>
    );
  },
};

function buildPrompt(messages: Message[]) {
  const transcript = messages
    .slice(-10)
    .map((message) => `${message.role === 'user' ? 'User' : 'Assistant'}: ${message.content}`)
    .join('\n\n');

  return [
    'You are SayBee AI, a concise and professional assistant for interview prep, resumes, and career questions.',
    'Keep every answer clear, practical, and direct.',
    'Use markdown only when it improves readability.',
    'Conversation:',
    transcript,
    'Assistant:',
  ].join('\n\n');
}

function createMessage(role: Message['role'], content: string): Message {
  return {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    content,
  };
}

export default function ChatWorkspace() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [retryConversation, setRetryConversation] = useState<Message[] | null>(null);
  const messagesRef = useRef<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    const container = scrollRef.current;

    if (!container) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });

    return () => cancelAnimationFrame(frame);
  }, [loading, messages]);

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
  };

  const requestAssistantReply = async (conversation: Message[]) => {
    try {
      const response = await axios.post<ChatApiResponse>('/api/chat', {
        message: buildPrompt(conversation),
      });

      const replyText =
        response.data.data?.message?.trim() ??
        response.data.reply?.trim() ??
        response.data.message?.trim() ??
        '';

      if (replyText) {
        setMessages((current) => {
          const nextMessages = [...current, createMessage('assistant', replyText)];
          messagesRef.current = nextMessages;
          return nextMessages;
        });
      }

      if (response.data.success === false && !replyText) {
        setRetryConversation(conversation);
        toast.error('Something went wrong');
        return;
      }

      setRetryConversation(null);
    } catch (error) {
      console.error('Chat error:', error);
      setRetryConversation(conversation);
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    const content = input.trim();

    if (!content || loading) {
      return;
    }

    const nextConversation = [...messagesRef.current, createMessage('user', content)];
    messagesRef.current = nextConversation;
    setMessages(nextConversation);
    setInput('');
    setRetryConversation(null);
    setLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    await requestAssistantReply(nextConversation);
  };

  const handleRetry = async () => {
    if (!retryConversation || loading) {
      return;
    }

    setLoading(true);
    await requestAssistantReply(retryConversation);
  };

  const handleInputChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
    adjustTextareaHeight();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  return (
    <section className="mx-auto flex h-[calc(100vh-12rem)] w-full max-w-[700px] flex-col rounded-xl border border-[#1F2937] bg-[#0B0F19]">
      <header className="border-b border-[#1F2937] px-4 py-4 sm:px-6">
        <h2 className="text-base font-semibold text-white">AI Assistant</h2>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center">
            <p className="max-w-sm text-sm leading-7 text-[#6B7280]">
              Ask interview, resume, or career questions to start the conversation.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-7 ${
                    message.role === 'user'
                      ? 'bg-[#2563EB] text-white'
                      : 'border border-[#1F2937] bg-[#111827] text-[#E5E7EB]'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <div className="space-y-3">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {loading && (
          <div className="mt-4 flex justify-start">
            <div className="rounded-xl border border-[#1F2937] bg-[#111827] px-4 py-3 text-sm text-[#9CA3AF]">
              Thinking...
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-[#1F2937] px-4 py-4 sm:px-6">
        {retryConversation && !loading && (
          <div className="mb-3 flex justify-start">
            <button
              type="button"
              onClick={() => void handleRetry()}
              className="rounded-xl border border-[#1F2937] bg-[#111827] px-4 py-2 text-sm font-medium text-white transition-colors hover:border-[#374151]"
            >
              Retry
            </button>
          </div>
        )}

        <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-3">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            className="min-h-[56px] w-full resize-none bg-transparent px-1 py-1 text-sm leading-7 text-white outline-none placeholder:text-[#6B7280]"
          />

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={!input.trim() || loading}
              className="rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:bg-[#1F2937] disabled:text-[#6B7280]"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
