'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { interviewAPI } from '@/lib/api';
import { VideoIcon, Clock, CheckCircle, XCircle, ChevronRight, type LucideIcon } from 'lucide-react';

interface InterviewHistoryItem {
  id: string;
  category: string;
  language: string;
  status: string;
  score: number | null;
  createdAt: string;
  _count?: { questions?: number };
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; icon: LucideIcon; label: string }> = {
    COMPLETED: { color: '#22d3a0', icon: CheckCircle, label: 'Completed' },
    IN_PROGRESS: { color: '#fbbf24', icon: Clock, label: 'In Progress' },
    PENDING: { color: '#8888aa', icon: Clock, label: 'Pending' },
    FAILED: { color: '#ff4d6d', icon: XCircle, label: 'Failed' },
  };
  const cfg = map[status] ?? map.PENDING;
  const Icon = cfg.icon;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: `${cfg.color}18`, color: cfg.color }}>
      <Icon className="w-3 h-3" /> {cfg.label}
    </span>
  );
}

export default function HistoryPage() {
  const [interviews, setInterviews] = useState<InterviewHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    interviewAPI.list().then((r) => setInterviews(r.data.interviews)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-2">Interview History</h1>
      <p className="text-sm mb-8" style={{ color: '#8888aa' }}>All your past interview sessions</p>

      <div className="glass-card p-6">
        {loading ? (
          <p className="text-center py-10" style={{ color: '#8888aa' }}>Loading...</p>
        ) : interviews.length === 0 ? (
          <div className="text-center py-12">
            <VideoIcon className="w-12 h-12 mx-auto mb-3" style={{ color: '#8888aa' }} />
            <p className="font-medium text-white mb-1">No interviews yet</p>
            <Link href="/interview/setup" className="btn-primary text-sm mt-3 inline-flex">Start Your First Interview</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {interviews.map((interview) => (
              <Link key={interview.id} href={`/dashboard/reports?id=${interview.id}`}
                className="flex items-center gap-4 p-4 rounded-xl transition-colors hover:bg-white/5 group"
                style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'rgba(108,99,255,0.15)' }}>
                  <VideoIcon className="w-5 h-5" style={{ color: '#6c63ff' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-sm">{interview.category}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#8888aa' }}>
                    {interview.language} · {interview._count?.questions ?? 0} questions · {new Date(interview.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {interview.score != null && (
                    <span className="text-sm font-bold" style={{ color: '#6c63ff' }}>{interview.score?.toFixed(1)}/10</span>
                  )}
                  <StatusBadge status={interview.status} />
                  <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#8888aa' }} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
