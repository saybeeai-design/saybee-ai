import { useState, useRef } from "react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { Mic, Square } from "lucide-react";

interface VoiceRecorderProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export default function VoiceRecorder({ onTranscript, disabled = false }: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function sendToBackend(blob: Blob) {
    const formData = new FormData();
    formData.append("audio", blob, "record.webm");

    try {
      const res = await api.post("/interviews/speech-to-text", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      return res.data.transcript;
    } catch (error) {
      console.error("STT error:", error);
      toast.error("Transcription failed");
      return null;
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setProcessing(true);
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const transcript = await sendToBackend(blob);
        chunksRef.current = [];
        setProcessing(false);
        if (transcript) {
          onTranscript(transcript);
        }
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (err) {
      toast.error("Could not access microphone");
      console.error("Mic error:", err);
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  }

  const toggleRecording = () => {
    if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={toggleRecording}
        disabled={disabled || processing}
        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${
          recording 
            ? "bg-red-500 shadow-lg shadow-red-500/30 hover:bg-red-600 animate-pulse" 
            : processing 
              ? "bg-slate-700 opacity-50 cursor-not-allowed" 
              : "bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-500/30"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        {recording ? (
          <Square className="w-5 h-5 text-white" fill="currentColor" />
        ) : (
          <Mic className="w-6 h-6 text-white" />
        )}
      </button>

      <span className="text-xs font-medium text-slate-300 min-h-[16px]">
        {recording ? (
          <span className="text-red-400 font-semibold animate-pulse">Recording...</span>
        ) : processing ? (
          <span className="text-blue-400">Processing audio...</span>
        ) : (
          "Click to speak"
        )}
      </span>
    </div>
  );
}
