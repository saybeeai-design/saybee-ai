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
exports.resetPassword = exports.forgotPassword = exports.resolveFrontendUrl = exports.googleAuthCallback = exports.login = exports.signup = void 0;
const crypto_1 = __importDefault(require("crypto"));
const db_1 = __importDefault(require("../config/db"));
const helpers_1 = require("../utils/helpers");
const emailService_1 = require("../services/emailService");
const client_1 = require("@prisma/client");
const validation_1 = require("../utils/validation");
const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;
const resolveFrontendUrl = () => {
    var _a, _b, _c;
    const configuredFrontendUrl = (_a = process.env.FRONTEND_URL) === null || _a === void 0 ? void 0 : _a.trim();
    const firstCorsOrigin = (_c = (_b = process.env.CORS_ORIGIN) === null || _b === void 0 ? void 0 : _b.split(',')[0]) === null || _c === void 0 ? void 0 : _c.trim();
    const candidates = [configuredFrontendUrl, firstCorsOrigin, 'http://localhost:3000'].filter((value) => Boolean(value));
    const isLocalUrl = (value) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(value);
    const preferredUrl = process.env.NODE_ENV === 'production'
        ? candidates.find((value) => !isLocalUrl(value)) || candidates[0]
        : candidates[0];
    return preferredUrl.replace(/\/+$/, '');
};
exports.resolveFrontendUrl = resolveFrontendUrl;
const issueAuthCookie = (res, token) => {
    res.cookie('sb_access_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
    });
};
const signupLookupSelect = client_1.Prisma.validator()({
    id: true,
});
const loginUserSelect = client_1.Prisma.validator()({
    id: true,
    name: true,
    email: true,
    password: true,
    role: true,
    createdAt: true,
});
const forgotPasswordUserSelect = client_1.Prisma.validator()({
    id: true,
    email: true,
});
const signup = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const email = typeof ((_a = req.body) === null || _a === void 0 ? void 0 : _a.email) === 'string' ? req.body.email.trim().toLowerCase() : '';
        const password = typeof ((_b = req.body) === null || _b === void 0 ? void 0 : _b.password) === 'string' ? req.body.password : '';
        const name = (0, validation_1.sanitizeName)((_c = req.body) === null || _c === void 0 ? void 0 : _c.name);
        if (!(0, validation_1.isValidEmail)(email) || !(0, validation_1.isValidPassword)(password)) {
            res.status(400).json({ message: 'A valid email and a password with at least 8 characters are required' });
            return;
        }
        const existingUser = yield db_1.default.user.findUnique({
            where: { email },
            select: signupLookupSelect,
        });
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
        issueAuthCookie(res, token);
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
const login = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const email = typeof ((_a = req.body) === null || _a === void 0 ? void 0 : _a.email) === 'string' ? req.body.email.trim().toLowerCase() : '';
        const password = typeof ((_b = req.body) === null || _b === void 0 ? void 0 : _b.password) === 'string' ? req.body.password : '';
        if (!(0, validation_1.isValidEmail)(email) || !(0, validation_1.assertNonEmptyString)(password)) {
            res.status(400).json({ message: 'Email and password are required' });
            return;
        }
        const user = yield db_1.default.user.findUnique({
            where: { email },
            select: loginUserSelect,
        });
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
        issueAuthCookie(res, token);
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
const googleAuthCallback = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const frontendUrl = resolveFrontendUrl();
        const user = req.user;
        if (!user) {
            res.redirect(`${frontendUrl}/auth-callback?error=Google_Auth_Failed`);
            return;
        }
        const token = (0, helpers_1.generateToken)({ userId: user.id, email: user.email, role: user.role });
        issueAuthCookie(res, token);
        res.redirect(`${frontendUrl}/auth-callback?token=${encodeURIComponent(token)}`);
    }
    catch (error) {
        next(error);
    }
});
exports.googleAuthCallback = googleAuthCallback;
const forgotPassword = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const email = typeof ((_a = req.body) === null || _a === void 0 ? void 0 : _a.email) === 'string' ? req.body.email.trim().toLowerCase() : '';
        if (!(0, validation_1.isValidEmail)(email)) {
            res.status(400).json({ message: 'A valid email is required' });
            return;
        }
        const user = yield db_1.default.user.findUnique({
            where: { email },
            select: forgotPasswordUserSelect,
        });
        if (!user) {
            res.status(200).json({ message: 'If an account exists, a reset link has been sent' });
            return;
        }
        const rawToken = crypto_1.default.randomBytes(32).toString('hex');
        const tokenHash = crypto_1.default.createHash('sha256').update(rawToken).digest('hex');
        const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
        yield db_1.default.user.update({
            where: { id: user.id },
            data: {
                passwordResetTokenHash: tokenHash,
                passwordResetExpiresAt: expiresAt,
            },
        });
        yield (0, emailService_1.sendPasswordReset)(user.email, rawToken);
        res.status(200).json({ message: 'If an account exists, a reset link has been sent' });
    }
    catch (error) {
        next(error);
    }
});
exports.forgotPassword = forgotPassword;
const resetPassword = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const token = typeof ((_a = req.body) === null || _a === void 0 ? void 0 : _a.token) === 'string' ? req.body.token.trim() : '';
        const newPassword = typeof ((_b = req.body) === null || _b === void 0 ? void 0 : _b.newPassword) === 'string' ? req.body.newPassword : '';
        if (!(0, validation_1.assertNonEmptyString)(token) || !(0, validation_1.isValidPassword)(newPassword)) {
            res.status(400).json({ message: 'Token and a valid password are required' });
            return;
        }
        const tokenHash = crypto_1.default.createHash('sha256').update(token).digest('hex');
        const user = yield db_1.default.user.findFirst({
            where: {
                passwordResetTokenHash: tokenHash,
                passwordResetExpiresAt: { gt: new Date() },
            },
            select: { id: true },
        });
        if (!user) {
            res.status(400).json({ message: 'Reset token is invalid or expired' });
            return;
        }
        const hashedPassword = yield (0, helpers_1.hashPassword)(newPassword);
        yield db_1.default.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                passwordResetTokenHash: null,
                passwordResetExpiresAt: null,
            },
        });
        res.status(200).json({ message: 'Password reset successfully' });
    }
    catch (error) {
        next(error);
    }
});
exports.resetPassword = resetPassword;
