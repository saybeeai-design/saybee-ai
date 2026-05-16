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
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", { value: true });
exports.reconnectPrismaClient = void 0;
require("dotenv/config");
const client_1 = require("@prisma/client");
const databaseErrors_1 = require("../utils/databaseErrors");
const PRISMA_QUERY_RETRIES = Number((_a = process.env.DB_QUERY_RETRY_COUNT) !== null && _a !== void 0 ? _a : 2);
const PRISMA_QUERY_RETRY_DELAY_MS = Number((_b = process.env.DB_QUERY_RETRY_DELAY_MS) !== null && _b !== void 0 ? _b : 250);
const globalForPrisma = globalThis;
const sleep = (ms) => new Promise((resolve) => {
    setTimeout(resolve, ms);
});
const normalizeDatabaseUrl = (rawDatabaseUrl) => {
    var _a;
    if (!rawDatabaseUrl) {
        throw new Error('Missing required environment variable: DATABASE_URL');
    }
    const databaseUrl = new URL(rawDatabaseUrl);
    if (!['postgres:', 'postgresql:'].includes(databaseUrl.protocol)) {
        throw new Error('DATABASE_URL must use the postgres or postgresql protocol');
    }
    // Neon is more stable for long-lived deployments when Prisma goes through the pooler.
    if (databaseUrl.hostname.endsWith('neon.tech') && !databaseUrl.hostname.includes('-pooler.')) {
        const hostParts = databaseUrl.hostname.split('.');
        if ((_a = hostParts[0]) === null || _a === void 0 ? void 0 : _a.startsWith('ep-')) {
            hostParts[0] = `${hostParts[0]}-pooler`;
            databaseUrl.hostname = hostParts.join('.');
        }
        else {
            console.warn('[DB] DATABASE_URL is not using a Neon pooler hostname.');
        }
    }
    if (databaseUrl.searchParams.get('sslmode') !== 'require') {
        databaseUrl.searchParams.set('sslmode', 'require');
    }
    return databaseUrl.toString();
};
const normalizedDatabaseUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);
process.env.DATABASE_URL = normalizedDatabaseUrl;
let prisma;
const reconnectPrismaClient = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (reason = 'recovery') {
    if (globalForPrisma.prismaReconnectPromise) {
        return globalForPrisma.prismaReconnectPromise;
    }
    globalForPrisma.prismaReconnectPromise = (() => __awaiter(void 0, void 0, void 0, function* () {
        try {
            yield prisma.$disconnect();
        }
        catch (_a) {
            // Ignore disconnect failures while refreshing a broken connection.
        }
        yield prisma.$connect();
        console.log(`[DB] Prisma connection refreshed (${reason})`);
    }))().finally(() => {
        globalForPrisma.prismaReconnectPromise = undefined;
    });
    return globalForPrisma.prismaReconnectPromise;
});
exports.reconnectPrismaClient = reconnectPrismaClient;
const createPrismaClient = () => {
    const client = new client_1.PrismaClient({
        datasources: {
            db: {
                url: normalizedDatabaseUrl,
            },
        },
        log: [
            { emit: 'event', level: 'warn' },
            { emit: 'event', level: 'error' },
        ],
    });
    client.$on('warn', (event) => {
        console.warn(`[Prisma] Warning${event.target ? ` (${event.target})` : ''}: ${event.message}`);
    });
    client.$on('error', (event) => {
        console.error(`[Prisma] Error${event.target ? ` (${event.target})` : ''}: ${event.message}`);
    });
    client.$use((params, next) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        let attempt = 0;
        const operationName = `${(_a = params.model) !== null && _a !== void 0 ? _a : 'raw'}.${params.action}`;
        while (true) {
            try {
                return yield next(params);
            }
            catch (error) {
                const errorMessage = (0, databaseErrors_1.getDatabaseErrorMessage)(error);
                const errorCode = (0, databaseErrors_1.getDatabaseErrorCode)(error);
                if (!(0, databaseErrors_1.isRecoverableDatabaseError)(error) || attempt >= PRISMA_QUERY_RETRIES) {
                    const details = `${errorCode ? `${errorCode}: ` : ''}${errorMessage}`;
                    if ((0, databaseErrors_1.isSchemaMismatchDatabaseError)(error)) {
                        console.error(`[DB] Schema mismatch during ${operationName}. ${details}. The deployed database is behind the Prisma schema. Run "npx prisma db push" during deployment.`);
                    }
                    else {
                        console.error(`[DB] Query failed during ${operationName}. ${details}`);
                    }
                    throw error;
                }
                attempt += 1;
                console.warn(`[DB] Transient database error on ${operationName}. Retrying (${attempt}/${PRISMA_QUERY_RETRIES})...`);
                try {
                    yield (0, exports.reconnectPrismaClient)(`query retry: ${operationName}`);
                }
                catch (reconnectError) {
                    console.error(`[DB] Query retry reconnect failed for ${operationName}: ${(0, databaseErrors_1.getDatabaseErrorMessage)(reconnectError)}`);
                    throw reconnectError;
                }
                if (PRISMA_QUERY_RETRY_DELAY_MS > 0) {
                    yield sleep(PRISMA_QUERY_RETRY_DELAY_MS);
                }
            }
        }
    }));
    return client;
};
prisma = (_c = globalForPrisma.prisma) !== null && _c !== void 0 ? _c : createPrismaClient();
if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = prisma;
}
console.log(`[DB] Prisma configured with ${normalizedDatabaseUrl.includes('-pooler.') ? 'pooled' : 'direct'} PostgreSQL connection`);
exports.default = prisma;
