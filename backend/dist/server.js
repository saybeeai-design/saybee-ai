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
require("dotenv/config");
const app_1 = __importDefault(require("./app"));
const dbService_1 = require("./services/dbService");
const PORT = process.env.PORT || 5000;
let server = null;
function startServer() {
    server = app_1.default.listen(PORT, () => {
        console.log(`SayBee AI Backend running on http://localhost:${PORT}`);
        console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
    void (0, dbService_1.connectToDatabase)({ reason: 'startup' })
        .then(() => {
        console.log('Database connected via Prisma');
    })
        .catch((error) => {
        console.error('Database startup connection failed. Continuing in degraded mode:', error);
        (0, dbService_1.reconnectDatabaseInBackground)('startup recovery');
    });
}
const shutdownServer = (signal) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`[Server] Received ${signal}. Shutting down gracefully...`);
    if (!server) {
        yield (0, dbService_1.shutdownDatabase)();
        process.exit(0);
        return;
    }
    server.close(() => __awaiter(void 0, void 0, void 0, function* () {
        yield (0, dbService_1.shutdownDatabase)();
        process.exit(0);
    }));
    setTimeout(() => {
        console.error('[Server] Forced shutdown after timeout.');
        process.exit(1);
    }, 10000).unref();
});
process.on('SIGINT', () => {
    void shutdownServer('SIGINT');
});
process.on('SIGTERM', () => {
    void shutdownServer('SIGTERM');
});
startServer();
