'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Check, 
  Zap, 
  Flame, 
  Rocket, 
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { paymentAPI } from '@/lib/api';
import { useAuthStore } from '@/store/globalStore';
import SuccessAnimation from './SuccessAnimation';


interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PLANS = [
  {
    id: 'micro1',
    name: 'Single Kickstart',
    price: '₹29',
    description: 'Perfect for a quick mock session.',
    credits: '1 Interview',
    icon: Zap,
    color: 'from-amber-400 to-orange-500',
    popular: false,
  },
  {
    id: 'micro2',
    name: 'Double Prep',
    price: '₹49',
    description: 'Double the practice, better results.',
    credits: '2 Interviews',
    icon: Flame,
    color: 'from-orange-500 to-rose-500',
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro Career',
    price: '₹149',
    description: 'Most popular for serious candidates.',
    credits: '10 Interviews',
    icon: Rocket,
    color: 'from-blue-500 to-indigo-600',
    popular: true,
  },
  {
    id: 'premium',
    name: 'Premium Mastery',
    price: '₹399',
    description: 'Complete interview readiness pack.',
    credits: '50 Interviews',
    icon: ShieldCheck,
    color: 'from-purple-500 to-pink-600',
    popular: false,
  },
];

export default function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  const { user, updateUser } = useAuthStore();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);


  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async (planId: string) => {
    setLoadingPlan(planId);
    try {
      const res = await loadRazorpay();
      if (!res) {
        alert('Razorpay SDK failed to load. Check your internet connection.');
        setLoadingPlan(null);
        return;
      }

      const { data } = await paymentAPI.createOrder(planId);
      
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_placeholder',
        amount: data.amount,
        currency: data.currency,
        name: 'SayBee AI',
        description: `Upgrade to ${planId.toUpperCase()}`,
        image: '/logo.png',
        order_id: data.orderId,
        handler: async (response: any) => {
          try {
            const verifyRes = await paymentAPI.verify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan: planId,
            });
            
            if (verifyRes.data.user) {
              updateUser(verifyRes.data.user);
              setShowSuccess(true);
            }
          } catch (err) {
            console.error('Verification failed', err);
            alert('Payment verification failed.');
          }
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
        },
        theme: {
          color: '#3b82f6',
        },
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();
    } catch (err) {
      console.error('Order creation failed', err);
      alert('Could not initiate payment.');
    } finally {
      setLoadingPlan(null);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-4xl bg-[#0f172a]/90 border border-slate-700/50 rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Close Button */}
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full bg-slate-800/50 text-slate-400 hover:text-white transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-8 md:p-12">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
                Unlock Your Full Potential
              </h2>
              <p className="text-slate-400 max-w-lg mx-auto">
                Select a plan that fits your career goals. Get detailed feedback 
                and unlimited practice with our advanced AI.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {PLANS.map((plan) => (
                <div 
                  key={plan.id}
                  className={`relative flex flex-col p-6 rounded-2xl border transition-all duration-300 group ${
                    plan.popular 
                      ? 'bg-blue-600/10 border-blue-500/50 ring-1 ring-blue-500/20' 
                      : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 text-[10px] font-bold text-white rounded-full uppercase tracking-wider">
                      Most Popular
                    </div>
                  )}

                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-6 shadow-lg`}>
                    <plan.icon className="w-6 h-6 text-white" />
                  </div>

                  <h3 className="text-lg font-bold text-white mb-1">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-2xl font-bold text-white">{plan.price}</span>
                    <span className="text-xs text-slate-500">/ one-time</span>
                  </div>

                  <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                    {plan.description}
                  </p>

                  <div className="mt-auto space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                      <Check className="w-4 h-4 text-emerald-500" />
                      {plan.credits}
                    </div>
                    
                    <button
                      disabled={loadingPlan !== null}
                      onClick={() => handlePayment(plan.id)}
                      className={`w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
                        plan.popular
                          ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                          : 'bg-slate-800 hover:bg-slate-700 text-white'
                      }`}
                    >
                      {loadingPlan === plan.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Get Credits'
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-center mt-10 text-[10px] text-slate-500 uppercase tracking-widest font-semibold flex items-center justify-center gap-2">
              <ShieldCheck className="w-3	h-3" />
              Secure Payment via Razorpay
            </p>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showSuccess && (
          <SuccessAnimation 
            onComplete={() => {
              setShowSuccess(false);
              onClose();
            }} 
          />
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}
