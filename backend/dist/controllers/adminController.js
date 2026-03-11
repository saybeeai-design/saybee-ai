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
exports.deleteUser = exports.banUser = exports.addCredits = exports.markPaid = exports.getPlatformInterviews = exports.getPlatformUsers = exports.getSystemMetrics = void 0;
const db_1 = __importDefault(require("../config/db"));
// ─── GET /api/admin/metrics ─────────────────────────────────────────────────
const getSystemMetrics = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const totalUsers = yield db_1.default.user.count();
        const totalInterviews = yield db_1.default.interview.count();
        const totalResumes = yield db_1.default.resume.count();
        // AI Usage Stats
        const totalQuestions = yield db_1.default.question.count();
        const totalTranscripts = yield db_1.default.transcript.count();
        const metrics = {
            users: totalUsers,
            interviews: totalInterviews,
            resumes: totalResumes,
            aiUsage: {
                generatedQuestions: totalQuestions,
                processedTranscripts: totalTranscripts
            }
        };
        res.status(200).json(metrics);
    }
    catch (error) {
        next(error);
    }
});
exports.getSystemMetrics = getSystemMetrics;
// ─── GET /api/admin/users ───────────────────────────────────────────────────
const getPlatformUsers = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Basic pagination could be added here
        const users = yield db_1.default.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                credits: true,
                // @ts-ignore
                isPaid: true,
                createdAt: true,
                _count: {
                    select: { interviews: true, resumes: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json({ users });
    }
    catch (error) {
        next(error);
    }
});
exports.getPlatformUsers = getPlatformUsers;
// ─── GET /api/admin/interviews ──────────────────────────────────────────────
const getPlatformInterviews = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const interviews = yield db_1.default.interview.findMany({
            include: {
                user: { select: { name: true, email: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 50 // Limit to recent 50 for admin dashboard preview
        });
        res.status(200).json({ interviews });
    }
    catch (error) {
        next(error);
    }
});
exports.getPlatformInterviews = getPlatformInterviews;
// ─── POST /api/admin/users/:id/mark-paid ──────────────────────────────────────
const markPaid = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = req.params.id;
        const user = yield db_1.default.user.update({
            where: { id },
            // @ts-ignore
            data: { isPaid: true }
        });
        res.status(200).json({ message: 'User marked as paid', user });
    }
    catch (error) {
        next(error);
    }
});
exports.markPaid = markPaid;
// ─── POST /api/admin/users/:id/add-credits ────────────────────────────────────
const addCredits = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = req.params.id;
        const { amount } = req.body;
        const user = yield db_1.default.user.update({
            where: { id },
            // Use parsed amount or fallback
            data: { credits: { increment: amount ? Number(amount) : 0 } }
        });
        res.status(200).json({ message: 'Credits added successfully', user });
    }
    catch (error) {
        next(error);
    }
});
exports.addCredits = addCredits;
// ─── POST /api/admin/users/:id/ban ────────────────────────────────────────────
const banUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = req.params.id;
        const user = yield db_1.default.user.update({
            where: { id },
            data: { role: 'BANNED' }
        });
        res.status(200).json({ message: 'User banned successfully', user });
    }
    catch (error) {
        next(error);
    }
});
exports.banUser = banUser;
// ─── DELETE /api/admin/users/:id ──────────────────────────────────────────────
const deleteUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = req.params.id;
        yield db_1.default.user.delete({ where: { id } });
        res.status(200).json({ message: 'User deleted successfully' });
    }
    catch (error) {
        next(error);
    }
});
exports.deleteUser = deleteUser;
