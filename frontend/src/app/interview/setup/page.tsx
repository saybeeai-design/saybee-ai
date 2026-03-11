/* eslint-disable */
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { resumeAPI, interviewAPI } from '@/lib/api';
import { useInterviewStore } from '@/store/globalStore';
import { FileText, Briefcase, Globe, ChevronRight } from 'lucide-react';

const CATEGORIES = ['Software Developer', 'HR Interview', 'Government Jobs', 'SSC', 'UPSC', 'Banking', 'Custom Role'];
const LANGUAGES = ['English', 'Hindi', 'Assamese', 'Tamil', 'Bengali'];

interface Resume { id: string; fileName: string; }

export default function InterviewSetupPage() {
  const router = useRouter();
  const { setInterview } = useInterviewStore();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [form, setForm] = useState({ resumeId: '', category: '', language: 'English' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    resumeAPI.list().then((r) => {
      setResumes(r.data.resumes);
      if (r.data.resumes.length > 0) setForm((f) => ({ ...f, resumeId: r.data.resumes[0].id }));
    }).catch(() => toast.error('Failed to load resumes'));
  }, []);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.resumeId) { toast.error('Upload a resume first'); return; }
    if (!form.category) { toast.error('Select an interview category'); return; }

    setLoading(true);
    try {
      const res = await interviewAPI.start(form);
      const interviewId = res.data.interview.id;
      setInterview(interviewId);
      router.push(`/interview/${interviewId}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to start interview');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Setup Interview</h1>
          <p className="mt-2" style={{ color: '#8888aa' }}>Configure your AI interview session</p>
        </div>

        <form onSubmit={handleStart} className="glass-card p-8 space-y-6">
          {/* Resume */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold mb-3" style={{ color: '#8888aa' }}>
              <FileText className="w-4 h-4" /> Select Resume
            </label>
            {resumes.length === 0 ? (
              <div className="p-4 rounded-xl text-center text-sm" style={{ background: 'rgba(255,77,109,0.1)', color: '#ff4d6d', border: '1px solid rgba(255,77,109,0.2)' }}>
                No resumes found. <a href="/dashboard/resume" className="underline">Upload one first ↗</a>
              </div>
            ) : (
              <select
                className="input-field"
                value={form.resumeId}
                onChange={(e) => setForm({ ...form, resumeId: e.target.value })}
              >
                {resumes.map((r) => <option key={r.id} value={r.id}>{r.fileName}</option>)}
              </select>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold mb-3" style={{ color: '#8888aa' }}>
              <Briefcase className="w-4 h-4" /> Interview Category
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setForm({ ...form, category: cat })}
                  className="px-4 py-3 rounded-xl text-sm font-medium text-left transition-all duration-150"
                  style={{
                    background: form.category === cat ? 'rgba(108,99,255,0.2)' : 'rgba(255,255,255,0.04)',
                    border: form.category === cat ? '1px solid #6c63ff' : '1px solid rgba(255,255,255,0.08)',
                    color: form.category === cat ? '#6c63ff' : '#8888aa',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold mb-3" style={{ color: '#8888aa' }}>
              <Globe className="w-4 h-4" /> Interview Language
            </label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setForm({ ...form, language: lang })}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150"
                  style={{
                    background: form.language === lang ? 'rgba(78,205,196,0.2)' : 'rgba(255,255,255,0.04)',
                    border: form.language === lang ? '1px solid #4ecdc4' : '1px solid rgba(255,255,255,0.08)',
                    color: form.language === lang ? '#4ecdc4' : '#8888aa',
                  }}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" className="btn-primary w-full" disabled={loading || resumes.length === 0}>
            {loading ? 'Starting...' : <><span>Start AI Interview</span><ChevronRight className="w-5 h-5" /></>}
          </button>
        </form>
      </div>
    </div>
  );
}
