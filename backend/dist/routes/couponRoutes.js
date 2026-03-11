"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const couponController_1 = require("../controllers/couponController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const adminMiddleware_1 = require("../middlewares/adminMiddleware");
const router = (0, express_1.Router)();
// Public validation
router.post('/validate', authMiddleware_1.protect, couponController_1.validateCoupon);
// Admin only routes
router.use(authMiddleware_1.protect, adminMiddleware_1.requireAdmin);
router.post('/', couponController_1.createCoupon);
router.get('/', couponController_1.getCoupons);
router.patch('/:id/toggle', couponController_1.toggleCouponActivity);
exports.default = router;
