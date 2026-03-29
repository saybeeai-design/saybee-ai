'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/globalStore';
import { userAPI } from '@/lib/api';
import toast from 'react-hot-toast';

export default function AuthCallbackContent({ token, error }: { token?: string | null; error?: string | null }) {
  const router = useRouter();
  const { setAuth } = useAuthStore();

  useEffect(() => {
    if (error) {
      toast.error('Google Authentication Failed');
      router.push('/login');
      return;
    }

    if (token) {
      localStorage.setItem('token', token);

      userAPI.getProfile().then((res) => {
        setAuth(token, res.data.user);
        toast.success('Successfully logged in with Google!');
        router.push('/dashboard');
      }).catch((err) => {
        console.error('Failed to resolve Google user', err);
        toast.error('Failed to complete Google login');
        localStorage.removeItem('token');
        router.push('/login');
      });
    } else {
      router.push('/login');
    }
  }, [token, error, router, setAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center gradient-bg">
      <div className="glass-card p-10 flex flex-col items-center gap-6 shadow-2xl rounded-2xl w-full max-w-sm text-center">
        <div className="w-10 h-10 rounded-full border-4 border-[#16161e] border-t-[#6c63ff] animate-spin"></div>
        <p className="text-[#8888aa] font-medium text-sm">Completing authentication...</p>
      </div>
    </div>
  );
}
