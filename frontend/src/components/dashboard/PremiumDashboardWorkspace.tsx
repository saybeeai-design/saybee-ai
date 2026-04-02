'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  Clock3,
  FileText,
  Loader2,
  PlayCircle,
  Sparkles,
  TrendingUp,
  Upload,
  Video,
  type LucideIcon,
} from 'lucide-react';
import { useAuthStore } from '@/store/globalStore';
import { interviewAPI, resumeAPI } from '@/lib/api';

interface InterviewRecord {
  id: string;
  category?: string | null;
  language?: string | null;
  status: string;
  score?: number | null;
  createdAt: string;
}

interface ResumeRecord {
  id: string;
  fileName?: string | null;
  createdAt?: string;
}

interface DashboardData {
  interviews: InterviewRecord[];
  resumes: ResumeRecord[];
}

interface ActivityItem {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  badge: string;
  href: string;
}

function formatDate(value?: string): string {
  if (!value) {
    return 'No activity yet';
  }

  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatRelativeTime(value: string): string {
  const diff = new Date(value).getTime() - Date.now();
  const minutes = Math.round(diff / 60000);

  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

  if (Math.abs(minutes) < 60) {
    return formatter.format(minutes, 'minute');
  }

  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) {
    return formatter.format(hours, 'hour');
  }

  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) {
    return formatter.format(days, 'day');
  }

  const months = Math.round(days / 30);
  return formatter.format(months, 'month');
}

function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-xl border border-[#1F2937] bg-[#111827]/85 p-6 shadow-[0_18px_40px_-30px_rgba(0,0,0,0.82)] backdrop-blur-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#9CA3AF]">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</p>
        </div>
        <div className="rounded-xl border border-[#1F2937] bg-[#0B0F19]/80 p-3 text-[#22D3EE]">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-4 text-sm text-[#6B7280]">{hint}</p>
    </div>
  );
}

const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28 },
};

export default function PremiumDashboardWorkspace() {
  const { user } = useAuthStore();
  const [data, setData] = useState<DashboardData>({ interviews: [], resumes: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [interviewResponse, resumeResponse] = await Promise.all([
          interviewAPI.list(),
          resumeAPI.list(),
        ]);

        setData({
          interviews: interviewResponse.data.interviews ?? [],
          resumes: resumeResponse.data.resumes ?? [],
        });
      } catch {
        setData({ interviews: [], resumes: [] });
      } finally {
        setLoading(false);
      }
    };

    void loadDashboard();
  }, []);

  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const completedInterviews = data.interviews.filter((interview) => interview.status === 'COMPLETED');
  const averageScore = completedInterviews.length
    ? (completedInterviews.reduce((sum, interview) => sum + (interview.score ?? 0), 0) / completedInterviews.length).toFixed(1)
    : '--';
  const lastCompletedInterview = completedInterviews[0];
  const latestEventDate =
    [...data.interviews.map((item) => item.createdAt), ...data.resumes.map((item) => item.createdAt ?? '')]
      .filter(Boolean)
      .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ?? '';

  const activityItems: ActivityItem[] = [
    ...data.interviews.map((interview) => ({
      id: `interview-${interview.id}`,
      title: interview.category ?? 'General interview',
      description: `${interview.language ?? 'English'} interview session`,
      createdAt: interview.createdAt,
      badge: interview.status.replace('_', ' ').toLowerCase(),
      href: `/dashboard/reports?id=${interview.id}`,
    })),
    ...data.resumes.map((resume) => ({
      id: `resume-${resume.id}`,
      title: resume.fileName ?? 'Resume uploaded',
      description: 'Added to your interview prep library',
      createdAt: resume.createdAt ?? new Date().toISOString(),
      badge: 'resume',
      href: '/dashboard/resume',
    })),
  ]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <motion.section
        {...fadeUp}
        className="rounded-2xl border border-[#1F2937] bg-[#111827]/85 p-6 shadow-[0_22px_50px_-34px_rgba(0,0,0,0.82)] backdrop-blur-sm"
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-[#9CA3AF]">Interview prep workspace</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Welcome back, {firstName} <span aria-hidden="true">👋</span>
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#9CA3AF]">
              Keep your pipeline focused with a cleaner overview of live interview activity, available credits,
              and the next actions that actually matter.
            </p>
          </div>

          <Link
            href="/pricing"
            className="inline-flex w-fit items-center gap-3 rounded-full border border-[#1F2937] bg-[#0B0F19]/80 px-4 py-3 text-sm font-medium text-white transition-colors hover:border-[#334155]"
          >
            <Sparkles className="h-4 w-4 text-[#22D3EE]" />
            <span>{user?.credits ?? 0} credits remaining</span>
          </Link>
        </div>
      </motion.section>

      <motion.section
        {...fadeUp}
        transition={{ duration: 0.28, delay: 0.04 }}
        className="grid gap-6 md:grid-cols-3"
      >
        <MetricCard
          label="Total Interviews"
          value={loading ? '--' : data.interviews.length}
          hint="Every mock interview you have launched across the workspace."
          icon={Video}
        />
        <MetricCard
          label="Credits Remaining"
          value={loading ? '--' : user?.credits ?? 0}
          hint="Available interview credits ready for your next practice session."
          icon={Sparkles}
        />
        <MetricCard
          label="Average Score"
          value={loading ? '--' : averageScore === '--' ? '--' : `${averageScore}/10`}
          hint="Average score across completed interviews with a final evaluation."
          icon={TrendingUp}
        />
      </motion.section>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <motion.section
          {...fadeUp}
          transition={{ duration: 0.28, delay: 0.08 }}
          className="rounded-2xl border border-[#1F2937] bg-[#111827]/85 p-6 shadow-[0_22px_50px_-34px_rgba(0,0,0,0.82)] backdrop-blur-sm"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-white">Quick Actions</h3>
              <p className="mt-2 text-sm leading-6 text-[#9CA3AF]">
                Jump back into the workflow with the two actions you are most likely to need.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href="/dashboard/interview" className="btn-primary h-12 flex-1">
              <PlayCircle className="h-4 w-4" />
              Start Interview
            </Link>
            <Link href="/dashboard/resume" className="btn-secondary h-12 flex-1">
              <Upload className="h-4 w-4" />
              Upload Resume
            </Link>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[#1F2937] bg-[#0B0F19]/70 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#6B7280]">Resumes on file</p>
              <p className="mt-2 text-lg font-semibold text-white">{loading ? '--' : data.resumes.length}</p>
              <p className="mt-2 text-sm text-[#9CA3AF]">Keep your latest version ready for role-specific practice.</p>
            </div>
            <div className="rounded-xl border border-[#1F2937] bg-[#0B0F19]/70 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#6B7280]">Latest completed</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {loading ? '--' : formatDate(lastCompletedInterview?.createdAt)}
              </p>
              <p className="mt-2 text-sm text-[#9CA3AF]">
                {lastCompletedInterview?.category ?? 'Finish an interview to populate this summary.'}
              </p>
            </div>
          </div>
        </motion.section>

        <motion.section
          {...fadeUp}
          transition={{ duration: 0.28, delay: 0.12 }}
          className="rounded-2xl border border-[#1F2937] bg-[#111827]/85 p-6 shadow-[0_22px_50px_-34px_rgba(0,0,0,0.82)] backdrop-blur-sm"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-white">Recent Activity</h3>
              <p className="mt-2 text-sm leading-6 text-[#9CA3AF]">
                A clean feed of the latest sessions and resume updates inside your workspace.
              </p>
            </div>
            <Link
              href="/dashboard/reports"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#9CA3AF] transition-colors hover:text-white"
            >
              View reports
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-[#22D3EE]" />
            </div>
          ) : activityItems.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-[#1F2937] bg-[#0B0F19]/60 p-8 text-center">
              <Clock3 className="mx-auto h-8 w-8 text-[#6B7280]" />
              <p className="mt-4 text-base font-medium text-white">No recent activity yet</p>
              <p className="mt-2 text-sm text-[#9CA3AF]">
                Start an interview or upload a resume to build out your workspace history.
              </p>
            </div>
          ) : (
            <div className="mt-6 divide-y divide-[#1F2937]">
              {activityItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex flex-col gap-4 py-4 transition-colors hover:bg-white/[0.02] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg border border-[#1F2937] bg-[#0B0F19] p-2 text-[#22D3EE]">
                        {item.badge === 'resume' ? (
                          <FileText className="h-4 w-4" />
                        ) : (
                          <Video className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">{item.title}</p>
                        <p className="mt-1 truncate text-sm text-[#9CA3AF]">{item.description}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:shrink-0">
                    <span className="rounded-full border border-[#1F2937] bg-[#0B0F19]/80 px-3 py-1 text-xs font-medium capitalize text-[#9CA3AF]">
                      {item.badge}
                    </span>
                    <time className="text-sm text-[#6B7280]" dateTime={item.createdAt}>
                      {formatRelativeTime(item.createdAt)}
                    </time>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {!loading && latestEventDate && (
            <div className="mt-6 rounded-xl border border-[#1F2937] bg-[#0B0F19]/70 px-4 py-3 text-sm text-[#9CA3AF]">
              Last workspace update: <span className="font-medium text-white">{formatDate(latestEventDate)}</span>
            </div>
          )}
        </motion.section>
      </div>
    </div>
  );
}
