"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminController_1 = require("../controllers/adminController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const adminMiddleware_1 = require("../middlewares/adminMiddleware");
const router = (0, express_1.Router)();
// Protect all admin routes
router.use(authMiddleware_1.protect, adminMiddleware_1.requireAdmin);
// We keep /metrics as an alias or replace it with /analytics if exactly matched
router.get('/analytics', adminController_1.getSystemMetrics);
router.get('/metrics', adminController_1.getSystemMetrics);
router.get('/users', adminController_1.getPlatformUsers);
router.get('/interviews', adminController_1.getPlatformInterviews);
router.post('/users/:id/mark-paid', adminController_1.markPaid);
router.post('/users/:id/add-credits', adminController_1.addCredits);
router.post('/users/:id/ban', adminController_1.banUser);
router.delete('/users/:id', adminController_1.deleteUser);
exports.default = router;
