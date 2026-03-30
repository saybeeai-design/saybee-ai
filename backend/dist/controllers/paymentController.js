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
exports.getBillingHistory = exports.verifyPayment = exports.createOrder = void 0;
const crypto_1 = __importDefault(require("crypto"));
const db_1 = __importDefault(require("../config/db"));
const razorpayService_1 = require("../services/razorpayService");
const emailService_1 = require("../services/emailService");
// ─── POST /api/payments/create-order ─────────────────────────────────────────
const createOrder = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const { plan } = req.body;
        const planConfig = razorpayService_1.PLANS[plan === null || plan === void 0 ? void 0 : plan.toLowerCase()];
        if (!planConfig) {
            res.status(400).json({
                message: `Invalid plan. Valid options: ${Object.keys(razorpayService_1.PLANS).join(', ')}`,
            });
            return;
        }
        // Stub / test mode — return a fake order so the frontend can test the flow
        if (razorpayService_1.isRazorpayStub) {
            console.log(`[Razorpay Stub] Creating order for plan: ${plan}, amount: ₹${planConfig.amount / 100}`);
            res.status(200).json({
                orderId: `stub_order_${Date.now()}`,
                amount: planConfig.amount,
                currency: planConfig.currency,
                plan,
                stub: true,
            });
            return;
        }
        const order = yield razorpayService_1.razorpay.orders.create({
            amount: planConfig.amount,
            currency: planConfig.currency,
            receipt: `rcpt_${userId.slice(0, 8)}_${Date.now()}`,
            notes: { userId, plan },
        });
        res.status(200).json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            plan,
        });
    }
    catch (error) {
        next(error);
    }
});
exports.createOrder = createOrder;
// ─── POST /api/payments/verify ────────────────────────────────────────────────
const verifyPayment = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body;
        const planConfig = razorpayService_1.PLANS[plan === null || plan === void 0 ? void 0 : plan.toLowerCase()];
        if (!planConfig) {
            res.status(400).json({ message: 'Invalid plan.' });
            return;
        }
        // ── Signature Verification ──────────────────────────────────────────────
        if (!razorpayService_1.isRazorpayStub) {
            const body = `${razorpay_order_id}|${razorpay_payment_id}`;
            const expectedSignature = crypto_1.default
                .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
                .update(body)
                .digest('hex');
            if (expectedSignature !== razorpay_signature) {
                res.status(400).json({ message: 'Payment verification failed. Invalid signature.' });
                return;
            }
        }
        else {
            console.log(`[Razorpay Stub] Skipping signature verification for stub order.`);
        }
        // ── Update DB ──────────────────────────────────────────────────────────
        const updatedUser = yield db_1.default.user.update({
            where: { id: userId },
            data: {
                credits: { increment: planConfig.credits },
                isPaid: true,
                subscriptionType: planConfig.subscriptionType,
            },
            select: {
                id: true,
                name: true,
                email: true,
                credits: true,
                subscriptionType: true,
                isPaid: true,
                role: true,
            },
        });
        // ── Log Subscription ───────────────────────────────────────────────────
        yield db_1.default.subscription.create({
            data: {
                userId,
                plan: planConfig.subscriptionType,
                status: 'ACTIVE',
            },
        });
        // ── Log Usage ──────────────────────────────────────────────────────────
        yield db_1.default.usageLog.create({
            data: {
                userId,
                action: 'PAYMENT_SUCCESS',
                details: JSON.stringify({
                    plan,
                    credits: planConfig.credits,
                    amount: planConfig.amount,
                    razorpay_payment_id,
                    razorpay_order_id,
                }),
            },
        });
        // ── Send Email ─────────────────────────────────────────────────────────
        try {
            yield (0, emailService_1.sendPaymentSuccessEmail)(updatedUser.email, (_b = updatedUser.name) !== null && _b !== void 0 ? _b : 'there', planConfig.subscriptionType, planConfig.credits, planConfig.amount);
        }
        catch (emailErr) {
            console.error('[Email] Failed to send payment success email:', emailErr);
            // Non-fatal — don't block the response
        }
        res.status(200).json({
            message: 'Payment verified successfully!',
            user: updatedUser,
            creditsAdded: planConfig.credits,
        });
    }
    catch (error) {
        next(error);
    }
});
exports.verifyPayment = verifyPayment;
// ─── GET /api/payments/history ────────────────────────────────────────────────
const getBillingHistory = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const subscriptions = yield db_1.default.subscription.findMany({
            where: { userId },
            orderBy: { startDate: 'desc' },
        });
        res.status(200).json({ subscriptions });
    }
    catch (error) {
        next(error);
    }
});
exports.getBillingHistory = getBillingHistory;
