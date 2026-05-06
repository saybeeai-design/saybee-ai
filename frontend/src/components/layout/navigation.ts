import {
  BarChart3,
  FileText,
  LayoutDashboard,
  MessageSquareText,
  Settings,
  Video,
  type LucideIcon,
} from 'lucide-react';

export interface NavigationItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const navigationItems: NavigationItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/resume', label: 'Resumes', icon: FileText },
  { href: '/dashboard/interview', label: 'Interview', icon: Video },
  { href: '/dashboard/reports', label: 'Reports', icon: BarChart3 },
  { href: '/dashboard/chat', label: 'Chat', icon: MessageSquareText },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export interface PageMeta {
  title: string;
  subtitle?: string;
}

export function getPageMeta(pathname: string): PageMeta {
  if (pathname === '/dashboard') {
    return {
      title: 'Dashboard',
      subtitle: 'Track your prep, credits, and latest interview activity.',
    };
  }

  if (pathname.startsWith('/dashboard/chat')) {
    return {
      title: 'AI Assistant',
    };
  }

  if (pathname.startsWith('/dashboard/interview')) {
    return {
      title: 'Interview Studio',
      subtitle: 'Launch role-aware practice sessions and keep your momentum high.',
    };
  }

  if (pathname.startsWith('/dashboard/resume')) {
    return {
      title: 'Resume Library',
      subtitle: 'Manage the files that power tailored interview questions and feedback.',
    };
  }

  if (pathname.startsWith('/dashboard/reports')) {
    return {
      title: 'Reports',
      subtitle: 'Review scores, coaching signals, and session-by-session performance.',
    };
  }

  if (pathname.startsWith('/dashboard/settings')) {
    return {
      title: 'Settings',
      subtitle: 'Manage your profile, workspace preferences, and account controls.',
    };
  }

  if (pathname.startsWith('/dashboard/history')) {
    return {
      title: 'History',
      subtitle: 'Look back at previous sessions and revisit your strongest responses.',
    };
  }

  if (pathname.startsWith('/dashboard/billing')) {
    return {
      title: 'Billing',
      subtitle: 'Purchase credits and keep your prep workflow uninterrupted.',
    };
  }

  return {
    title: 'Workspace',
    subtitle: 'Everything you need to prepare, practice, and improve.',
  };
}
