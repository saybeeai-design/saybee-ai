import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash-latest"
});

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

  const result = await model.generateContent(prompt);
  const response = result.response.text();

  return response.trim();
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

  const result = await model.generateContent(prompt);
  const response = result.response.text();

  return response.trim();
}
