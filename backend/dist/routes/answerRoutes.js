"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const answerController_1 = require("../controllers/answerController");
const aiController_1 = require("../controllers/aiController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.protect);
// POST  /api/questions/:id/answer    — Submit answer
router.post('/:id/answer', answerController_1.submitAnswer);
// GET   /api/questions/:id/answer    — Get answer
router.get('/:id/answer', answerController_1.getAnswer);
// POST  /api/questions/:id/evaluate  — AI evaluate an existing answer (Gemini)
router.post('/:id/evaluate', aiController_1.evaluateQuestionAnswer);
exports.default = router;
