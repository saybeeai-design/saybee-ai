'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/globalStore';
import { 
  LayoutDashboard, 
  FileText, 
  Video, 
  BarChart3, 
  MessageSquare, 
  Settings, 
  LogOut, 
  X,
  ChevronRight,
  Brain,
  Star
} from 'lucide-react';
import { motion } from 'framer-motion';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/resume', label: 'Resumes', icon: FileText },
  { href: '/dashboard/interview', label: 'Interview', icon: Video },
  { href: '/dashboard/reports', label: 'Reports', icon: BarChart3 },
  { href: '/dashboard/chat', label: 'Chat', icon: MessageSquare },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isMobile: boolean;
}

export default function Sidebar({ isOpen, onClose, isMobile }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const sidebarVariants = {
    open: { 
      x: 0,
      transition: { type: 'spring' as const, stiffness: 300, damping: 30 }
    },
    closed: { 
      x: '-100%',
      transition: { type: 'spring' as const, stiffness: 300, damping: 30 }
    }
  };

  return (
    <motion.aside
      initial={isMobile ? "closed" : "open"}
      animate={isOpen ? "open" : "closed"}
      variants={sidebarVariants}
      className={`fixed lg:static inset-y-0 left-0 w-72 flex flex-col z-50 border-r border-slate-800 bg-[#1e293b]/50 backdrop-blur-xl`}
    >
      {/* Logo */}
      <div className="flex items-center justify-between p-6 border-b border-slate-800">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-600/20 text-blue-400">
            <Brain className="w-6 h-6" />
          </div>
          <span className="font-bold text-white text-xl tracking-tight">SayBee AI</span>
        </Link>
        {isMobile && (
          <button onClick={onClose} className="lg:hidden p-2 text-slate-400 hover:text-white transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center">
            <X className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={isMobile ? onClose : undefined}
              className={`flex items-center gap-3 px-4 py-3 min-h-[48px] rounded-xl transition-all duration-200 group relative border border-transparent ${
                active 
                  ? 'bg-blue-600/10 text-blue-400 border-blue-500/20' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50 hover:border-slate-700'
              }`}
            >
              <Icon className={`w-5 h-5 transition-colors ${active ? 'text-blue-400' : 'group-hover:text-blue-400'}`} />
              <span className="font-medium text-sm">{label}</span>
              {active && (
                <motion.div 
                  layoutId="active-pill"
                  className="absolute left-0 w-1 h-6 bg-blue-500 rounded-r-full"
                />
              )}
              {active && <ChevronRight className="w-4 h-4 ml-auto opacity-50" />}
            </Link>
          );
        })}
      </nav>

      {/* User Profile Area */}
      <div className="absolute bottom-0 left-0 right-0 p-4 lg:p-6 border-t border-slate-800 bg-[#0f172a]">
        <Link href="/pricing" className="flex items-center justify-between px-4 py-2.5 mb-4 bg-gradient-to-r from-blue-600/10 to-transparent border border-blue-500/20 rounded-xl hover:from-blue-600/20 hover:border-blue-500/40 transition-all group">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">Go Pro</span>
          </div>
          <span className="text-xs font-bold text-slate-400 px-2.5 py-1 bg-slate-900 rounded-lg border border-slate-700">{user?.credits ?? 0} Credits</span>
        </Link>

        <div className="flex items-center gap-3 p-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold ring-2 ring-blue-500/20">
            {user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.name ?? 'User'}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>
        <button 
          onClick={logout}
          className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 min-h-[48px] rounded-xl border border-slate-800 bg-slate-800/50 text-slate-400 text-sm font-medium hover:bg-slate-800 hover:text-white transition-all group"
        >
          <LogOut className="w-4 h-4 group-hover:text-rose-500 transition-colors" />
          Log Out
        </button>
      </div>
    </motion.aside>
  );
}
