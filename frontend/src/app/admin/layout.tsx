'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/globalStore';
import { LayoutDashboard, Users, Tag, BarChart3, LogOut, ChevronRight, DollarSign } from 'lucide-react';
import Image from 'next/image';

const nav = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users Management', icon: Users },
  { href: '/admin/analytics', label: 'Interviews Analytics', icon: BarChart3 },
  { href: '/admin/revenue', label: 'Revenue & Subscriptions', icon: DollarSign },
  { href: '/admin/coupons', label: 'Coupons Management', icon: Tag },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const router = useRouter();
  // Basic client-side protection (real protection is in the API)
  useEffect(() => {
    if (!user || user.role !== 'ADMIN') {
      router.replace('/dashboard');
    }
  }, [user, router]);

  if (!user || user.role !== 'ADMIN') return null;

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="flex min-h-screen text-gray-300" style={{ background: '#0a0a0f' }}>
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 flex flex-col border-r" style={{ background: '#12121a', borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3 p-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="w-9 h-9 flex items-center justify-center">
            <Image src="/logo.png" alt="SayBee AI Logo" width={36} height={36} className="object-contain drop-shadow-[0_0_10px_rgba(255,77,109,0.3)]" />
          </div>
          <span className="font-bold text-white text-lg">Admin / SayBee</span>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {nav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-white/10 text-white font-medium' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                <item.icon className={`w-5 h-5 ${isActive ? 'text-rose-400' : 'text-gray-500'}`} />
                {item.label}
                {isActive && <ChevronRight className="w-4 h-4 ml-auto text-rose-400" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-all text-left">
            <LogOut className="w-5 h-5 text-gray-500" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center justify-between px-8 border-b" style={{ borderColor: 'rgba(255,255,255,0.04)', background: 'rgba(10,10,15,0.8)' }}>
          <h2 className="text-sm font-medium text-gray-400">Administration Portal</h2>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-sm">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <span className="text-sm font-medium text-white">{user?.name}</span>
          </div>
        </header>

        <div className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
