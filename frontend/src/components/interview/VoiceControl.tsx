"use strict";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff } from "lucide-react";

interface VoiceControlProps {
  isListening: boolean;
  onToggle: () => void;
  audioLevel?: number; // 0 to 1
}

const VoiceControl = ({ isListening, onToggle, audioLevel = 0 }: VoiceControlProps) => {
  return (
    <div className="flex flex-col items-center space-y-6">
      {/* Waveform Visualization */}
      <div className="flex items-center justify-center h-12 space-x-1.5 px-6">
        <AnimatePresence>
          {isListening ? (
            [...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ height: 4 }}
                animate={{ 
                  height: [4, (10 + (i % 6) * 4) * (0.5 + audioLevel), 4] 
                }}
                transition={{
                  duration: 0.4,
                  repeat: Infinity,
                  delay: i * 0.05,
                }}
                className="w-1.5 rounded-full bg-cyan-400/60"
              />
            ))
          ) : (
            <div className="text-gray-500 text-sm font-medium tracking-wide uppercase">
              Microphone Muted
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Mic Button */}
      <button
        onClick={onToggle}
        className={`relative group flex items-center justify-center w-20 h-20 rounded-full transition-all duration-500 ${
          isListening 
            ? "bg-cyan-500 shadow-[0_0_30px_rgba(34,211,238,0.4)]" 
            : "bg-gray-800 hover:bg-gray-700 shadow-xl"
        }`}
      >
        <div className="absolute inset-0 rounded-full bg-white/20 scale-0 group-hover:scale-100 transition-transform duration-300 pointer-events-none" />
        
        {isListening ? (
          <Mic size={32} className="text-white relative z-10" />
        ) : (
          <MicOff size={32} className="text-gray-400 relative z-10" />
        )}

        {/* Outer Ring Animation (Listening State) */}
        {isListening && (
          <motion.div
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="absolute inset-0 rounded-full border-2 border-cyan-400"
          />
        )}
      </button>

      <div className="text-xs text-center">
        <p className={`font-bold transition-colors ${isListening ? "text-cyan-400" : "text-gray-500"}`}>
          {isListening ? "AI is listening..." : "Tap to speak"}
        </p>
      </div>
    </div>
  );
};

export default VoiceControl;
