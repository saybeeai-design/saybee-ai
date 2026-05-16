export {
  GEMINI_MODEL_NAME,
  GEMINI_TIMEOUT_MS,
  generateGeminiText,
  getGeminiClient,
  getGeminiModel,
  parseJsonFromGemini,
} from '../../providers/geminiProvider';

export const GEMINI_FALLBACK_RESPONSE = {
  success: false,
  error: 'AI temporarily unavailable',
  data: {
    message: "Let's continue your interview. Tell me about yourself.",
  },
} as const;
