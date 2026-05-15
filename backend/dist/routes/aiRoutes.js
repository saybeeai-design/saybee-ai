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
const audioUpload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowedAudioTypes = ['audio/wav', 'audio/x-wav', 'audio/mpeg', 'audio/mp3', 'audio/webm', 'audio/mp4', 'audio/ogg'];
        if (allowedAudioTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Only WAV, MP3, WEBM, MP4, or OGG audio files are allowed'));
        }
    },
});
const fileUpload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowedTypes = ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Only PDF, TXT, and DOC files are allowed'));
        }
    }
});
router.use(authMiddleware_1.protect);
// POST /api/ai/transcribe  — Upload audio file → get text transcript (Whisper)
router.post('/transcribe', audioUpload.single('audio'), aiController_1.transcribeAudioFile);
// POST /api/ai/speak       — Text → speech audio
router.post('/speak', aiController_1.speakText);
// POST /api/ai/upload      — Upload files for chat
router.post('/upload', fileUpload.single('file'), aiController_1.uploadChatFile);
exports.default = router;
