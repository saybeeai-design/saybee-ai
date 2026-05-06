export interface RazorpayPaymentResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayCheckoutOptions {
  amount: number;
  currency: string;
  orderId: string;
  name: string;
  description: string;
  key?: string | null;
  email?: string;
  contact?: string;
  onSuccess: (response: RazorpayPaymentResponse) => Promise<void>;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
    };
  }
}

let razorpayLoadPromise: Promise<boolean> | null = null;

export function loadRazorpay(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return Promise.resolve(false);
  }

  if (window.Razorpay) {
    return Promise.resolve(true);
  }

  if (razorpayLoadPromise) {
    return razorpayLoadPromise;
  }

  razorpayLoadPromise = new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

  return razorpayLoadPromise;
}

export async function openRazorpayCheckout({
  amount,
  currency,
  orderId,
  name,
  description,
  key: providedKey,
  email,
  contact,
  onSuccess,
}: RazorpayCheckoutOptions): Promise<void> {
  const key =
    providedKey ||
    process.env.NEXT_PUBLIC_RAZORPAY_KEY ||
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
    '';

  if (!key) {
    throw new Error('Missing Razorpay checkout key. Restart the frontend and backend after updating payment env vars.');
  }

  const isLoaded = await loadRazorpay();
  if (!isLoaded || !window.Razorpay) {
    throw new Error('Razorpay SDK failed to load');
  }

  const paymentObject = new window.Razorpay({
    key,
    amount,
    currency,
    name,
    description,
    image: '/logo.png',
    order_id: orderId,
    prefill: {
      email,
      contact,
    },
    theme: {
      color: '#2563eb',
    },
    handler: async (response: RazorpayPaymentResponse) => {
      await onSuccess(response);
    },
  });

  paymentObject.open();
}
