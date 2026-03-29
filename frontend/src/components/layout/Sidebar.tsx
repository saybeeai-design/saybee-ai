'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/globalStore';
import { useTheme } from 'next-themes';
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
  Star,
  PanelLeftClose,
  PanelLeft,
  Sun,
  Moon,
  Monitor
} from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import UpgradeModal from '../UpgradeModal';


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
  isCollapsed?: boolean;
  toggleCollapse?: () => void;
}

function ThemeToggle({ isCollapsed }: { isCollapsed?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="h-9 w-full" />;

  if (isCollapsed) {
    return (
      <button 
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="w-full flex items-center justify-center p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        title="Toggle Theme"
      >
        {theme === 'dark' ? <Moon className="w-[18px] h-[18px]" /> : <Sun className="w-[18px] h-[18px]" />}
      </button>
    );
  }

  return (
    <div className="flex items-center justify-between gap-1 p-1 bg-slate-100 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
      <button 
        onClick={() => setTheme('light')} 
        className={`p-1.5 rounded-lg flex-1 flex justify-center transition-all ${theme === 'light' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
        title="Light Mode"
      ><Sun className="w-4 h-4" /></button>
      <button 
        onClick={() => setTheme('system')} 
        className={`p-1.5 rounded-lg flex-1 flex justify-center transition-all ${theme === 'system' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
        title="System Preference"
      ><Monitor className="w-4 h-4" /></button>
      <button 
        onClick={() => setTheme('dark')} 
        className={`p-1.5 rounded-lg flex-1 flex justify-center transition-all ${theme === 'dark' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
        title="Dark Mode"
      ><Moon className="w-4 h-4" /></button>
    </div>
  );
}

export default function Sidebar({ isOpen, onClose, isMobile, isCollapsed = false, toggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const sidebarVariants = {
    open: { 
      x: 0,
      width: isMobile ? 288 : (isCollapsed ? 80 : 288), // 288px = w-72, 80px = w-20
      transition: { type: 'spring' as const, stiffness: 300, damping: 30 }
    },
    closed: { 
      x: '-100%',
      width: 288,
      transition: { type: 'spring' as const, stiffness: 300, damping: 30 }
    }
  };

  return (
    <motion.aside
      initial={isMobile ? "closed" : "open"}
      animate={isOpen ? "open" : "closed"}
      variants={sidebarVariants}
      className={`fixed lg:static inset-y-0 left-0 flex flex-col z-50 border-r border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#1e293b]/50 backdrop-blur-xl shadow-xl lg:shadow-none overflow-hidden`}
    >
      {/* Logo & Toggle Header */}
      <div className={`flex items-center p-6 border-b border-slate-200 dark:border-slate-800 min-h-[89px] ${isCollapsed && !isMobile ? 'justify-center' : 'justify-between'}`}>
        <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
          <div className="relative w-10 h-10 shrink-0 flex items-center justify-center rounded-xl overflow-hidden">
            <Image src="/logo.png" alt="SayBee AI Logo" fill className="object-cover" />
          </div>
          {(!isCollapsed || isMobile) && (
            <motion.span 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="font-bold text-slate-900 dark:text-white text-xl tracking-tight whitespace-nowrap"
            >
              SayBee AI
            </motion.span>
          )}
        </Link>
        {isMobile && (
          <button onClick={onClose} className="lg:hidden p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center">
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
              title={isCollapsed && !isMobile ? label : undefined}
              onClick={isMobile ? onClose : undefined}
              className={`flex items-center ${isCollapsed && !isMobile ? 'justify-center' : 'gap-3'} px-4 py-3 min-h-[48px] rounded-xl transition-all duration-200 group relative border ${
                active 
                  ? 'bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20' 
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:border-slate-200 dark:hover:border-slate-700'
              }`}
            >
              <Icon className={`w-5 h-5 shrink-0 transition-colors ${active ? 'text-blue-600 dark:text-blue-400' : 'group-hover:text-blue-600 dark:group-hover:text-blue-400'}`} />
              
              {(!isCollapsed || isMobile) && (
                <>
                  <span className="font-medium text-sm whitespace-nowrap">{label}</span>
                  {active && (
                    <motion.div 
                      layoutId="active-pill"
                      className="absolute left-0 w-1 h-6 bg-blue-500 rounded-r-full"
                    />
                  )}
                  {active && <ChevronRight className="w-4 h-4 ml-auto opacity-50 shrink-0" />}
                </>
              )}

              {/* Collapsed Active Indicator */}
              {(isCollapsed && !isMobile && active) && (
                 <motion.div 
                   layoutId="active-pill"
                   className="absolute left-0 w-1 h-6 bg-blue-500 rounded-r-full"
                 />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Area */}
      <div className={`p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0f172a] ${isCollapsed && !isMobile ? 'flex flex-col items-center gap-4' : ''}`}>
        
        {(!isCollapsed || isMobile) ? (
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-500">Credits</span>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{user?.credits ?? 0} Left</span>
            </div>
            <button 
              onClick={() => setIsUpgradeModalOpen(true)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:opacity-90 transition-all group shadow-lg shadow-blue-500/20"
            >
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-white fill-white/20" />
                <span className="text-sm font-bold">Upgrade</span>
              </div>
              <ChevronRight className="w-4 h-4 opacity-50 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setIsUpgradeModalOpen(true)}
            title="Upgrade - Credits" 
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20 hover:scale-105 transition-all"
          >
            <Star className="w-5 h-5 fill-white/20" />
          </button>
        )}

        <div className={`flex items-center gap-3 mb-4 rounded-xl ${(!isCollapsed || isMobile) ? 'p-2' : 'justify-center'}`}>
          <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold ring-2 ring-blue-500/20">
            {user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          {(!isCollapsed || isMobile) && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user?.name ?? 'User'}</p>
              <p className="text-xs text-slate-500 dark:text-slate-500 truncate">{user?.email}</p>
            </div>
          )}
        </div>

        {/* Theme & Collapse Actions row */}
        <div className={`flex ${isCollapsed && !isMobile ? 'flex-col' : 'items-center'} gap-2 w-full`}>
          <div className="flex-1 w-full">
            <ThemeToggle isCollapsed={isCollapsed && !isMobile} />
          </div>
          
          {/* Desktop Only Collapse Toggle */}
          {!isMobile && toggleCollapse && (
            <button 
              onClick={toggleCollapse}
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              className={`p-2 shrink-0 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors`}
            >
              {isCollapsed ? <PanelLeft className="w-[18px] h-[18px]" /> : <PanelLeftClose className="w-[18px] h-[18px]" />}
            </button>
          )}

          {(!isCollapsed || isMobile) && (
            <button 
              onClick={logout}
              title="Log Out"
              className="p-2 shrink-0 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-500 transition-colors"
            >
              <LogOut className="w-[18px] h-[18px]" />
            </button>
          )}

          {(isCollapsed && !isMobile) && (
             <button 
               onClick={logout}
               title="Log Out"
               className="mt-2 p-2 w-full flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-500 transition-colors"
             >
               <LogOut className="w-[18px] h-[18px]" />
             </button>
          )}
        </div>
        
      </div>

      <UpgradeModal 
        isOpen={isUpgradeModalOpen} 
        onClose={() => setIsUpgradeModalOpen(false)} 
      />
    </motion.aside>
  );
}
