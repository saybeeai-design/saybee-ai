'use client';
import { useState } from 'react';
import { paymentAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Check, Star, Zap, Building2, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/store/globalStore';
import { useRouter } from 'next/navigation';

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const { user } = useAuthStore();
  const router = useRouter();

  const handleCheckout = async (planId: string) => {
    if (!user) {
      toast.error('Please log in to purchase credits');
      router.push('/login');
      return;
    }

    setLoading(planId);
    try {
      const res = await paymentAPI.createSession(planId);
      if (res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (err: any) {
      toast.error('Failed to initiate checkout. Please try again.');
      setLoading(null);
    }
  };

  const plans = [
    {
      id: 'FREE',
      name: 'Free Tier',
      icon: Star,
      price: '$0',
      description: 'Perfect for trying out the AI interview engine.',
      features: ['2 AI Interviews', 'Basic feedback', 'Standard response time'],
      buttonText: 'Current Plan',
      buttonDisabled: true,
      popular: false,
    },
    {
      id: 'PRO',
      name: 'Pro',
      icon: Zap,
      price: '$19',
      unit: '/month',
      description: 'Advance your career with comprehensive AI coaching.',
      features: ['10 AI Interviews', 'Detailed scoring & feedback', 'Priority processing', 'Save transcripts'],
      buttonText: 'Upgrade to Pro',
      buttonDisabled: false,
      popular: true,
    },
    {
      id: 'ENTERPRISE',
      name: 'Premium',
      icon: Building2,
      price: '$49',
      unit: '/month',
      description: 'Unlimited access for intensive interview preparation.',
      features: ['50 AI Interviews', 'Full suite & analytics', 'Lightning fast processing', 'SLA Support'],
      buttonText: 'Get Premium',
      buttonDisabled: false,
      popular: false,
    }
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-200 overflow-hidden relative selection:bg-blue-500/30">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.05] pointer-events-none" />
      <div className="absolute top-20 left-10 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors mb-12">
          <ChevronLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <div className="text-center mb-16">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight"
          >
            Simple, Transparent Pricing
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-slate-400 max-w-2xl mx-auto"
          >
            Unlock the full potential of SayBee AI. Practice more, land your dream job faster.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, idx) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 + 0.2 }}
              className={`relative rounded-3xl p-8 backdrop-blur-xl border ${
                plan.popular 
                  ? 'bg-blue-900/10 border-blue-500/50 shadow-[0_0_40px_-15px_rgba(59,130,246,0.3)]' 
                  : 'bg-slate-900/50 border-slate-800'
              } flex flex-col`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full text-xs font-bold text-white shadow-lg tracking-wider">
                  MOST POPULAR
                </div>
              )}

              <div className="flex items-center gap-4 mb-6">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  plan.popular ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'
                }`}>
                  <plan.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">{plan.name}</h3>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                {plan.unit && <span className="text-slate-500 font-medium ml-1">{plan.unit}</span>}
              </div>

              <p className="text-sm text-slate-400 mb-8 min-h-[40px] leading-relaxed">
                {plan.description}
              </p>

              <div className="space-y-4 mb-8 flex-1">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Check className={`w-5 h-5 shrink-0 ${plan.popular ? 'text-blue-400' : 'text-slate-500'}`} />
                    <span className="text-sm font-medium text-slate-300">{feature}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleCheckout(plan.id)}
                disabled={plan.buttonDisabled || loading === plan.id}
                className={`w-full py-4 min-h-[48px] rounded-xl font-bold transition-all ${
                  plan.buttonDisabled
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : plan.popular
                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25 active:scale-[0.98]'
                      : 'bg-white hover:bg-slate-200 text-slate-900 active:scale-[0.98]'
                }`}
              >
                {loading === plan.id ? 'Processing...' : plan.buttonText}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
