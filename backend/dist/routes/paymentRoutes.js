"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const paymentController_1 = require("../controllers/paymentController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// Webhook must be public for Stripe to reach it
router.post('/webhook', paymentController_1.stripeWebhook);
// Protected routes
router.use(authMiddleware_1.protect);
router.post('/create-checkout-session', paymentController_1.createCheckoutSession);
router.get('/history', paymentController_1.getBillingHistory);
exports.default = router;
