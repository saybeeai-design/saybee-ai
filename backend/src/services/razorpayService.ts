import Razorpay from 'razorpay';

let client: Razorpay | null = null;

export const getRazorpayClient = (): Razorpay => {
  if (client) return client;

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be configured');
  }

  client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  return client;
};

export const razorpayWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

export const PLANS: Record<string, { amount: number; currency: string; credits: number; subscriptionType: string; description: string }> = {
  pro: {
    amount: 14900,
    currency: 'INR',
    credits: 10,
    subscriptionType: 'PRO',
    description: 'SayBee AI Pro - 10 Interview Credits',
  },
  premium: {
    amount: 39900,
    currency: 'INR',
    credits: 50,
    subscriptionType: 'PREMIUM',
    description: 'SayBee AI Premium - 50 Interview Credits',
  },
  micro1: {
    amount: 2900,
    currency: 'INR',
    credits: 1,
    subscriptionType: 'MICRO',
    description: 'SayBee AI - 1 Interview Credit',
  },
  micro2: {
    amount: 4900,
    currency: 'INR',
    credits: 2,
    subscriptionType: 'MICRO',
    description: 'SayBee AI - 2 Interview Credits',
  },
};
