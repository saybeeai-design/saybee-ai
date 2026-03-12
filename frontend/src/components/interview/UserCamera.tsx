"use strict";
import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff } from "lucide-react";

const UserCamera = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user"
          },
          audio: false,
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsActive(true);
        }
      } catch (err) {
        console.error("Error accessing webcam:", err);
        setError("Could not access camera. Please ensure permissions are granted.");
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div className="relative w-full max-w-md aspect-video bg-gray-900 rounded-2xl overflow-hidden border-2 border-blue-500/30 shadow-2xl shadow-blue-500/10 transition-all duration-500 hover:border-blue-400/50">
      {!isActive && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 space-y-3">
          <div className="animate-pulse bg-gray-800 rounded-full p-4">
            <Camera size={32} />
          </div>
          <p className="text-sm font-medium">Initializing camera...</p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 bg-red-950/20 p-6 text-center">
          <CameraOff size={32} className="mb-3" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-700 ${
          isActive ? "opacity-100" : "opacity-0"
        }`}
      />

      <div className="absolute bottom-4 right-4 flex items-center space-x-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
        <div className={`w-2 h-2 rounded-full ${isActive ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
        <span className="text-[10px] text-white/80 font-bold uppercase tracking-wider">Live Preview</span>
      </div>
    </div>
  );
};

export default UserCamera;
