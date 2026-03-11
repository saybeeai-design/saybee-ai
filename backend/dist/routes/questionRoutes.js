"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const questionController_1 = require("../controllers/questionController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.protect);
// POST   /api/questions/interviews/:id/question  — Generate next question
router.post('/interviews/:id/question', questionController_1.generateNextQuestion);
// GET    /api/questions/interviews/:id           — Get all questions
router.get('/interviews/:id', questionController_1.getInterviewQuestions);
exports.default = router;
