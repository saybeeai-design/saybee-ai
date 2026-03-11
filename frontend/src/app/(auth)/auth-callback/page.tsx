'use client';
import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/globalStore';
import { userAPI } from '@/lib/api';
import toast from 'react-hot-toast';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuthStore();

  useEffect(() => {
    const token = searchParams.get('token');
    const err = searchParams.get('error');

    if (err) {
      toast.error('Google Authentication Failed');
      router.push('/login');
      return;
    }

    if (token) {
      localStorage.setItem('saybeeai_token', token);
      
      userAPI.getProfile().then((res) => {
         setAuth(token, res.data.user); // wait, response might be nested differently. Let's assume res.data is the user? Wait, let's check userController.ts
         // Looking at userController getProfile, it returns res.status(200).json(user) 
         // So res.data is the user object!
         // Wait, auth endpoint signup/login return { message, token, user }. getProfile returns `{ id, email, ... }`
         // Let's pass res.data because setAuth expects the user object.
         setAuth(token, res.data);
         toast.success('Successfully logged in with Google!');
         router.push('/dashboard');
      }).catch((err) => {
         console.error('Failed to resolve Google user', err);
         toast.error('Failed to complete Google login');
         localStorage.removeItem('saybeeai_token');
         router.push('/login');
      });
    } else {
      router.push('/login');
    }
  }, [searchParams, router, setAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center gradient-bg">
      <div className="glass-card p-10 flex flex-col items-center gap-6 shadow-2xl rounded-2xl w-full max-w-sm text-center">
        <div className="w-10 h-10 rounded-full border-4 border-[#16161e] border-t-[#6c63ff] animate-spin"></div>
        <p className="text-[#8888aa] font-medium text-sm">Completing authentication...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center gradient-bg"><div className="w-10 h-10 rounded-full border-4 border-[#16161e] border-t-[#6c63ff] animate-spin"></div></div>}>
      <AuthCallbackContent />
    </Suspense>
  );
}
