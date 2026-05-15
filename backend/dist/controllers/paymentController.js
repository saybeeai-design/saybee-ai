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
exports.getBillingHistory = exports.webhookPayment = exports.verifyPayment = exports.createOrder = exports.verifyCheckoutSignature = void 0;
const crypto_1 = __importDefault(require("crypto"));
const db_1 = __importDefault(require("../config/db"));
const razorpayService_1 = require("../services/razorpayService");
const emailService_1 = require("../services/emailService");
const createSignature = (orderId, paymentId) => crypto_1.default
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
const verifyCheckoutSignature = (payload) => {
    const expectedSignature = createSignature(payload.razorpay_order_id, payload.razorpay_payment_id);
    return expectedSignature === payload.razorpay_signature;
};
exports.verifyCheckoutSignature = verifyCheckoutSignature;
const processPayment = (params) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, plan, paymentId, orderId, eventId, rawPayload } = params;
    const planConfig = razorpayService_1.PLANS[plan.toLowerCase()];
    if (!planConfig)
        throw new Error('Invalid plan');
    const existingRecord = yield db_1.default.paymentRecord.findUnique({
        where: { paymentId },
        select: { id: true },
    });
    if (existingRecord) {
        const user = yield db_1.default.user.findUniqueOrThrow({
            where: { id: userId },
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
        return { creditsAdded: 0, user };
    }
    const [updatedUser] = yield db_1.default.$transaction([
        db_1.default.user.update({
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
        }),
        db_1.default.subscription.create({
            data: {
                userId,
                plan: planConfig.subscriptionType,
                status: 'ACTIVE',
            },
        }),
        db_1.default.paymentRecord.create({
            data: {
                paymentId,
                orderId,
                provider: 'RAZORPAY',
                eventType: 'PAYMENT_CAPTURED',
                eventId,
                email: '',
                amount: planConfig.amount,
                creditsAdded: planConfig.credits,
                status: 'PROCESSED',
                rawPayload: rawPayload,
                userId,
            },
        }),
        db_1.default.usageLog.create({
            data: {
                userId,
                action: 'PAYMENT_SUCCESS',
                details: JSON.stringify({
                    plan,
                    credits: planConfig.credits,
                    amount: planConfig.amount,
                    paymentId,
                    orderId,
                }),
            },
        }),
    ]);
    yield db_1.default.paymentRecord.update({
        where: { paymentId },
        data: { email: updatedUser.email },
    });
    return { creditsAdded: planConfig.credits, user: updatedUser };
});
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
        const razorpay = (0, razorpayService_1.getRazorpayClient)();
        const order = yield razorpay.orders.create({
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
            keyId: process.env.RAZORPAY_KEY_ID || null,
            stub: false,
        });
    }
    catch (error) {
        next(error);
    }
});
exports.createOrder = createOrder;
const verifyPayment = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const payload = req.body;
        const planConfig = razorpayService_1.PLANS[(_b = payload.plan) === null || _b === void 0 ? void 0 : _b.toLowerCase()];
        if (!planConfig) {
            res.status(400).json({ message: 'Invalid plan.' });
            return;
        }
        if (!(0, exports.verifyCheckoutSignature)(payload)) {
            res.status(400).json({ message: 'Payment verification failed. Invalid signature.' });
            return;
        }
        const razorpay = (0, razorpayService_1.getRazorpayClient)();
        const payment = yield razorpay.payments.fetch(payload.razorpay_payment_id);
        if (payment.order_id !== payload.razorpay_order_id || payment.status !== 'captured') {
            res.status(400).json({ message: 'Payment verification failed. Payment not captured.' });
            return;
        }
        if (payment.amount !== planConfig.amount) {
            res.status(400).json({ message: 'Payment amount mismatch.' });
            return;
        }
        const result = yield processPayment({
            userId,
            plan: payload.plan,
            paymentId: payload.razorpay_payment_id,
            orderId: payload.razorpay_order_id,
            rawPayload: payload,
        });
        if (result.creditsAdded > 0) {
            try {
                yield (0, emailService_1.sendPaymentSuccessEmail)(result.user.email, (_c = result.user.name) !== null && _c !== void 0 ? _c : 'there', planConfig.subscriptionType, planConfig.credits, planConfig.amount);
            }
            catch (emailErr) {
                console.error('[Email] Failed to send payment success email:', emailErr);
            }
        }
        res.status(200).json({
            message: result.creditsAdded > 0 ? 'Payment verified successfully!' : 'Payment already processed.',
            user: result.user,
            creditsAdded: result.creditsAdded,
        });
    }
    catch (error) {
        next(error);
    }
});
exports.verifyPayment = verifyPayment;
const webhookPayment = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        if (!razorpayService_1.razorpayWebhookSecret) {
            res.status(500).json({ message: 'RAZORPAY_WEBHOOK_SECRET is not configured' });
            return;
        }
        const signature = req.header('x-razorpay-signature');
        const eventId = req.header('x-razorpay-event-id') || undefined;
        if (!signature || !Buffer.isBuffer(req.body)) {
            res.status(400).json({ message: 'Invalid webhook payload' });
            return;
        }
        const expected = crypto_1.default.createHmac('sha256', razorpayService_1.razorpayWebhookSecret).update(req.body).digest('hex');
        if (expected !== signature) {
            res.status(400).json({ message: 'Invalid webhook signature' });
            return;
        }
        const event = JSON.parse(req.body.toString('utf8'));
        if (event.event !== 'payment.captured') {
            res.status(200).json({ message: 'Ignored event' });
            return;
        }
        const payment = (_b = (_a = event.payload) === null || _a === void 0 ? void 0 : _a.payment) === null || _b === void 0 ? void 0 : _b.entity;
        const notes = (payment === null || payment === void 0 ? void 0 : payment.notes) || {};
        const userId = notes.userId;
        const plan = notes.plan;
        const paymentId = payment === null || payment === void 0 ? void 0 : payment.id;
        const orderId = payment === null || payment === void 0 ? void 0 : payment.order_id;
        if (!userId || !plan || !paymentId || !orderId) {
            res.status(400).json({ message: 'Missing webhook payment metadata' });
            return;
        }
        const result = yield processPayment({
            userId,
            plan,
            paymentId,
            orderId,
            eventId,
            rawPayload: event,
        });
        res.status(200).json({ message: 'Webhook processed', creditsAdded: result.creditsAdded });
    }
    catch (error) {
        next(error);
    }
});
exports.webhookPayment = webhookPayment;
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
        const payments = yield db_1.default.paymentRecord.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        res.status(200).json({ subscriptions, payments });
    }
    catch (error) {
        next(error);
    }
});
exports.getBillingHistory = getBillingHistory;
