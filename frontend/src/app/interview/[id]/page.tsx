/* eslint-disable */
'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { interviewAPI, aiAPI } from '@/lib/api';
import { Mic, MicOff, PhoneOff, Volume2, User } from 'lucide-react';
import Image from 'next/image';
import AIAvatar from '@/components/interview/AIAvatar';

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
  const [isMicOn, setIsMicOn] = useState(false);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [isLast, setIsLast] = useState(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const transcriptRef = useRef<string>('');

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
    if (!synthRef.current) { onEnd?.(); return; }
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.onend = () => onEnd?.();
    synthRef.current.speak(utterance);
  }, []);

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

  const startListening = () => {
    if (!streamRef.current) { toast.error('No microphone found'); return; }
    try {
      const mediaRecorder = new MediaRecorder(streamRef.current);
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsMicOn(true);
      setTranscript('');
    } catch (err) {
      toast.error('Failed to start microphone');
    }
  };

  const stopListening = async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsMicOn(false);
  };
  
  const getTranscription = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!mediaRecorderRef.current) return resolve('');
      
      mediaRecorderRef.current.onstop = async () => {
        setIsMicOn(false);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', audioBlob, 'record.webm');
        try {
          const res = await aiAPI.transcribe(formData);
          resolve(res.data.transcription?.text || '');
        } catch (err) {
          reject(err);
        }
      };
      
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      } else {
        resolve(transcript);
      }
    });
  };

  const toggleMic = () => {
    if (phase !== 'listening') return;
    isMicOn ? stopListening() : startListening();
  };

  const submitAnswer = async () => {
    if (!currentQuestion) {
      toast.error('No active question');
      return;
    }
    setPhase('processing');
    
    let finalTranscript = transcript;
    if (isMicOn && mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        setTranscript('Transcribing audio...');
        finalTranscript = await getTranscription();
        setTranscript(finalTranscript);
      } catch (err) {
        toast.error('Failed to transcribe audio');
        setPhase('listening');
        return;
      }
    }

    if (!finalTranscript.trim()) {
      toast.error('Please speak your answer first');
      setPhase('listening');
      return;
    }
    try {
      if (isLast) {
        // Last question — submit and finish
        await interviewAPI.nextTurn(id, { questionId: currentQuestion.id, answerContent: finalTranscript, speakNextQuestion: false });
        await interviewAPI.finish(id);
        setPhase('done');
        toast.success('Interview completed! 🎉');
        setTimeout(() => router.push(`/dashboard/reports?id=${id}`), 2000);
      } else {
        const res = await interviewAPI.nextTurn(id, { questionId: currentQuestion.id, answerContent: finalTranscript, speakNextQuestion: true });
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
    <div className="min-h-screen flex flex-col" style={{ background: '#0a0a0f' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="SayBee AI Logo" width={24} height={24} className="object-contain" />
          <span className="font-bold text-white text-lg">SayBee AI Interview</span>
        </div>
        {currentQuestion && (
          <div className="flex items-center gap-3">
            <span className="text-xs px-3 py-1 rounded-full font-medium" style={{ background: `${stageColor}18`, color: stageColor }}>
              {currentQuestion.stage}
            </span>
            <span className="text-sm" style={{ color: '#8888aa' }}>Q{currentQuestion.questionNumber} / 10</span>
          </div>
        )}
      </div>

      {/* Main interview area */}
      <div className="flex flex-1 gap-6 p-6">
        {/* AI Avatar (left) */}
        <div className="flex-1 glass-card flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(circle at 50% 50%, ${stageColor}40, transparent)` }} />
          
          {/* 3D AIAvatar Canvas */}
          <div className="w-full h-full relative z-10 flex-1 flex flex-col items-center justify-center min-h-[400px]">
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

        {/* User webcam (right) */}
        <div className="w-80 flex flex-col gap-4">
          <div className="glass-card flex-1 flex flex-col items-center justify-center overflow-hidden relative" style={{ minHeight: '280px' }}>
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
      <div className="flex items-center justify-center gap-6 p-6 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <button onClick={toggleMic} disabled={phase !== 'listening'}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 ${isMicOn ? 'bg-purple-600 shadow-lg shadow-purple-500/30' : 'bg-white/10'}`}>
          {isMicOn ? <Mic className="w-6 h-6 text-white" /> : <MicOff className="w-6 h-6 text-white" />}
        </button>

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
