"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFound = exports.errorHandler = void 0;
const dbService_1 = require("../services/dbService");
const isProduction = process.env.NODE_ENV === 'production';
const errorHandler = (err, _req, res, next) => {
    var _a;
    if (res.headersSent) {
        next(err);
        return;
    }
    if ((0, dbService_1.isRecoverableDatabaseError)(err)) {
        (0, dbService_1.markDatabaseUnhealthy)(err);
        (0, dbService_1.reconnectDatabaseInBackground)('request error');
        res.status(503).json({
            code: 'DATABASE_UNAVAILABLE',
            message: 'Database connection was interrupted. Please retry in a few seconds.',
        });
        return;
    }
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    const error = err instanceof Error ? err : new Error('Internal Server Error');
    res.status(statusCode);
    console.error(`[Error] ${error.message}`);
    res.json({
        message: statusCode >= 500 && isProduction ? 'Internal Server Error' : error.message,
        stack: isProduction ? null : (_a = error.stack) !== null && _a !== void 0 ? _a : null,
    });
};
exports.errorHandler = errorHandler;
const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
};
exports.notFound = notFound;
