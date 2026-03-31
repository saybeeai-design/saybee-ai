"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const Sentry = __importStar(require("@sentry/node"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const passport_1 = __importDefault(require("./config/passport"));
const errorMiddleware_1 = require("./middlewares/errorMiddleware");
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const aiRoutes_1 = __importDefault(require("./routes/aiRoutes"));
const answerRoutes_1 = __importDefault(require("./routes/answerRoutes"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const couponRoutes_1 = __importDefault(require("./routes/couponRoutes"));
const interviewRoutes_1 = __importDefault(require("./routes/interviewRoutes"));
const paymentRoutes_1 = __importDefault(require("./routes/paymentRoutes"));
const resumeRoutes_1 = __importDefault(require("./routes/resumeRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const dbService_1 = require("./services/dbService");
Sentry.init({
    dsn: process.env.SENTRY_DSN || undefined,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
});
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'GEMINI_API_KEY'];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.error(`Missing required environment variable: ${envVar}`);
        process.exit(1);
    }
}
const optionalEnvGroups = [
    {
        name: 'Google OAuth',
        keys: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
        fallback: 'Google sign-in will use stub credentials until both variables are set.',
    },
    {
        name: 'Razorpay',
        keys: ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET'],
        fallback: 'Payment routes will run in stub mode until both variables are set.',
    },
    {
        name: 'SMTP',
        keys: ['SMTP_USER', 'SMTP_PASS'],
        fallback: 'Email delivery will run in stub mode until both variables are set.',
    },
];
for (const { name, keys, fallback } of optionalEnvGroups) {
    const configuredKeys = keys.filter((key) => Boolean(process.env[key]));
    if (configuredKeys.length === 0) {
        console.warn(`[Config] ${name} is not configured. ${fallback}`);
        continue;
    }
    if (configuredKeys.length !== keys.length) {
        const missingKeys = keys.filter((key) => !process.env[key]);
        console.error(`[Config] ${name} is partially configured. Missing: ${missingKeys.join(', ')}`);
        process.exit(1);
    }
}
const app = (0, express_1.default)();
// Render forwards the client IP through a proxy, so trust the first hop.
app.set('trust proxy', 1);
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(',')
        : ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use(passport_1.default.initialize());
app.use((0, helmet_1.default)());
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 150,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === '/health',
});
app.use('/api', limiter);
const aiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: 'Too many AI requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});
app.get('/', (_req, res) => {
    res.status(200).send('SayBee AI Backend is running! Access the API at /api/health');
});
app.get('/api/health', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        yield (0, dbService_1.ensureDatabaseConnection)();
    }
    catch (_b) {
        // Keep the process healthy and surface the DB state in the payload instead.
    }
    const databaseStatus = (0, dbService_1.getDatabaseStatus)();
    res.status(200).json({
        status: databaseStatus.connected ? 'ok' : 'degraded',
        database: databaseStatus.connected ? 'connected' : 'disconnected',
        details: databaseStatus,
        timestamp: new Date().toISOString(),
        version: (_a = process.env.npm_package_version) !== null && _a !== void 0 ? _a : '1.0.0',
    });
}));
app.use('/api', (req, _res, next) => __awaiter(void 0, void 0, void 0, function* () {
    if (req.path === '/health') {
        next();
        return;
    }
    try {
        yield (0, dbService_1.ensureDatabaseConnection)();
        next();
    }
    catch (error) {
        next(error);
    }
}));
app.use('/api/auth', authRoutes_1.default);
app.use('/api/users', userRoutes_1.default);
app.use('/api/resumes', resumeRoutes_1.default);
app.use('/api/interviews', aiLimiter, interviewRoutes_1.default);
app.use('/api/questions', aiLimiter, answerRoutes_1.default);
app.use('/api/ai', aiLimiter, aiRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
app.use('/api/payments', paymentRoutes_1.default);
app.use('/api/coupons', couponRoutes_1.default);
Sentry.setupExpressErrorHandler(app);
app.use(errorMiddleware_1.notFound);
app.use(errorMiddleware_1.errorHandler);
exports.default = app;
