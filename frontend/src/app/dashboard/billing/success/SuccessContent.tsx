'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { userAPI } from '@/lib/api';
import { useAuthStore } from '@/store/globalStore';
import { CheckCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

export default function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const { updateUser } = useAuthStore();
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      router.push('/dashboard');
      return;
    }

    const verifyAndRedirect = async () => {
      try {
        // Because webhook updates credits asynchronously on the backend,
        // give it a tiny delay to ensure webhook completes before pulling fresh profile.
        await new Promise(r => setTimeout(r, 1500));

        const res = await userAPI.getProfile();
        updateUser(res.data.user);

        toast.success('Payment successful! Credits added.', { duration: 4000 });

        // Bounce user to dashboard
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      } catch (err) {
        console.error('Verification failed:', err);
        router.push('/dashboard');
      } finally {
        setVerifying(false);
      }
    };

    verifyAndRedirect();
  }, [sessionId, router, updateUser]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card p-10 flex flex-col items-center text-center max-w-sm w-full"
      >
        {verifying ? (
          <>
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
            <h1 className="text-xl font-bold text-white mb-2">Verifying Payment</h1>
            <p className="text-sm text-slate-400">Please don&apos;t close this window...</p>
          </>
        ) : (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring' }}
            >
              <CheckCircle className="w-16 h-16 text-emerald-500 mb-4 mx-auto" />
            </motion.div>
            <h1 className="text-xl font-bold text-white mb-2">Upgrade Complete!</h1>
            <p className="text-sm text-slate-400">Taking you back to your dashboard...</p>
          </>
        )}
      </motion.div>
    </div>
  );
}
