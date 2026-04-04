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
exports.ensureDatabaseSchemaCompatibility = void 0;
const client_1 = require("@prisma/client");
const db_1 = __importDefault(require("../config/db"));
const databaseErrors_1 = require("../utils/databaseErrors");
const AUTO_REPAIR_ENABLED = process.env.DB_AUTO_REPAIR_SCHEMA !== 'false';
const USER_COLUMN_REPAIRS = [
    {
        name: 'credits',
        ddl: 'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "credits" INTEGER NOT NULL DEFAULT 2',
    },
    {
        name: 'isPaid',
        ddl: 'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isPaid" BOOLEAN NOT NULL DEFAULT FALSE',
    },
    {
        name: 'stripeCustomerId',
        ddl: 'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT',
    },
    {
        name: 'subscriptionType',
        ddl: 'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionType" TEXT NOT NULL DEFAULT \'FREE\'',
    },
    {
        name: 'googleId',
        ddl: 'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "googleId" TEXT',
    },
    {
        name: 'provider',
        ddl: 'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "provider" TEXT NOT NULL DEFAULT \'LOCAL\'',
    },
];
let compatibilityCheckPromise = null;
let compatibilityChecked = false;
const getExistingUserColumns = () => __awaiter(void 0, void 0, void 0, function* () {
    const rows = yield db_1.default.$queryRaw(client_1.Prisma.sql `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'User'
  `);
    return new Set(rows.map((row) => row.column_name));
});
const ensureDatabaseSchemaCompatibility = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (reason = 'startup') {
    if (!AUTO_REPAIR_ENABLED || compatibilityChecked) {
        return;
    }
    if (compatibilityCheckPromise) {
        return compatibilityCheckPromise;
    }
    compatibilityCheckPromise = (() => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const existingColumns = yield getExistingUserColumns();
            if (existingColumns.size === 0) {
                console.warn('[DB] Schema compatibility check skipped because the "User" table was not found.');
                return;
            }
            const missingColumns = USER_COLUMN_REPAIRS.filter((columnRepair) => !existingColumns.has(columnRepair.name));
            if (missingColumns.length === 0) {
                compatibilityChecked = true;
                return;
            }
            console.warn(`[DB] Repairing legacy User schema drift (${reason}). Missing columns: ${missingColumns
                .map((columnRepair) => columnRepair.name)
                .join(', ')}`);
            for (const columnRepair of missingColumns) {
                yield db_1.default.$executeRawUnsafe(columnRepair.ddl);
            }
            yield db_1.default.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "User_googleId_key" ON "User"("googleId") WHERE "googleId" IS NOT NULL');
            compatibilityChecked = true;
            console.log('[DB] Legacy User schema compatibility repair completed.');
        }
        catch (error) {
            console.error(`[DB] Legacy schema compatibility repair failed (${reason}): ${(0, databaseErrors_1.getDatabaseErrorMessage)(error)}`);
            throw error;
        }
    }))().finally(() => {
        compatibilityCheckPromise = null;
    });
    return compatibilityCheckPromise;
});
exports.ensureDatabaseSchemaCompatibility = ensureDatabaseSchemaCompatibility;
