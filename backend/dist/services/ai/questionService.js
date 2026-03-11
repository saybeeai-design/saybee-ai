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
exports.generateInterviewQuestion = generateInterviewQuestion;
const geminiClient_1 = require("./geminiClient");
const STAGE_CONTEXT = {
    Introduction: 'Ask a warm, welcoming question to help the candidate introduce themselves. Start a natural flow.',
    Technical: 'Ask a focused, challenging technical question based on their resume, skills, and industry standards.',
    Scenario: 'Present a realistic, complex scenario or behavioral question (STAR method) commonly used by top-tier companies.',
    HR: 'Ask a deep HR, cultural fit, or behavioral question about their goals, teamwork, or handling pressure.',
    Closing: 'Ask a polite closing question — either inviting their questions or asking for final thoughts.',
};
function generateInterviewQuestion(input) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const { stage, category, language, resumeSummary, previousQuestions } = input;
        const stageGuidance = (_a = STAGE_CONTEXT[stage]) !== null && _a !== void 0 ? _a : 'Ask a relevant interview question.';
        const asked = previousQuestions.length > 0
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
        const model = (0, geminiClient_1.getGeminiModel)();
        const result = yield model.generateContent(prompt);
        const text = result.response.text().trim();
        return { content: text, stage };
    });
}
