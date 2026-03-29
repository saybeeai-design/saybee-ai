'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface SuccessAnimationProps {
  onComplete?: () => void;
}

export default function SuccessAnimation({ onComplete }: SuccessAnimationProps) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none"
    >
      <div className="relative">
        {/* Particle circles */}
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ 
              scale: [0, 1.5, 2],
              opacity: [1, 1, 0],
              x: Math.cos((i * 30) * Math.PI / 180) * 150,
              y: Math.sin((i * 30) * Math.PI / 180) * 150,
            }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute top-1/2 left-1/2 w-3 h-3 rounded-full bg-blue-500"
            style={{ margin: '-6px 0 0 -6px' }}
          />
        ))}

        {/* Central Success Icon */}
        <motion.div
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ 
            type: "spring",
            stiffness: 260,
            damping: 20,
            delay: 0.1
          }}
          onAnimationComplete={() => {
            setTimeout(() => onComplete?.(), 2000);
          }}
          className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-2xl shadow-blue-500/50 relative z-10"
        >
          <Check className="w-12 h-12 text-white stroke-[3px]" />
        </motion.div>

        {/* Text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="absolute -bottom-16 left-1/2 -translate-x-1/2 whitespace-nowrap text-2xl font-bold text-white tracking-tight"
        >
          Payment Successful!
        </motion.div>
      </div>
    </motion.div>
  );
}
