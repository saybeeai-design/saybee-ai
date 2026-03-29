import Razorpay from 'razorpay';

const keyId = process.env.RAZORPAY_KEY_ID || '';
const keySecret = process.env.RAZORPAY_KEY_SECRET || '';

export const isRazorpayStub =
  !keyId || keyId.includes('placeholder') || !keySecret || keySecret.includes('placeholder');

export const razorpay = isRazorpayStub
  ? null
  : new Razorpay({ key_id: keyId, key_secret: keySecret });

// Plan configuration — amounts in paise (₹1 = 100 paise)
export const PLANS: Record<string, { amount: number; currency: string; credits: number; subscriptionType: string; description: string }> = {
  pro: {
    amount: 14900,       // ₹149
    currency: 'INR',
    credits: 10,
    subscriptionType: 'PRO',
    description: 'SayBee AI Pro – 10 Interview Credits',
  },
  premium: {
    amount: 39900,       // ₹399
    currency: 'INR',
    credits: 50,
    subscriptionType: 'PREMIUM',
    description: 'SayBee AI Premium – 50 Interview Credits',
  },
  micro1: {
    amount: 2900,        // ₹29
    currency: 'INR',
    credits: 1,
    subscriptionType: 'MICRO',
    description: 'SayBee AI – 1 Interview Credit',
  },
  micro2: {
    amount: 4900,        // ₹49
    currency: 'INR',
    credits: 2,
    subscriptionType: 'MICRO',
    description: 'SayBee AI – 2 Interview Credits',
  },
};
