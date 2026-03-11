"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
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
exports.default = router;
