"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFound = exports.errorHandler = void 0;
const dbService_1 = require("../services/dbService");
const databaseErrors_1 = require("../utils/databaseErrors");
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
    if ((0, databaseErrors_1.isSchemaMismatchDatabaseError)(err)) {
        (0, dbService_1.markDatabaseUnhealthy)(err);
        console.error(`[DB] Schema mismatch detected: ${(0, databaseErrors_1.getDatabaseErrorMessage)(err)}`);
        res.status(503).json({
            code: 'DATABASE_SCHEMA_MISMATCH',
            message: 'Database schema is out of date for the current backend release. Apply Prisma schema changes and retry.',
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
