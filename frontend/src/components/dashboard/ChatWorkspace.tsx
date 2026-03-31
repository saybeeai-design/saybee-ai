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

const STORAGE_KEY = 'saybeeai-chat-workspace-v1';
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
          className="rounded-2xl text-sm !bg-[#111827]"
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      );
    }

    return (
      <code
        className="rounded-md bg-slate-200 px-1.5 py-0.5 text-sm text-pink-600 dark:bg-slate-800 dark:text-pink-400"
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
  onClick,
  icon: Icon,
}: {
  title: string;
  description: string;
  onClick: () => void;
  icon: LucideIcon;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 text-left transition-colors hover:border-blue-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/70 dark:hover:border-slate-700 dark:hover:bg-slate-900/80"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-950 dark:text-white">{title}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
    </button>
  );
}

export default function ChatWorkspace() {
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
      })
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

  const speakReply = (text: string) => {
    setIsSpeaking(true);
    speakText(text, getSafeLanguage(selectedLanguage), () => setIsSpeaking(false));
  };

  const requestAssistantReply = async (conversation: Message[]) => {
    try {
      const response = await axios.post('/api/chat', {
        message: buildPrompt(conversation, selectedLanguage),
      });

      const replyText = response.data.reply;
      const assistantMessage = createMessage('assistant', replyText);

      setMessages((current) => [...current, assistantMessage]);

      if (autoVoice) {
        speakReply(replyText);
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

    window.speechSynthesis.cancel();
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

    window.speechSynthesis.cancel();
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
      description: 'Turn a rough intro into a stronger 60 second answer.',
      icon: Sparkles,
    },
    {
      title: 'Ask me backend interview questions',
      description: 'Simulate a focused technical round with follow-ups.',
      icon: MessageSquareText,
    },
    {
      title: 'Review my salary negotiation plan',
      description: 'Pressure-test my talking points before the final call.',
      icon: Globe2,
    },
    {
      title: 'Create a STAR answer from this project',
      description: 'Help me structure one project into a clean behavioral answer.',
      icon: ArrowUp,
    },
  ];

  return (
    <div className="mx-auto flex min-h-[calc(100vh-10rem)] w-full max-w-6xl flex-col gap-6">
      <section className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-6 shadow-[0_32px_80px_-50px_rgba(15,23,42,0.45)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/75">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/15 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-300">
              <Sparkles className="h-3.5 w-3.5" />
              AI career copilot
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white md:text-4xl">
              A cleaner, faster chat space for interview prep
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-400 md:text-base">
              Use SayBee AI like a real copilot. Draft answers, rehearse tough follow-ups, and refine your stories in a conversation flow that feels focused instead of cluttered.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              <Globe2 className="h-4 w-4 text-blue-500" />
              {selectedLanguage}
            </div>
            <button
              onClick={() => setAutoVoice((current) => !current)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                autoVoice
                  ? 'border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-300'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {autoVoice ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              Voice {autoVoice ? 'on' : 'off'}
            </button>
            <button
              onClick={clearChat}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <RefreshCcw className="h-4 w-4" />
              New chat
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.8fr]">
        <div className="space-y-6">
          <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-5 shadow-[0_30px_70px_-50px_rgba(15,23,42,0.4)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/75">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Workspace controls
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-950 dark:text-white">
                  Response language
                </label>
                <select
                  value={selectedLanguage}
                  onChange={(event) => setSelectedLanguage(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-blue-500"
                >
                  {INDIAN_LANGUAGES.map((language) => (
                    <option key={language} value={language}>
                      {language}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950 dark:text-white">Auto voice playback</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      Read assistant answers aloud after each response.
                    </p>
                  </div>
                  <button
                    onClick={() => setAutoVoice((current) => !current)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                      autoVoice
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-300'
                        : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {autoVoice ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
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
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-5 shadow-[0_30px_70px_-50px_rgba(15,23,42,0.4)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/75">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Session pulse
            </p>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                <p className="text-xs text-slate-500 dark:text-slate-400">Messages</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{messages.length}</p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                <p className="text-xs text-slate-500 dark:text-slate-400">Voice</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
                  {isSpeaking ? 'Live' : autoVoice ? 'Armed' : 'Off'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200/80 bg-white/90 shadow-[0_32px_80px_-50px_rgba(15,23,42,0.45)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/75">
          <div className="border-b border-slate-200/80 px-5 py-4 dark:border-slate-800">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-950 dark:text-white">Conversation</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Interview strategy, answer polishing, and role-specific prep.
                </p>
              </div>
              {loading ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-300">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Thinking
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Ready
                </span>
              )}
            </div>
          </div>

          <div className="flex min-h-[46rem] flex-col">
            <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto px-5 py-6 custom-scrollbar">
              {messages.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mx-auto flex h-full max-w-3xl flex-col items-center justify-center text-center"
                >
                  <div className="rounded-[1.75rem] border border-blue-500/15 bg-blue-500/10 p-4 text-blue-600 dark:text-blue-300">
                    <Sparkles className="h-8 w-8" />
                  </div>
                  <h2 className="mt-6 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
                    What should we work on next?
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-slate-500 dark:text-slate-400">
                    Ask for answer critiques, hiring manager follow-ups, behavioral stories, or technical explanations. This chat keeps the tone focused and practical, like a real prep copilot.
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
                <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
                  <AnimatePresence initial={false}>
                    {messages.map((message, index) => {
                      const isLastAssistant =
                        message.role === 'assistant' &&
                        index === messages.length - 1 &&
                        !loading;

                      return (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={message.role === 'user' ? 'flex justify-end' : 'group'}
                        >
                          {message.role === 'user' ? (
                            <div className="max-w-[85%] rounded-[1.5rem] rounded-br-md border border-blue-500/20 bg-blue-600 px-5 py-4 text-sm leading-7 text-white shadow-[0_24px_50px_-35px_rgba(37,99,235,0.7)]">
                              {message.content}
                            </div>
                          ) : (
                            <div className="w-full rounded-[1.75rem] border border-slate-200/80 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-900/70">
                              <div className="flex items-center gap-3">
                                <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-2 text-blue-600 dark:text-blue-300">
                                  <Sparkles className="h-4 w-4" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-slate-950 dark:text-white">SayBee AI</p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Structured guidance for interview prep
                                  </p>
                                </div>
                              </div>

                              <div className="prose prose-slate mt-4 max-w-none text-sm leading-7 dark:prose-invert sm:text-[15px]">
                                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                                  {message.content}
                                </ReactMarkdown>
                              </div>

                              <div className="mt-4 flex flex-wrap items-center gap-2">
                                <button
                                  onClick={() => void handleCopy(message)}
                                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
                                >
                                  {copiedMessageId === message.id ? (
                                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                  {copiedMessageId === message.id ? 'Copied' : 'Copy'}
                                </button>
                                <button
                                  onClick={() => speakReply(message.content)}
                                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
                                >
                                  <Volume2 className="h-3.5 w-3.5" />
                                  Read aloud
                                </button>
                                {isLastAssistant && (
                                  <button
                                    onClick={() => void handleRegenerate()}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
                                  >
                                    <RefreshCcw className="h-3.5 w-3.5" />
                                    Regenerate
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}

                    {loading && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mx-auto w-full max-w-4xl rounded-[1.75rem] border border-slate-200/80 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-900/70"
                      >
                        <div className="flex items-center gap-3">
                          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-2 text-blue-600 dark:text-blue-300">
                            <Sparkles className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-950 dark:text-white">SayBee AI</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Drafting your response
                            </p>
                          </div>
                        </div>
                        <div className="mt-5 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                          Thinking through the best answer...
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            <div className="border-t border-slate-200/80 bg-white/80 px-5 pb-5 pt-4 dark:border-slate-800 dark:bg-slate-950/75">
              <div className="mx-auto max-w-4xl">
                <div className="rounded-[1.75rem] border border-slate-200 bg-white p-3 shadow-[0_20px_50px_-40px_rgba(15,23,42,0.5)] transition focus-within:border-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:focus-within:border-blue-500">
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Message SayBee AI..."
                    className="max-h-[220px] min-h-[68px] w-full resize-none bg-transparent px-2 py-2 text-[15px] leading-7 text-slate-950 outline-none placeholder:text-slate-400 custom-scrollbar dark:text-slate-100 dark:placeholder:text-slate-500"
                  />

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleUploadDummy}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                        title="Upload files"
                      >
                        <Paperclip className="h-5 w-5" />
                      </button>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Shift + Enter for a new line
                      </div>
                    </div>

                    <button
                      onClick={() => void handleSend()}
                      disabled={!hydrated || !input.trim() || loading}
                      className={`inline-flex h-11 items-center gap-2 rounded-2xl px-4 text-sm font-semibold transition-all ${
                        input.trim() && !loading
                          ? 'bg-blue-600 text-white shadow-[0_18px_40px_-24px_rgba(37,99,235,0.85)] hover:bg-blue-500'
                          : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                      }`}
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
                      Send
                    </button>
                  </div>
                </div>
                <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
                  SayBee AI can make mistakes. Double-check important interview or career advice.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
