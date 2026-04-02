'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronDown,
  CreditCard,
  LogOut,
  Menu,
  Settings,
  Sparkles,
} from 'lucide-react';
import { useAuthStore } from '@/store/globalStore';
import { getPageMeta } from '@/components/layout/navigation';

interface NavbarProps {
  onOpenSidebar: () => void;
}

export default function Navbar({ onOpenSidebar }: NavbarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pageMeta = getPageMeta(pathname);

  const initials = useMemo(() => {
    const name = user?.name?.trim();
    if (!name) {
      return 'SB';
    }

    return name
      .split(' ')
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('')
      .slice(0, 2);
  }, [user?.name]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-[#1F2937]/80 bg-[#0B0F19]/90 backdrop-blur-sm">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenSidebar}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#1F2937] bg-[#111827] text-[#9CA3AF] transition-colors hover:border-[#334155] hover:text-white lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#6B7280]">
              Workspace
            </p>
            <h1 className="truncate text-lg font-semibold text-white sm:text-xl">{pageMeta.title}</h1>
            <p className="hidden truncate text-sm text-[#9CA3AF] md:block">{pageMeta.subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/pricing"
            className="hidden items-center gap-2 rounded-full border border-[#1F2937] bg-[#111827]/80 px-3 py-2 text-sm font-medium text-[#9CA3AF] transition-colors hover:border-[#334155] hover:text-white sm:inline-flex"
          >
            <CreditCard className="h-4 w-4 text-[#22D3EE]" />
            <span>{user?.credits ?? 0} credits</span>
          </Link>

          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
              className="inline-flex items-center gap-3 rounded-full border border-[#1F2937] bg-[#111827]/80 px-2 py-2 text-left transition-colors hover:border-[#334155]"
              aria-expanded={menuOpen}
              aria-label="Open user menu"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#3B82F6] text-sm font-semibold text-white">
                {initials}
              </div>
              <div className="hidden pr-1 md:block">
                <p className="max-w-[10rem] truncate text-sm font-medium text-white">
                  {user?.name ?? 'SayBee user'}
                </p>
                <p className="max-w-[10rem] truncate text-xs text-[#6B7280]">{user?.email}</p>
              </div>
              <ChevronDown
                className={`h-4 w-4 text-[#6B7280] transition-transform ${menuOpen ? 'rotate-180' : ''}`}
              />
            </button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 top-[calc(100%+0.75rem)] w-64 rounded-2xl border border-[#1F2937] bg-[#111827] p-2 shadow-[0_24px_60px_-36px_rgba(0,0,0,0.78)]"
                >
                  <div className="rounded-xl border border-[#1F2937] bg-[#0B0F19]/70 px-3 py-3">
                    <p className="text-sm font-medium text-white">{user?.name ?? 'SayBee user'}</p>
                    <p className="mt-1 truncate text-xs text-[#6B7280]">{user?.email}</p>
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#1F2937] bg-[#111827] px-3 py-1 text-xs font-medium text-[#9CA3AF]">
                      <Sparkles className="h-3.5 w-3.5 text-[#22D3EE]" />
                      {user?.credits ?? 0} credits remaining
                    </div>
                  </div>

                  <div className="mt-2 space-y-1">
                    <Link
                      href="/dashboard/settings"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#9CA3AF] transition-colors hover:bg-[#0B0F19] hover:text-white"
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                    <Link
                      href="/pricing"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#9CA3AF] transition-colors hover:bg-[#0B0F19] hover:text-white"
                    >
                      <CreditCard className="h-4 w-4" />
                      Credits & pricing
                    </Link>
                    <button
                      type="button"
                      onClick={logout}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#FCA5A5] transition-colors hover:bg-[#0B0F19]"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
