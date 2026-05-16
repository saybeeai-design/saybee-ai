'use client';

import { startTransition, useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, ArrowUp, Check, Copy } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import toast from 'react-hot-toast';
import { streamChatCompletion } from '@/lib/aiStreaming';

type RequestState = 'idle' | 'thinking' | 'streaming';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface MessageLayout {
  height: number;
  message: Message;
  top: number;
}

interface MessageBubbleProps {
  copied: boolean;
  message: Message;
  onCopy: (message: Message) => void;
  onMeasure: (id: string, nextHeight: number) => void;
  top: number;
  useEntryAnimation: boolean;
}

const STORAGE_KEY = 'saybeeai-chat-workspace-v4';
const MESSAGE_GAP = 16;
const OVERSCAN_PX = 560;
const DEFAULT_USER_HEIGHT = 92;
const DEFAULT_ASSISTANT_HEIGHT = 136;

const markdownComponents: Components = {
  p({ children }) {
    return <p className="whitespace-pre-wrap break-words leading-7 text-[#E5E7EB]">{children}</p>;
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
  strong({ children }) {
    return <strong className="font-semibold text-white">{children}</strong>;
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

function MessageBubble({
  copied,
  message,
  onCopy,
  onMeasure,
  top,
  useEntryAnimation,
}: MessageBubbleProps) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const isAssistant = message.role === 'assistant';

  useEffect(() => {
    const node = nodeRef.current;

    if (!node) {
      return;
    }

    const measure = () => {
      onMeasure(message.id, node.getBoundingClientRect().height);
    };

    measure();

    const resizeObserver = new ResizeObserver(() => {
      measure();
    });

    resizeObserver.observe(node);

    return () => {
      resizeObserver.disconnect();
    };
  }, [message.content, message.id, onMeasure]);

  return (
    <motion.div
      layout={!useEntryAnimation}
      initial={useEntryAnimation ? { opacity: 0, y: 12 } : false}
      animate={{ opacity: 1, y: 0 }}
      exit={useEntryAnimation ? { opacity: 0, y: 6 } : undefined}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      style={{ top }}
      className={`absolute left-0 right-0 flex ${isAssistant ? 'justify-start' : 'justify-end'}`}
    >
      <div
        ref={nodeRef}
        className={`group relative w-full ${
          isAssistant ? 'max-w-[88%]' : 'max-w-[72%]'
        }`}
      >
        {isAssistant ? (
          <div className="rounded-2xl border border-[#1F2937] bg-[#111827] px-5 py-4 pr-14 text-[15px] leading-7 text-[#E5E7EB] shadow-[0_20px_50px_-36px_rgba(0,0,0,0.82)]">
            <button
              type="button"
              onClick={() => onCopy(message)}
              className="absolute right-3 top-3 rounded-lg border border-[#1F2937] bg-[#0B0F19] p-2 text-[#9CA3AF] opacity-0 transition hover:border-[#374151] hover:text-white focus-visible:opacity-100 group-hover:opacity-100"
              aria-label={copied ? 'Copied assistant message' : 'Copy assistant message'}
            >
              {copied ? <Check className="h-4 w-4 text-[#93C5FD]" /> : <Copy className="h-4 w-4" />}
            </button>

            <div className="space-y-3 break-words">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {message.content}
              </ReactMarkdown>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-[#2563EB] px-4 py-3 text-[15px] leading-7 text-white shadow-[0_18px_42px_-30px_rgba(37,99,235,0.65)]">
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ThinkingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.2 }}
      className="mt-4 flex justify-start"
    >
      <div className="max-w-[88%] rounded-2xl border border-[#1F2937] bg-[#111827] px-5 py-4">
        <div className="flex items-center gap-3 text-sm text-[#9CA3AF]">
          <span>Thinking</span>
          <span className="flex items-center gap-1">
            {[0, 1, 2].map((index) => (
              <motion.span
                key={index}
                className="h-1.5 w-1.5 rounded-full bg-[#6B7280]"
                animate={{ opacity: [0.3, 1, 0.3], y: [0, -1, 0] }}
                transition={{
                  duration: 1,
                  ease: 'easeInOut',
                  repeat: Number.POSITIVE_INFINITY,
                  delay: index * 0.14,
                }}
              />
            ))}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function RetryState({ onRetry }: { onRetry: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.18 }}
      className="mt-4 flex justify-start"
    >
      <div className="rounded-2xl border border-[#1F2937] bg-[#111827] px-4 py-3">
        <p className="text-sm text-[#9CA3AF]">AI is temporarily unavailable.</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-xl border border-[#1F2937] bg-[#0B0F19] px-4 py-2 text-sm font-medium text-white transition hover:border-[#374151]"
        >
          Retry
        </button>
      </div>
    </motion.div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center px-6 text-center">
      <div className="max-w-md">
        <h2 className="text-lg font-medium text-white">Start a conversation</h2>
        <p className="mt-3 text-sm leading-7 text-[#6B7280]">
          Ask about interviews, resumes, practice answers, or career decisions. SayBee AI will keep
          the conversation focused and useful.
        </p>
      </div>
    </div>
  );
}

function InputShell({
  busy,
  input,
  onChange,
  onKeyDown,
  onSend,
  textareaRef,
}: {
  busy: boolean;
  input: string;
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  return (
    <div className="sticky bottom-0 border-t border-[#1F2937] bg-[#0B0F19]/95 px-4 py-4 backdrop-blur-sm sm:px-6">
      <div className="rounded-[22px] border border-[#1F2937] bg-[#111827] p-3 shadow-[0_22px_50px_-36px_rgba(0,0,0,0.82)]">
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder="Ask anything..."
          className="min-h-[72px] max-h-[180px] w-full resize-none bg-transparent px-2 py-2 text-[15px] leading-7 text-white outline-none placeholder:text-[#6B7280]"
        />

        <div className="mt-3 flex items-center justify-end">
          <button
            type="button"
            onClick={onSend}
            disabled={!input.trim() || busy}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#3B82F6] text-white transition hover:bg-[#2563EB] disabled:cursor-not-allowed disabled:bg-[#1F2937] disabled:text-[#6B7280]"
            aria-label="Send message"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ChatWorkspace() {
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [requestState, setRequestState] = useState<RequestState>('idle');
  const [retryConversation, setRetryConversation] = useState<Message[] | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [storedReady, setStoredReady] = useState(false);
  const [virtualVersion, setVirtualVersion] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageHeightsRef = useRef<Map<string, number>>(new Map());
  const messagesRef = useRef<Message[]>([]);
  const shouldStickToBottomRef = useRef(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const unmountedRef = useRef(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);

      if (stored) {
        const parsed = JSON.parse(stored) as { messages?: Message[] };

        if (parsed.messages) {
          setMessages(parsed.messages);
          messagesRef.current = parsed.messages;
        }
      }
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
    } finally {
      setStoredReady(true);
    }
  }, []);

  useEffect(() => {
    if (!storedReady) {
      return;
    }

    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        messages,
      })
    );
  }, [messages, storedReady]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    return () => {
      unmountedRef.current = true;

      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const layouts: MessageLayout[] = [];
  let totalHeight = 0;

  for (const message of messages) {
    const measuredHeight =
      messageHeightsRef.current.get(message.id) ??
      (message.role === 'assistant' ? DEFAULT_ASSISTANT_HEIGHT : DEFAULT_USER_HEIGHT);

    layouts.push({
      message,
      top: totalHeight,
      height: measuredHeight,
    });

    totalHeight += measuredHeight + MESSAGE_GAP;
  }

  if (totalHeight > 0) {
    totalHeight -= MESSAGE_GAP;
  }

  const shouldVirtualize = messages.length > 80;
  const visibleLayouts = shouldVirtualize
    ? layouts.filter((layout) => {
        const itemBottom = layout.top + layout.height;
        return (
          itemBottom >= scrollTop - OVERSCAN_PX &&
          layout.top <= scrollTop + viewportHeight + OVERSCAN_PX
        );
      })
    : layouts;

  const busy = requestState !== 'idle';

  const updateScrollState = () => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const nextScrollTop = container.scrollTop;
    const nextViewportHeight = container.clientHeight;
    const distanceFromBottom = container.scrollHeight - (container.scrollTop + container.clientHeight);
    const isNearBottom = distanceFromBottom < 140;

    setScrollTop(nextScrollTop);
    setViewportHeight(nextViewportHeight);
    setShowScrollButton(!isNearBottom);
    shouldStickToBottomRef.current = isNearBottom;
  };

  const scrollToBottom = (behavior: ScrollBehavior) => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    shouldStickToBottomRef.current = true;
    setShowScrollButton(false);
    container.scrollTo({
      top: container.scrollHeight,
      behavior,
    });
  };

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    updateScrollState();

    const frame = requestAnimationFrame(() => {
      if (shouldStickToBottomRef.current) {
        scrollToBottom(requestState === 'streaming' ? 'auto' : 'smooth');
      } else {
        updateScrollState();
      }
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [messages, requestState, virtualVersion]);

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
  };

  const handleMeasure = (id: string, nextHeight: number) => {
    const roundedHeight = Math.ceil(nextHeight);
    const currentHeight = messageHeightsRef.current.get(id);

    if (currentHeight && Math.abs(currentHeight - roundedHeight) < 2) {
      return;
    }

    messageHeightsRef.current.set(id, roundedHeight);
    setVirtualVersion((current) => current + 1);
  };

  const handleCopy = async (message: Message) => {
    await navigator.clipboard.writeText(message.content);
    setCopiedMessageId(message.id);

    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
    }

    copyTimeoutRef.current = setTimeout(() => {
      setCopiedMessageId(null);
    }, 1800);
  };

  const requestAssistantReply = async (conversation: Message[]) => {
    setRequestState('thinking');

    try {
      const assistantMessage = createMessage('assistant', '');
      setRequestState('streaming');
      startTransition(() => {
        setMessages((current) => {
          const nextMessages = [...current, assistantMessage];
          messagesRef.current = nextMessages;
          return nextMessages;
        });
      });

      let streamedText = '';
      await streamChatCompletion(
        {
          messages: conversation.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          mode: 'general',
        },
        (token) => {
          streamedText += token;
          startTransition(() => {
            setMessages((current) => {
              const nextMessages = current.map((message) =>
                message.id === assistantMessage.id ? { ...message, content: streamedText } : message
              );
              messagesRef.current = nextMessages;
              return nextMessages;
            });
          });

          if (shouldStickToBottomRef.current) {
            scrollToBottom('auto');
          }
        }
      );

      if (!streamedText.trim()) {
        setMessages((current) => current.filter((message) => message.id !== assistantMessage.id));
        setRetryConversation(conversation);
        toast.error('The AI service is temporarily unavailable.');
      } else {
        setRetryConversation(null);
      }

      setRequestState('idle');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The AI service is temporarily unavailable.';
      console.error('Chat error:', error);
      setRetryConversation(conversation);
      setRequestState('idle');
      toast.error(message);
    }
  };

  const handleSend = async () => {
    const content = input.trim();

    if (!content || busy) {
      return;
    }

    const nextConversation = [...messagesRef.current, createMessage('user', content)];

    shouldStickToBottomRef.current = true;
    setInput('');
    setRetryConversation(null);
    messagesRef.current = nextConversation;
    setMessages(nextConversation);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    await requestAssistantReply(nextConversation);
  };

  const handleRetry = async () => {
    if (!retryConversation || busy) {
      return;
    }

    shouldStickToBottomRef.current = true;
    await requestAssistantReply(retryConversation);
  };

  const handleInputChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
    adjustTextareaHeight();
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const renderMessageCanvas = (): ReactNode => {
    if (messages.length === 0) {
      return <EmptyState />;
    }

    return (
      <div className="relative" style={{ height: totalHeight || 1 }}>
        <AnimatePresence initial={false}>
          {visibleLayouts.map((layout) => (
            <MessageBubble
              key={layout.message.id}
              copied={copiedMessageId === layout.message.id}
              message={layout.message}
              onCopy={handleCopy}
              onMeasure={handleMeasure}
              top={layout.top}
              useEntryAnimation={!shouldVirtualize}
            />
          ))}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="mx-auto w-full max-w-[768px] py-4 sm:py-6">
      <section className="relative flex h-[calc(100vh-11rem)] min-h-[640px] flex-col overflow-hidden rounded-[28px] border border-[#1F2937] bg-[#0B0F19]">
        <header className="border-b border-[#1F2937] px-4 py-4 sm:px-6">
          <h2 className="text-sm font-semibold tracking-[0.02em] text-white">SayBee AI Assistant</h2>
          <p className="mt-1 text-sm text-[#6B7280]">
            Clear, professional support for interviews, resumes, and career decisions.
          </p>
        </header>

        <div
          ref={containerRef}
          onScroll={updateScrollState}
          className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth sm:px-6"
        >
          {renderMessageCanvas()}

          <AnimatePresence>{requestState === 'thinking' ? <ThinkingIndicator /> : null}</AnimatePresence>
          <AnimatePresence>
            {retryConversation && requestState === 'idle' ? (
              <RetryState onRetry={() => void handleRetry()} />
            ) : null}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {showScrollButton ? (
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.18 }}
              onClick={() => scrollToBottom('smooth')}
              className="absolute bottom-28 right-6 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#1F2937] bg-[#111827] text-[#9CA3AF] shadow-[0_16px_30px_-20px_rgba(0,0,0,0.82)] transition hover:border-[#374151] hover:text-white"
              aria-label="Scroll to latest message"
            >
              <ArrowDown className="h-4 w-4" />
            </motion.button>
          ) : null}
        </AnimatePresence>

        <InputShell
          busy={busy || !storedReady}
          input={input}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onSend={() => void handleSend()}
          textareaRef={textareaRef}
        />
      </section>
    </div>
  );
}
