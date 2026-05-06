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
exports.generateFollowUpQuestion = generateFollowUpQuestion;
const geminiClient_1 = require("./geminiClient");
const searchService_1 = require("../searchService");
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
        // ─── Attempt real-time web search enrichment ───────────────────────────────
        let webContextBlock = '';
        let usedWebContext = false;
        try {
            const searchQuery = (0, searchService_1.buildSearchQuery)(category, stage);
            const searchResults = yield (0, searchService_1.searchWeb)(searchQuery);
            const formatted = (0, searchService_1.formatSearchContext)(searchResults);
            if (formatted) {
                webContextBlock = `
Real-Time Industry Context (sourced from the web — today's trends & expectations):
${formatted}

Use this context to make your question feel current and industry-relevant. Reference real frameworks, tools, or methodologies from above where appropriate.`;
                usedWebContext = true;
            }
        }
        catch (_b) {
            // Silent – fallback to base prompt below
        }
        // ─── Build final Gemini prompt ─────────────────────────────────────────────
        const prompt = `You are a professional, highly experienced AI interviewer conducting a live voice conversation for a ${category} role.
You are actively listening to the candidate and must act like a real human generating the next best question.

Stage: ${stage}
Guidance for this stage: ${stageGuidance}
Candidate's Resume Summary: ${resumeSummary}
Interview Language: ${language}
${webContextBlock}${asked}

Your core objectives for question generation:
1. UP TO DATE: If web context is provided above, prioritize generating questions that reflect the latest industry trends, tools, or expectations for ${category} roles in ${new Date().getFullYear()}.
2. DIVERSE & REALISTIC: Do not ask basic or generic questions. Draw inspiration from complex real-world patterns used by top tech and enterprise companies.
3. CONVERSATIONAL: The question should sound natural when spoken via Text-to-Speech. Avoid rigid, robotic wording.
4. RESUME-SPECIFIC: If the candidate's resume mentions specific projects, tools, or roles, weave them naturally into technical or scenario questions.
5. STRICT LANGUAGE ENFORCEMENT: Always respond strictly in "${language}". Do not mix languages.

Generate exactly ONE interview question for the ${stage} stage.
Requirements:
- Ask only one clear, concise question.
- Do not include any explanation, preamble, numbering, or introductory text.
- Output the question text ONLY.`;
        const text = yield (0, geminiClient_1.generateGeminiText)(prompt, {
            label: `generateInterviewQuestion (${stage})`,
        });
        return { content: text, stage, usedWebContext };
    });
}
// ─── generateFollowUpQuestion ─────────────────────────────────────────────────
// Called when the previous answer is weak (challenge it), strong (go deeper),
// or average (probe for specifics). Prepends a natural AI reaction phrase.
function generateFollowUpQuestion(input) {
    return __awaiter(this, void 0, void 0, function* () {
        const { lastQuestion, userAnswer, resumeSummary, category, language, stage } = input;
        const prompt = `You are a strict, highly experienced ${category} interviewer conducting a live voice interview.

Previous Question you asked:
"${lastQuestion}"

Candidate's Answer:
"${userAnswer}"

Candidate Resume Context:
${resumeSummary}

Interview Language: ${language}

Your Task:
1. Silently assess the quality of the answer:
   - WEAK: vague, generic, lacks specifics, avoids the question, or uses filler.
   - AVERAGE: partially answers but misses depth, examples, or key details.
   - STRONG: specific, structured, demonstrates real experience or insight.

2. Based on your assessment, generate ONE follow-up question:
   - If WEAK → Challenge them directly. Push for a real concrete example. Be slightly skeptical.
   - If AVERAGE → Probe deeper into the most interesting part they mentioned. Ask for specifics.
   - If STRONG → Elevate the conversation. Go deeper — scalability, trade-offs, edge cases, or real-world complexity.

3. Start your question with a SHORT natural reaction (1 sentence) that a real human interviewer would say, then immediately ask the follow-up.
   Reaction examples for weak: "That's a bit vague — ", "I'd like to dig deeper here — ", "Can you be more specific? "
   Reaction examples for average: "Interesting point — ", "Let's explore that further — "
   Reaction examples for strong: "That's a solid answer — ", "I like that approach — ", "Good thinking — "

Rules:
- Respond strictly in "${language}". Do not mix languages.
- Output the reaction + follow-up as a single natural sentence or two. No lists, no preamble.
- Do NOT repeat the previous question.
- Sound like a real human, not a robot.
- Ask ONLY ONE question.`;
        const text = yield (0, geminiClient_1.generateGeminiText)(prompt, {
            label: `generateFollowUpQuestion (${stage})`,
        });
        return { content: text, stage, isFollowUp: true };
    });
}
