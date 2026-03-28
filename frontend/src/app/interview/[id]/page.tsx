/* eslint-disable */
'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { interviewAPI, aiAPI } from '@/lib/api';
import { Mic, MicOff, PhoneOff, Volume2, User, Globe } from 'lucide-react';
import Image from 'next/image';
import AIAvatar from '@/components/interview/AIAvatar';
import { speakText, getSafeLanguage } from '@/lib/tts';
import VoiceRecorder from '@/components/VoiceRecorder';

const INDIAN_LANGUAGES = [
  "English", "Hindi", "Assamese", "Bengali", "Marathi", "Gujarati", 
  "Punjabi", "Tamil", "Telugu", "Kannada", "Malayalam", "Odia", "Urdu"
];

const STAGE_COLORS: Record<string, string> = {
  Introduction: '#4ecdc4', Technical: '#6c63ff', Scenario: '#fbbf24', HR: '#22d3a0', Closing: '#ff4d6d',
};

type InterviewPhase = 'loading' | 'speaking' | 'listening' | 'processing' | 'done';

export default function InterviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [phase, setPhase] = useState<InterviewPhase>('loading');
  const [currentQuestion, setCurrentQuestion] = useState<{ id: string; content: string; stage: string; questionNumber: number } | null>(null);
  const [transcript, setTranscript] = useState('');
  const [evaluation, setEvaluation] = useState<any>(null);
  const [isLast, setIsLast] = useState(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('English');

  const synthRef = useRef<SpeechSynthesis | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Start webcam
  useEffect(() => {
    let mounted = true;

    const initWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!mounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err: any) {
        console.error("Webcam error:", err);
        setWebcamError(err.name === 'NotAllowedError' ? 'Camera or microphone access was denied.' : 'Failed to access webcam.');
        toast.error("Failed to access webcam. Check site permissions.");
      }
    };

    initWebcam();
    synthRef.current = window.speechSynthesis;
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
    loadFirstQuestion();
    
    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const playAudio = useCallback((base64: string | null, fallbackText: string, onEnd?: () => void) => {
    if (base64) {
      try {
        const audio = new Audio("data:audio/mp3;base64," + base64);
        audio.onended = () => onEnd?.();
        audio.onerror = () => fallbackSpeak(fallbackText, onEnd);
        audio.play().catch((err: any) => fallbackSpeak(fallbackText, onEnd));
      } catch (err) {
        fallbackSpeak(fallbackText, onEnd);
      }
    } else {
      fallbackSpeak(fallbackText, onEnd);
    }
  }, []);

  const fallbackSpeak = useCallback((text: string, onEnd?: () => void) => {
    speakText(text, getSafeLanguage(selectedLanguage), onEnd);
  }, [selectedLanguage]);

  const loadFirstQuestion = async () => {
    setPhase('loading');
    try {
      const res = await interviewAPI.generateQuestion(id, true);
      const q = res.data;
      setCurrentQuestion({ id: q.question.id, content: q.question.content, stage: q.stage, questionNumber: q.questionNumber });
      setIsLast(q.isLastQuestion);
      setPhase('speaking');
      playAudio(q.tts, q.question.content, () => setPhase('listening'));
    } catch (err: any) {
      toast.error('Failed to start interview');
      router.push('/dashboard');
    }
  };

  const handleTranscript = (text: string) => {
    setTranscript(text);
    submitAnswer(text); // Auto submit after transcript generates
  };

  const submitAnswer = async (textToSubmit?: string | React.MouseEvent) => {
    if (!currentQuestion) {
      toast.error('No active question');
      return;
    }
    
    const finalTranscript = typeof textToSubmit === 'string' ? textToSubmit : transcript;

    if (!finalTranscript.trim()) {
      toast.error('Please speak your answer first');
      setPhase('listening');
      return;
    }

    setPhase('processing');
    
    try {
      if (isLast) {
        await interviewAPI.nextTurn(id, { 
          questionId: currentQuestion.id, 
          answerContent: finalTranscript + (selectedLanguage !== 'English' ? `\n\n[Please ask the next question exclusively in ${selectedLanguage}]` : ''), 
          speakNextQuestion: false 
        });
        await interviewAPI.finish(id);
        setPhase('done');
        toast.success('Interview completed! 🎉');
        setTimeout(() => router.push(`/dashboard/reports?id=${id}`), 2000);
      } else {
        const res = await interviewAPI.nextTurn(id, { 
          questionId: currentQuestion.id, 
          answerContent: finalTranscript + (selectedLanguage !== 'English' ? `\n\n[Please ask the next question exclusively in ${selectedLanguage}]` : ''), 
          speakNextQuestion: true 
        });
        const data = res.data;
        setEvaluation(data.evaluation);

        if (data.interviewDone) {
          await interviewAPI.finish(id);
          setPhase('done');
          toast.success('Interview complete! Redirecting...');
          setTimeout(() => router.push(`/dashboard/reports?id=${id}`), 2000);
          return;
        }

        const next = data.nextQuestion;
        setCurrentQuestion({ id: next.id, content: next.content, stage: data.answeredQuestion?.stage ?? currentQuestion.stage, questionNumber: next.order });
        setIsLast(next.order >= 10);
        setTranscript('');
        setPhase('speaking');
        playAudio(data.tts, next.content, () => setPhase('listening'));
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to submit answer');
      setPhase('listening');
    }
  };

  const endInterview = async () => {
    if (!confirm('End interview now?')) return;
    await interviewAPI.finish(id);
    router.push(`/dashboard/reports?id=${id}`);
  };

  const stageColor = currentQuestion ? (STAGE_COLORS[currentQuestion.stage] ?? '#6c63ff') : '#6c63ff';
  const phaseLabel: Record<InterviewPhase, string> = {
    loading: 'Preparing...', speaking: 'AI is speaking...', listening: 'Your turn — speak your answer',
    processing: 'Analyzing...', done: 'Interview complete!',
  };

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden" style={{ background: '#0a0a0f' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between px-4 sm:px-8 py-4 border-b gap-4 sm:gap-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="SayBee AI Logo" width={24} height={24} className="object-contain" />
          <span className="font-bold text-white text-lg hidden md:inline">SayBee AI Interview</span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <select 
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="bg-transparent text-white text-xs font-medium focus:outline-none appearance-none cursor-pointer"
            >
              {INDIAN_LANGUAGES.map((lang) => (
                <option key={lang} value={lang} className="bg-slate-900">{lang}</option>
              ))}
            </select>
          </div>

          {currentQuestion && (
            <div className="flex items-center gap-3 border-l border-white/10 pl-4">
              <span className="text-xs px-3 py-1 rounded-full font-medium" style={{ background: `${stageColor}18`, color: stageColor }}>
                {currentQuestion.stage}
              </span>
              <span className="text-sm" style={{ color: '#8888aa' }}>Q{currentQuestion.questionNumber} / 10</span>
            </div>
          )}
        </div>
      </div>

      {/* Main interview area */}
      <div className="flex flex-col lg:flex-row flex-1 gap-4 lg:gap-6 p-4 lg:p-6 w-full max-w-full">
        {/* AI Avatar (left/top) */}
        <div className="flex-1 glass-card flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(circle at 50% 50%, ${stageColor}40, transparent)` }} />
          
          {/* 3D AIAvatar Canvas */}
          <div className="w-full h-full relative z-10 flex-1 flex flex-col items-center justify-center min-h-[250px] lg:min-h-[400px] mb-4 lg:mb-0">
             <AIAvatar isSpeaking={phase === 'speaking'} />
          </div>

          <p className="text-lg font-semibold text-white mb-2 z-10">AI Interviewer</p>
          <div className="flex items-center gap-2 text-sm z-10" style={{ color: stageColor }}>
            {phase === 'speaking' && <Volume2 className="w-4 h-4 animate-pulse" />}
            <span>{phaseLabel[phase]}</span>
          </div>

          {/* Question display */}
          {currentQuestion && phase !== 'loading' && (
            <div className="mt-6 mx-6 p-4 rounded-xl max-w-sm text-center z-10 mb-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-white text-sm leading-relaxed">&ldquo;{currentQuestion.content}&rdquo;</p>
            </div>
          )}
        </div>

        {/* User webcam (right/bottom) */}
        <div className="w-full lg:w-80 flex flex-col gap-4">
          <div className="glass-card flex-1 flex flex-col items-center justify-center overflow-hidden relative min-h-[200px] sm:min-h-[280px]">
            {webcamError ? (
              <div className="flex flex-col items-center justify-center p-6 text-center h-full" style={{ background: 'rgba(255,0,0,0.05)' }}>
                <MicOff className="w-10 h-10 text-red-400 mb-3" />
                <p className="text-sm font-medium text-white mb-1">Access Denied</p>
                <p className="text-xs text-slate-400">{webcamError}</p>
                <p className="text-xs text-slate-500 mt-4 leading-relaxed">
                  Please allow camera and microphone permissions in your browser settings (usually the lock icon next to the URL) to continue.
                </p>
              </div>
            ) : (
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover rounded-xl" />
            )}
            {!webcamError && (
              <div className="absolute bottom-3 left-3 flex items-center gap-2 px-2 py-1 rounded-lg text-xs" style={{ background: 'rgba(0,0,0,0.6)' }}>
                <div className="pulse-dot" />
                <span className="text-white">You</span>
              </div>
            )}
          </div>

          {/* Transcript */}
          <div className="glass-card p-4" style={{ minHeight: '100px' }}>
            <p className="text-xs font-medium mb-2" style={{ color: '#8888aa' }}>Your answer (transcript)</p>
            <p className="text-sm text-white leading-relaxed">
              {transcript || <span style={{ color: '#8888aa' }}>Start speaking after the AI finishes...</span>}
            </p>
          </div>

          {/* Evaluation preview */}
          {evaluation && (
            <div className="glass-card p-4">
              <p className="text-xs font-medium mb-2" style={{ color: '#8888aa' }}>Last answer eval</p>
              <div className="flex gap-3 text-center">
                {[['Score', evaluation.score], ['Comm.', evaluation.communication], ['Conf.', evaluation.confidence]].map(([l, v]) => (
                  <div key={l} className="flex-1">
                    <div className="text-lg font-bold" style={{ color: '#6c63ff' }}>{v}/10</div>
                    <div className="text-xs" style={{ color: '#8888aa' }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom controls */}
      <div className="flex items-center justify-center gap-4 sm:gap-6 p-4 sm:p-6 border-t pb-8 sm:pb-6 sticky bottom-0 z-20 bg-[#0a0a0f]/90 backdrop-blur-md" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <VoiceRecorder 
          onTranscript={handleTranscript} 
          disabled={phase !== 'listening'} 
        />

        <button onClick={submitAnswer} disabled={phase !== 'listening' && phase !== 'processing'}
          className="btn-primary px-8 py-3 text-base"
          style={{ opacity: (phase !== 'listening' && phase !== 'processing') ? 0.5 : 1 }}>
          Submit Answer
        </button>

        <button onClick={endInterview} className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200" style={{ background: 'rgba(255,77,109,0.15)', border: '1px solid rgba(255,77,109,0.3)' }}>
          <PhoneOff className="w-6 h-6" style={{ color: '#ff4d6d' }} />
        </button>
      </div>
    </div>
  );
}
