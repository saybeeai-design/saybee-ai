"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.uploadChatFile = exports.nextInterviewTurn = exports.speakText = exports.transcribeAudioFile = exports.evaluateQuestionAnswer = exports.generateAIQuestion = void 0;
const db_1 = __importDefault(require("../config/db"));
const evaluationService_1 = require("../services/ai/evaluationService");
const promptBuilder_1 = require("../services/ai/promptBuilder");
const questionService_1 = require("../services/ai/questionService");
const speechToTextService_1 = require("../services/ai/speechToTextService");
const textToSpeechService_1 = require("../services/ai/textToSpeechService");
const aiService_1 = require("../services/aiService");
const interviewController_1 = require("./interviewController");
const MAX_FOLLOW_UPS = 2; // Maximum follow-ups per main question before advancing
const QUESTIONS_PER_STAGE = 2;
function getCurrentStage(questionCount) {
    const stageIndex = Math.min(Math.floor(questionCount / QUESTIONS_PER_STAGE), interviewController_1.INTERVIEW_STAGES.length - 1);
    return { stage: interviewController_1.INTERVIEW_STAGES[stageIndex], stageIndex };
}
const EVALUATION_FALLBACK = {
    communication: 5,
    confidence: 5,
    score: 5,
    strengths: ['Responded to the question'],
    suggestions: ['Please provide a more detailed answer'],
    summary: 'Evaluation is temporarily unavailable.',
    technicalAccuracy: 5,
    weaknesses: ['Answer could not be fully evaluated'],
};
// ─── PHASE 1: POST /api/interviews/:id/generate-question ─────────────────────
// Full AI question generation pipeline:
//   1. Determine current stage from answered count
//   2. Call Gemini to generate a context-aware question
//   3. Store it in the Question table
//   4. Optionally convert question to speech
const generateAIQuestion = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const interviewId = req.params.id;
        const { speakQuestion = false } = req.body;
        const interview = yield db_1.default.interview.findFirst({
            where: { id: interviewId, userId },
            include: {
                resume: true,
                questions: { orderBy: { order: 'asc' }, include: { answer: true } },
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
        const totalQuestions = interview.questions.length;
        const maxQuestions = interviewController_1.INTERVIEW_STAGES.length * QUESTIONS_PER_STAGE;
        if (totalQuestions >= maxQuestions) {
            res.status(200).json({
                done: true,
                message: 'All questions asked. Please call /finish to complete the interview.',
                totalQuestions,
            });
            return;
        }
        const { stage, stageIndex } = getCurrentStage(totalQuestions);
        const previousQuestions = interview.questions.map((q) => q.content);
        const interviewConfig = (0, promptBuilder_1.getInterviewConfigFromReportData)(interview.reportData, {
            category: interview.category,
            language: interview.language,
        });
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
        catch (err) {
            console.error('Gemini AI failed to generate question, using fallback:', err);
        }
        // 2. Persist question
        const question = yield db_1.default.question.create({
            data: {
                interviewId,
                content: generatedQuestion.question,
                order: totalQuestions + 1,
            },
        });
        // 3. Optionally convert question to speech
        let ttsResult = null;
        if (speakQuestion) {
            const langCode = (0, textToSpeechService_1.getLanguageCode)(interview.language);
            ttsResult = yield (0, textToSpeechService_1.textToSpeech)(generatedQuestion.question, langCode);
        }
        const isLastQuestion = totalQuestions + 1 >= maxQuestions;
        res.status(201).json({
            question,
            stage,
            stageIndex,
            totalStages: interviewController_1.INTERVIEW_STAGES.length,
            questionNumber: totalQuestions + 1,
            totalQuestions: maxQuestions,
            questionMeta: generatedQuestion,
            isLastQuestion,
            tts: ttsResult,
        });
    }
    catch (error) {
        next(error);
    }
});
exports.generateAIQuestion = generateAIQuestion;
// ─── PHASE 2: POST /api/questions/:id/evaluate ────────────────────────────────
// Evaluate an already-submitted answer using Gemini AI.
// Can also be called immediately after submit if evaluate=true in the answer body.
const evaluateQuestionAnswer = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const questionId = req.params.id;
        const question = yield db_1.default.question.findFirst({
            where: { id: questionId },
            include: {
                answer: true,
                interview: {
                    select: { userId: true, category: true, language: true },
                },
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
            res.status(404).json({ message: 'No answer found for this question. Submit an answer first.' });
            return;
        }
        const stageIndex = Math.min(Math.floor((question.order - 1) / QUESTIONS_PER_STAGE), interviewController_1.INTERVIEW_STAGES.length - 1);
        const stage = interviewController_1.INTERVIEW_STAGES[stageIndex];
        let feedback = EVALUATION_FALLBACK;
        try {
            feedback = yield (0, evaluationService_1.evaluateAnswer)({
                answer: question.answer.content,
                category: question.interview.category,
                language: question.interview.language,
                question: question.content,
                stage,
            });
        }
        catch (err) {
            console.error('Gemini AI failed to evaluate answer, using fallback:', err);
        }
        // Update the answer with AI evaluation
        const updatedAnswer = yield db_1.default.answer.update({
            where: { id: question.answer.id },
            data: {
                score: feedback.score,
                evaluation: JSON.stringify(feedback),
            },
        });
        res.status(200).json({
            message: 'Answer evaluated successfully',
            answer: updatedAnswer,
            evaluation: feedback,
        });
    }
    catch (error) {
        next(error);
    }
});
exports.evaluateQuestionAnswer = evaluateQuestionAnswer;
// ─── PHASE 3: POST /api/ai/transcribe ─────────────────────────────────────────
// Accepts a multipart audio upload and returns the Whisper transcription.
const transcribeAudioFile = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file) {
            res.status(400).json((0, aiService_1.aiFailure)('No audio file provided'));
            return;
        }
        const result = yield (0, speechToTextService_1.transcribeBuffer)(req.file.buffer);
        res.status(200).json(Object.assign(Object.assign({}, (0, aiService_1.aiSuccess)({ transcription: result })), { transcription: result }));
    }
    catch (error) {
        next(error);
    }
});
exports.transcribeAudioFile = transcribeAudioFile;
// ─── PHASE 4: POST /api/ai/speak ──────────────────────────────────────────────
// Converts text to speech. If no TTS key is available, returns stub
// so the client can use the browser's Web Speech API.
const speakText = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { text, language = 'English' } = req.body;
        if (!text || text.trim().length === 0) {
            res.status(400).json((0, aiService_1.aiFailure)('text is required'));
            return;
        }
        const langCode = (0, textToSpeechService_1.getLanguageCode)(language);
        const result = yield (0, textToSpeechService_1.textToSpeech)(text, langCode);
        res.status(200).json(Object.assign(Object.assign({}, (0, aiService_1.aiSuccess)({ tts: result })), { tts: result }));
    }
    catch (error) {
        next(error);
    }
});
exports.speakText = speakText;
// ─── PHASE 5: POST /api/interviews/:id/next-turn ─────────────────────────────
// Full interview loop:
//   1. Save the user's spoken/typed answer to the current question
//   2. Evaluate it (Gemini)
//   3. Generate the next question (Gemini)
//   4. Convert it to speech
//   Returns everything in one response for optimized frontend usage.
const nextInterviewTurn = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const interviewId = req.params.id;
        const { questionId, // The question being answered
        answerContent, // Plain text answer (from STT or typed)
        speakNextQuestion = true, } = req.body;
        if (!questionId || !answerContent) {
            res.status(400).json({ message: 'questionId and answerContent are required' });
            return;
        }
        // ── 1. Validate and save answer ───────────────────────────────────────────
        const question = yield db_1.default.question.findFirst({
            where: { id: questionId },
            include: {
                interview: true,
                answer: true,
            },
        });
        if (!question || question.interview.userId !== userId || question.interview.id !== interviewId) {
            res.status(404).json({ message: 'Question not found or access denied' });
            return;
        }
        if (question.answer) {
            res.status(409).json({ message: 'This question has already been answered' });
            return;
        }
        // Persist the raw answer first (evaluation may take a moment)
        const savedAnswer = yield db_1.default.answer.create({
            data: {
                questionId,
                content: answerContent,
                score: null,
            },
        });
        // ── 2. Evaluate answer using Gemini with Fallback ──────────
        const stageIndex = Math.min(Math.floor((question.order - 1) / QUESTIONS_PER_STAGE), interviewController_1.INTERVIEW_STAGES.length - 1);
        const stage = interviewController_1.INTERVIEW_STAGES[stageIndex];
        let feedback = EVALUATION_FALLBACK;
        try {
            feedback = yield (0, evaluationService_1.evaluateAnswer)({
                answer: answerContent,
                category: question.interview.category,
                language: question.interview.language,
                question: question.content,
                stage,
            });
        }
        catch (err) {
            console.error('Gemini AI failed to evaluate answer, using fallback:', err);
        }
        // Persist evaluation
        const evaluatedAnswer = yield db_1.default.answer.update({
            where: { id: savedAnswer.id },
            data: {
                score: feedback.score,
                evaluation: JSON.stringify(feedback),
            },
        });
        // ── 3. Stitch live transcript ──────────────────────────────────────────────
        const transcriptChunk = `Q: ${question.content}\nA: ${answerContent}`;
        const existingTranscript = yield db_1.default.transcript.findUnique({ where: { interviewId } });
        if (existingTranscript) {
            yield db_1.default.transcript.update({
                where: { interviewId },
                data: { text: existingTranscript.text + '\n\n' + transcriptChunk },
            });
        }
        else {
            yield db_1.default.transcript.create({ data: { interviewId, text: transcriptChunk } });
        }
        // ── 4. Determine follow-up vs new question ────────────────────────────────
        const currentInterview = yield db_1.default.interview.findUnique({
            where: { id: interviewId },
            include: {
                resume: true,
                questions: { orderBy: { order: 'asc' }, include: { answer: true } },
            },
        });
        const totalAsked = currentInterview.questions.length;
        const maxQuestions = interviewController_1.INTERVIEW_STAGES.length * QUESTIONS_PER_STAGE;
        const interviewConfig = (0, promptBuilder_1.getInterviewConfigFromReportData)(currentInterview.reportData, {
            category: currentInterview.category,
            language: currentInterview.language,
        });
        const resumeSummary = (0, promptBuilder_1.extractResumeContext)(currentInterview.resume.parsedData, currentInterview.resume.fileName, interviewConfig.category);
        let nextQuestion = null;
        let nextQuestionMeta = null;
        let tts = null;
        let interviewDone = false;
        let isFollowUp = false;
        if (totalAsked < maxQuestions) {
            // Read follow-up count from lightweight metadata stored in reportData.followUpMap
            const reportMeta = (_b = currentInterview.reportData) !== null && _b !== void 0 ? _b : {};
            const followUpMap = (_c = reportMeta.followUpMap) !== null && _c !== void 0 ? _c : {};
            const currentFollowUpCount = (_d = followUpMap[questionId]) !== null && _d !== void 0 ? _d : 0;
            const { stage: nextStage } = getCurrentStage(totalAsked);
            const previousQuestions = currentInterview.questions.map((q) => q.content);
            let generatedQuestion = (0, questionService_1.buildQuestionFallback)({
                interviewConfig,
                stage: nextStage,
            });
            if (currentFollowUpCount < MAX_FOLLOW_UPS) {
                // ── Generate follow-up based on the last answer ───────────────────────
                try {
                    generatedQuestion = yield (0, questionService_1.generateFollowUpQuestion)({
                        followUpCount: currentFollowUpCount,
                        interviewConfig,
                        lastQuestion: question.content,
                        resumeSummary,
                        stage,
                        userAnswer: answerContent,
                    });
                    isFollowUp = true;
                    // Persist updated follow-up count
                    const updatedFollowUpMap = Object.assign(Object.assign({}, followUpMap), { [questionId]: currentFollowUpCount + 1 });
                    yield db_1.default.interview.update({
                        where: { id: interviewId },
                        data: { reportData: Object.assign(Object.assign({}, reportMeta), { followUpMap: updatedFollowUpMap }) },
                    });
                }
                catch (err) {
                    console.error('[FollowUp] Follow-up generation failed, advancing to new question:', err);
                    isFollowUp = false;
                }
            }
            if (!isFollowUp) {
                try {
                    generatedQuestion = yield (0, questionService_1.generateInterviewQuestion)({
                        interviewConfig,
                        previousQuestions,
                        resumeSummary,
                        stage: nextStage,
                    });
                }
                catch (err) {
                    console.error('Gemini AI failed to generate next question, using fallback:', err);
                }
            }
            if (isFollowUp) {
                // Persist follow-up as a new Question record
                nextQuestion = yield db_1.default.question.create({
                    data: {
                        interviewId,
                        content: generatedQuestion.question,
                        order: totalAsked + 1,
                    },
                });
            }
            else {
                // Persist new main question
                nextQuestion = yield db_1.default.question.create({
                    data: {
                        interviewId,
                        content: generatedQuestion.question,
                        order: totalAsked + 1,
                    },
                });
            }
            nextQuestionMeta = generatedQuestion;
            // Optionally convert next question to speech
            if (speakNextQuestion && nextQuestion) {
                const langCode = (0, textToSpeechService_1.getLanguageCode)(currentInterview.language);
                tts = yield (0, textToSpeechService_1.textToSpeech)(nextQuestion.content, langCode);
            }
        }
        else {
            // No more questions: interview is complete
            interviewDone = true;
            yield db_1.default.interview.update({
                where: { id: interviewId },
                data: { status: 'COMPLETED' },
            });
        }
        res.status(200).json({
            evaluatedAnswer,
            feedback,
            nextQuestion,
            nextQuestionMeta,
            tts,
            interviewDone,
            isFollowUp,
            totalAsked,
        });
    }
    catch (error) {
        next(error);
    }
});
exports.nextInterviewTurn = nextInterviewTurn;
// ─── POST /api/ai/upload ─────────────────────────────────────────────────────
// General file upload endpoint for chat file sharing
const uploadChatFile = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file) {
            res.status(400).json((0, aiService_1.aiFailure)('No file uploaded'));
            return;
        }
        const { uploadFileToCloud } = yield Promise.resolve().then(() => __importStar(require('../services/storageService')));
        const fileUrl = yield uploadFileToCloud(req.file.buffer, req.file.originalname, req.file.mimetype);
        res.status(200).json(Object.assign(Object.assign({}, (0, aiService_1.aiSuccess)({
            fileUrl,
            fileId: req.file.originalname,
            fileName: req.file.originalname,
            fileSize: req.file.size,
        })), { fileUrl, fileId: req.file.originalname, fileName: req.file.originalname, fileSize: req.file.size }));
    }
    catch (error) {
        next(error);
    }
});
exports.uploadChatFile = uploadChatFile;
