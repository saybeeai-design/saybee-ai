"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateAnswer = evaluateAnswer;
exports.generateFinalReport = generateFinalReport;
const geminiClient_1 = require("./geminiClient");
function evaluateAnswer(input) {
    return __awaiter(this, void 0, void 0, function* () {
        const { question, answer, stage, category, language } = input;
        const prompt = `You are an expert ${category} interview evaluator.

Interview Stage: ${stage}
Language: ${language}

Question asked:
"${question}"

Candidate's answer:
"${answer}"

Evaluate the candidate's answer and respond with a JSON object ONLY — no markdown, no explanation. Always respond strictly in the selected language (${language}). Do not mix languages.
The JSON must follow this exact structure:
{
  "score": <overall score 1-10>,
  "communication": <communication clarity score 1-10>,
  "confidence": <perceived confidence score 1-10>,
  "technicalAccuracy": <technical correctness score 1-10 (0 if not applicable)>,
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "suggestions": ["suggestion1", "suggestion2"],
  "summary": "<2-3 sentence overall assessment>"
}`;
        const raw = yield (0, geminiClient_1.generateGeminiText)(prompt, {
            label: `evaluateAnswer (${stage})`,
        });
        // Strip markdown code fences if Gemini includes them
        const cleaned = raw.replace(/^```json\s*|^```\s*|\s*```$/g, '').trim();
        let parsed;
        try {
            parsed = JSON.parse(cleaned);
        }
        catch (_a) {
            // Fallback: return a safe default if JSON parsing fails
            parsed = {
                score: 5,
                communication: 5,
                confidence: 5,
                technicalAccuracy: 5,
                strengths: ['Responded to the question'],
                weaknesses: ['Answer could not be fully evaluated'],
                suggestions: ['Please provide a more detailed answer'],
                summary: 'Evaluation could not be completed due to a parsing error.',
            };
        }
        // Clamp all numeric values to 1–10
        const clamp = (v) => Math.min(10, Math.max(1, Math.round(v)));
        return Object.assign(Object.assign({}, parsed), { score: clamp(parsed.score), communication: clamp(parsed.communication), confidence: clamp(parsed.confidence), technicalAccuracy: clamp(parsed.technicalAccuracy) });
    });
}
function generateFinalReport(transcript, category, language) {
    return __awaiter(this, void 0, void 0, function* () {
        const prompt = `You are an expert ${category} interview evaluator.

Read the following full interview transcript and generate a final comprehensive report.
Language: ${language}

Transcript:
"""
${transcript}
"""

Evaluate the candidate's overall performance across the entire interview.
Respond with a JSON object ONLY — no markdown, no explanation. Always respond strictly in the selected language (${language}). Do not mix languages.
The JSON must follow this exact structure:
{
  "communication": <overall communication score 1-100>,
  "confidence": <overall confidence score 1-100>,
  "technicalKnowledge": <overall technical score 1-100 (0 if not applicable)>,
  "strengths": ["major strength 1", "major strength 2", "major strength 3"],
  "weaknesses": ["area for improvement 1", "area for improvement 2"],
  "suggestions": ["actionable advice 1", "actionable advice 2", "actionable advice 3"],
  "overallSummary": "<1 paragraph detailed summary of their performance>"
}`;
        try {
            const raw = yield (0, geminiClient_1.generateGeminiText)(prompt, {
                label: 'generateFinalReport',
            });
            const cleaned = raw.replace(/^```json\s*|^```\s*|\s*```$/g, '').trim();
            const parsed = JSON.parse(cleaned);
            return parsed;
        }
        catch (err) {
            console.error('Failed to generate final report via AI:', err);
            return {
                communication: 50,
                confidence: 50,
                technicalKnowledge: 50,
                strengths: ['Completed the interview'],
                weaknesses: ['Report generation failed'],
                suggestions: ['Review your answers manually'],
                overallSummary: 'The AI was unable to generate a final report due to a processing error.'
            };
        }
    });
}
