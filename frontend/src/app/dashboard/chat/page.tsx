'use client';
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import PremiumChatWorkspace from '@/components/dashboard/PremiumChatWorkspace';
import { useState, useRef, useEffect, KeyboardEvent, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, User, Loader2, MessageSquare, Trash2, Paperclip, Sparkles, Copy, Check, ArrowUp, Volume2, VolumeX, RefreshCcw } from 'lucide-react';
import axios from 'axios';
import { speakText, getSafeLanguage } from '@/lib/tts';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import toast from 'react-hot-toast';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatPage() {
  return <PremiumChatWorkspace />;
}

function LegacyChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const INDIAN_LANGUAGES = [
    "English", "Hindi", "Assamese", "Bengali", "Marathi", "Gujarati", 
    "Punjabi", "Tamil", "Telugu", "Kannada", "Malayalam", "Odia", "Urdu"
  ];

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    adjustTextareaHeight();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'; // Reset height
    }
    
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await axios.post('/api/chat', { 
        message: `[Please reply exclusively in ${selectedLanguage}].\n\n${userMessage}` 
      });
      const replyText = response.data.reply;
      
      setMessages(prev => [...prev, { role: 'assistant', content: replyText }]);

      if (isVoiceEnabled) {
        setIsSpeaking(true);
        speakText(replyText, getSafeLanguage(selectedLanguage), () => setIsSpeaking(false));
      }
    } catch (err) {
      console.error("Chat error:", err);
      toast.error("Failed to generate AI response.");
      // We don't push error messages to the standard chat stream to keep it clean.
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    if (confirm("Clear all messages? Start a new session?")) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setMessages([]);
    }
  };

  const toggleVoice = () => {
    if (isVoiceEnabled) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    setIsVoiceEnabled(!isVoiceEnabled);
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleUploadDummy = () => {
    toast('File uploads coming soon!', { icon: '📎' });
  };

  const sendQuickPrompt = (prompt: string) => {
    setInput(prompt);
    setTimeout(() => {
      if (textareaRef.current) {
         textareaRef.current.focus();
         adjustTextareaHeight();
      }
    }, 50);
  };

  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-120px)] max-w-4xl mx-auto -m-4 md:-m-6 lg:-m-10 relative bg-slate-50 dark:bg-[#0f172a] transition-colors duration-300">
      
      {/* Top Header Controls */}
      <div className="flex items-center justify-between px-4 py-3 sm:px-6 w-full sticky top-0 z-20 bg-slate-50/90 dark:bg-[#0f172a]/90 backdrop-blur-md border-b border-transparent shadow-sm">
        <div className="relative group">
          <select 
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="appearance-none bg-transparent hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium text-sm rounded-xl px-4 py-2 pr-8 cursor-pointer focus:outline-none transition-colors"
          >
            {INDIAN_LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>{lang} Language</option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-500 dark:text-slate-400">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
          </div>
        </div>

        <button 
          onClick={clearChat}
          className="flex items-center gap-2 p-2 px-3 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-800"
          title="New Chat"
        >
          <RefreshCcw className="w-4 h-4" /> <span className="hidden sm:inline">New Chat</span>
        </button>
      </div>

      {/* Main Chat Thread Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 custom-scrollbar pb-48" ref={scrollRef}>
        
        {messages.length === 0 ? (
          // Empty State (Zero State)
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto mt-10 lg:mt-20 text-center"
          >
            <div className="w-16 h-16 rounded-3xl bg-blue-100 dark:bg-slate-800 flex items-center justify-center shadow-inner mb-6 ring-4 ring-white dark:ring-[#0f172a]">
              <Sparkles className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-3xl font-semibold text-slate-800 dark:text-white tracking-tight mb-3">How can I help you today?</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-10 max-w-md">Ask questions about interview strategies, resume structure, or practice coding problems.</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl text-left">
              {[
                { title: "Review my resume", desc: "Check for ATS structure" },
                { title: "Mock interview setup", desc: "For a Frontend Developer role" },
                { title: "Tell me about STAR", desc: "Behavioral interview technique" },
                { title: "Salary negotiation", desc: "Tips for a senior engineering role" },
              ].map((item, i) => (
                <button 
                  key={i} 
                  onClick={() => sendQuickPrompt(item.title)}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="font-medium text-slate-800 dark:text-slate-200 text-sm mb-1">{item.title}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-500">{item.desc}</div>
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <div className="space-y-8 max-w-3xl mx-auto pb-[100px]">
            <AnimatePresence>
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-4 sm:gap-6 group"
                >
                  {/* Avatar */}
                  <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${
                    msg.role === 'user' 
                      ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300' 
                      : 'bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-sm'
                  }`}>
                    {msg.role === 'user' ? <User className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                  </div>

                  {/* Content Body */}
                  <div className="flex-1 min-w-0 pt-1 relative">
                    <div className="font-semibold text-sm mb-1 text-slate-800 dark:text-slate-200">
                      {msg.role === 'user' ? 'You' : 'SayBee AI'}
                    </div>

                    {msg.role === 'user' ? (
                      <div className="px-4 py-3 sm:px-5 sm:py-3.5 bg-slate-200/50 dark:bg-slate-800/60 rounded-2xl rounded-tl-xl text-slate-800 dark:text-slate-200 whitespace-pre-wrap text-[15px] leading-relaxed inline-block max-w-full">
                        {msg.content}
                      </div>
                    ) : (
                      <div className="prose prose-slate dark:prose-invert prose-sm sm:prose-base max-w-none text-slate-800 dark:text-slate-200 leading-relaxed marker:text-slate-400">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code({node, inline, className, children, ...props}: any) {
                              const match = /language-(\w+)/.exec(className || '');
                              return !inline && match ? (
                                <SyntaxHighlighter
                                  style={vscDarkPlus as any}
                                  language={match[1]}
                                  PreTag="div"
                                  className="rounded-xl my-4 text-sm !bg-[#1e293b]"
                                  {...props}
                                >
                                  {String(children).replace(/\n$/, '')}
                                </SyntaxHighlighter>
                              ) : (
                                <code className="bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded-md text-sm font-mono text-pink-600 dark:text-pink-400" {...props}>
                                  {children}
                                </code>
                              )
                            }
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>

                        {/* AI Message Actions */}
                        <div className="mt-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleCopy(msg.content, idx)} 
                            className="p-1.5 text-slate-400 hover:text-slate-800 dark:text-slate-500 dark:hover:text-slate-300 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium"
                            title="Copy response"
                          >
                            {copiedIndex === idx ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              
              {/* Loading Indicator */}
              {loading && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-4 sm:gap-6"
                >
                  <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-sm">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="flex-1 pt-2">
                     <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Sleek Input Dock - Sticky Bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-4 sm:pb-8 bg-gradient-to-t from-slate-50 via-slate-50 dark:from-[#0f172a] dark:via-[#0f172a] to-transparent pointer-events-none z-30">
        <div className="max-w-3xl mx-auto pointer-events-auto">
          <div className="relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-[0_0_40px_rgba(0,0,0,0.05)] dark:shadow-[0_0_40px_rgba(0,0,0,0.3)] rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/50 transition-shadow">
            
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Message SayBee AI..."
              className="w-full bg-transparent resize-none outline-none py-4 px-4 pb-14 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 custom-scrollbar text-[15px] sm:text-base leading-relaxed"
              style={{ minHeight: '56px', maxHeight: '200px' }}
            />

            {/* Input Action Row */}
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button 
                  onClick={handleUploadDummy} 
                  className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  title="Upload files"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <button 
                  onClick={toggleVoice} 
                  className={`p-2 rounded-xl transition-colors ${isVoiceEnabled ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                  title={isVoiceEnabled ? "Voice On - Click to mute" : "Voice Off - Click to enable TTS"}
                >
                  {isVoiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  {isSpeaking && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>}
                </button>
              </div>

              <button 
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${
                  input.trim() && !loading
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md active:scale-95' 
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                }`}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowUp className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <div className="text-center mt-3 text-[11px] sm:text-xs text-slate-500 dark:text-slate-500 bg-transparent">
            SayBee AI can make mistakes. Consider verifying important information.
          </div>
        </div>
      </div>

    </div>
  );
}
