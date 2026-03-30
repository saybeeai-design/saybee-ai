"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const paymentController_1 = require("../controllers/paymentController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// All payment routes require authentication
router.use(authMiddleware_1.protect);
// POST /api/payments/create-order  → Razorpay order creation
router.post('/create-order', paymentController_1.createOrder);
// POST /api/payments/verify  → Signature verification + credit allocation
router.post('/verify', paymentController_1.verifyPayment);
// GET /api/payments/history  → User's billing history
router.get('/history', paymentController_1.getBillingHistory);
exports.default = router;
