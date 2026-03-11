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
exports.getInterviewQuestions = exports.generateNextQuestion = void 0;
const db_1 = __importDefault(require("../config/db"));
const interviewController_1 = require("./interviewController");
// ─── Placeholder Question Bank ────────────────────────────────────────────────
// This will be replaced by the Gemini AI engine in the next implementation step.
const PLACEHOLDER_QUESTIONS = {
    Introduction: [
        'Tell me about yourself and your background.',
        'What motivated you to apply for this position?',
        'Describe your overall career journey so far.',
    ],
    Technical: [
        'What are your core technical skills and areas of expertise?',
        'Describe a challenging technical problem you solved recently.',
        'How do you approach debugging a complex issue in production?',
        'What development methodologies are you familiar with?',
    ],
    Scenario: [
        'Describe a time you had to deliver under a tight deadline. How did you manage it?',
        'Tell me about a situation where you disagreed with your team. How was it resolved?',
        'Give an example of a project where you had to learn something new quickly.',
    ],
    HR: [
        'Where do you see yourself in the next 5 years?',
        'What are your biggest professional strengths and areas for improvement?',
        'How do you handle stress and pressure at work?',
        'What are your salary expectations?',
    ],
    Closing: [
        'Do you have any questions for us?',
        'Is there anything else you would like us to know about you?',
        'When are you available to start if selected?',
    ],
};
const QUESTIONS_PER_STAGE = 2;
// Determine current stage from the number of questions already asked
function getCurrentStage(questionCount) {
    const stageIndex = Math.min(Math.floor(questionCount / QUESTIONS_PER_STAGE), interviewController_1.INTERVIEW_STAGES.length - 1);
    return { stage: interviewController_1.INTERVIEW_STAGES[stageIndex], stageIndex };
}
// ─── POST /api/interviews/:id/question ────────────────────────────────────────
const generateNextQuestion = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const interviewId = req.params.id;
        const interview = yield db_1.default.interview.findFirst({
            where: { id: interviewId, userId },
            include: { questions: { orderBy: { order: 'asc' } } },
        });
        if (!interview) {
            res.status(404).json({ message: 'Interview not found' });
            return;
        }
        if (interview.status === 'COMPLETED') {
            res.status(400).json({ message: 'Interview is already completed' });
            return;
        }
        const currentQuestionCount = interview.questions.length;
        const maxQuestions = interviewController_1.INTERVIEW_STAGES.length * QUESTIONS_PER_STAGE;
        if (currentQuestionCount >= maxQuestions) {
            res.status(200).json({
                message: 'All questions have been asked. Please finish the interview.',
                done: true,
                totalQuestions: currentQuestionCount,
            });
            return;
        }
        const { stage, stageIndex } = getCurrentStage(currentQuestionCount);
        const stageQuestions = PLACEHOLDER_QUESTIONS[stage];
        // Pick a question from the stage bank the interviewer hasn't asked yet
        const askedContents = interview.questions.map((q) => q.content);
        const available = stageQuestions.filter((q) => !askedContents.includes(q));
        const questionContent = available.length > 0
            ? available[Math.floor(Math.random() * available.length)]
            : stageQuestions[Math.floor(Math.random() * stageQuestions.length)];
        const question = yield db_1.default.question.create({
            data: {
                interviewId,
                content: questionContent,
                order: currentQuestionCount + 1,
            },
        });
        const isLastQuestion = currentQuestionCount + 1 >= maxQuestions;
        res.status(201).json({
            question,
            stage,
            stageIndex,
            totalStages: interviewController_1.INTERVIEW_STAGES.length,
            questionNumber: currentQuestionCount + 1,
            totalQuestions: maxQuestions,
            isLastQuestion,
        });
    }
    catch (error) {
        next(error);
    }
});
exports.generateNextQuestion = generateNextQuestion;
// ─── GET /api/interviews/:id/questions ────────────────────────────────────────
const getInterviewQuestions = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const interviewId = req.params.id;
        const interview = yield db_1.default.interview.findFirst({
            where: { id: interviewId, userId },
        });
        if (!interview) {
            res.status(404).json({ message: 'Interview not found' });
            return;
        }
        const questions = yield db_1.default.question.findMany({
            where: { interviewId },
            orderBy: { order: 'asc' },
            include: { answer: true },
        });
        // Annotate each question with its stage
        const annotated = questions.map((q) => (Object.assign(Object.assign({}, q), { stage: getCurrentStage(q.order - 1).stage })));
        res.status(200).json({ questions: annotated });
    }
    catch (error) {
        next(error);
    }
});
exports.getInterviewQuestions = getInterviewQuestions;
