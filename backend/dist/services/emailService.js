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
exports.sendPaymentSuccessEmail = exports.sendPasswordReset = exports.sendInterviewReport = exports.sendSignupConfirmation = void 0;
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
const sendPaymentSuccessEmail = (email, name, planName, credits, amount) => __awaiter(void 0, void 0, void 0, function* () {
    if (isStubMode) {
        console.log(`[Email Stub] Payment success email sent to ${email} — Plan: ${planName}, Credits: +${credits}`);
        return;
    }
    const dashboardUrl = `${process.env.FRONTEND_URL}/dashboard`;
    yield transporter.sendMail({
        from: '"SayBee AI" <noreply@saybee.ai>',
        to: email,
        subject: `🎉 Payment Successful – ${credits} Credit${credits > 1 ? 's' : ''} Added!`,
        html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; padding: 0;">
          <div style="max-width: 520px; margin: 40px auto; background: #1e293b; border-radius: 16px; overflow: hidden; border: 1px solid #334155;">
            <div style="background: linear-gradient(135deg, #3b82f6, #6366f1); padding: 32px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 8px;">🎉</div>
              <h1 style="color: #fff; margin: 0; font-size: 24px; font-weight: 700;">Payment Successful!</h1>
              <p style="color: #bfdbfe; margin: 8px 0 0; font-size: 14px;">Welcome to ${planName}</p>
            </div>
            <div style="padding: 32px;">
              <p style="font-size: 16px; color: #cbd5e1;">Hi <strong style="color: #f1f5f9;">${name}</strong>,</p>
              <p style="color: #94a3b8; line-height: 1.6;">
                Your payment of <strong style="color: #f1f5f9;">₹${(amount / 100).toFixed(0)}</strong> has been processed successfully.
                We've added <strong style="color: #60a5fa;">${credits} credit${credits > 1 ? 's' : ''}</strong> to your SayBee AI account.
              </p>
              <div style="background: #0f172a; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #1e3a5f; text-align: center;">
                <p style="margin: 0; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Credits Added</p>
                <p style="margin: 8px 0 0; font-size: 42px; font-weight: 800; color: #60a5fa;">+${credits}</p>
              </div>
              <a href="${dashboardUrl}" style="display: block; background: linear-gradient(135deg, #3b82f6, #6366f1); color: #fff; text-align: center; padding: 14px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px;">
                Start Your Interview →
              </a>
            </div>
            <div style="padding: 16px 32px; border-top: 1px solid #334155; text-align: center;">
              <p style="color: #475569; font-size: 12px; margin: 0;">© 2025 SayBee AI · <a href="${dashboardUrl}" style="color: #3b82f6;">Dashboard</a></p>
            </div>
          </div>
        </body>
      </html>
    `,
    });
});
exports.sendPaymentSuccessEmail = sendPaymentSuccessEmail;
