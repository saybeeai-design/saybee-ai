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
exports.finishInterview = exports.listInterviews = exports.getInterview = exports.startInterview = exports.INTERVIEW_STAGES = void 0;
const db_1 = __importDefault(require("../config/db"));
const emailService_1 = require("../services/emailService");
const evaluationService_1 = require("../services/ai/evaluationService");
const promptBuilder_1 = require("../services/ai/promptBuilder");
const questionService_1 = require("../services/ai/questionService");
// Interview stages in order
exports.INTERVIEW_STAGES = [
    'Introduction',
    'Technical',
    'Scenario',
    'HR',
    'Closing',
];
function safeParseEvaluation(value) {
    if (typeof value !== 'string') {
        return value !== null && value !== void 0 ? value : null;
    }
    try {
        return JSON.parse(value);
    }
    catch (_a) {
        return value;
    }
}
// ─── POST /api/interviews/start ───────────────────────────────────────────────
const startInterview = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const resumeId = typeof req.body.resume === 'string' && req.body.resume.trim()
            ? req.body.resume.trim()
            : typeof req.body.resumeId === 'string'
                ? req.body.resumeId.trim()
                : '';
        const interviewConfig = (0, promptBuilder_1.normalizeInterviewConfig)({
            category: typeof req.body.category === 'string' ? req.body.category.trim() : '',
            customRole: typeof req.body.customRole === 'string' ? req.body.customRole.trim() : '',
            language: typeof req.body.language === 'string' ? req.body.language.trim() : '',
            role: typeof req.body.role === 'string' ? req.body.role.trim() : '',
            subRole: typeof req.body.subRole === 'string' ? req.body.subRole.trim() : '',
        });
        const category = interviewConfig.category;
        if (!resumeId || !category) {
            res.status(400).json({ message: 'resume/category information is required' });
            return;
        }
        // Check Credits
        const userCheck = yield db_1.default.user.findUnique({ where: { id: userId } });
        if (!userCheck || userCheck.credits <= 0) {
            res.status(403).json({
                success: false,
                code: "NO_CREDITS",
                message: 'No credits left'
            });
            return;
        }
        // Verify the resume belongs to the user
        const resume = yield db_1.default.resume.findFirst({ where: { id: resumeId, userId } });
        if (!resume) {
            res.status(404).json({ message: 'Resume not found or does not belong to this user' });
            return;
        }
        const interview = yield db_1.default.interview.create({
            data: {
                userId,
                resumeId,
                category,
                language: interviewConfig.language,
                reportData: {
                    interviewConfig,
                },
                status: 'IN_PROGRESS',
                // Store current stage in a JSON metadata field — we use the existing
                // data model's JSON-compatible approach via the score field being nullable
                // and tracking stage via a prefix in the category temporarily.
                // We'll use a separate approach: track stage via the question count.
            },
            include: {
                resume: { select: { id: true, fileName: true } },
            },
        });
        // Deduct 1 credit
        yield db_1.default.user.update({
            where: { id: userId },
            data: { credits: { decrement: 1 } },
        });
        // Generate the first question immediately
        const resumeContext = (0, promptBuilder_1.extractResumeContext)(resume.parsedData, resume.fileName, category);
        let firstQuestionMeta = (0, questionService_1.buildQuestionFallback)({
            interviewConfig,
            stage: exports.INTERVIEW_STAGES[0],
        });
        try {
            firstQuestionMeta = yield (0, questionService_1.generateInterviewQuestion)({
                interviewConfig,
                previousQuestions: [],
                resumeSummary: resumeContext,
                stage: exports.INTERVIEW_STAGES[0],
            });
        }
        catch (error) {
            console.error('[Interview Start] Failed to generate the first AI question, using fallback:', error);
        }
        const firstQuestion = yield db_1.default.question.create({
            data: {
                interviewId: interview.id,
                content: firstQuestionMeta.question,
                order: 1,
            },
        });
        res.status(201).json({
            message: 'Interview session started',
            interview: Object.assign(Object.assign({}, interview), { currentStage: exports.INTERVIEW_STAGES[0], totalStages: exports.INTERVIEW_STAGES.length, firstQuestion,
                firstQuestionMeta }),
        });
    }
    catch (error) {
        next(error);
    }
});
exports.startInterview = startInterview;
// ─── GET /api/interviews/:id ──────────────────────────────────────────────────
const getInterview = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const interviewId = req.params.id;
        const interview = yield db_1.default.interview.findFirst({
            where: { id: interviewId, userId },
            include: {
                resume: { select: { id: true, fileName: true } },
                questions: {
                    orderBy: { order: 'asc' },
                    include: { answer: true },
                },
                transcript: true,
            },
        });
        if (!interview) {
            res.status(404).json({ message: 'Interview not found' });
            return;
        }
        // Derive current stage from answered question count
        const answeredCount = interview.questions.filter((q) => q.answer !== null).length;
        const stageIndex = Math.min(Math.floor(answeredCount / 2), // ~2 questions per stage
        exports.INTERVIEW_STAGES.length - 1);
        const result = Object.assign(Object.assign({}, interview), { questions: interview.questions.map(q => (Object.assign(Object.assign({}, q), { answer: q.answer ? Object.assign(Object.assign({}, q.answer), { evaluation: safeParseEvaluation(q.answer.evaluation) }) : null }))) });
        res.status(200).json({
            interview: Object.assign(Object.assign({}, result), { currentStage: exports.INTERVIEW_STAGES[stageIndex], stageIndex, totalStages: exports.INTERVIEW_STAGES.length, answeredCount }),
        });
    }
    catch (error) {
        next(error);
    }
});
exports.getInterview = getInterview;
// ─── GET /api/interviews ──────────────────────────────────────────────────────
const listInterviews = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const interviews = yield db_1.default.interview.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: {
                resume: { select: { id: true, fileName: true } },
                _count: { select: { questions: true } },
            },
        });
        res.status(200).json({ interviews });
    }
    catch (error) {
        next(error);
    }
});
exports.listInterviews = listInterviews;
// ─── POST /api/interviews/:id/finish ─────────────────────────────────────────
const finishInterview = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const interviewId = req.params.id;
        const { score } = req.body; // Optional final score (0–100)
        const interview = yield db_1.default.interview.findFirst({
            where: { id: interviewId, userId },
            include: {
                questions: { include: { answer: true } },
            },
        });
        if (!interview) {
            res.status(404).json({ message: 'Interview not found' });
            return;
        }
        if (interview.status === 'COMPLETED') {
            res.status(200).json({
                message: 'Interview is already completed',
                interview
            });
            return;
        }
        // Calculate average score from individual answers if no overall score given
        const answers = interview.questions
            .map((q) => q.answer)
            .filter((a) => a !== null && a.score !== null);
        const averageScore = score !== undefined
            ? Number(score)
            : answers.length > 0
                ? answers.reduce((sum, a) => { var _a; return sum + ((_a = a.score) !== null && _a !== void 0 ? _a : 0); }, 0) / answers.length
                : null;
        // Build full transcript text from all answers
        const transcriptText = interview.questions
            .map((q, idx) => {
            var _a, _b, _c;
            const ans = (_b = (_a = q.answer) === null || _a === void 0 ? void 0 : _a.content) !== null && _b !== void 0 ? _b : '(No answer)';
            const evaluation = safeParseEvaluation((_c = q.answer) === null || _c === void 0 ? void 0 : _c.evaluation);
            return `Q${idx + 1} [${q.content}]\nA: ${ans}\nEvaluation: ${JSON.stringify(evaluation)}`;
        })
            .join('\n\n');
        const updatedInterview = yield db_1.default.interview.update({
            where: { id: interviewId },
            data: {
                status: 'COMPLETED',
                score: averageScore,
                transcript: {
                    upsert: {
                        create: { text: transcriptText },
                        update: { text: transcriptText },
                    },
                },
            },
            include: { transcript: true },
        });
        // Generate Final Report using Gemini
        const finalReport = yield (0, evaluationService_1.generateFinalReport)(transcriptText, interview.category, interview.language);
        // Save report to the interview
        const completedInterview = yield db_1.default.interview.update({
            where: { id: interviewId },
            data: { reportData: finalReport },
            include: { transcript: true },
        });
        const user = yield db_1.default.user.findUnique({ where: { id: userId } });
        if (user) {
            yield (0, emailService_1.sendInterviewReport)(user.email, user.name || 'User', interviewId).catch((err) => console.error('Email error:', err));
        }
        res.status(200).json({
            message: 'Interview completed successfully',
            interview: completedInterview,
        });
    }
    catch (error) {
        next(error);
    }
});
exports.finishInterview = finishInterview;
