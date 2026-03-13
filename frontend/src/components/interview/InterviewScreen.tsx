"use client";
import { useState } from "react";
import AIOrb from "./AIOrb";
import UserCamera from "./UserCamera";
import VoiceControl from "./VoiceControl";
import { motion } from "framer-motion";

const InterviewScreen = () => {
  const [aiState, setAiState] = useState<"idle" | "speaking" | "thinking">("idle");
  const [isListening, setIsListening] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(
    "Welcome! I am your AI interviewer. To get started, could you please introduce yourself and tell me about your background?"
  );

  const toggleMic = () => {
    setIsListening(!isListening);
    // Simulation: If starting to listen, change AI to idle. If stopping, change to thinking.
    if (!isListening) {
      setAiState("idle");
    } else {
      setAiState("thinking");
      // Simulate AI thinking then speaking
      setTimeout(() => {
        setAiState("speaking");
        setCurrentQuestion("That's interesting! How do you handle challenging situations in a team environment?");
        setTimeout(() => setAiState("idle"), 5000);
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-between p-6 md:p-12 overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-900/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-900/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="w-full max-w-5xl flex justify-between items-center z-10">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400/80">Interview Session Live</span>
        </div>
        <button className="text-xs font-medium text-gray-500 hover:text-white transition-colors uppercase tracking-widest border border-gray-800 px-4 py-2 rounded-full">
          Exit Interview
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-4xl flex flex-col items-center justify-center space-y-12 z-10">
        
        {/* AI Section */}
        <div className="flex flex-col items-center space-y-8 w-full">
          <AIOrb state={aiState} />
          
          <motion.div 
            key={currentQuestion}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-2xl text-center"
          >
            <h2 className="text-xl md:text-2xl font-medium leading-relaxed text-blue-50/90 tracking-tight">
              {currentQuestion}
            </h2>
          </motion.div>
        </div>

        {/* User Section (Camera + Controls) */}
        <div className="w-full flex flex-col items-center space-y-10">
          <UserCamera />
          <VoiceControl isListening={isListening} onToggle={toggleMic} />
        </div>

      </main>

      {/* Footer Info */}
      <footer className="w-full max-w-5xl flex justify-center z-10">
        <p className="text-[10px] text-gray-600 uppercase tracking-widest font-medium">
          Powered by SayBee AI • Advanced Interview Engine
        </p>
      </footer>
    </div>
  );
};

export default InterviewScreen;
