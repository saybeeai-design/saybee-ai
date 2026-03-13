"use strict";
import { motion } from "framer-motion";

interface AIOrbProps {
  state: "idle" | "speaking" | "thinking";
}

const AIOrb = ({ state }: AIOrbProps) => {
  const variants = {
    idle: {
      scale: [1, 1.05, 1],
      opacity: [0.6, 0.8, 0.6],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut" as const,
      },
    },
    speaking: {
      scale: [1, 1.2, 1, 1.15, 1],
      opacity: [0.8, 1, 0.8],
      transition: {
        duration: 0.8,
        repeat: Infinity,
        ease: "easeInOut" as const,
      },
    },
    thinking: {
      rotate: [0, 360],
      scale: [1, 1.1, 1],
      transition: {
        rotate: {
          duration: 2,
          repeat: Infinity,
          ease: "linear" as const,
        },
        scale: {
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut" as const,
        },
      },
    },
  };

  return (
    <div className="relative flex items-center justify-center w-48 h-48 md:w-64 md:h-64">
      {/* Outer Glow */}
      <motion.div
        animate={state}
        variants={variants}
        className="absolute inset-0 rounded-full bg-cyan-500/20 blur-3xl"
      />
      
      {/* Middle Glow */}
      <motion.div
        animate={state}
        variants={variants}
        className="absolute inset-4 rounded-full bg-blue-600/30 blur-2xl"
      />

      {/* Core Orb */}
      <motion.div
        animate={state}
        variants={variants}
        className="relative w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 shadow-[0_0_50px_rgba(34,211,238,0.5)] border border-cyan-300/30 flex items-center justify-center overflow-hidden"
      >
        {/* Inner Shine/Detail */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.4),transparent)]" />
        
        {/* Pulsing Core */}
        <motion.div
          animate={{
            scale: state === "speaking" ? [1, 0.9, 1.1, 1] : 1,
          }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="w-12 h-12 rounded-full bg-white/10 blur-md"
        />
      </motion.div>

      {/* Thinking State Rings */}
      {state === "thinking" && (
        <>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 border-2 border-dashed border-cyan-400/30 rounded-full"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
            className="absolute inset-8 border border-blue-400/20 rounded-full"
          />
        </>
      )}
    </div>
  );
};

export default AIOrb;
