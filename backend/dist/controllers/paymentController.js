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
exports.getBillingHistory = exports.stripeWebhook = exports.createCheckoutSession = void 0;
const stripe_1 = __importDefault(require("stripe"));
const db_1 = __importDefault(require("../config/db"));
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY || 'sk_test_stub', {
    apiVersion: '2025-02-24.acacia', // Using generic typing for resilience
});
const isStubMode = !process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('stub');
// ─── POST /api/payments/create-checkout-session ──────────────────────────────
const createCheckoutSession = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const { planId } = req.body; // e.g. 'PRO' or 'ENTERPRISE'
        // In a real app, map planId to Stripe Price ID
        const priceId = planId === 'PRO' ? 'price_pro_stub' : 'price_enterprise_stub';
        if (isStubMode) {
            // Return a simulated URL that immediately triggers a success fallback
            res.status(200).json({ url: `/dashboard/billing/success?session_id=stub_session_${Date.now()}` });
            return;
        }
        const session = yield stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'subscription',
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${process.env.FRONTEND_URL}/dashboard/billing/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL}/dashboard/billing`,
            client_reference_id: userId,
            metadata: { userId, planId }
        });
        res.status(200).json({ url: session.url });
    }
    catch (error) {
        next(error);
    }
});
exports.createCheckoutSession = createCheckoutSession;
// ─── POST /api/payments/webhook ─────────────────────────────────────────────
// Note: Webhook needs to be parsed using express.raw() in app.ts before reaching here if verifying signatures.
const stripeWebhook = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        let event;
        if (isStubMode) {
            // Just simulate webhook logic
            event = req.body;
            if (!event.type)
                event.type = 'checkout.session.completed';
        }
        else {
            const sig = req.headers['stripe-signature'];
            try {
                event = stripe.webhooks.constructEvent(req.body, // In real scenario req.body needs to be Buffer
                sig, process.env.STRIPE_WEBHOOK_SECRET);
            }
            catch (err) {
                res.status(400).send(`Webhook Error: ${err.message}`);
                return;
            }
        }
        // Handle the event
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const userId = session.client_reference_id || ((_a = session.metadata) === null || _a === void 0 ? void 0 : _a.userId);
            const planId = ((_b = session.metadata) === null || _b === void 0 ? void 0 : _b.planId) || 'PRO';
            if (userId) {
                // Upgrade User
                yield db_1.default.user.update({
                    where: { id: userId },
                    data: {
                        stripeCustomerId: session.customer,
                        credits: { increment: planId === 'PRO' ? 10 : 50 } // Allocate credits
                    }
                });
                // Upsert Subscription
                yield db_1.default.subscription.create({
                    data: {
                        userId,
                        plan: planId,
                        status: 'ACTIVE',
                        stripeSubscriptionId: session.subscription,
                    }
                });
            }
        }
        res.status(200).json({ received: true });
    }
    catch (error) {
        next(error);
    }
});
exports.stripeWebhook = stripeWebhook;
// ─── GET /api/payments/history ─────────────────────────────────────────────
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
            orderBy: { startDate: 'desc' }
        });
        res.status(200).json({ subscriptions });
    }
    catch (error) {
        next(error);
    }
});
exports.getBillingHistory = getBillingHistory;
