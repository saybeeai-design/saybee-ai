import {
  Flame,
  Rocket,
  ShieldCheck,
  Zap,
  type LucideIcon,
} from 'lucide-react';

export interface PaymentPlan {
  id: 'micro1' | 'micro2' | 'pro' | 'premium';
  name: string;
  amount: number;
  priceLabel: string;
  description: string;
  credits: number;
  creditsLabel: string;
  icon: LucideIcon;
  color: string;
  popular: boolean;
}

const formatPlanPrice = (amount: number): string =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount / 100);

export const PAYMENT_PLANS: PaymentPlan[] = [
  {
    id: 'micro1',
    name: 'Single Kickstart',
    amount: 2900,
    priceLabel: formatPlanPrice(2900),
    description: 'Perfect for a quick mock session.',
    credits: 1,
    creditsLabel: '1 Interview',
    icon: Zap,
    color: 'from-amber-400 to-orange-500',
    popular: false,
  },
  {
    id: 'micro2',
    name: 'Double Prep',
    amount: 4900,
    priceLabel: formatPlanPrice(4900),
    description: 'Double the practice, better results.',
    credits: 2,
    creditsLabel: '2 Interviews',
    icon: Flame,
    color: 'from-orange-500 to-rose-500',
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro Career',
    amount: 14900,
    priceLabel: formatPlanPrice(14900),
    description: 'Most popular for serious candidates.',
    credits: 10,
    creditsLabel: '10 Interviews',
    icon: Rocket,
    color: 'from-blue-500 to-indigo-600',
    popular: true,
  },
  {
    id: 'premium',
    name: 'Premium Mastery',
    amount: 39900,
    priceLabel: formatPlanPrice(39900),
    description: 'Complete interview readiness pack.',
    credits: 50,
    creditsLabel: '50 Interviews',
    icon: ShieldCheck,
    color: 'from-purple-500 to-pink-600',
    popular: false,
  },
];

export const getPaymentPlan = (planId: PaymentPlan['id']): PaymentPlan => {
  const plan = PAYMENT_PLANS.find((item) => item.id === planId);

  if (!plan) {
    throw new Error(`Unknown payment plan: ${planId}`);
  }

  return plan;
};
