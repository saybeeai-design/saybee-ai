"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const resumeController_1 = require("../controllers/resumeController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const uploadMiddleware_1 = require("../middlewares/uploadMiddleware");
const router = (0, express_1.Router)();
// All resume routes require authentication
router.use(authMiddleware_1.protect);
// POST /api/resumes/upload
router.post('/upload', uploadMiddleware_1.upload.single('resume'), resumeController_1.uploadResume);
// GET /api/resumes
router.get('/', resumeController_1.getResumes);
// DELETE /api/resumes/:id
router.delete('/:id', resumeController_1.deleteResume);
exports.default = router;
