"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const aiController_1 = require("../controllers/aiController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
const audioUpload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
router.use(authMiddleware_1.protect);
// POST /api/ai/transcribe  — Upload audio file → get text transcript (Whisper)
router.post('/transcribe', audioUpload.single('audio'), aiController_1.transcribeAudioFile);
// POST /api/ai/speak       — Text → speech audio (Google TTS / stub)
router.post('/speak', aiController_1.speakText);
exports.default = router;
