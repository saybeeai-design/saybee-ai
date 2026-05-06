export const SUPPORTED_INTERVIEW_LANGUAGES = [
  'English',
  'Hindi',
  'Assamese',
  'Bengali',
  'Tamil',
  'Telugu',
  'Marathi',
  'Gujarati',
] as const;

export type SupportedInterviewLanguage = (typeof SUPPORTED_INTERVIEW_LANGUAGES)[number];

interface LanguageConfig {
  fallbackQuestion: string;
  instruction: string;
  spokenStyle: string;
}

const LANGUAGE_CONFIGS: Record<SupportedInterviewLanguage, LanguageConfig> = {
  English: {
    fallbackQuestion: 'Tell me about yourself.',
    instruction: 'Conduct the interview entirely in English. Do not switch languages.',
    spokenStyle: 'Use natural professional spoken English suitable for a live interview.',
  },
  Hindi: {
    fallbackQuestion: 'कृपया अपने बारे में बताइए।',
    instruction: 'Conduct the interview entirely in Hindi. Do not switch languages.',
    spokenStyle: 'Use natural, professional Hindi as it would be spoken in a formal interview.',
  },
  Assamese: {
    fallbackQuestion: 'অনুগ্ৰহ কৰি আপোনাৰ বিষয়ে কওক।',
    instruction: 'Conduct the interview entirely in Assamese. Do not switch languages.',
    spokenStyle: 'Use natural, professional Assamese suitable for a live interview conversation.',
  },
  Bengali: {
    fallbackQuestion: 'অনুগ্রহ করে নিজের সম্পর্কে বলুন।',
    instruction: 'Conduct the interview entirely in Bengali. Do not switch languages.',
    spokenStyle: 'Use natural, professional Bengali suitable for an interview panel conversation.',
  },
  Tamil: {
    fallbackQuestion: 'உங்களைப் பற்றி சொல்லுங்கள்.',
    instruction: 'Conduct the interview entirely in Tamil. Do not switch languages.',
    spokenStyle: 'Use natural, professional Tamil suitable for a live interview setting.',
  },
  Telugu: {
    fallbackQuestion: 'దయచేసి మీ గురించి చెప్పండి.',
    instruction: 'Conduct the interview entirely in Telugu. Do not switch languages.',
    spokenStyle: 'Use natural, professional Telugu suitable for a real interview.',
  },
  Marathi: {
    fallbackQuestion: 'कृपया स्वतःबद्दल सांगा.',
    instruction: 'Conduct the interview entirely in Marathi. Do not switch languages.',
    spokenStyle: 'Use natural, professional Marathi suitable for a live interview.',
  },
  Gujarati: {
    fallbackQuestion: 'કૃપા કરીને તમારા વિશે કહો.',
    instruction: 'Conduct the interview entirely in Gujarati. Do not switch languages.',
    spokenStyle: 'Use natural, professional Gujarati suitable for a formal interview.',
  },
};

export function isSupportedInterviewLanguage(language: string): language is SupportedInterviewLanguage {
  return (SUPPORTED_INTERVIEW_LANGUAGES as readonly string[]).includes(language);
}

export function getLanguageConfig(language: string) {
  const resolvedLanguage = isSupportedInterviewLanguage(language) ? language : 'English';
  return {
    name: resolvedLanguage,
    ...LANGUAGE_CONFIGS[resolvedLanguage],
  };
}
