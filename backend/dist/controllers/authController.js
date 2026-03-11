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
exports.resetPassword = exports.forgotPassword = exports.googleAuthCallback = exports.login = exports.signup = void 0;
const db_1 = __importDefault(require("../config/db"));
const helpers_1 = require("../utils/helpers");
const emailService_1 = require("../services/emailService");
// ─── POST /api/auth/signup ────────────────────────────────────────────────────
const signup = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ message: 'Email and password are required' });
            return;
        }
        if (password.length < 8) {
            res.status(400).json({ message: 'Password must be at least 8 characters' });
            return;
        }
        const existingUser = yield db_1.default.user.findUnique({ where: { email } });
        if (existingUser) {
            res.status(409).json({ message: 'A user with this email already exists' });
            return;
        }
        const hashedPassword = yield (0, helpers_1.hashPassword)(password);
        const user = yield db_1.default.user.create({
            data: { name, email, password: hashedPassword },
            select: { id: true, name: true, email: true, role: true, createdAt: true },
        });
        const token = (0, helpers_1.generateToken)({ userId: user.id, email: user.email, role: user.role });
        // Send Welcome Email (Non-blocking ideally, but awaited for simplicity here)
        yield (0, emailService_1.sendSignupConfirmation)(user.email, user.name || 'User').catch((err) => console.error('Email error:', err));
        res.status(201).json({
            message: 'Account created successfully',
            token,
            user,
        });
    }
    catch (error) {
        next(error);
    }
});
exports.signup = signup;
// ─── POST /api/auth/login ────────────────────────────────────────────────────
const login = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ message: 'Email and password are required' });
            return;
        }
        const user = yield db_1.default.user.findUnique({ where: { email } });
        if (!user) {
            res.status(401).json({ message: 'Invalid email or password' });
            return;
        }
        const isMatch = user.password ? yield (0, helpers_1.comparePassword)(password, user.password) : false;
        if (!isMatch) {
            res.status(401).json({ message: 'Invalid email or password' });
            return;
        }
        const token = (0, helpers_1.generateToken)({ userId: user.id, email: user.email, role: user.role });
        res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
exports.login = login;
// ─── GET /api/auth/google/callback ────────────────────────────────────────────
const googleAuthCallback = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        if (!user) {
            res.redirect(`${process.env.FRONTEND_URL}/login?error=Google_Auth_Failed`);
            return;
        }
        const token = (0, helpers_1.generateToken)({ userId: user.id, email: user.email, role: user.role });
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        // Redirect to frontend auth-callback route with the token
        res.redirect(`${frontendUrl}/auth-callback?token=${token}`);
    }
    catch (error) {
        next(error);
    }
});
exports.googleAuthCallback = googleAuthCallback;
// ─── POST /api/auth/forgot-password ─────────────────────────────────────────
const emailService_2 = require("../services/emailService");
const forgotPassword = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email } = req.body;
        if (!email) {
            res.status(400).json({ message: 'Email is required' });
            return;
        }
        const user = yield db_1.default.user.findUnique({ where: { email } });
        if (!user) {
            // Return 200 anyway to prevent email enumeration
            res.status(200).json({ message: 'If an account exists, a reset link has been sent' });
            return;
        }
        // In a real app, you would create a token in the DB and attach it to the email.
        // For this stub, we just simulate the flow.
        const resetToken = `stub_reset_${Date.now()}`;
        yield (0, emailService_2.sendPasswordReset)(user.email, resetToken).catch(err => console.error(err));
        res.status(200).json({ message: 'If an account exists, a reset link has been sent' });
    }
    catch (error) {
        next(error);
    }
});
exports.forgotPassword = forgotPassword;
// ─── POST /api/auth/reset-password ──────────────────────────────────────────
const resetPassword = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            res.status(400).json({ message: 'Token and new password are required' });
            return;
        }
        // Since this is a stub, we won't verify the DB token, but we would hash the new password and update the user.
        // In real app, find user by resetToken. For now, just return success if string > 8.
        if (newPassword.length < 8) {
            res.status(400).json({ message: 'Password must be at least 8 characters' });
            return;
        }
        // Stub: We can't update without knowing the user, so we just acknowledge it.
        res.status(200).json({ message: 'Password reset successfully (Stub logic executed)' });
    }
    catch (error) {
        next(error);
    }
});
exports.resetPassword = resetPassword;
