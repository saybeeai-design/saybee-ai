'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Check, ChevronLeft, CreditCard, ShieldCheck, Sparkles } from 'lucide-react';
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

const curatedPlans: PricingPlanView[] = PAYMENT_PLANS.filter((plan) =>
  ['micro1', 'pro', 'premium'].includes(plan.id),
).map((plan) => ({
  ...plan,
  features:
    plan.id === 'micro1'
      ? ['1 AI interview credit', 'Fast mock practice session', 'Quick score summary after completion']
      : plan.id === 'pro'
        ? ['10 AI interview credits', 'Detailed scoring and stronger feedback', 'Best fit for weekly interview prep']
        : ['50 AI interview credits', 'Highest volume for long prep cycles', 'Best price per interview session'],
  buttonText: plan.id === 'pro' ? 'Choose Pro' : plan.id === 'premium' ? 'Go Premium' : 'Start Small',
}));

export default function PremiumPricingWorkspace() {
  const [loading, setLoading] = useState<string | null>(null);
  const { user, updateUser } = useAuthStore();
  const router = useRouter();

  const handleCheckout = async (planId: PricingPlanView['id']) => {
    if (!user) {
      toast.error('Please log in to purchase credits.');
      router.push('/login');
      return;
    }

    setLoading(planId);

    try {
      const { data } = await paymentAPI.createOrder(planId);

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

            toast.success('Payment successful.');
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
    <div className="min-h-screen bg-[#0B0F19] text-white">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#9CA3AF] transition-colors hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to dashboard
          </Link>

          {user && (
            <div className="inline-flex items-center gap-2 rounded-full border border-[#1F2937] bg-[#111827]/80 px-4 py-2 text-sm font-medium text-[#9CA3AF]">
              <CreditCard className="h-4 w-4 text-[#22D3EE]" />
              {user.credits} credits available
            </div>
          )}
        </div>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          className="mx-auto mt-12 max-w-3xl text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-[#1F2937] bg-[#111827]/80 px-4 py-2 text-sm font-medium text-[#9CA3AF]">
            <Sparkles className="h-4 w-4 text-[#22D3EE]" />
            One-time credit packs
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Pricing built for serious interview prep
          </h1>
          <p className="mt-4 text-base leading-8 text-[#9CA3AF]">
            Choose a clean one-time plan, refill your credits instantly after payment verification, and keep
            practicing without a monthly subscription.
          </p>
        </motion.section>

        <div className="mx-auto mt-14 grid max-w-6xl gap-6 lg:grid-cols-3">
          {curatedPlans.map((plan, index) => {
            const isPopular = plan.popular;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: index * 0.06 }}
                whileHover={{ scale: 1.02 }}
                className={`relative rounded-2xl border p-6 shadow-[0_24px_50px_-34px_rgba(0,0,0,0.84)] ${
                  isPopular
                    ? 'border-[#3B82F6]/60 bg-[#111827] lg:scale-[1.02] lg:shadow-[0_28px_64px_-38px_rgba(59,130,246,0.34)]'
                    : 'border-[#1F2937] bg-[#111827]/85'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-[#3B82F6]/50 bg-[#0B0F19] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                    Most Popular
                  </div>
                )}

                <div className="flex items-center justify-between gap-4">
                  <div
                    className={`rounded-xl border p-3 ${
                      isPopular ? 'border-[#3B82F6]/50 bg-[#3B82F6]/10 text-white' : 'border-[#1F2937] bg-[#0B0F19] text-[#9CA3AF]'
                    }`}
                  >
                    <plan.icon className="h-5 w-5" />
                  </div>
                  <span className="rounded-full border border-[#1F2937] bg-[#0B0F19]/80 px-3 py-1 text-xs font-medium text-[#9CA3AF]">
                    {plan.creditsLabel}
                  </span>
                </div>

                <h2 className="mt-6 text-2xl font-semibold text-white">{plan.name}</h2>
                <p className="mt-2 text-sm leading-7 text-[#9CA3AF]">{plan.description}</p>

                <div className="mt-6 flex items-end gap-2">
                  <span className="text-4xl font-semibold tracking-tight text-white">{plan.priceLabel}</span>
                  <span className="pb-1 text-sm text-[#6B7280]">one-time</span>
                </div>

                <ul className="mt-6 space-y-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-[#9CA3AF]">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#22D3EE]" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => void handleCheckout(plan.id)}
                  disabled={loading === plan.id}
                  className={`mt-8 inline-flex h-12 w-full items-center justify-center rounded-xl text-sm font-semibold transition-colors ${
                    isPopular
                      ? 'bg-[#3B82F6] text-white hover:bg-[#2563EB]'
                      : 'border border-[#1F2937] bg-[#0B0F19] text-white hover:border-[#334155]'
                  }`}
                >
                  {loading === plan.id ? 'Processing...' : plan.buttonText}
                </button>
              </motion.div>
            );
          })}
        </div>

        <div className="mx-auto mt-10 grid max-w-4xl gap-3 text-sm text-[#9CA3AF] md:grid-cols-3">
          <div className="rounded-xl border border-[#1F2937] bg-[#111827]/80 px-4 py-3">
            Secure Razorpay checkout for every purchase
          </div>
          <div className="rounded-xl border border-[#1F2937] bg-[#111827]/80 px-4 py-3">
            One-time payment with no recurring subscription
          </div>
          <div className="rounded-xl border border-[#1F2937] bg-[#111827]/80 px-4 py-3">
            Credits update after successful payment verification
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-[#1F2937] bg-[#111827]/80 px-6 py-5 text-sm leading-7 text-[#9CA3AF]">
          <div className="flex items-center gap-2 text-white">
            <ShieldCheck className="h-4 w-4 text-[#22D3EE]" />
            Designed for focused interview repetition
          </div>
          <p className="mt-2">
            Use smaller packs for targeted practice, or move up to Pro when you want enough runway for full
            weekly mock interview cycles and report review.
          </p>
        </div>
      </div>
    </div>
  );
}
