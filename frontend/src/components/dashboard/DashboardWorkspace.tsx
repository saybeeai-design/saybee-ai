'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/globalStore';
import { interviewAPI, resumeAPI } from '@/lib/api';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  MessageSquareText,
  PlayCircle,
  Sparkles,
  Target,
  TrendingUp,
  Video,
  XCircle,
} from 'lucide-react';

interface InterviewRecord {
  id: string;
  category?: string | null;
  language?: string | null;
  status: string;
  score?: number | null;
  createdAt: string;
  resume?: { fileName?: string | null } | null;
}

interface ResumeRecord {
  id: string;
  fileName?: string | null;
  createdAt?: string;
}

interface Stats {
  interviews: InterviewRecord[];
  resumes: ResumeRecord[];
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; icon: LucideIcon; label: string }> = {
    COMPLETED: { color: 'text-emerald-400', icon: CheckCircle2, label: 'Completed' },
    IN_PROGRESS: { color: 'text-amber-400', icon: Clock3, label: 'In progress' },
    PENDING: { color: 'text-slate-400', icon: Clock3, label: 'Pending' },
    FAILED: { color: 'text-rose-400', icon: XCircle, label: 'Needs retry' },
  };

  const config = map[status] ?? map.PENDING;
  const Icon = config.icon;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-200 dark:text-slate-200">
      <Icon className={`h-3.5 w-3.5 ${config.color}`} />
      {config.label}
    </span>
  );
}

function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
  loading,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: LucideIcon;
  accent: string;
  loading: boolean;
}) {
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white/85 p-5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/70">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
            {loading ? '--' : value}
          </p>
        </div>
        <div className={`rounded-2xl border px-3 py-3 ${accent}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{hint}</p>
    </div>
  );
}

function QuickAction({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="group rounded-3xl border border-slate-200/80 bg-white/90 p-5 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_28px_60px_-40px_rgba(59,130,246,0.35)] dark:border-slate-800 dark:bg-slate-950/65 dark:hover:border-slate-700"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-3 text-blue-600 dark:text-blue-400">
          <Icon className="h-5 w-5" />
        </div>
        <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-700 dark:group-hover:text-white" />
      </div>
      <h3 className="mt-5 text-base font-semibold text-slate-950 dark:text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
    </Link>
  );
}

function formatDate(dateValue?: string): string {
  if (!dateValue) {
    return 'No activity yet';
  }

  return new Date(dateValue).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function DashboardWorkspace() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<Stats>({ interviews: [], resumes: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [interviewResponse, resumeResponse] = await Promise.all([
          interviewAPI.list(),
          resumeAPI.list(),
        ]);

        setStats({
          interviews: interviewResponse.data.interviews ?? [],
          resumes: resumeResponse.data.resumes ?? [],
        });
      } catch {
        setStats({ interviews: [], resumes: [] });
      } finally {
        setLoading(false);
      }
    };

    void loadDashboard();
  }, []);

  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const completed = stats.interviews.filter((interview) => interview.status === 'COMPLETED');
  const inProgress = stats.interviews.filter((interview) => interview.status === 'IN_PROGRESS');
  const averageScore = completed.length
    ? (completed.reduce((sum, interview) => sum + (interview.score ?? 0), 0) / completed.length).toFixed(1)
    : '--';
  const bestScore = completed.length
    ? Math.max(...completed.map((interview) => interview.score ?? 0)).toFixed(1)
    : '--';
  const completionRate = stats.interviews.length
    ? Math.round((completed.length / stats.interviews.length) * 100)
    : 0;
  const latestInterview = stats.interviews[0];
  const recentResumes = stats.resumes.slice(0, 3);

  const statCards = [
    {
      label: 'Interview sessions',
      value: stats.interviews.length,
      hint: `${completed.length} completed, ${inProgress.length} active`,
      icon: Video,
      accent: 'border-indigo-500/20 bg-indigo-500/10 text-indigo-500 dark:text-indigo-300',
    },
    {
      label: 'Average score',
      value: averageScore === '--' ? '--' : `${averageScore}/10`,
      hint: completed.length ? `Best run: ${bestScore}/10` : 'Finish a session to unlock score trends',
      icon: TrendingUp,
      accent: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500 dark:text-emerald-300',
    },
    {
      label: 'Resume library',
      value: stats.resumes.length,
      hint: stats.resumes.length ? 'Ready for new mock sessions' : 'Upload a resume to personalize interviews',
      icon: FileText,
      accent: 'border-amber-500/20 bg-amber-500/10 text-amber-500 dark:text-amber-300',
    },
    {
      label: 'Credits available',
      value: user?.credits ?? 0,
      hint: user?.credits ? 'Enough to launch another interview' : 'Top up to keep practicing',
      icon: Sparkles,
      accent: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-500 dark:text-cyan-300',
    },
  ];

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/90 p-6 shadow-[0_32px_80px_-50px_rgba(15,23,42,0.45)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/75 md:p-8">
        <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_45%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.14),transparent_35%)]" />
        <div className="relative grid gap-8 xl:grid-cols-[1.35fr_0.9fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/15 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-300">
              <BrainCircuit className="h-3.5 w-3.5" />
              Interview command center
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white md:text-4xl">
              Welcome back, {firstName}. Your prep pipeline is ready.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-400 md:text-base">
              Keep your interview prep moving with live sessions, faster feedback loops, and an AI copilot that is available whenever you need another round.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/dashboard/interview" className="btn-primary px-5 py-3 text-sm">
                <PlayCircle className="h-4 w-4" />
                Start interview
              </Link>
              <Link href="/dashboard/chat" className="btn-secondary px-5 py-3 text-sm">
                <MessageSquareText className="h-4 w-4" />
                Open AI copilot
              </Link>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Last activity
                </p>
                <p className="mt-3 text-lg font-semibold text-slate-950 dark:text-white">
                  {formatDate(latestInterview?.createdAt)}
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {latestInterview ? latestInterview.category ?? 'General interview' : 'Launch your first session'}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Completion rate
                </p>
                <p className="mt-3 text-lg font-semibold text-slate-950 dark:text-white">{completionRate}%</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Based on all recorded interview sessions
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Best score
                </p>
                <p className="mt-3 text-lg font-semibold text-slate-950 dark:text-white">
                  {bestScore === '--' ? '--' : `${bestScore}/10`}
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Your highest scoring completed interview
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200/80 bg-slate-50/90 p-5 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Prep readiness
                </p>
                <h2 className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">
                  Everything you need for your next session
                </h2>
              </div>
              {loading && <Loader2 className="h-5 w-5 animate-spin text-blue-500" />}
            </div>

            <div className="mt-6 space-y-4">
              {[
                {
                  label: 'Resume coverage',
                  value: stats.resumes.length ? `${stats.resumes.length} on file` : 'Missing',
                  hint: stats.resumes.length
                    ? 'You can launch a personalized interview now'
                    : 'Upload a resume to tailor prompts and evaluation',
                  ready: stats.resumes.length > 0,
                },
                {
                  label: 'Credits balance',
                  value: `${user?.credits ?? 0} available`,
                  hint: user?.credits
                    ? 'You have enough credits for another run'
                    : 'Recharge to continue full interview sessions',
                  ready: Boolean(user?.credits),
                },
                {
                  label: 'AI copilot',
                  value: 'Always on',
                  hint: 'Use chat to rehearse answers before your next session',
                  ready: true,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 dark:border-slate-800 dark:bg-slate-950/70"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{item.label}</p>
                      <p className="mt-1 text-base font-semibold text-slate-950 dark:text-white">{item.value}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{item.hint}</p>
                    </div>
                    <div
                      className={`mt-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        item.ready
                          ? 'bg-emerald-500/12 text-emerald-500 dark:text-emerald-300'
                          : 'bg-amber-500/12 text-amber-500 dark:text-amber-300'
                      }`}
                    >
                      {item.ready ? 'Ready' : 'Attention'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        {statCards.map((card) => (
          <MetricCard key={card.label} {...card} loading={loading} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-6 shadow-[0_30px_70px_-50px_rgba(15,23,42,0.4)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/75">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Quick actions
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
                  Move through your workflow faster
                </h2>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <QuickAction
                href="/dashboard/interview"
                title="Launch a live interview"
                description="Start a new mock interview, choose your resume, and keep momentum with live AI evaluation."
                icon={PlayCircle}
              />
              <QuickAction
                href="/dashboard/resume"
                title="Refresh your resume library"
                description="Upload the latest version of your CV before your next role-specific practice session."
                icon={FileText}
              />
              <QuickAction
                href="/dashboard/reports"
                title="Review feedback reports"
                description="Revisit your strongest answers, weak spots, and the sessions that need another pass."
                icon={Target}
              />
              <QuickAction
                href="/dashboard/chat"
                title="Ask the AI copilot"
                description="Rehearse tricky answers, refine storytelling, and pressure-test your next interview pitch."
                icon={MessageSquareText}
              />
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-6 shadow-[0_30px_70px_-50px_rgba(15,23,42,0.4)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/75">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Recent interviews
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
                  Track the sessions that matter most
                </h2>
              </div>
              <Link
                href="/dashboard/interview"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                New session
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {loading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              </div>
            ) : stats.interviews.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 p-10 text-center dark:border-slate-700 dark:bg-slate-900/60">
                <Video className="mx-auto h-10 w-10 text-slate-400" />
                <h3 className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">No interviews yet</h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Start your first AI session to unlock analytics, scores, and progress tracking.
                </p>
                <Link href="/dashboard/interview" className="btn-primary mt-6 px-5 py-3 text-sm">
                  Start your first interview
                </Link>
              </div>
            ) : (
              <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800">
                <div className="hidden grid-cols-[1.1fr_0.8fr_0.8fr_0.6fr_0.8fr] gap-4 border-b border-slate-200 bg-slate-50/80 px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400 md:grid">
                  <span>Session</span>
                  <span>Resume</span>
                  <span>Language</span>
                  <span>Score</span>
                  <span>Status</span>
                </div>

                <div className="divide-y divide-slate-200 dark:divide-slate-800">
                  {stats.interviews.slice(0, 6).map((interview) => (
                    <Link
                      key={interview.id}
                      href={`/dashboard/reports?id=${interview.id}`}
                      className="grid gap-3 px-5 py-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/60 md:grid-cols-[1.1fr_0.8fr_0.8fr_0.6fr_0.8fr]"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-950 dark:text-white">
                          {interview.category ?? 'General interview'}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {formatDate(interview.createdAt)}
                        </p>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        {interview.resume?.fileName ?? 'No resume linked'}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        {interview.language ?? 'English'}
                      </p>
                      <p className="text-sm font-semibold text-slate-950 dark:text-white">
                        {typeof interview.score === 'number' ? `${interview.score.toFixed(1)}/10` : '--'}
                      </p>
                      <div className="md:justify-self-start">
                        <StatusBadge status={interview.status} />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-6 shadow-[0_30px_70px_-50px_rgba(15,23,42,0.4)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/75">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Preparation health
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
              Your interview system at a glance
            </h2>

            <div className="mt-6 space-y-5">
              <div>
                <div className="flex items-center justify-between text-sm font-medium text-slate-600 dark:text-slate-300">
                  <span>Completion trend</span>
                  <span>{completionRate}%</span>
                </div>
                <div className="mt-2 h-2.5 rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    className="h-2.5 rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400"
                    style={{ width: `${Math.max(completionRate, 8)}%` }}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-950 dark:text-white">
                    <CalendarClock className="h-4 w-4 text-blue-500" />
                    Next best move
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {stats.resumes.length
                      ? 'Run one more session and compare it against your latest report to tighten weak sections.'
                      : 'Upload a current resume first so the interview questions and scoring become role-aware.'}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-950 dark:text-white">
                    <Sparkles className="h-4 w-4 text-cyan-500" />
                    Copilot recommendation
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    Ask the AI chat to generate follow-up questions from your last interview so you can rehearse targeted improvements.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-6 shadow-[0_30px_70px_-50px_rgba(15,23,42,0.4)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/75">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Resume shelf
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
              Latest uploaded files
            </h2>

            {recentResumes.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
                No resumes uploaded yet. Add one to personalize questions, context, and scoring.
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {recentResumes.map((resume) => (
                  <div
                    key={resume.id}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/90 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                        {resume.fileName ?? 'Untitled resume'}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(resume.createdAt)}
                      </p>
                    </div>
                    <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
