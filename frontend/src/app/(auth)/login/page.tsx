'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/store/globalStore';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.error('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const res = await authAPI.login(form);
      setAuth(res.data.token, res.data.user);
      toast.success('Welcome back!');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
    window.location.href = `${backendUrl}/api/auth/google`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-bg relative overflow-hidden">
      {/* Background soft glow elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#6c63ff]/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#4ecdc4]/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-[420px] relative z-10">
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="flex items-center gap-3 justify-center mb-2 group">
            <div className="w-12 h-12 flex items-center justify-center relative">
              <div className="absolute inset-0 bg-[#6c63ff] blur-md opacity-40 group-hover:opacity-60 transition-opacity rounded-full" />
              <Image src="/logo.png" alt="SayBee AI Logo" width={48} height={48} className="object-contain relative z-10" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">SayBee AI</span>
          </Link>
          <h1 className="text-3xl font-extrabold text-white mt-4">Welcome back</h1>
          <p className="text-[#8888aa] mt-2">Sign in to your account to continue</p>
        </div>

        <div className="glass-card p-8 shadow-2xl rounded-2xl border border-white/10 backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2 text-[#8888aa]">Email address</label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-3.5 w-[18px] h-[18px] text-[#8888aa] group-focus-within:text-[#6c63ff] transition-colors" />
                <input
                  type="email"
                  placeholder="name@company.com"
                  className="input-field pl-11 py-3 text-sm rounded-xl focus:ring-2 focus:ring-[#6c63ff]/50 transition-all bg-[#12121a]/50"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-[#8888aa]">Password</label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-3.5 w-[18px] h-[18px] text-[#8888aa] group-focus-within:text-[#6c63ff] transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="input-field pl-11 pr-11 py-3 text-sm rounded-xl focus:ring-2 focus:ring-[#6c63ff]/50 transition-all bg-[#12121a]/50"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
                <button 
                  type="button" 
                  className="absolute right-3.5 top-3.5 text-[#8888aa] hover:text-white transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              className="btn-primary w-full py-3 rounded-xl text-[15px] font-semibold flex justify-center items-center gap-2 mt-2" 
              disabled={loading}
            >
              {loading && <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {loading ? 'Signing in...' : 'Login'}
            </button>
          </form>

          <div className="mt-8 relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative bg-[#16161e] px-4 text-xs font-medium text-[#8888aa] uppercase tracking-wider">
              OR
            </div>
          </div>

          <button 
            type="button" 
            onClick={handleGoogleLogin}
            className="w-full mt-8 flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-200 text-white font-medium text-[15px] group"
          >
            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          <p className="mt-8 text-center text-sm text-[#8888aa]">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-semibold text-[#6c63ff] hover:text-[#8179ff] transition-colors">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
