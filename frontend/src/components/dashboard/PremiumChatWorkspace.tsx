'use client';

import { startTransition, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  Mic,
  Plus,
  File,
  Send,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Trash2,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import toast from 'react-hot-toast';
import { VoiceRecorder, transcribeAudio, uploadFile, formatFileSize } from '@/lib/voiceFileUtils';
import api from '@/lib/api';

type RequestState = 'idle' | 'thinking' | 'streaming';
type AIMode = 'general' | 'interview' | 'resume' | 'career';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatSession {
  id: string;
  title: string;
  mode: AIMode;
  createdAt: number;
  messages: Message[];
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

const STORAGE_KEY = 'saybeeai-chat-sessions';

const AI_MODES = {
  general: {
    label: 'General Chat',
    icon: Sparkles,
    description: 'Talk about anything career-related',
    color: 'from-blue-500 to-cyan-500',
  },
  interview: {
    label: 'Interview Coach',
    icon: Mic,
    description: 'Practice interviews & get feedback',
    color: 'from-purple-500 to-pink-500',
  },
  resume: {
    label: 'Resume Review',
    icon: File,
    description: 'Refine your resume content',
    color: 'from-emerald-500 to-teal-500',
  },
  career: {
    label: 'Career Guidance',
    icon: Sparkles,
    description: 'Career planning & strategy',
    color: 'from-amber-500 to-orange-500',
  },
};

const SUGGESTED_PROMPTS: Record<AIMode, string[]> = {
  general: [
    'What are the top 5 skills employers want in 2024?',
    'How do I write a compelling cover letter?',
    'What salary should I negotiate?',
  ],
  interview: [
    'Help me prepare for a software engineer role',
    'What are common behavioral questions?',
    'How should I answer "Tell me about yourself"?',
  ],
  resume: [
    'Review my resume for a senior position',
    'How do I format my achievements?',
    'What should I highlight from my past roles?',
  ],
  career: [
    'How do I transition to product management?',
    'Should I pursue an MBA?',
    'What does a typical career path look like?',
  ],
};

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

function buildPrompt(messages: Message[], mode: AIMode) {
  const modeContext: Record<AIMode, string> = {
    general:
      'You are a professional career advisor. Provide clear, actionable advice for career decisions.',
    interview:
      'You are an expert interview coach. Help users prepare for interviews with tips, feedback, and practice scenarios.',
    resume:
      'You are a professional resume expert. Help users optimize their resume with concrete improvements.',
    career:
      'You are a career strategist. Help users plan their career path with actionable steps.',
  };

  const transcript = messages
    .slice(-12)
    .map((message) => `${message.role === 'user' ? 'User' : 'Assistant'}: ${message.content}`)
    .join('\n\n');

  return [
    'You are SayBee AI, a world-class assistant for career development.',
    modeContext[mode],
    'Respond like a premium conversational AI: clear, practical, thoughtful, and concise.',
    'Use markdown only when it makes the answer easier to scan. Keep responses focused and human-like.',
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

function tokenizeForStreaming(content: string) {
  const tokens = content.match(/\S+\s*|\n+/g);
  return tokens && tokens.length > 0 ? tokens : [content];
}

function getBatchSize(tokenCount: number) {
  if (tokenCount > 180) return 5;
  if (tokenCount > 90) return 4;
  if (tokenCount > 40) return 3;
  return 2;
}

function getStreamDelay(lastToken: string) {
  if (/\n/.test(lastToken)) return 110;
  if (/[.!?]$/.test(lastToken.trim())) return 95;
  if (/[,:;]$/.test(lastToken.trim())) return 70;
  return 38;
}

function MessageBubble({
  copied,
  message,
  onCopy,
}: {
  copied: boolean;
  message: Message;
  onCopy: (message: Message) => void;
}) {
  const isAssistant = message.role === 'assistant';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className={`flex w-full mb-4 ${isAssistant ? 'justify-start' : 'justify-end'}`}
    >
      <div
        className={`group relative ${isAssistant ? 'max-w-[88%]' : 'max-w-[72%]'}`}
      >
        {isAssistant ? (
          <div className="rounded-2xl border border-[#1F2937] bg-[#111827] px-5 py-4 pr-14 text-[15px] leading-7 text-[#E5E7EB] shadow-[0_20px_50px_-36px_rgba(0,0,0,0.82)]">
            <button
              type="button"
              onClick={() => onCopy(message)}
              className="absolute right-3 top-3 rounded-lg border border-[#1F2937] bg-[#0B0F19] p-2 text-[#9CA3AF] opacity-0 transition hover:border-[#374151] hover:text-white focus-visible:opacity-100 group-hover:opacity-100"
              aria-label={copied ? 'Copied' : 'Copy message'}
            >
              {copied ? <Check className="h-4 w-4 text-[#93C5FD]" /> : <Copy className="h-4 w-4" />}
            </button>

            <div className="space-y-3 break-words pr-2">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {message.content}
              </ReactMarkdown>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-4 text-[15px] leading-7 text-white shadow-[0_18px_42px_-30px_rgba(37,99,235,0.65)]">
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
      className="flex justify-start"
    >
      <div className="rounded-2xl border border-[#1F2937] bg-[#111827] px-5 py-4">
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

function EmptyState({
  mode,
  onPromptClick,
}: {
  mode: AIMode;
  onPromptClick: (prompt: string) => void;
}) {
  const ModeIcon = AI_MODES[mode].icon;

  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <div className={`inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${AI_MODES[mode].color} p-3.5 text-white`}>
          <ModeIcon className="h-8 w-8" />
        </div>
      </motion.div>

      <h2 className="text-2xl font-bold text-white mb-2">{AI_MODES[mode].label}</h2>
      <p className="max-w-md text-sm text-[#9CA3AF] mb-8">
        {AI_MODES[mode].description}
      </p>

      <div className="grid gap-2 w-full max-w-sm">
        {SUGGESTED_PROMPTS[mode].map((prompt, idx) => (
          <motion.button
            key={idx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: idx * 0.08 }}
            onClick={() => onPromptClick(prompt)}
            className="group relative text-left rounded-xl border border-[#1F2937] bg-[#111827] p-4 transition hover:border-[#374151] hover:bg-[#1a1f2e]"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="text-sm text-[#E5E7EB] group-hover:text-white transition">
                {prompt}
              </span>
              <ArrowUp className="h-4 w-4 text-[#6B7280] group-hover:text-[#93C5FD] transition mt-0.5 flex-shrink-0" />
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function ModeSelector({
  currentMode,
  onModeChange,
}: {
  currentMode: AIMode;
  onModeChange: (mode: AIMode) => void;
}) {
  const modes: AIMode[] = ['general', 'interview', 'resume', 'career'];

  return (
    <div className="flex items-center gap-2 px-6 py-4 border-b border-[#1F2937] overflow-x-auto">
      {modes.map((mode) => {
        const config = AI_MODES[mode];
        const Icon = config.icon;
        const isActive = mode === currentMode;

        return (
          <button
            key={mode}
            onClick={() => onModeChange(mode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition ${
              isActive
                ? 'bg-[#1F2937] text-white border border-[#374151]'
                : 'text-[#9CA3AF] hover:text-white hover:bg-[#111827]'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="text-sm font-medium">{config.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function RecentChatsSidebar({
  sessions,
  currentSessionId,
  onSelectSession,
  onDeleteSession,
  isOpen,
  onToggle,
}: {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (session: ChatSession) => void;
  onDeleteSession: (sessionId: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <motion.div
        className="fixed left-0 top-0 h-full w-64 bg-[#0a0a0f] border-r border-[#1F2937] flex flex-col z-40 overflow-hidden"
        initial={{ x: isOpen ? 0 : -256 }}
        animate={{ x: isOpen ? 0 : -256 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        {/* Header */}
        <div className="border-b border-[#1F2937] p-4 flex items-center justify-between">
          <h3 className="font-semibold text-white">Recent Chats</h3>
          <button
            onClick={onToggle}
            className="p-1 hover:bg-[#1F2937] rounded-lg transition text-[#6B7280]"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {sessions.length === 0 ? (
            <div className="p-4 text-center text-[#6B7280] text-sm">No recent chats</div>
          ) : (
            <div className="p-3 space-y-2">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => onSelectSession(session)}
                  className={`group relative p-3 rounded-lg cursor-pointer transition ${
                    currentSessionId === session.id
                      ? 'bg-[#1F2937] text-white'
                      : 'text-[#9CA3AF] hover:bg-[#111827]'
                  }`}
                >
                  <div className="flex items-start gap-2 pr-8">
                    <div className="mt-1 flex-shrink-0">
                      <div className="h-2 w-2 rounded-full bg-current"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{session.title}</p>
                      <p className="text-[10px] text-[#6B7280] mt-0.5">
                        {AI_MODES[session.mode].label}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md bg-[#1a1f2e] hover:bg-[#2a2f3e] opacity-0 group-hover:opacity-100 transition text-[#6B7280] hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Toggle Button */}
      {!isOpen && (
        <motion.button
          onClick={onToggle}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="fixed left-4 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-[#111827] hover:bg-[#1F2937] text-[#6B7280] hover:text-white transition z-30 border border-[#1F2937]"
        >
          <ChevronRight className="h-5 w-5" />
        </motion.button>
      )}

      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 bg-black/40 z-30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onToggle}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default function PremiumChatWorkspace() {
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [currentMode, setCurrentMode] = useState<AIMode>('general');
  const [messages, setMessages] = useState<Message[]>([]);
  const [requestState, setRequestState] = useState<RequestState>('idle');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? (JSON.parse(stored) as ChatSession[]) : [];
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }
  });
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const voiceRecorderRef = useRef<VoiceRecorder | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const unmountedRef = useRef(false);
  const shouldStickToBottomRef = useRef(true);

  // Save sessions to storage
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    }
  }, [sessions]);

  useEffect(() => {
    return () => {
      unmountedRef.current = true;
      if (streamTimeoutRef.current) clearTimeout(streamTimeoutRef.current);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const updateScrollState = () => {
    const container = containerRef.current;
    if (!container) return;

    const distanceFromBottom = container.scrollHeight - (container.scrollTop + container.clientHeight);
    const isNearBottom = distanceFromBottom < 140;

    setShowScrollButton(!isNearBottom);
    shouldStickToBottomRef.current = isNearBottom;
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    const container = containerRef.current;
    if (!container) return;

    shouldStickToBottomRef.current = true;
    setShowScrollButton(false);
    container.scrollTo({
      top: container.scrollHeight,
      behavior,
    });
  };

  const handleCopy = async (message: Message) => {
    await navigator.clipboard.writeText(message.content);
    setCopiedMessageId(message.id);

    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = setTimeout(() => {
      setCopiedMessageId(null);
    }, 1800);
  };

  const streamAssistantMessage = async (fullText: string) => {
    const tokens = tokenizeForStreaming(fullText);
    const batchSize = getBatchSize(tokens.length);
    const assistantMessage = createMessage('assistant', tokens.slice(0, batchSize).join(''));

    setRequestState('streaming');
    startTransition(() => {
      setMessages((current) => [...current, assistantMessage]);
    });

    let tokenIndex = batchSize;

    if (tokenIndex >= tokens.length) {
      setRequestState('idle');
      scrollToBottom('auto');
      return;
    }

    await new Promise<void>((resolve) => {
      const pump = () => {
        if (unmountedRef.current) {
          resolve();
          return;
        }

        tokenIndex = Math.min(tokenIndex + batchSize, tokens.length);
        const nextContent = tokens.slice(0, tokenIndex).join('');

        startTransition(() => {
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantMessage.id ? { ...message, content: nextContent } : message
            )
          );
        });

        if (shouldStickToBottomRef.current) {
          scrollToBottom('auto');
        }

        if (tokenIndex >= tokens.length) {
          resolve();
          return;
        }

        streamTimeoutRef.current = setTimeout(
          pump,
          getStreamDelay(tokens[Math.max(tokenIndex - 1, 0)] ?? '')
        );
      };

      streamTimeoutRef.current = setTimeout(pump, 70);
    });

    setRequestState('idle');
  };

  const requestAssistantReply = async (conversation: Message[]) => {
    setRequestState('thinking');

    try {
      const response = await api.post<ChatApiResponse>('/chat', {
        message: buildPrompt(conversation, currentMode),
      });

      const replyText =
        response.data.data?.message?.trim() ??
        response.data.reply?.trim() ??
        response.data.message?.trim() ??
        '';

      if (!replyText) {
        setRequestState('idle');
        toast.error('AI is temporarily unavailable');
        return;
      }

      if (response.data.success === false) {
        toast.error(response.data.error ?? 'AI is temporarily unavailable');
      }

      await streamAssistantMessage(replyText);
    } catch {
      console.error('Chat error');
      setRequestState('idle');
      toast.error('AI is temporarily unavailable');
    }
  };

  const handleSend = async () => {
    const content = input.trim();
    if (!content || requestState !== 'idle') return;

    const newMessage = createMessage('user', content);
    const nextMessages = [...messages, newMessage];

    shouldStickToBottomRef.current = true;
    setInput('');
    setMessages(nextMessages);
    textareaRef.current?.blur();

    // Update or create session
    if (currentSessionId) {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === currentSessionId ? { ...s, messages: nextMessages } : s
        )
      );
    } else {
      const newSession: ChatSession = {
        id: crypto.randomUUID?.() ?? `session-${Date.now()}`,
        title: content.substring(0, 50),
        mode: currentMode,
        createdAt: Date.now(),
        messages: nextMessages,
      };
      setCurrentSessionId(newSession.id);
      setSessions((prev) => [newSession, ...prev]);
    }

    await requestAssistantReply(nextMessages);
  };

  const handleModeChange = (mode: AIMode) => {
    setCurrentMode(mode);
    setMessages([]);
    setCurrentSessionId(null);
  };

  const handlePromptClick = (prompt: string) => {
    setInput(prompt);
    textareaRef.current?.focus();
  };

  const handleSelectSession = (session: ChatSession) => {
    setCurrentSessionId(session.id);
    setMessages(session.messages);
    setCurrentMode(session.mode);
    setSidebarOpen(false);
  };

  const handleDeleteSession = (sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
      setMessages([]);
    }
  };

  const handleNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setInput('');
    textareaRef.current?.focus();
  };

  const busy = requestState !== 'idle';

  // Voice Recording Handlers
  const handleStartVoiceRecord = async () => {
    try {
      voiceRecorderRef.current = new VoiceRecorder();
      await voiceRecorderRef.current.startRecording();
      setIsRecording(true);
      toast.success('Recording started');
    } catch {
      toast.error('Microphone access denied');
    }
  };

  const handleStopVoiceRecord = async () => {
    try {
      if (!voiceRecorderRef.current) return;

      setIsRecording(false);
      const audioBlob = await voiceRecorderRef.current.stopRecording();

      // Transcribe audio
      toast.loading('Transcribing audio...');
      const transcript = await transcribeAudio(audioBlob);
      toast.dismiss();

      if (transcript) {
        setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
        toast.success('Audio transcribed');
      } else {
        toast.error('Could not transcribe audio');
      }
    } catch {
      toast.error('Voice recording failed');
      setIsRecording(false);
    }
  };

  // File Upload Handlers
  const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.currentTarget.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const validTypes = ['application/pdf', 'text/plain', 'application/msword'];

    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a PDF, TXT, or DOC file');
      return;
    }

    try {
      setUploadProgress(0);
      toast.loading('Uploading file...');

      const { fileUrl } = await uploadFile(file, (progress) => {
        setUploadProgress(progress);
      });

      setUploadedFiles((prev) => [...prev, file]);
      toast.dismiss();
      toast.success(`File uploaded: ${file.name}`);

      // Optionally add file reference to message
      setInput(
        (prev) =>
          `${prev}\n[File: ${file.name}](${fileUrl})`
      );
    } catch {
      toast.dismiss();
      toast.error('File upload failed');
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="relative h-screen bg-[#0a0a0f] flex overflow-hidden">
      {/* Sidebar */}
      <RecentChatsSidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main Content */}
      <div className={`flex-1 flex flex-col ${sidebarOpen ? 'ml-64' : ''} transition-all duration-300`}>
        {/* Header with Mode and Controls */}
        <div className="border-b border-[#1F2937] bg-[#0a0a0f]/95 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#1F2937]">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-[#1F2937] rounded-lg transition text-[#6B7280]"
              >
                {sidebarOpen ? (
                  <ChevronLeft className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
              </button>
              <h1 className="text-lg font-semibold text-white">{AI_MODES[currentMode].label}</h1>
            </div>
            <button
              onClick={handleNewChat}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1F2937] hover:bg-[#2a2f3e] text-white transition text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              New Chat
            </button>
          </div>

          {/* Mode Selector */}
          <ModeSelector currentMode={currentMode} onModeChange={handleModeChange} />
        </div>

        {/* Messages Container */}
        <div
          ref={containerRef}
          onScroll={updateScrollState}
          className="flex-1 overflow-y-auto px-6 py-8 scroll-smooth"
        >
          {messages.length === 0 ? (
            <EmptyState mode={currentMode} onPromptClick={handlePromptClick} />
          ) : (
            <div className="max-w-2xl mx-auto space-y-4">
              <AnimatePresence mode="popLayout">
                {messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    copied={copiedMessageId === message.id}
                    message={message}
                    onCopy={handleCopy}
                  />
                ))}
              </AnimatePresence>

              <AnimatePresence>
                {requestState === 'thinking' && <ThinkingIndicator />}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Scroll Button */}
        <AnimatePresence>
          {showScrollButton && (
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.18 }}
              onClick={() => scrollToBottom('smooth')}
              className="absolute bottom-28 right-6 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#1F2937] bg-[#111827] text-[#9CA3AF] shadow-[0_16px_30px_-20px_rgba(0,0,0,0.82)] transition hover:border-[#374151] hover:text-white z-10"
              aria-label="Scroll to latest message"
            >
              <ArrowDown className="h-4 w-4" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Input Bar - Sticky */}
        <div className="sticky bottom-0 border-t border-[#1F2937] bg-[#0a0a0f]/95 px-6 py-4 backdrop-blur-md">
          <div className="max-w-2xl mx-auto">
            {/* Uploaded Files Display */}
            {uploadedFiles.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-3 space-y-2"
              >
                {uploadedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-[#111827] border border-[#1F2937] rounded-lg px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <File className="h-4 w-4 text-[#93C5FD] flex-shrink-0" />
                      <span className="text-xs text-[#E5E7EB] truncate">{file.name}</span>
                      <span className="text-[10px] text-[#6B7280] flex-shrink-0">
                        {formatFileSize(file.size)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveFile(idx)}
                      className="text-[#6B7280] hover:text-red-400 transition"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </motion.div>
            )}

            {/* Input Controls */}
            <div className="flex gap-3 items-end">
              {/* File Upload Button */}
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                accept=".pdf,.txt,.doc,.docx"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-3 rounded-lg bg-[#1F2937] hover:bg-[#2a2f3e] text-[#6B7280] hover:text-white transition flex-shrink-0"
                title="Upload file"
                disabled={busy}
              >
                <File className="h-5 w-5" />
              </button>

              {/* Voice Button */}
              <button
                onClick={isRecording ? handleStopVoiceRecord : handleStartVoiceRecord}
                className={`p-3 rounded-lg transition flex-shrink-0 ${
                  isRecording
                    ? 'bg-red-600/20 text-red-400 border border-red-500/50'
                    : 'bg-[#1F2937] hover:bg-[#2a2f3e] text-[#6B7280] hover:text-white'
                }`}
                title={isRecording ? 'Stop recording' : 'Start recording'}
                disabled={busy}
              >
                <motion.div
                  animate={isRecording ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
                >
                  <Mic className="h-5 w-5" />
                </motion.div>
              </button>

              {/* Input Textarea */}
              <div className="flex-1 rounded-2xl border border-[#1F2937] bg-[#111827] p-3 shadow-[0_22px_50px_-36px_rgba(0,0,0,0.82)]">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Ask anything..."
                  className="w-full bg-transparent text-[15px] leading-7 text-white outline-none placeholder:text-[#6B7280] resize-none max-h-[120px]"
                />
              </div>

              {/* Send Button */}
              <button
                onClick={handleSend}
                disabled={!input.trim() || busy}
                className="p-3 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                aria-label="Send message"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>

            {/* Upload Progress */}
            {uploadProgress > 0 && uploadProgress < 100 && (
              <motion.div
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                className="mt-2 h-1 bg-[#1F2937] rounded-full overflow-hidden"
              >
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-600 to-blue-500"
                  initial={{ width: '0%' }}
                  animate={{ width: `${uploadProgress}%` }}
                />
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
