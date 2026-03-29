'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '@/components/layout/Sidebar';
import { useAuthStore } from '@/store/globalStore';
import Link from 'next/link';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      setSidebarOpen(!mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close sidebar on route change on mobile
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [pathname, isMobile]);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-slate-200 overflow-hidden transition-colors duration-300">
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isMobile && sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
          />
        )}
      </AnimatePresence>

      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        isMobile={isMobile} 
        isCollapsed={isCollapsed}
        toggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-[#0f172a]/90 backdrop-blur-lg sticky top-0 z-30 transition-colors duration-300">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800/50 text-slate-900 dark:text-white transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2 pointer-events-none sm:pointer-events-auto">
            <div className="relative w-6 h-6 hidden sm:block rounded-md overflow-hidden shrink-0">
               <Image src="/logo.png" alt="SayBee AI Logo" fill className="object-cover" />
            </div>
            <span className="font-bold text-slate-900 dark:text-white tracking-tight text-sm sm:text-base hidden sm:block">SayBee AI</span>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/pricing" className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600/20 to-cyan-500/20 border border-blue-500/30 rounded-full text-xs font-semibold text-blue-400 hover:from-blue-600/30 hover:to-cyan-500/30 transition-all">
              <span className="text-white">★</span> {user?.credits ?? 0} Credits
            </Link>
            <Link href="/pricing" className="sm:hidden flex items-center gap-1 px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[11px] font-bold text-blue-400">
              {user?.credits ?? 0} <span className="text-slate-400">left</span>
            </Link>

            <Link href="/dashboard/settings" className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold text-sm ring-2 ring-blue-500/20 active:scale-95 transition-transform">
              {user?.name?.[0]?.toUpperCase() ?? 'U'}
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-10 custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
