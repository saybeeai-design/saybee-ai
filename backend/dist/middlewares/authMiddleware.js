"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.protect = void 0;
const helpers_1 = require("../utils/helpers");
const protect = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ message: 'Not authorized, no token provided' });
        return;
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = (0, helpers_1.verifyToken)(token);
        req.user = decoded;
        next();
    }
    catch (error) {
        res.status(401).json({ message: 'Not authorized, token is invalid or expired' });
    }
};
exports.protect = protect;
