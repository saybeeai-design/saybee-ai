'use client';
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import PremiumDashboardWorkspace from '@/components/dashboard/PremiumDashboardWorkspace';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/globalStore';
import { interviewAPI, resumeAPI } from '@/lib/api';
import { FileText, VideoIcon, TrendingUp, Plus, Clock, CheckCircle, XCircle } from 'lucide-react';

interface Stats { interviews: any[]; resumes: any[]; }

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; icon: any; label: string }> = {
    COMPLETED: { color: '#22d3a0', icon: CheckCircle, label: 'Completed' },
    IN_PROGRESS: { color: '#fbbf24', icon: Clock, label: 'In Progress' },
    PENDING: { color: '#8888aa', icon: Clock, label: 'Pending' },
    FAILED: { color: '#ff4d6d', icon: XCircle, label: 'Failed' },
  };
  const cfg = map[status] ?? map.PENDING;
  const Icon = cfg.icon;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: `${cfg.color}18`, color: cfg.color }}>
      <Icon className="w-3 h-3" /> {cfg.label}
    </span>
  );
}

export default function DashboardPage() {
  return <PremiumDashboardWorkspace />;
}

function LegacyDashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<Stats>({ interviews: [], resumes: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [iRes, rRes] = await Promise.all([interviewAPI.list(), resumeAPI.list()]);
        setStats({ interviews: iRes.data.interviews, resumes: rRes.data.resumes });
      } catch { /* silently fail */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const completed = stats.interviews.filter((i: any) => i.status === 'COMPLETED');
  const avgScore = completed.length
    ? (completed.reduce((s: number, i: any) => s + (i.score ?? 0), 0) / completed.length).toFixed(1)
    : '—';

  const statCards = [
    { label: 'Total Interviews', value: stats.interviews.length, icon: VideoIcon, color: '#6c63ff' },
    { label: 'Completed', value: completed.length, icon: CheckCircle, color: '#22d3a0' },
    { label: 'Avg Score', value: avgScore, icon: TrendingUp, color: '#4ecdc4' },
    { label: 'Resumes', value: stats.resumes.length, icon: FileText, color: '#fbbf24' },
  ];

  return (
    <div>
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
          Welcome back, <span style={{ color: '#6c63ff' }}>{user?.name?.split(' ')[0] ?? 'there'}</span> 👋
        </h1>
        <p className="mt-1.5 text-sm" style={{ color: '#8888aa' }}>Track your progress and start a new AI interview session.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2" style={{ background: `${color}18` }}>
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <div className="text-2xl font-bold text-white">{loading ? '...' : value}</div>
            <div className="text-sm" style={{ color: '#8888aa' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Recent interviews */}
      <div className="glass-card p-4 md:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-semibold text-white">Recent Interviews</h2>
          <Link href="/interview/setup" className="btn-primary text-sm px-4 py-2 w-full sm:w-auto min-h-[48px] justify-center items-center flex">
            <Plus className="w-4 h-4 mr-2" /> New Interview
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-8" style={{ color: '#8888aa' }}>Loading...</div>
        ) : stats.interviews.length === 0 ? (
          <div className="text-center py-12">
            <VideoIcon className="w-12 h-12 mx-auto mb-3" style={{ color: '#8888aa' }} />
            <p className="font-medium text-white mb-1">No interviews yet</p>
            <p className="text-sm mb-6" style={{ color: '#8888aa' }}>Start your first AI interview session</p>
            <Link href="/interview/setup" className="btn-primary text-sm w-full sm:w-auto inline-flex justify-center min-h-[48px] items-center">Start Interview</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {stats.interviews.slice(0, 5).map((interview: any) => (
              <Link key={interview.id} href={`/dashboard/reports?id=${interview.id}`}
                className="flex items-center gap-4 p-4 rounded-xl transition-colors hover:bg-white/5"
                style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(108,99,255,0.15)' }}>
                  <VideoIcon className="w-5 h-5" style={{ color: '#6c63ff' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-sm">{interview.category}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#8888aa' }}>
                    {interview.language} · {new Date(interview.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {interview.score !== null && (
                    <span className="text-sm font-semibold" style={{ color: '#6c63ff' }}>{interview.score?.toFixed(1)}/10</span>
                  )}
                  <StatusBadge status={interview.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
