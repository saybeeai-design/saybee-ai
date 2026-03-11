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
exports.validateCoupon = exports.toggleCouponActivity = exports.getCoupons = exports.createCoupon = void 0;
const db_1 = __importDefault(require("../config/db"));
// ─── ADMIN: Create Coupon ───────────────────────────────────────────────────
const createCoupon = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { code, discountType, discountValue, expiryDate, maxUses } = req.body;
        const existing = yield db_1.default.coupon.findUnique({ where: { code } });
        if (existing) {
            res.status(400).json({ message: 'Coupon code already exists' });
            return;
        }
        const coupon = yield db_1.default.coupon.create({
            data: {
                code: code.toUpperCase(),
                discountType,
                discountValue,
                expiryDate: new Date(expiryDate),
                maxUses
            }
        });
        res.status(201).json({ message: 'Coupon created successfully', coupon });
    }
    catch (error) {
        next(error);
    }
});
exports.createCoupon = createCoupon;
// ─── ADMIN: Get Coupons ─────────────────────────────────────────────────────
const getCoupons = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const coupons = yield db_1.default.coupon.findMany({ orderBy: { createdAt: 'desc' } });
        res.status(200).json({ coupons });
    }
    catch (error) {
        next(error);
    }
});
exports.getCoupons = getCoupons;
// ─── ADMIN: Toggle Coupon Status ────────────────────────────────────────────
const toggleCouponActivity = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = req.params.id;
        const { active } = req.body;
        const coupon = yield db_1.default.coupon.update({
            where: { id },
            data: { active }
        });
        res.status(200).json({ message: 'Coupon status updated', coupon });
    }
    catch (error) {
        next(error);
    }
});
exports.toggleCouponActivity = toggleCouponActivity;
// ─── PUBLIC: Validate Coupon ──────────────────────────────────────────────────
const validateCoupon = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { code } = req.body;
        if (!code) {
            res.status(400).json({ message: 'Coupon code is required' });
            return;
        }
        const coupon = yield db_1.default.coupon.findUnique({ where: { code: code.toUpperCase() } });
        if (!coupon) {
            res.status(404).json({ message: 'Invalid coupon code' });
            return;
        }
        if (!coupon.active) {
            res.status(400).json({ message: 'This coupon is no longer active' });
            return;
        }
        if (new Date() > new Date(coupon.expiryDate)) {
            res.status(400).json({ message: 'This coupon has expired' });
            return;
        }
        if (coupon.maxUses > 0 && coupon.currentUses >= coupon.maxUses) {
            res.status(400).json({ message: 'This coupon has reached its usage limit' });
            return;
        }
        res.status(200).json({
            valid: true,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue
        });
    }
    catch (error) {
        next(error);
    }
});
exports.validateCoupon = validateCoupon;
