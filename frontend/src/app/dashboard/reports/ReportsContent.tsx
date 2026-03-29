/* eslint-disable */
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { interviewAPI } from '@/lib/api';
import { CheckCircle, TrendingUp, AlertCircle, Lightbulb, FileText, ArrowLeft, Download } from 'lucide-react';

function ScoreMeter({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span style={{ color: '#8888aa' }}>{label}</span>
        <span className="font-semibold text-white">{value}/10</span>
      </div>
      <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
        <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${value * 10}%`, background: color }} />
      </div>
    </div>
  );
}

export default function ReportsContent({ id }: { id?: string | null }) {
  const router = useRouter();
  const [interview, setInterview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    interviewAPI.get(id).then((r) => setInterview(r.data.interview)).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (!id) return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-6">Interview Reports</h1>
      <div className="glass-card p-10 text-center">
        <FileText className="w-12 h-12 mx-auto mb-3" style={{ color: '#8888aa' }} />
        <p className="text-white font-medium">Select an interview from history to view its report.</p>
        <Link href="/dashboard/history" className="btn-primary mt-4 inline-flex text-sm">View History</Link>
      </div>
    </div>
  );

  if (loading) return <div className="flex items-center justify-center h-64 text-white">Loading report...</div>;
  if (!interview) return <div className="text-center text-white py-20">Report not found.</div>;

  const handleDownloadPDF = async () => {
    const element = document.getElementById('report-content');
    if (!element) return;
    const opt: any = {
      margin: 0.5,
      filename: `Interview_Report_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    // Dynamically import to avoid SSR 'self is not defined' errors
    const html2pdf = (await import('html2pdf.js')).default;
    html2pdf().set(opt).from(element).save();
  };

  // If reportData exists, use it. Otherwise, fallback to the old score aggregation format
  let reportData = null;
  if (interview.reportData) {
    if (typeof interview.reportData === 'string') {
      try { reportData = JSON.parse(interview.reportData); } catch (e) {}
    } else {
      reportData = interview.reportData;
    }
  }
  
  const answers = interview.questions?.flatMap((q: any) => q.answer ? [q.answer] : []) ?? [];
  const evals = answers.map((a: any) => a.evaluation).filter(Boolean);
  const avgOf = (key: string) => evals.length ? (evals.reduce((s: number, e: any) => s + (e[key] ?? 0), 0) / evals.length).toFixed(1) : '0';

  const overallScore = reportData ? ((reportData.communication + reportData.confidence + reportData.technicalKnowledge) / 3).toFixed(1) : (interview.score?.toFixed(1) ?? avgOf('score'));
  const commScore = reportData?.communication ? (reportData.communication / 10).toFixed(1) : avgOf('communication');
  const confScore = reportData?.confidence ? (reportData.confidence / 10).toFixed(1) : avgOf('confidence');
  const techScore = reportData?.technicalKnowledge ? (reportData.technicalKnowledge / 10).toFixed(1) : avgOf('technicalAccuracy');

  const allStrengths = reportData ? reportData.strengths : evals.flatMap((e: any) => e.strengths ?? []).slice(0, 4);
  const allWeaknesses = reportData ? reportData.weaknesses : evals.flatMap((e: any) => e.weaknesses ?? []).slice(0, 4);
  const allSuggestions = reportData ? reportData.suggestions : evals.flatMap((e: any) => e.suggestions ?? []).slice(0, 4);

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="btn-secondary text-sm py-2 px-3">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white">Interview Report</h1>
            <p className="text-sm mt-0.5" style={{ color: '#8888aa' }}>
              {interview.category} · {interview.language} · {new Date(interview.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <button onClick={handleDownloadPDF} className="btn-primary flex items-center gap-2 text-sm px-4 py-2">
          <Download className="w-4 h-4" /> Export PDF
        </button>
      </div>

      <div id="report-content" className="space-y-6">
        {reportData?.overallSummary && (
          <div className="glass-card p-6">
            <h2 className="font-semibold text-white mb-2 flex items-center gap-2"><FileText className="w-5 h-5" style={{ color: '#6c63ff' }} /> Overall Summary</h2>
            <p className="text-sm leading-relaxed" style={{ color: '#8888aa' }}>{reportData.overallSummary}</p>
          </div>
        )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score overview */}
        <div className="glass-card p-6">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5" style={{ color: '#6c63ff' }} /> Overall Score</h2>
          <div className="text-5xl font-bold text-center mb-4" style={{ color: '#6c63ff' }}>
            {parseFloat(overallScore).toFixed(1)}<span className="text-2xl text-gray-500">/10</span>
          </div>
          <div className="space-y-3">
            <ScoreMeter label="Communication" value={parseFloat(commScore) || 0} color="#4ecdc4" />
            <ScoreMeter label="Confidence" value={parseFloat(confScore) || 0} color="#6c63ff" />
            <ScoreMeter label="Technical" value={parseFloat(techScore) || 0} color="#fbbf24" />
          </div>
        </div>

        {/* Strengths & Weaknesses */}
        <div className="space-y-4">
          <div className="glass-card p-5">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2"><CheckCircle className="w-4 h-4" style={{ color: '#22d3a0' }} /> Strengths</h3>
            {allStrengths.length > 0 ? allStrengths.map((s: string, i: number) => (
              <div key={i} className="flex items-start gap-2 mb-2 text-sm" style={{ color: '#8888aa' }}>
                <span style={{ color: '#22d3a0' }}>✓</span>{s}
              </div>
            )) : <p className="text-sm" style={{ color: '#8888aa' }}>Complete the interview to see results.</p>}
          </div>

          <div className="glass-card p-5">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2"><AlertCircle className="w-4 h-4" style={{ color: '#ff4d6d' }} /> Areas to Improve</h3>
            {allWeaknesses.length > 0 ? allWeaknesses.map((w: string, i: number) => (
              <div key={i} className="flex items-start gap-2 mb-2 text-sm" style={{ color: '#8888aa' }}>
                <span style={{ color: '#ff4d6d' }}>!</span>{w}
              </div>
            )) : <p className="text-sm" style={{ color: '#8888aa' }}>No data yet.</p>}
          </div>
        </div>

        {/* Suggestions */}
        <div className="glass-card p-5">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2"><Lightbulb className="w-4 h-4" style={{ color: '#fbbf24' }} /> Suggestions</h3>
          {allSuggestions.length > 0 ? allSuggestions.map((s: string, i: number) => (
            <div key={i} className="mb-3 p-3 rounded-lg text-sm" style={{ background: 'rgba(251,191,36,0.08)', color: '#fbbf24' }}>
              {s}
            </div>
          )) : <p className="text-sm" style={{ color: '#8888aa' }}>No suggestions yet.</p>}
        </div>
      </div>

      {/* Transcript */}
      {interview.transcript && (
        <div className="glass-card p-6 mt-6 html2pdf__page-break">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2"><FileText className="w-5 h-5" style={{ color: '#6c63ff' }} /> Full Transcript</h2>
          <pre className="text-sm leading-loose whitespace-pre-wrap" style={{ color: '#8888aa', fontFamily: 'Inter, sans-serif' }}>
            {interview.transcript.text}
          </pre>
        </div>
      )}
    </div>
    </div>
  );
}
