'use client';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Loader2, MessageSquare, Trash2 } from 'lucide-react';
import axios from 'axios';
import { speakText, getSafeLanguage } from '@/lib/tts';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hello! I'm your SayBee AI Assistant. How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
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
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error. Please try again later." }]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    if (confirm("Clear all messages?")) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setMessages([{ role: 'assistant', content: "Hello! I'm your SayBee AI Assistant. How can I help you today?" }]);
    }
  };

  const toggleVoice = () => {
    if (isVoiceEnabled) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    setIsVoiceEnabled(!isVoiceEnabled);
  };

  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-120px)] max-w-5xl mx-auto -m-4 md:-m-6 lg:-m-10 p-4 md:p-6 lg:p-10 relative">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-blue-500" />
            AI Assistant
          </h1>
          <p className="text-sm text-slate-400 mt-1">Chat with our AI to get help with your interviews and resumes.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Language Selector */}
          <div className="relative">
            <select 
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="appearance-none bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {INDIAN_LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-400">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
            </div>
          </div>

          {/* Voice Toggle */}
          <button 
             onClick={toggleVoice}
             className={`flex flex-1 sm:flex-none items-center justify-center gap-2 px-3 py-2 min-h-[48px] rounded-lg text-sm font-medium transition-colors ${
               isVoiceEnabled ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
             }`}
             title={isVoiceEnabled ? "Mute Voice Output" : "Enable Voice Output"}
          >
             <Bot className={`w-4 h-4 ${isVoiceEnabled && isSpeaking ? 'animate-pulse text-blue-400' : ''}`} />
             {isVoiceEnabled ? (isSpeaking ? `Speaking ${selectedLanguage}...` : "Voice On") : "Voice Off"}
          </button>

          <button 
            onClick={clearChat}
            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 border border-transparent rounded-lg transition-all min-h-[48px] min-w-[48px] flex items-center justify-center"
            title="Clear Chat"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-1 py-4 custom-scrollbar mb-20" ref={scrollRef}>
        <div className="space-y-6">
          <AnimatePresence>
            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                tabIndex={0}
                className={`flex gap-3 lg:gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-xl flex items-center justify-center flex-shrink-0 border-2 ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 border-blue-400 text-white' 
                    : 'bg-slate-800 border-slate-700 text-blue-400'
                }`}>
                  {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                </div>

                {/* Bubble */}
                <div className={`max-w-[95%] sm:max-w-[85%] lg:max-w-[75%] p-4 rounded-2xl text-sm lg:text-base leading-relaxed break-words ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-slate-800/80 border border-slate-700 text-slate-200 rounded-tl-none shadow-lg'
                }`}>
                  {msg.content}
                </div>
              </motion.div>
            ))}
            
            {loading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-4"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-800 border-2 border-slate-700 text-blue-400">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="bg-slate-800/80 border border-slate-700 text-slate-400 p-4 rounded-2xl rounded-tl-none flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  <span>Thinking...</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 lg:p-10 bg-[#0f172a] sm:bg-transparent sm:bg-gradient-to-t from-[#0f172a] via-[#0f172a] to-transparent z-10 border-t sm:border-none border-slate-800">
        <form 
          onSubmit={handleSend}
          className="relative group max-w-4xl mx-auto"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl blur opacity-25 group-focus-within:opacity-50 transition duration-1000"></div>
          <div className="relative flex items-center gap-2 bg-[#1e293b] border border-slate-700 rounded-2xl p-2 pl-4 shadow-2xl overflow-hidden">
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything..."
              className="flex-1 bg-transparent py-2 text-white placeholder-slate-500 focus:outline-none text-sm lg:text-base"
            />
            <button 
              type="submit"
              disabled={!input.trim() || loading}
              className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg active:scale-95"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
