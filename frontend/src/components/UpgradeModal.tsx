'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { CheckCircle2, X } from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Blurred backdrop layer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal body */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-[#0f172a] border border-blue-500/30 rounded-2xl shadow-[0_0_50px_-12px_rgba(59,130,246,0.5)] overflow-hidden z-10"
        >
          {/* Close button */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-2xl mb-6 shadow-lg shadow-blue-500/20">
              🚀
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
              Upgrade to Continue
            </h2>
            <p className="text-sm text-slate-400 mb-8 leading-relaxed">
              You&apos;ve used all your credits. Upgrade to unlock more interviews and advance your career.
            </p>

            <div className="space-y-4 mb-8 bg-slate-900/50 rounded-xl p-5 border border-slate-800">
              {[
                "Unlimited AI Interviews",
                "Detailed Reports",
                "Priority AI Processing"
              ].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-blue-500" />
                  <span className="text-sm font-medium text-slate-200">{feature}</span>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <button 
                onClick={() => {
                  onClose();
                  router.push('/pricing');
                }}
                className="w-full py-3.5 min-h-[48px] bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-blue-500/25 active:scale-[0.98]"
              >
                Upgrade Now
              </button>
              <button 
                onClick={onClose}
                className="w-full py-3.5 min-h-[48px] bg-transparent border border-slate-700 text-slate-400 font-semibold rounded-xl hover:bg-slate-800 hover:text-white transition-colors"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
