'use client';

import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import toast from 'react-hot-toast';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowUp,
  Check,
  Copy,
  Globe2,
  Loader2,
  MessageSquareText,
  Paperclip,
  RefreshCcw,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { getSafeLanguage, speakText } from '@/lib/tts';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const STORAGE_KEY = 'saybeeai-chat-workspace-v2';
const INDIAN_LANGUAGES = [
  'English',
  'Hindi',
  'Assamese',
  'Bengali',
  'Marathi',
  'Gujarati',
  'Punjabi',
  'Tamil',
  'Telugu',
  'Kannada',
  'Malayalam',
  'Odia',
  'Urdu',
];

const markdownComponents: Components = {
  code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '');

    if (match) {
      return (
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={match[1]}
          PreTag="div"
          className="rounded-2xl text-sm !bg-[#0B0F19]"
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      );
    }

    return (
      <code
        className="rounded-md border border-white/5 bg-[#0B0F19] px-1.5 py-0.5 text-sm text-[#93C5FD]"
        {...props}
      >
        {children}
      </code>
    );
  },
};

function buildPrompt(history: Message[], language: string): string {
  const recentMessages = history.slice(-8);
  const transcript = recentMessages
    .map((message) => `${message.role === 'user' ? 'User' : 'Assistant'}: ${message.content}`)
    .join('\n\n');

  return [
    'You are SayBee AI, a polished interview prep copilot for ambitious job seekers.',
    `Reply exclusively in ${language}.`,
    'Keep answers practical, concise, and confident.',
    'Use markdown only when it improves clarity.',
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

function PromptChip({
  title,
  description,
  icon: Icon,
  onClick,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-[#1F2937] bg-[#111827]/85 p-4 text-left transition-colors hover:border-[#334155] hover:bg-[#111827]"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-lg border border-[#1F2937] bg-[#0B0F19] p-2 text-[#22D3EE]">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-medium text-white">{title}</p>
          <p className="mt-1 text-sm leading-6 text-[#9CA3AF]">{description}</p>
        </div>
      </div>
    </button>
  );
}

function ThinkingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="max-w-[75%]">
        <p className="mb-2 px-1 text-xs font-medium text-[#6B7280]">SayBee AI</p>
        <div className="rounded-2xl rounded-bl-md border border-[#1F2937] bg-[#111827] px-5 py-4">
          <div className="flex items-center gap-2 text-sm text-[#9CA3AF]">
            <Loader2 className="h-4 w-4 animate-spin text-[#22D3EE]" />
            Thinking...
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PremiumChatWorkspace() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [autoVoice, setAutoVoice] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          messages?: Message[];
          selectedLanguage?: string;
          autoVoice?: boolean;
        };

        if (parsed.messages) {
          setMessages(parsed.messages);
        }
        if (parsed.selectedLanguage) {
          setSelectedLanguage(parsed.selectedLanguage);
        }
        if (typeof parsed.autoVoice === 'boolean') {
          setAutoVoice(parsed.autoVoice);
        }
      }
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        messages,
        selectedLanguage,
        autoVoice,
      }),
    );
  }, [autoVoice, hydrated, messages, selectedLanguage]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [loading, messages]);

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 220)}px`;
  };

  const speakReply = (content: string) => {
    setIsSpeaking(true);
    speakText(content, getSafeLanguage(selectedLanguage), () => setIsSpeaking(false));
  };

  const requestAssistantReply = async (conversation: Message[]) => {
    try {
      const response = await axios.post('/api/chat', {
        message: buildPrompt(conversation, selectedLanguage),
      });

      const assistantMessage = createMessage('assistant', response.data.reply);
      setMessages((current) => [...current, assistantMessage]);

      if (autoVoice) {
        speakReply(assistantMessage.content);
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Failed to generate AI response.');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (override?: string) => {
    const content = (override ?? input).trim();
    if (!content || loading) {
      return;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);

    const userMessage = createMessage('user', content);
    const conversation = [...messages, userMessage];

    setMessages(conversation);
    setInput('');
    setLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    await requestAssistantReply(conversation);
  };

  const handleRegenerate = async () => {
    if (loading || messages.length === 0) {
      return;
    }

    const conversation =
      messages[messages.length - 1]?.role === 'assistant' ? messages.slice(0, -1) : messages;

    if (conversation[conversation.length - 1]?.role !== 'user') {
      return;
    }

    setMessages(conversation);
    setLoading(true);
    await requestAssistantReply(conversation);
  };

  const clearChat = () => {
    if (messages.length > 0 && !confirm('Start a fresh chat session?')) {
      return;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    setIsSpeaking(false);
    setMessages([]);
    setInput('');
    sessionStorage.removeItem(STORAGE_KEY);
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

  const handleCopy = async (message: Message) => {
    await navigator.clipboard.writeText(message.content);
    setCopiedMessageId(message.id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const handleUploadDummy = () => {
    toast('File uploads are coming soon.');
  };

  const suggestionPrompts = [
    {
      title: 'Rewrite my self introduction',
      description: 'Turn a rough answer into a cleaner 60 second opener.',
      icon: Sparkles,
    },
    {
      title: 'Ask me frontend interview questions',
      description: 'Simulate a focused technical round with realistic follow-ups.',
      icon: MessageSquareText,
    },
    {
      title: 'Review my salary negotiation plan',
      description: 'Pressure-test the talking points before the final call.',
      icon: Globe2,
    },
    {
      title: 'Turn this project into a STAR answer',
      description: 'Structure one project into a strong behavioral response.',
      icon: ArrowUp,
    },
  ];

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto pb-6 custom-scrollbar">
        {messages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28 }}
            className="mx-auto flex h-full max-w-3xl flex-col items-center justify-center py-12 text-center"
          >
            <div className="rounded-2xl border border-[#1F2937] bg-[#111827] p-4 text-[#22D3EE]">
              <MessageSquareText className="h-8 w-8" />
            </div>
            <h2 className="mt-6 text-3xl font-semibold tracking-tight text-white">
              How can I help with your next interview?
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#9CA3AF]">
              Use the chat like ChatGPT for answer rewrites, mock follow-ups, resume improvements, and
              role-specific coaching without the extra clutter.
            </p>

            <div className="mt-8 grid w-full gap-3 sm:grid-cols-2">
              {suggestionPrompts.map((prompt) => (
                <PromptChip
                  key={prompt.title}
                  title={prompt.title}
                  description={prompt.description}
                  icon={prompt.icon}
                  onClick={() => void handleSend(prompt.title)}
                />
              ))}
            </div>
          </motion.div>
        ) : (
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 py-2">
            <AnimatePresence initial={false}>
              {messages.map((message, index) => {
                const isAssistant = message.role === 'assistant';
                const isLastAssistant = isAssistant && index === messages.length - 1 && !loading;

                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}
                  >
                    <div className={`group max-w-[85%] ${isAssistant ? '' : 'ml-auto'}`}>
                      <p
                        className={`mb-2 px-1 text-xs font-medium ${
                          isAssistant ? 'text-[#6B7280]' : 'text-right text-[#93C5FD]'
                        }`}
                      >
                        {isAssistant ? 'SayBee AI' : 'You'}
                      </p>

                      <div
                        className={`rounded-2xl px-5 py-4 shadow-[0_18px_40px_-30px_rgba(0,0,0,0.78)] ${
                          isAssistant
                            ? 'rounded-bl-md border border-[#1F2937] bg-[#111827]'
                            : 'rounded-br-md bg-[#3B82F6] text-white'
                        }`}
                      >
                        {isAssistant ? (
                          <div className="markdown-body text-sm text-white">
                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap text-sm leading-7 text-white">{message.content}</p>
                        )}
                      </div>

                      {isAssistant && (
                        <div className="mt-3 flex flex-wrap items-center gap-2 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => void handleCopy(message)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-[#1F2937] bg-[#111827] px-3 py-1.5 text-xs font-medium text-[#9CA3AF] transition-colors hover:text-white"
                          >
                            {copiedMessageId === message.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                            {copiedMessageId === message.id ? 'Copied' : 'Copy'}
                          </button>

                          <button
                            type="button"
                            onClick={() => speakReply(message.content)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-[#1F2937] bg-[#111827] px-3 py-1.5 text-xs font-medium text-[#9CA3AF] transition-colors hover:text-white"
                          >
                            <Volume2 className="h-3.5 w-3.5" />
                            Read aloud
                          </button>

                          {isLastAssistant && (
                            <button
                              type="button"
                              onClick={() => void handleRegenerate()}
                              className="inline-flex items-center gap-1.5 rounded-full border border-[#1F2937] bg-[#111827] px-3 py-1.5 text-xs font-medium text-[#9CA3AF] transition-colors hover:text-white"
                            >
                              <RefreshCcw className="h-3.5 w-3.5" />
                              Regenerate
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}

              {loading && <ThinkingIndicator />}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 mt-6 border-t border-[#1F2937]/80 bg-[#0B0F19]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#9CA3AF]">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Globe2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
                <select
                  value={selectedLanguage}
                  onChange={(event) => setSelectedLanguage(event.target.value)}
                  className="h-10 rounded-full border border-[#1F2937] bg-[#111827] pl-9 pr-8 text-sm text-white outline-none transition-colors focus:border-[#3B82F6]"
                >
                  {INDIAN_LANGUAGES.map((language) => (
                    <option key={language} value={language}>
                      {language}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => setAutoVoice((current) => !current)}
                className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors ${
                  autoVoice
                    ? 'border-[#3B82F6] bg-[#3B82F6]/10 text-white'
                    : 'border-[#1F2937] bg-[#111827] text-[#9CA3AF] hover:text-white'
                }`}
              >
                {autoVoice ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                Voice {autoVoice ? 'on' : 'off'}
              </button>

              {isSpeaking && (
                <span className="inline-flex h-10 items-center rounded-full border border-[#1F2937] bg-[#111827] px-4 text-sm font-medium text-[#9CA3AF]">
                  Speaking
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={clearChat}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-[#1F2937] bg-[#111827] px-4 text-sm font-medium text-[#9CA3AF] transition-colors hover:text-white"
            >
              <RefreshCcw className="h-4 w-4" />
              New chat
            </button>
          </div>

          <div className="rounded-[20px] border border-[#1F2937] bg-[#111827] p-3 shadow-[0_18px_40px_-28px_rgba(0,0,0,0.8)]">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Message SayBee AI..."
              className="max-h-[220px] min-h-[88px] w-full resize-none bg-transparent px-2 py-2 text-[15px] leading-7 text-white outline-none placeholder:text-[#6B7280] custom-scrollbar"
            />

            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                <button
                  type="button"
                  onClick={handleUploadDummy}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#1F2937] bg-[#0B0F19] text-[#9CA3AF] transition-colors hover:text-white"
                  title="Upload files"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <span>Shift + Enter for a new line</span>
              </div>

              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={!hydrated || !input.trim() || loading}
                className={`inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors ${
                  input.trim() && !loading
                    ? 'bg-[#3B82F6] text-white hover:bg-[#2563EB]'
                    : 'bg-[#0B0F19] text-[#6B7280]'
                }`}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
                Send
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-[#6B7280]">
            SayBee AI can make mistakes. Verify important interview advice before acting on it.
          </p>
        </div>
      </div>
    </div>
  );
}
