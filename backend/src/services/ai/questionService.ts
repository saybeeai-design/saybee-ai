import { getGeminiModel } from './geminiClient';

export interface GenerateQuestionInput {
  stage: string;
  category: string;
  language: string;
  resumeSummary: string;
  previousQuestions: string[];
}

export interface GeneratedQuestion {
  content: string;
  stage: string;
}

const STAGE_CONTEXT: Record<string, string> = {
  Introduction:
    'Ask a warm, welcoming question to help the candidate introduce themselves. Start a natural flow.',
  Technical:
    'Ask a focused, challenging technical question based on their resume, skills, and industry standards.',
  Scenario:
    'Present a realistic, complex scenario or behavioral question (STAR method) commonly used by top-tier companies.',
  HR:
    'Ask a deep HR, cultural fit, or behavioral question about their goals, teamwork, or handling pressure.',
  Closing:
    'Ask a polite closing question — either inviting their questions or asking for final thoughts.',
};

export async function generateInterviewQuestion(
  input: GenerateQuestionInput
): Promise<GeneratedQuestion> {
  const { stage, category, language, resumeSummary, previousQuestions } = input;

  const stageGuidance = STAGE_CONTEXT[stage] ?? 'Ask a relevant interview question.';
  const asked =
    previousQuestions.length > 0
      ? `\n\nQuestions already asked (do NOT repeat these):\n${previousQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
      : '';

  const prompt = `You are a professional, highly experienced AI interviewer conducting a live voice conversation for a ${category} role.
You are actively listening to the candidate and must act like a real human generating the next best question.

Stage: ${stage}
Guidance for this stage: ${stageGuidance}
Candidate's Resume Summary: ${resumeSummary}
Interview Language: ${language}
${asked}

Your core objectives for question generation:
1. DIVERSE & REALISTIC: Do not ask basic or generic questions. Actively draw inspiration from complex, real-world interview patterns and online datasets used by top tech and enterprise companies for ${category} roles.
2. CONVERSATIONAL: The question should sound natural when spoken out loud using Text-to-Speech. Avoid rigid robot-like wording.
3. CONTEXTUAL: If the candidate's resume summary mentions specific tools, projects, or accomplishments, weave them naturally into your technical or scenario questions.
4. STRICT LANGUAGE ENFORCEMENT: Always respond strictly in the selected language ("${language}"). Do not mix languages.

Generate exactly ONE interview question for the ${stage} stage.
Requirements:
- Ask only one clear, concise question.
- Do not include any explanation, preamble, numbering, or introductory text.
- Output the question text ONLY.`;

  const model = getGeminiModel();
  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  return { content: text, stage };
}
