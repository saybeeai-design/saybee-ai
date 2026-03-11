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
exports.sendPasswordReset = exports.sendInterviewReport = exports.sendSignupConfirmation = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const transporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.SMTP_PORT || '587'),
    auth: {
        user: process.env.SMTP_USER || 'stub_user',
        pass: process.env.SMTP_PASS || 'stub_pass',
    },
});
const isStubMode = !process.env.SMTP_USER || process.env.SMTP_USER.includes('stub');
const sendSignupConfirmation = (email, name) => __awaiter(void 0, void 0, void 0, function* () {
    if (isStubMode) {
        console.log(`[Email Stub] Signup confirmation sent to ${email}`);
        return;
    }
    yield transporter.sendMail({
        from: '"SayBee AI" <noreply@saybee.ai>',
        to: email,
        subject: 'Welcome to SayBee AI!',
        html: `<h3>Welcome to SayBee AI, ${name}!</h3><p>Your account has been successfully created. You can now log in and start practicing interviews with our AI.</p>`,
    });
});
exports.sendSignupConfirmation = sendSignupConfirmation;
const sendInterviewReport = (email, name, interviewId) => __awaiter(void 0, void 0, void 0, function* () {
    if (isStubMode) {
        console.log(`[Email Stub] Interview report sent to ${email} for interview #${interviewId}`);
        return;
    }
    const reportUrl = `${process.env.FRONTEND_URL}/dashboard/reports/${interviewId}`;
    yield transporter.sendMail({
        from: '"SayBee AI" <noreply@saybee.ai>',
        to: email,
        subject: 'Your AI Interview Report is Ready',
        html: `<h3>Hello ${name},</h3><p>Your interview has been evaluated.</p><p><a href="${reportUrl}">Click here to view your detailed feedback and score.</a></p>`,
    });
});
exports.sendInterviewReport = sendInterviewReport;
const sendPasswordReset = (email, resetToken) => __awaiter(void 0, void 0, void 0, function* () {
    if (isStubMode) {
        console.log(`[Email Stub] Password reset link sent to ${email} -> /reset-password?token=${resetToken}`);
        return;
    }
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    yield transporter.sendMail({
        from: '"SayBee AI" <noreply@saybee.ai>',
        to: email,
        subject: 'Reset Your Password - SayBee AI',
        html: `<h3>Password Reset Request</h3><p>Click the link below to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
    });
});
exports.sendPasswordReset = sendPasswordReset;
