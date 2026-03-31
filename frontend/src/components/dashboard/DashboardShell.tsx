'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, Command, Menu } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import { useAuthStore } from '@/store/globalStore';

function getPageMeta(pathname: string) {
  if (pathname === '/dashboard') {
    return {
      title: 'Overview',
      subtitle: 'Monitor progress, launch sessions, and keep prep momentum high.',
    };
  }

  if (pathname.startsWith('/dashboard/chat')) {
    return {
      title: 'AI Copilot',
      subtitle: 'Refine answers, strategy, and interview stories in a live chat workspace.',
    };
  }

  if (pathname.startsWith('/dashboard/interview')) {
    return {
      title: 'Interview Studio',
      subtitle: 'Configure resumes, languages, and launch a new mock session.',
    };
  }

  if (pathname.startsWith('/dashboard/resume')) {
    return {
      title: 'Resume Library',
      subtitle: 'Manage the files that power personalized interview preparation.',
    };
  }

  if (pathname.startsWith('/dashboard/reports')) {
    return {
      title: 'Reports',
      subtitle: 'Review scoring, performance signals, and improvement opportunities.',
    };
  }

  if (pathname.startsWith('/dashboard/settings')) {
    return {
      title: 'Settings',
      subtitle: 'Control profile details, preferences, and account setup.',
    };
  }

  if (pathname.startsWith('/dashboard/history')) {
    return {
      title: 'History',
      subtitle: 'Look back at your previous sessions and outcomes.',
    };
  }

  if (pathname.startsWith('/dashboard/billing')) {
    return {
      title: 'Billing',
      subtitle: 'Manage credits, top-ups, and purchase history.',
    };
  }

  return {
    title: 'Workspace',
    subtitle: 'Everything you need to prepare, practice, and improve.',
  };
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pageMeta = getPageMeta(pathname);

  useEffect(() => {
    const updateViewport = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      setSidebarOpen(!mobile);
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900 transition-colors duration-300 dark:bg-[#020617] dark:text-slate-200">
      <AnimatePresence>
        {isMobile && sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isMobile={isMobile}
        isCollapsed={isCollapsed}
        toggleCollapse={() => setIsCollapsed((current) => !current)}
      />

      <div className="relative flex min-w-0 flex-1 flex-col">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_28%),radial-gradient(circle_at_top_right,rgba(20,184,166,0.09),transparent_24%)]" />

        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-slate-100/85 backdrop-blur-xl dark:border-slate-800 dark:bg-[#020617]/85">
          <div className="flex h-[84px] items-center justify-between gap-4 px-4 md:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 lg:hidden dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="hidden h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm lg:flex dark:border-slate-800 dark:bg-slate-900">
                <div className="relative h-6 w-6 overflow-hidden rounded-lg">
                  <Image src="/logo.png" alt="SayBee AI Logo" fill className="object-cover" />
                </div>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/15 bg-blue-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-300">
                    <Command className="h-3 w-3" />
                    Workspace
                  </span>
                </div>
                <h1 className="mt-2 truncate text-lg font-semibold text-slate-950 dark:text-white md:text-2xl">
                  {pageMeta.title}
                </h1>
                <p className="hidden truncate text-sm text-slate-500 dark:text-slate-400 md:block">
                  {pageMeta.subtitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 md:flex">
                <CalendarDays className="h-4 w-4 text-blue-500" />
                {new Date().toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>

              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 rounded-full border border-blue-500/15 bg-blue-500/10 px-3 py-2 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-500/15 dark:text-blue-300"
              >
                {user?.credits ?? 0} credits
              </Link>

              <Link
                href="/dashboard/settings"
                className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-2 py-2 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-sm font-semibold text-white">
                  {user?.name?.[0]?.toUpperCase() ?? 'U'}
                </div>
                <div className="hidden pr-2 text-left md:block">
                  <p className="max-w-[11rem] truncate text-sm font-semibold text-slate-950 dark:text-white">
                    {user?.name ?? 'User'}
                  </p>
                  <p className="max-w-[11rem] truncate text-xs text-slate-500 dark:text-slate-400">
                    {user?.email}
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </header>

        <main className="relative flex-1 overflow-y-auto px-4 py-6 md:px-6 lg:px-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
