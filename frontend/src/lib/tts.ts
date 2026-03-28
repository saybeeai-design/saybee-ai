export function speakText(text: string, language: string = "en-US", onEnd?: () => void) {
  if (typeof window === "undefined") {
    onEnd?.();
    return;
  }

  const synth = window.speechSynthesis;
  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language;
  utterance.rate = 1;
  utterance.pitch = 1;

  if (onEnd) {
    utterance.onend = () => onEnd();
    utterance.onerror = () => onEnd(); // gracefully handle errors
  }

  synth.speak(utterance);
}

export function getLanguageCode(lang: string) {
  switch (lang.toLowerCase()) {
    case "english": return "en-US";
    case "hindi": return "hi-IN";
    case "assamese": return "as-IN";
    case "bengali": return "bn-IN";
    case "marathi": return "mr-IN";
    case "gujarati": return "gu-IN";
    case "punjabi": return "pa-IN";
    case "tamil": return "ta-IN";
    case "telugu": return "te-IN";
    case "kannada": return "kn-IN";
    case "malayalam": return "ml-IN";
    case "odia": return "or-IN";
    case "urdu": return "ur-IN";
    default: return "en-US";
  }
}

export function getSafeLanguage(lang: string) {
  const supported = ["en-US", "hi-IN", "bn-IN"];
  const code = getLanguageCode(lang);
  if (supported.includes(code)) return code;
  return "hi-IN"; // fallback
}
