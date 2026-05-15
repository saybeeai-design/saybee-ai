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
const promptBuilder_1 = require("../services/ai/promptBuilder");
const questionService_1 = require("../services/ai/questionService");
const QUESTIONS_PER_STAGE = 2;
function getCurrentStage(questionCount) {
    const stageIndex = Math.min(Math.floor(questionCount / QUESTIONS_PER_STAGE), interviewController_1.INTERVIEW_STAGES.length - 1);
    return { stage: interviewController_1.INTERVIEW_STAGES[stageIndex], stageIndex };
}
const generateNextQuestion = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const interviewId = req.params.id;
        const interview = yield db_1.default.interview.findFirst({
            where: { id: interviewId, userId },
            include: {
                questions: { orderBy: { order: 'asc' } },
                resume: true,
            },
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
                done: true,
                message: 'All questions have been asked. Please finish the interview.',
                totalQuestions: currentQuestionCount,
            });
            return;
        }
        const { stage, stageIndex } = getCurrentStage(currentQuestionCount);
        const interviewConfig = (0, promptBuilder_1.getInterviewConfigFromReportData)(interview.reportData, {
            category: interview.category,
            language: interview.language,
        });
        const previousQuestions = interview.questions.map((question) => question.content);
        const resumeSummary = (0, promptBuilder_1.extractResumeContext)(interview.resume.parsedData, interview.resume.fileName, interviewConfig.category);
        let generatedQuestion = (0, questionService_1.buildQuestionFallback)({
            interviewConfig,
            stage,
        });
        try {
            generatedQuestion = yield (0, questionService_1.generateInterviewQuestion)({
                interviewConfig,
                previousQuestions,
                resumeSummary,
                stage,
            });
        }
        catch (error) {
            console.error('[QuestionController] Dynamic question generation failed, using fallback:', error);
        }
        const question = yield db_1.default.question.create({
            data: {
                interviewId,
                content: generatedQuestion.question,
                order: currentQuestionCount + 1,
            },
        });
        const isLastQuestion = currentQuestionCount + 1 >= maxQuestions;
        res.status(201).json({
            question,
            questionMeta: generatedQuestion,
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
        const annotated = questions.map((question) => (Object.assign(Object.assign({}, question), { stage: getCurrentStage(question.order - 1).stage })));
        res.status(200).json({ questions: annotated });
    }
    catch (error) {
        next(error);
    }
});
exports.getInterviewQuestions = getInterviewQuestions;
