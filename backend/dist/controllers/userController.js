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
exports.updateProfile = exports.getProfile = void 0;
const db_1 = __importDefault(require("../config/db"));
const helpers_1 = require("../utils/helpers");
// ─── GET /api/users/profile ───────────────────────────────────────────────────
const getProfile = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const user = yield db_1.default.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                credits: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: { resumes: true, interviews: true },
                },
            },
        });
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        res.status(200).json({ user });
    }
    catch (error) {
        next(error);
    }
});
exports.getProfile = getProfile;
// ─── PUT /api/users/profile ───────────────────────────────────────────────────
const updateProfile = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const { name, password } = req.body;
        const updateData = {};
        if (name)
            updateData.name = name;
        if (password) {
            if (password.length < 8) {
                res.status(400).json({ message: 'Password must be at least 8 characters' });
                return;
            }
            updateData.password = yield (0, helpers_1.hashPassword)(password);
        }
        if (Object.keys(updateData).length === 0) {
            res.status(400).json({ message: 'No valid fields to update' });
            return;
        }
        const updatedUser = yield db_1.default.user.update({
            where: { id: userId },
            data: updateData,
            select: { id: true, name: true, email: true, role: true, updatedAt: true },
        });
        res.status(200).json({ message: 'Profile updated successfully', user: updatedUser });
    }
    catch (error) {
        next(error);
    }
});
exports.updateProfile = updateProfile;
