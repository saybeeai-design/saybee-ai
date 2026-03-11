"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
console.log('Initializing Prisma with DB type:', (_a = process.env.DATABASE_URL) === null || _a === void 0 ? void 0 : _a.split(':')[0]);
const prisma = new client_1.PrismaClient({
    log: ['warn', 'error'],
});
exports.default = prisma;
