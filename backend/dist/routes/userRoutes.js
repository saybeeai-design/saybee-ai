"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userController_1 = require("../controllers/userController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// All user routes require authentication
router.use(authMiddleware_1.protect);
// GET /api/users/profile
router.get('/profile', userController_1.getProfile);
// PUT /api/users/profile
router.put('/profile', userController_1.updateProfile);
exports.default = router;
