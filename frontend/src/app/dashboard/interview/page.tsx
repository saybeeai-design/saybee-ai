'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { interviewAPI, resumeAPI } from '@/lib/api';
import {
  AlertCircle,
  Brain,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Globe,
  Loader2,
  Play,
  Upload,
  Video,
} from 'lucide-react';
import { useAuthStore } from '@/store/globalStore';
import UpgradeModal from '@/components/UpgradeModal';

interface ResumeRecord {
  id: string;
  fileName: string;
  fileUrl?: string | null;
  createdAt?: string;
}

interface InterviewRecord {
  id: string;
  status: string;
  createdAt: string;
  language?: string | null;
  resume?: { fileName?: string | null } | null;
}

type UploadStatus = 'idle' | 'uploading' | 'done' | 'error';

const ROLE_OPTIONS = ['UPSC', 'State PSC', 'SSC', 'Banking', 'Custom'] as const;
const STATE_PSC_OPTIONS = [
  'Assam PSC',
  'WBPSC',
  'BPSC',
  'APPSC',
  'UPPSC',
  'MPPSC',
  'Kerala PSC',
  'TNPSC',
  'OPSC',
  'MPSC',
] as const;
const BANKING_OPTIONS = [
  'SBI PO',
  'SBI Clerk',
  'IBPS PO',
  'IBPS Clerk',
  'RBI Grade B',
  'NABARD',
  'LIC AAO',
] as const;
const LANGUAGE_OPTIONS = [
  'English',
  'Hindi',
  'Assamese',
  'Bengali',
  'Tamil',
  'Telugu',
  'Marathi',
  'Gujarati',
] as const;
const MAX_RESUME_SIZE = 5 * 1024 * 1024;

function getRequestErrorMessage(error: unknown, fallbackMessage: string) {
  if (typeof error !== 'object' || error === null || !('response' in error)) {
    return fallbackMessage;
  }

  const response = (error as { response?: { data?: { message?: string; error?: string } } }).response;

  return response?.data?.message || response?.data?.error || fallbackMessage;
}

function getInterviewCategory(role: string, subRole: string, customRole: string) {
  const trimmedCustomRole = customRole.trim();

  if (role === 'Custom') {
    return trimmedCustomRole;
  }

  if (subRole) {
    return `${role} - ${subRole}`;
  }

  return role;
}

export default function InterviewDashboard() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuthStore();

  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [interviews, setInterviews] = useState<InterviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedSubRole, setSelectedSubRole] = useState('');
  const [customRole, setCustomRole] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const [resumeResponse, interviewResponse] = await Promise.all([
          resumeAPI.list(),
          interviewAPI.list(),
        ]);

        if (!isMounted) {
          return;
        }

        const nextResumes = resumeResponse.data.resumes ?? [];
        const nextInterviews = interviewResponse.data.interviews ?? [];

        setResumes(nextResumes);
        setInterviews(nextInterviews);
        setSelectedResumeId((currentResumeId) => {
          if (currentResumeId && nextResumes.some((resume: ResumeRecord) => resume.id === currentResumeId)) {
            return currentResumeId;
          }

          return nextResumes[0]?.id ?? '';
        });
      } catch (fetchError) {
        console.error('Failed to fetch data:', fetchError);
        if (isMounted) {
          setError('Could not load dashboard data. Please try again.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedResume = resumes.find((resume) => resume.id === selectedResumeId) ?? null;
  const trimmedCustomRole = customRole.trim();
  const requiresSubRole = selectedRole === 'State PSC' || selectedRole === 'Banking';
  const requiresCustomRole = selectedRole === 'Custom';
  const conditionalFieldComplete = requiresSubRole
    ? Boolean(selectedSubRole)
    : requiresCustomRole
      ? Boolean(trimmedCustomRole)
      : true;
  const selectedCategory = getInterviewCategory(selectedRole, selectedSubRole, trimmedCustomRole);
  const canStartInterview =
    Boolean(selectedResumeId && selectedRole && selectedLanguage && conditionalFieldComplete) &&
    !starting &&
    uploadStatus !== 'uploading';

  const openResumePicker = () => {
    fileInputRef.current?.click();
  };

  const resetResumePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleResumeSelect = (resumeId: string) => {
    setSelectedResumeId(resumeId);
    setError('');
  };

  const handleResumeUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setResumeFile(file);
    setError('');
    setUploadMessage('');

    if (file.type !== 'application/pdf') {
      setUploadStatus('error');
      setUploadMessage('Only PDF files are supported.');
      resetResumePicker();
      return;
    }

    if (file.size > MAX_RESUME_SIZE) {
      setUploadStatus('error');
      setUploadMessage('File size must be less than 5MB.');
      resetResumePicker();
      return;
    }

    const formData = new FormData();
    formData.append('resume', file);

    setUploadStatus('uploading');
    setUploadMessage(`Uploading ${file.name}...`);

    try {
      const response = await resumeAPI.upload(formData);
      const uploadedResume = response.data.resume as ResumeRecord;

      setResumes((currentResumes) => [
        uploadedResume,
        ...currentResumes.filter((resume) => resume.id !== uploadedResume.id),
      ]);
      setSelectedResumeId(uploadedResume.id);
      setUploadStatus('done');
      setUploadMessage('Resume uploaded successfully.');
    } catch (uploadError: unknown) {
      console.error('Failed to upload resume:', uploadError);
      setUploadStatus('error');
      setUploadMessage(getRequestErrorMessage(uploadError, 'Resume upload failed. Please try again.'));
    } finally {
      resetResumePicker();
    }
  };

  const handleRoleChange = (role: string) => {
    setSelectedRole(role);
    setSelectedSubRole('');
    setCustomRole('');
    setError('');
  };

  const handleStartInterview = async () => {
    if (!selectedResumeId) {
      setError('Upload or select a resume to continue.');
      return;
    }

    if (!selectedRole) {
      setError('Select a role to continue.');
      return;
    }

    if (selectedRole === 'State PSC' && !selectedSubRole) {
      setError('Select a State PSC exam to continue.');
      return;
    }

    if (selectedRole === 'Banking' && !selectedSubRole) {
      setError('Select a banking exam to continue.');
      return;
    }

    if (selectedRole === 'Custom' && !trimmedCustomRole) {
      setError('Enter your custom role or preparation type to continue.');
      return;
    }

    if (!selectedLanguage) {
      setError('Select an interview language to continue.');
      return;
    }

    if (!user || user.credits <= 0) {
      setIsUpgradeModalOpen(true);
      return;
    }

    setStarting(true);
    setError('');

    try {
      const response = await interviewAPI.start({
        resume: selectedResumeId,
        role: selectedRole,
        subRole: selectedSubRole,
        customRole: trimmedCustomRole,
        language: selectedLanguage,
      });
      const interviewId = response.data.interview?.id;

      if (!interviewId) {
        throw new Error('Interview id missing from response');
      }

      router.push(`/interview/${interviewId}`);
    } catch (startError: unknown) {
      console.error('Failed to start interview:', startError);
      setError(getRequestErrorMessage(startError, 'Failed to start interview session.'));
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
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Video className="w-8 h-8 text-blue-500" />
          AI Interview
        </h1>
        <p className="text-slate-400 mt-1">Configure and start your simulated AI interview session.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#1e293b] border border-slate-700/50 rounded-2xl p-8 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
              <Brain className="w-32 h-32 text-blue-400" />
            </div>

            <div className="relative z-10 space-y-6">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                hidden
                onChange={handleResumeUpload}
              />

              <div className="rounded-2xl border border-slate-700 bg-slate-900/35 p-5 space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">Step 1</p>
                    <h2 className="mt-2 text-lg font-semibold text-white">Resume Selection</h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Choose the resume that should drive interview context and feedback.
                    </p>
                  </div>
                  {selectedResume && (
                    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Uploaded
                    </span>
                  )}
                </div>

                {selectedResume ? (
                  <div className="space-y-3">
                    <div className="flex flex-col gap-4 rounded-xl border border-slate-700 bg-slate-950/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600/10 text-blue-400">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Active Resume
                          </p>
                          <p className="mt-1 truncate text-sm font-semibold text-white">
                            {selectedResume.fileName}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {resumeFile?.name === selectedResume.fileName && uploadStatus === 'done'
                              ? 'Latest upload is ready for this interview.'
                              : 'This file will be used for question context and evaluation.'}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={openResumePicker}
                        disabled={uploadStatus === 'uploading'}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {uploadStatus === 'uploading' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                        Change Resume
                      </button>
                    </div>

                    {resumes.length > 1 && (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {resumes.map((resume) => (
                          <button
                            key={resume.id}
                            type="button"
                            onClick={() => handleResumeSelect(resume.id)}
                            className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                              selectedResumeId === resume.id
                                ? 'border-blue-500 bg-blue-600/10 text-white ring-2 ring-blue-500/20'
                                : 'border-slate-700 bg-slate-950/50 text-slate-400 hover:border-slate-600'
                            }`}
                          >
                            <div
                              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                                selectedResumeId === resume.id
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-800 text-slate-500'
                              }`}
                            >
                              <FileText className="w-4 h-4" />
                            </div>
                            <span className="truncate text-sm font-medium">{resume.fileName}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={openResumePicker}
                    disabled={uploadStatus === 'uploading'}
                    className="w-full rounded-xl border border-dashed border-slate-700 bg-slate-950/45 p-6 text-center transition-colors hover:border-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Upload className="mx-auto mb-3 h-8 w-8 text-blue-400" />
                    <p className="text-sm font-semibold text-white">
                      {uploadStatus === 'uploading' ? 'Uploading resume...' : 'Upload your PDF resume'}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">PDF only · Max 5MB</p>
                  </button>
                )}

                {uploadMessage && (
                  <div
                    className={`flex items-center gap-3 rounded-xl border p-4 text-sm ${
                      uploadStatus === 'error'
                        ? 'border-rose-500/20 bg-rose-500/10 text-rose-400'
                        : uploadStatus === 'done'
                          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                          : 'border-blue-500/20 bg-blue-500/10 text-blue-300'
                    }`}
                  >
                    {uploadStatus === 'error' ? (
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    ) : uploadStatus === 'done' ? (
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    ) : (
                      <Loader2 className="w-5 h-5 flex-shrink-0 animate-spin" />
                    )}
                    {uploadMessage}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900/35 p-5 space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">Step 2</p>
                  <h2 className="mt-2 text-lg font-semibold text-white">Role Selection</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Pick the interview track so SayBee AI can tailor the session correctly.
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                    <Brain className="w-4 h-4 text-blue-400" />
                    Select Role
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(event) => handleRoleChange(event.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-blue-500"
                  >
                    <option value="">Choose a role</option>
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>

                <AnimatePresence initial={false}>
                  {selectedRole === 'State PSC' && (
                    <motion.div
                      key="state-psc"
                      initial={{ opacity: 0, y: -8, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -8, height: 0 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-950/45 p-4">
                        <label className="text-sm font-semibold text-slate-300">Select State PSC</label>
                        <select
                          value={selectedSubRole}
                          onChange={(event) => {
                            setSelectedSubRole(event.target.value);
                            setError('');
                          }}
                          className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-blue-500"
                        >
                          <option value="">Choose a State PSC exam</option>
                          {STATE_PSC_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                    </motion.div>
                  )}

                  {selectedRole === 'Banking' && (
                    <motion.div
                      key="banking"
                      initial={{ opacity: 0, y: -8, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -8, height: 0 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-950/45 p-4">
                        <label className="text-sm font-semibold text-slate-300">Select Banking Exam</label>
                        <select
                          value={selectedSubRole}
                          onChange={(event) => {
                            setSelectedSubRole(event.target.value);
                            setError('');
                          }}
                          className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-blue-500"
                        >
                          <option value="">Choose a banking exam</option>
                          {BANKING_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                    </motion.div>
                  )}

                  {selectedRole === 'Custom' && (
                    <motion.div
                      key="custom-role"
                      initial={{ opacity: 0, y: -8, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -8, height: 0 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-950/45 p-4">
                        <label className="text-sm font-semibold text-slate-300">
                          Enter Role or Preparation Type
                        </label>
                        <input
                          type="text"
                          value={customRole}
                          onChange={(event) => {
                            setCustomRole(event.target.value);
                            setError('');
                          }}
                          placeholder="Enter role or preparation type"
                          className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-blue-500"
                        />
                        <p className="text-xs text-slate-500">
                          Examples: Data Scientist, Software Engineer, Army Interview
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {selectedCategory && (
                  <div className="rounded-xl border border-blue-500/10 bg-blue-500/5 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
                      Selected Track
                    </p>
                    <p className="mt-2 text-sm font-medium text-white">{selectedCategory}</p>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900/35 p-5 space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">Step 3</p>
                  <h2 className="mt-2 text-lg font-semibold text-white">Language Selection</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Choose the language for questions, responses, and evaluation.
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                    <Globe className="w-4 h-4 text-blue-400" />
                    Interview Language
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGE_OPTIONS.map((language) => (
                      <button
                        key={language}
                        type="button"
                        onClick={() => {
                          setSelectedLanguage(language);
                          setError('');
                        }}
                        className={`rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
                          selectedLanguage === language
                            ? 'border-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                            : 'border-slate-700 bg-slate-950/50 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        {language}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-400">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={handleStartInterview}
                disabled={!canStartInterview}
                className="w-full flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 py-4 text-lg font-bold text-white shadow-xl shadow-blue-500/25 transition-all active:scale-[0.98] hover:from-blue-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {starting ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Preparing Interview...
                  </>
                ) : (
                  <>
                    <Play className="w-6 h-6 fill-current transition-transform" />
                    Start Interview
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <p className="text-xs text-slate-400">
                Make sure your camera and microphone are working properly before starting.
              </p>
            </div>
            <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <p className="text-xs text-slate-400">
                The AI will analyze your facial expressions and voice tone in real-time.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              Recent Sessions
            </h2>
          </div>

          <div className="space-y-3">
            {interviews.length > 0 ? (
              interviews.slice(0, 5).map((interview) => (
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
                      <p className="text-xs text-slate-500">{interview.language || 'English'}</p>
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
                type="button"
                onClick={() => router.push('/dashboard/history')}
                className="w-full py-2 text-xs font-bold text-slate-500 hover:text-white transition-colors"
              >
                View full history →
              </button>
            )}
          </div>
        </div>
      </div>

      <UpgradeModal isOpen={isUpgradeModalOpen} onClose={() => setIsUpgradeModalOpen(false)} />
    </div>
  );
}
