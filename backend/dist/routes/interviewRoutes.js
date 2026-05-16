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
const express_1 = require("express");
const uploadMiddleware_1 = require("../middlewares/uploadMiddleware");
const whisperService_1 = require("../services/whisperService");
const interviewController_1 = require("../controllers/interviewController");
const questionController_1 = require("../controllers/questionController");
const aiController_1 = require("../controllers/aiController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.protect);
// ── Session management ──────────────────────────────────────────────────────
router.post('/start', interviewController_1.startInterview); // POST /api/interviews/start
router.get('/', interviewController_1.listInterviews); // GET  /api/interviews
router.get('/:id', interviewController_1.getInterview); // GET  /api/interviews/:id
router.post('/:id/finish', interviewController_1.finishInterview); // POST /api/interviews/:id/finish
// ── Question flow (placeholder) ─────────────────────────────────────────────
router.post('/:id/question', questionController_1.generateNextQuestion); // POST /api/interviews/:id/question
router.get('/:id/questions', questionController_1.getInterviewQuestions); // GET  /api/interviews/:id/questions
// ── AI-powered endpoints ─────────────────────────────────────────────────────
router.post('/:id/generate-question', aiController_1.generateAIQuestion); // POST /api/interviews/:id/generate-question (Gemini)
router.post('/:id/next-turn', aiController_1.nextInterviewTurn); // POST /api/interviews/:id/next-turn (full loop)
// ── Speech-to-Text ───────────────────────────────────────────────────────────
router.post('/speech-to-text', uploadMiddleware_1.upload.single('audio'), ((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                data: null,
                error: 'No audio file provided',
            });
        }
        const filePath = req.file.path;
        const transcript = yield (0, whisperService_1.transcribeAudio)(filePath);
        res.json({
            success: true,
            data: { transcript },
            error: null,
            transcript,
        });
    }
    catch (error) {
        console.error("Whisper transcription error:", error);
        res.status(503).json({
            success: false,
            data: { transcript: '' },
            error: 'Transcription is temporarily unavailable. Please retry the recording.',
            transcript: '',
        });
    }
})));
exports.default = router;
