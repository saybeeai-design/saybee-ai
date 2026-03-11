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
exports.deleteResume = exports.getResumes = exports.uploadResume = void 0;
const db_1 = __importDefault(require("../config/db"));
const storageService_1 = require("../services/storageService");
// ─── POST /api/resumes/upload ─────────────────────────────────────────────────
const uploadResume = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        if (!req.file) {
            res.status(400).json({ message: 'No file uploaded. Please upload a PDF file.' });
            return;
        }
        const fileName = req.file.originalname;
        // Upload buffer to cloud storage
        const fileUrl = yield (0, storageService_1.uploadFileToCloud)(req.file.buffer, req.file.originalname, req.file.mimetype);
        const resume = yield db_1.default.resume.create({
            data: {
                userId,
                fileName,
                fileUrl,
                // parsedData will be populated by the resume-parsing service (future step)
            },
        });
        res.status(201).json({
            message: 'Resume uploaded successfully',
            resume,
        });
    }
    catch (error) {
        next(error);
    }
});
exports.uploadResume = uploadResume;
// ─── GET /api/resumes ────────────────────────────────────────────────────────
const getResumes = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const resumes = yield db_1.default.resume.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
        res.status(200).json({ resumes });
    }
    catch (error) {
        next(error);
    }
});
exports.getResumes = getResumes;
// ─── DELETE /api/resumes/:id ─────────────────────────────────────────────────
const deleteResume = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const id = req.params.id;
        const resume = yield db_1.default.resume.findFirst({ where: { id, userId } });
        if (!resume) {
            res.status(404).json({ message: 'Resume not found' });
            return;
        }
        yield db_1.default.resume.delete({ where: { id: id } });
        res.status(200).json({ message: 'Resume deleted successfully' });
    }
    catch (error) {
        next(error);
    }
});
exports.deleteResume = deleteResume;
