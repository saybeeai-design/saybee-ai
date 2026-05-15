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
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const client_1 = require("@prisma/client");
const db_1 = __importDefault(require("./db"));
const dotenv_1 = __importDefault(require("dotenv"));
const databaseErrors_1 = require("../utils/databaseErrors");
dotenv_1.default.config();
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
// In production, callbackURL should be an absolute URL like https://api.saybeeai.com/api/auth/google/callback
const callbackURL = process.env.GOOGLE_CALLBACK_URL;
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !callbackURL) {
    throw new Error('GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_CALLBACK_URL must be configured');
}
const googleAuthUserSelect = client_1.Prisma.validator()({
    id: true,
    email: true,
    name: true,
    role: true,
    createdAt: true,
});
passport_1.default.use(new passport_google_oauth20_1.Strategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL,
}, (accessToken, refreshToken, profile, done) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    let authContext = `googleId=${profile.id}`;
    try {
        const email = (_a = profile.emails) === null || _a === void 0 ? void 0 : _a[0].value;
        if (!email) {
            return done(new Error('No email found from Google profile'), false);
        }
        authContext = `email=${email}, googleId=${profile.id}`;
        let user = yield db_1.default.user.findUnique({
            where: { googleId: profile.id },
            select: googleAuthUserSelect,
        });
        if (user) {
            return done(null, user);
        }
        user = yield db_1.default.user.findUnique({
            where: { email },
            select: googleAuthUserSelect,
        });
        if (user) {
            user = yield db_1.default.user.update({
                where: { email },
                data: {
                    googleId: profile.id,
                    provider: 'GOOGLE',
                },
                select: googleAuthUserSelect,
            });
            return done(null, user);
        }
        user = yield db_1.default.user.create({
            data: {
                email,
                name: profile.displayName || email.split('@')[0],
                googleId: profile.id,
                provider: 'GOOGLE',
            },
            select: googleAuthUserSelect,
        });
        return done(null, user);
    }
    catch (error) {
        const message = (0, databaseErrors_1.getDatabaseErrorMessage)(error);
        if ((0, databaseErrors_1.isSchemaMismatchDatabaseError)(error)) {
            console.error(`[Auth] Google OAuth database schema mismatch (${authContext}): ${message}. Apply the latest Prisma schema to the production database.`);
        }
        else {
            console.error(`[Auth] Google OAuth user sync failed (${authContext}): ${message}`);
        }
        return done(error, false);
    }
})));
exports.default = passport_1.default;
