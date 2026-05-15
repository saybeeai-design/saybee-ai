"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.protect = void 0;
const helpers_1 = require("../utils/helpers");
const parseCookies = (cookieHeader) => {
    if (!cookieHeader)
        return {};
    return cookieHeader.split(';').reduce((acc, part) => {
        const [rawKey, ...rest] = part.trim().split('=');
        if (!rawKey || rest.length === 0)
            return acc;
        acc[rawKey] = decodeURIComponent(rest.join('='));
        return acc;
    }, {});
};
const protect = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const cookies = parseCookies(req.headers.cookie);
    const cookieToken = cookies.sb_access_token;
    const headerToken = (authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith('Bearer ')) ? authHeader.split(' ')[1] : null;
    const token = headerToken || cookieToken;
    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token provided' });
        return;
    }
    try {
        const decoded = (0, helpers_1.verifyToken)(token);
        req.user = decoded;
        next();
    }
    catch (_a) {
        res.status(401).json({ message: 'Not authorized, token is invalid or expired' });
    }
};
exports.protect = protect;
