import { generateGeminiText } from './geminiClient';

/**
 * Generates an interview question based on the provided context (e.g. resume data).
 * @param context The context for generating the question.
 * @returns A generated interview question.
 */
export async function generateInterviewQuestion(context: string): Promise<string> {
  const prompt = `
You are a professional AI interviewer.

Generate a clear interview question based on this context:
${context}

The question should be concise and relevant.
`;

  return generateGeminiText(prompt, { label: 'generateInterviewQuestion (legacy)' });
}

/**
 * Evaluates a candidate's answer to a specific interview question.
 * @param question The interview question.
 * @param answer The candidate's answer.
 * @returns Evaluation feedback including score, strengths, weaknesses, and suggestions.
 */
export async function evaluateAnswer(question: string, answer: string): Promise<string> {
  const prompt = `
Evaluate the following interview answer.

Question:
${question}

Candidate Answer:
${answer}

Provide feedback including:
- Score out of 10
- Strengths
- Weaknesses
- Suggestions
`;

  return generateGeminiText(prompt, { label: 'evaluateAnswer (legacy)' });
}
