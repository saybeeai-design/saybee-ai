'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { resumeAPI, interviewAPI } from '@/lib/api';
import { 
  Video, 
  FileText, 
  Globe, 
  Play, 
  Clock, 
  ChevronRight, 
  AlertCircle,
  Loader2,
  Calendar,
  CheckCircle2,
  Brain
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function InterviewDashboard() {
  const router = useRouter();
  const [resumes, setResumes] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  // Form State
  const [selectedResume, setSelectedResume] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [rRes, iRes] = await Promise.all([
          resumeAPI.list(),
          interviewAPI.list()
        ]);
        setResumes(rRes.data);
        setInterviews(iRes.data);
        if (rRes.data.length > 0) setSelectedResume(rRes.data[0].id);
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError('Could not load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleStartInterview = async () => {
    if (!selectedResume) {
      setError('Please select a resume to continue.');
      return;
    }

    setStarting(true);
    setError('');
    try {
      const res = await interviewAPI.start({
        resumeId: selectedResume,
        category: 'General', // Default for now
        language: selectedLanguage
      });
      
      // Navigate to the interview setup or room
      router.push(`/interview/${res.data.id}`);
    } catch (err: any) {
      console.error('Failed to start interview:', err);
      setError(err.response?.data?.error || 'Failed to start interview session.');
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Video className="w-8 h-8 text-blue-500" />
          AI Interview
        </h1>
        <p className="text-slate-400 mt-1">Configure and start your simulated AI interview session.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Configuration Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#1e293b] border border-slate-700/50 rounded-2xl p-8 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
              <Brain className="w-32 h-32 text-blue-400" />
            </div>

            <div className="relative z-10 space-y-8">
              <div className="space-y-6">
                {/* Resume Selection */}
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                    <FileText className="w-4 h-4 text-blue-400" />
                    Select Resume
                  </label>
                  {resumes.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {resumes.map((resume: any) => (
                        <button
                          key={resume.id}
                          onClick={() => setSelectedResume(resume.id)}
                          className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
                            selectedResume === resume.id
                              ? 'bg-blue-600/10 border-blue-500 text-white ring-2 ring-blue-500/20'
                              : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-600'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedResume === resume.id ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                            <FileText className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-medium truncate">{resume.fileName}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 bg-slate-900/50 border border-dashed border-slate-700 rounded-xl text-center">
                      <p className="text-sm text-slate-400">No resumes found. Please upload one first.</p>
                      <button 
                        onClick={() => router.push('/dashboard/resume')}
                        className="mt-3 text-blue-400 text-xs font-bold hover:underline"
                      >
                        Go to Resumes →
                      </button>
                    </div>
                  )}
                </div>

                {/* Language Selection */}
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                    <Globe className="w-4 h-4 text-blue-400" />
                    Interview Language
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['English', 'Spanish', 'French', 'German', 'Bengali'].map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setSelectedLanguage(lang)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                          selectedLanguage === lang
                            ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  {error}
                </div>
              )}

              <button
                onClick={handleStartInterview}
                disabled={starting || resumes.length === 0}
                className="w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-bold text-lg transition-all shadow-xl shadow-blue-500/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {starting ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Preparing Interview...
                  </>
                ) : (
                  <>
                    <Play className="w-6 h-6 fill-current group-hover:scale-110 transition-transform" />
                    Start Session Now
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Tips */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <p className="text-xs text-slate-400">Make sure your camera and microphone are working properly before starting.</p>
            </div>
            <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <p className="text-xs text-slate-400">The AI will analyze your facial expressions and voice tone in real-time.</p>
            </div>
          </div>
        </div>

        {/* History Area */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              Recent Sessions
            </h2>
          </div>

          <div className="space-y-3">
            {interviews.length > 0 ? (
              interviews.slice(0, 5).map((interview: any) => (
                <div 
                  key={interview.id}
                  className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 hover:bg-slate-800/60 transition-colors group cursor-pointer"
                  onClick={() => router.push(`/dashboard/reports/${interview.id}`)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider bg-blue-400/10 px-2 py-0.5 rounded">
                      {interview.status}
                    </span>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                      <Calendar className="w-3 h-3" />
                      {new Date(interview.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white truncate max-w-[150px]">
                        {interview.resume?.fileName || 'Interview Session'}
                      </p>
                      <p className="text-xs text-slate-500">{interview.language}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors" />
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-6 bg-slate-800/20 border border-dashed border-slate-700 rounded-2xl text-center">
                <Video className="w-10 h-10 text-slate-700 mb-3" />
                <p className="text-sm text-slate-500">No session history yet.</p>
              </div>
            )}
            
            {interviews.length > 5 && (
              <button 
                onClick={() => router.push('/dashboard/history')}
                className="w-full py-2 text-xs font-bold text-slate-500 hover:text-white transition-colors"
              >
                View full history →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
