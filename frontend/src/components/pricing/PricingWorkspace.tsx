'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Check, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { paymentAPI } from '@/lib/api';
import { getPaymentErrorMessage } from '@/lib/paymentErrors';
import { PAYMENT_PLANS } from '@/lib/paymentPlans';
import { openRazorpayCheckout } from '@/lib/razorpay';
import { useAuthStore } from '@/store/globalStore';

type PricingPlanView = (typeof PAYMENT_PLANS)[number] & {
  features: string[];
  buttonText: string;
};

const pricingPlans: PricingPlanView[] = PAYMENT_PLANS.map((plan) => ({
  ...plan,
  features:
    plan.id === 'micro1'
      ? ['1 AI interview credit', 'Fast mock practice', 'Instant feedback summary']
      : plan.id === 'micro2'
        ? ['2 AI interview credits', 'Better value for repeat practice', 'Detailed response review']
        : plan.id === 'pro'
          ? ['10 AI interview credits', 'Most balanced prep pack', 'Detailed scoring and stronger feedback']
          : ['50 AI interview credits', 'High-volume prep for serious applicants', 'Best price per interview'],
  buttonText:
    plan.id === 'pro'
      ? 'Choose Pro'
      : plan.id === 'premium'
        ? 'Choose Premium'
        : 'Buy Credits',
}));

export default function PricingWorkspace() {
  const [loading, setLoading] = useState<string | null>(null);
  const { user, updateUser } = useAuthStore();
  const router = useRouter();

  const handleCheckout = async (planId: PricingPlanView['id']) => {
    if (!user) {
      toast.error('Please log in to purchase credits');
      router.push('/login');
      return;
    }

    setLoading(planId);

    try {
      const { data } = await paymentAPI.createOrder(planId);

      if (data.stub) {
        throw new Error('Payments are still in stub mode on the server. Restart the backend after updating Razorpay credentials.');
      }

      await openRazorpayCheckout({
        amount: data.amount,
        currency: data.currency,
        orderId: data.orderId,
        name: 'SayBee AI',
        description: `Upgrade to ${planId.toUpperCase()}`,
        key: data.keyId,
        email: user.email,
        onSuccess: async (response) => {
          try {
            const verifyRes = await paymentAPI.verify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan: planId,
            });

            if (verifyRes.data.user) {
              updateUser(verifyRes.data.user);
            }

            toast.success('Payment Successful \u{1F389}');
            router.push('/dashboard');
            router.refresh();
          } catch {
            toast.error('Payment verification failed. Please contact support if credits were not added.');
          }
        },
      });
    } catch (error) {
      console.error('Checkout initialization failed', error);
      toast.error(getPaymentErrorMessage(error));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-200 overflow-hidden relative selection:bg-blue-500/30">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.05] pointer-events-none" />
      <div className="absolute top-20 left-10 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors mb-12"
        >
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
            Razorpay-powered one-time credit packs for faster practice, stronger feedback, and more interview reps.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4 max-w-6xl mx-auto">
          {pricingPlans.map((plan, idx) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 + 0.2 }}
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
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    plan.popular ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  <plan.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">{plan.name}</h3>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-extrabold text-white">{plan.priceLabel}</span>
                <span className="text-slate-500 font-medium ml-1">/ one-time</span>
              </div>

              <p className="text-sm text-slate-400 mb-8 min-h-[40px] leading-relaxed">{plan.description}</p>

              <div className="space-y-4 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-3">
                    <Check
                      className={`w-5 h-5 shrink-0 ${plan.popular ? 'text-blue-400' : 'text-slate-500'}`}
                    />
                    <span className="text-sm font-medium text-slate-300">{feature}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => void handleCheckout(plan.id)}
                disabled={loading === plan.id}
                className={`w-full py-4 min-h-[48px] rounded-xl font-bold transition-all ${
                  plan.popular
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
