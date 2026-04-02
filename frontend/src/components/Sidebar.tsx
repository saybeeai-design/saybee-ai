'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  CreditCard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/store/globalStore';
import { navigationItems } from '@/components/layout/navigation';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isMobile: boolean;
  isCollapsed?: boolean;
  toggleCollapse?: () => void;
}

export default function Sidebar({
  isOpen,
  onClose,
  isMobile,
  isCollapsed = false,
  toggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const desktopWidth = isCollapsed ? 88 : 272;

  return (
    <motion.aside
      initial={false}
      animate={{
        x: isMobile ? (isOpen ? 0 : -304) : 0,
        width: isMobile ? 272 : desktopWidth,
      }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="fixed inset-y-0 left-0 z-40 flex h-screen flex-col border-r border-[#1F2937] bg-[#111827]/95 backdrop-blur-sm"
    >
      <div
        className={`flex h-20 items-center border-b border-[#1F2937] px-4 ${
          isCollapsed && !isMobile ? 'justify-center' : 'justify-between'
        }`}
      >
        <Link href="/dashboard" className="flex min-w-0 items-center gap-3 overflow-hidden">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#1F2937] bg-[#0B0F19]">
            <div className="relative h-6 w-6 overflow-hidden rounded-lg">
              <Image src="/logo.png" alt="SayBee AI" fill className="object-cover" />
            </div>
          </div>
          {(!isCollapsed || isMobile) && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">SayBee AI</p>
              <p className="truncate text-xs text-[#6B7280]">Interview workspace</p>
            </div>
          )}
        </Link>

        {isMobile ? (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#1F2937] bg-[#0B0F19] text-[#9CA3AF] transition-colors hover:text-white"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        ) : toggleCollapse ? (
          <button
            type="button"
            onClick={toggleCollapse}
            className="hidden h-10 w-10 items-center justify-center rounded-xl border border-[#1F2937] bg-[#0B0F19] text-[#9CA3AF] transition-colors hover:text-white lg:inline-flex"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="h-[18px] w-[18px]" />
            ) : (
              <PanelLeftClose className="h-[18px] w-[18px]" />
            )}
          </button>
        ) : null}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 custom-scrollbar">
        {navigationItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

          return (
            <Link
              key={href}
              href={href}
              title={isCollapsed && !isMobile ? label : undefined}
              onClick={isMobile ? onClose : undefined}
              className={`flex items-center rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                active
                  ? 'bg-[#1F2937] text-white'
                  : 'text-[#9CA3AF] hover:bg-white/[0.04] hover:text-white'
              } ${isCollapsed && !isMobile ? 'justify-center' : 'gap-3'}`}
            >
              <Icon className={`h-5 w-5 shrink-0 ${active ? 'text-[#22D3EE]' : 'text-current'}`} />
              {(!isCollapsed || isMobile) && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[#1F2937] p-4">
        {(!isCollapsed || isMobile) && (
          <Link
            href="/pricing"
            className="flex items-center justify-between rounded-xl border border-[#1F2937] bg-[#0B0F19]/80 px-4 py-3 transition-colors hover:border-[#334155]"
          >
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#6B7280]">Credits</p>
              <p className="mt-1 text-sm font-semibold text-white">{user?.credits ?? 0} remaining</p>
            </div>
            <CreditCard className="h-[18px] w-[18px] text-[#22D3EE]" />
          </Link>
        )}

        <div className={`mt-3 flex gap-2 ${isCollapsed && !isMobile ? 'flex-col' : 'items-center'}`}>
          {!isMobile && toggleCollapse && isCollapsed && (
            <button
              type="button"
              onClick={toggleCollapse}
              className="flex h-11 w-full items-center justify-center rounded-xl border border-[#1F2937] bg-[#0B0F19] text-[#9CA3AF] transition-colors hover:text-white"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen className="h-[18px] w-[18px]" />
            </button>
          )}

          <Link
            href="/pricing"
            title={isCollapsed && !isMobile ? 'Pricing' : undefined}
            className={`flex h-11 items-center justify-center rounded-xl border border-[#1F2937] bg-[#0B0F19] text-sm font-medium text-[#9CA3AF] transition-colors hover:text-white ${
              isCollapsed && !isMobile ? 'w-full' : 'flex-1 gap-2'
            }`}
          >
            <CreditCard className="h-[18px] w-[18px]" />
            {(!isCollapsed || isMobile) && 'Pricing'}
          </Link>

          <button
            type="button"
            onClick={logout}
            title={isCollapsed && !isMobile ? 'Sign out' : undefined}
            className={`flex h-11 items-center justify-center rounded-xl border border-[#1F2937] bg-[#0B0F19] text-sm font-medium text-[#FCA5A5] transition-colors hover:bg-[#111827] ${
              isCollapsed && !isMobile ? 'w-full' : 'flex-1 gap-2'
            }`}
          >
            <LogOut className="h-[18px] w-[18px]" />
            {(!isCollapsed || isMobile) && 'Sign out'}
          </button>
        </div>
      </div>
    </motion.aside>
  );
}
