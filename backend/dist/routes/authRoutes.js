"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const passport_1 = __importDefault(require("passport"));
const authController_1 = require("../controllers/authController");
const router = (0, express_1.Router)();
// POST /api/auth/signup
router.post('/signup', authController_1.signup);
// POST /api/auth/login
router.post('/login', authController_1.login);
// POST /api/auth/forgot-password
router.post('/forgot-password', authController_1.forgotPassword);
// POST /api/auth/reset-password
router.post('/reset-password', authController_1.resetPassword);
// GET /api/auth/google
router.get('/google', passport_1.default.authenticate('google', { scope: ['profile', 'email'] }));
// GET /api/auth/google/callback
router.get('/google/callback', passport_1.default.authenticate('google', { session: false }), authController_1.googleAuthCallback);
exports.default = router;
