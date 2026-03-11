'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/globalStore';
import { Brain, LayoutDashboard, FileText, History, BarChart3, Settings, LogOut, ChevronRight } from 'lucide-react';

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/resume', label: 'Resumes', icon: FileText },
  { href: '/dashboard/history', label: 'History', icon: History },
  { href: '/dashboard/reports', label: 'Reports', icon: BarChart3 },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 flex flex-col border-r" style={{ background: '#12121a', borderColor: 'rgba(255,255,255,0.06)' }}>
        {/* Logo */}
        <div className="flex items-center gap-3 p-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="w-9 h-9 flex items-center justify-center">
            <Image src="/logo.png" alt="SayBee AI Logo" width={36} height={36} className="object-contain drop-shadow-[0_0_10px_rgba(108,99,255,0.3)]" />
          </div>
          <span className="font-bold text-white text-lg">SayBee AI</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150 group"
                style={{
                  background: active ? 'rgba(108,99,255,0.15)' : 'transparent',
                  color: active ? '#6c63ff' : '#8888aa',
                  borderLeft: active ? '2px solid #6c63ff' : '2px solid transparent',
                }}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium text-sm">{label}</span>
                {active && <ChevronRight className="w-4 h-4 ml-auto" />}
              </Link>
            );
          })}

          {user?.role === 'ADMIN' && (
            <>
              <div className="my-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }} />
              <Link
                href="/admin"
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:bg-white/5 group"
                style={{ color: '#8888aa', borderLeft: '2px solid transparent' }}
              >
                <Brain className="w-5 h-5 flex-shrink-0 group-hover:text-rose-400 transition-colors" />
                <span className="font-medium text-sm group-hover:text-rose-400 transition-colors">Admin Portal</span>
              </Link>
            </>
          )}
        </nav>

        {/* Start Interview CTA */}
        <div className="p-4">
          <Link href="/interview/setup" className="btn-primary w-full text-sm justify-center">
            Start Interview
          </Link>
        </div>

        {/* User */}
        <div className="p-4 border-t flex items-center gap-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #6c63ff, #4ecdc4)' }}>
            {user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name ?? 'User'}</p>
            <p className="text-xs truncate" style={{ color: '#8888aa' }}>{user?.email}</p>
          </div>
          <button onClick={logout} className="p-2 rounded-lg transition-colors hover:bg-red-500/10" title="Logout">
            <LogOut className="w-4 h-4" style={{ color: '#ff4d6d' }} />
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-8">
        {children}
      </main>
    </div>
  );
}
