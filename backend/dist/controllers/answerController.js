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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAnswer = exports.submitAnswer = void 0;
const db_1 = __importDefault(require("../config/db"));
// ─── Placeholder Evaluation Logic ─────────────────────────────────────────────
// Will be replaced by Gemini AI evaluation in the next implementation step.
function generatePlaceholderEvaluation(answerContent) {
    const wordCount = answerContent.trim().split(/\s+/).length;
    // Rudimentary scoring based on answer length as a placeholder
    const lengthScore = wordCount < 10 ? 4 : wordCount < 30 ? 6 : wordCount < 60 ? 8 : 9;
    return {
        score: lengthScore,
        evaluation: {
            communication: lengthScore,
            confidence: Math.round(5 + Math.random() * 4),
            technicalAccuracy: Math.round(5 + Math.random() * 4),
            note: 'Placeholder evaluation — Gemini AI evaluation will replace this.',
            strengths: ['Responded to the question'],
            improvements: ['Provide more specific examples'],
        },
    };
}
// ─── POST /api/questions/:id/answer ───────────────────────────────────────────
const submitAnswer = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const questionId = req.params.id;
        const { content, transcriptText } = req.body;
        if (!content || content.trim().length === 0) {
            res.status(400).json({ message: 'Answer content is required' });
            return;
        }
        // Verify question belongs to the user's interview
        const question = yield db_1.default.question.findFirst({
            where: { id: questionId },
            include: { interview: { select: { userId: true, id: true, status: true } } },
        });
        if (!question) {
            res.status(404).json({ message: 'Question not found' });
            return;
        }
        if (question.interview.userId !== userId) {
            res.status(403).json({ message: 'Forbidden — this question does not belong to you' });
            return;
        }
        if (question.interview.status === 'COMPLETED') {
            res.status(400).json({ message: 'Cannot submit answers to a completed interview' });
            return;
        }
        // Check if this question was already answered
        const existingAnswer = yield db_1.default.answer.findUnique({ where: { questionId } });
        if (existingAnswer) {
            res.status(409).json({ message: 'This question has already been answered' });
            return;
        }
        const { score, evaluation } = generatePlaceholderEvaluation(content);
        const answer = yield db_1.default.answer.create({
            data: {
                questionId,
                content: content.trim(),
                score,
                evaluation: JSON.stringify(evaluation),
            },
        });
        // If a transcriptText field is provided, upsert the interview transcript
        if (transcriptText) {
            const interviewId = question.interview.id;
            const existing = yield db_1.default.transcript.findUnique({ where: { interviewId } });
            if (existing) {
                yield db_1.default.transcript.update({
                    where: { interviewId },
                    data: { text: existing.text + `\n\n${transcriptText}` },
                });
            }
            else {
                yield db_1.default.transcript.create({
                    data: { interviewId, text: transcriptText },
                });
            }
        }
        res.status(201).json({
            message: 'Answer submitted successfully',
            answer,
        });
    }
    catch (error) {
        next(error);
    }
});
exports.submitAnswer = submitAnswer;
// ─── GET /api/questions/:id/answer ────────────────────────────────────────────
const getAnswer = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const questionId = req.params.id;
        const question = yield db_1.default.question.findFirst({
            where: { id: questionId },
            include: {
                answer: true,
                interview: { select: { userId: true } },
            },
        });
        if (!question) {
            res.status(404).json({ message: 'Question not found' });
            return;
        }
        if (question.interview.userId !== userId) {
            res.status(403).json({ message: 'Forbidden' });
            return;
        }
        if (!question.answer) {
            res.status(404).json({ message: 'No answer found for this question' });
            return;
        }
        const result = Object.assign(Object.assign({}, question.answer), { evaluation: question.answer.evaluation ? JSON.parse(question.answer.evaluation) : null });
        res.status(200).json({ answer: result });
    }
    catch (error) {
        next(error);
    }
});
exports.getAnswer = getAnswer;
