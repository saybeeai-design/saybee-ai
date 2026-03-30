"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var _a, _b, _c, _d, _e;
Object.defineProperty(exports, "__esModule", { value: true });
exports.shutdownDatabase = exports.getDatabaseStatus = exports.ensureDatabaseConnection = exports.reconnectDatabaseInBackground = exports.connectToDatabase = exports.markDatabaseUnhealthy = exports.isRecoverableDatabaseError = void 0;
const db_1 = __importStar(require("../config/db"));
const databaseErrors_1 = require("../utils/databaseErrors");
Object.defineProperty(exports, "isRecoverableDatabaseError", { enumerable: true, get: function () { return databaseErrors_1.isRecoverableDatabaseError; } });
const STARTUP_RETRIES = Number((_a = process.env.DB_CONNECT_MAX_RETRIES) !== null && _a !== void 0 ? _a : 5);
const STARTUP_RETRY_DELAY_MS = Number((_b = process.env.DB_CONNECT_RETRY_DELAY_MS) !== null && _b !== void 0 ? _b : 5000);
const REQUEST_RETRIES = Number((_c = process.env.DB_REQUEST_RECONNECT_RETRIES) !== null && _c !== void 0 ? _c : 1);
const REQUEST_RETRY_DELAY_MS = Number((_d = process.env.DB_REQUEST_RECONNECT_DELAY_MS) !== null && _d !== void 0 ? _d : 1000);
const HEALTH_CHECK_INTERVAL_MS = Number((_e = process.env.DB_HEALTH_CHECK_INTERVAL_MS) !== null && _e !== void 0 ? _e : 30000);
let databaseState = 'idle';
let lastDatabaseError = null;
let lastSuccessfulCheckAt = null;
let reconnectPromise = null;
const sleep = (ms) => new Promise((resolve) => {
    setTimeout(resolve, ms);
});
const setDatabaseReady = () => {
    databaseState = 'ready';
    lastSuccessfulCheckAt = Date.now();
    lastDatabaseError = null;
};
const markDatabaseUnhealthy = (error) => {
    if (databaseState !== 'shutting_down') {
        databaseState = 'degraded';
    }
    lastDatabaseError = (0, databaseErrors_1.createDatabaseErrorInfo)(error);
};
exports.markDatabaseUnhealthy = markDatabaseUnhealthy;
const pingDatabase = () => __awaiter(void 0, void 0, void 0, function* () {
    yield db_1.default.$queryRaw `SELECT 1`;
    setDatabaseReady();
});
const connectToDatabase = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (options = {}) {
    const { force = false, reason = 'startup', retries = STARTUP_RETRIES, retryDelayMs = STARTUP_RETRY_DELAY_MS, } = options;
    if (databaseState === 'ready' && !force) {
        return;
    }
    if (databaseState === 'shutting_down') {
        return;
    }
    if (reconnectPromise) {
        return reconnectPromise;
    }
    reconnectPromise = (() => __awaiter(void 0, void 0, void 0, function* () {
        let attempt = 0;
        let lastError;
        while (attempt <= retries) {
            attempt += 1;
            databaseState = 'connecting';
            try {
                yield (0, db_1.reconnectPrismaClient)(reason);
                yield pingDatabase();
                console.log(`[DB] Connection ready (${reason})`);
                return;
            }
            catch (error) {
                lastError = error;
                (0, exports.markDatabaseUnhealthy)(error);
                if (attempt > retries) {
                    break;
                }
                console.warn(`[DB] Connection attempt ${attempt}/${retries + 1} failed (${reason}). Retrying in ${retryDelayMs}ms.`);
                yield sleep(retryDelayMs);
            }
        }
        throw lastError instanceof Error ? lastError : new Error((0, databaseErrors_1.getDatabaseErrorMessage)(lastError));
    }))().finally(() => {
        reconnectPromise = null;
    });
    return reconnectPromise;
});
exports.connectToDatabase = connectToDatabase;
const reconnectDatabaseInBackground = (reason = 'recovery') => {
    if (databaseState === 'shutting_down') {
        return;
    }
    void (0, exports.connectToDatabase)({
        force: true,
        reason,
        retries: REQUEST_RETRIES,
        retryDelayMs: REQUEST_RETRY_DELAY_MS,
    }).catch((error) => {
        console.error(`[DB] Background reconnect failed: ${(0, databaseErrors_1.getDatabaseErrorMessage)(error)}`);
    });
};
exports.reconnectDatabaseInBackground = reconnectDatabaseInBackground;
const ensureDatabaseConnection = () => __awaiter(void 0, void 0, void 0, function* () {
    if (databaseState !== 'ready') {
        yield (0, exports.connectToDatabase)({
            force: true,
            reason: 'request reconnect',
            retries: REQUEST_RETRIES,
            retryDelayMs: REQUEST_RETRY_DELAY_MS,
        });
        return;
    }
    const shouldPing = lastSuccessfulCheckAt === null || Date.now() - lastSuccessfulCheckAt >= HEALTH_CHECK_INTERVAL_MS;
    if (!shouldPing) {
        return;
    }
    try {
        yield pingDatabase();
    }
    catch (error) {
        (0, exports.markDatabaseUnhealthy)(error);
        yield (0, exports.connectToDatabase)({
            force: true,
            reason: 'health check reconnect',
            retries: REQUEST_RETRIES,
            retryDelayMs: REQUEST_RETRY_DELAY_MS,
        });
    }
});
exports.ensureDatabaseConnection = ensureDatabaseConnection;
const getDatabaseStatus = () => ({
    connected: databaseState === 'ready',
    lastError: lastDatabaseError,
    lastSuccessfulCheckAt: lastSuccessfulCheckAt ? new Date(lastSuccessfulCheckAt).toISOString() : null,
    state: databaseState,
});
exports.getDatabaseStatus = getDatabaseStatus;
const shutdownDatabase = () => __awaiter(void 0, void 0, void 0, function* () {
    databaseState = 'shutting_down';
    reconnectPromise = null;
    try {
        yield db_1.default.$disconnect();
    }
    catch (_a) {
        // Ignore disconnect failures during shutdown.
    }
});
exports.shutdownDatabase = shutdownDatabase;
