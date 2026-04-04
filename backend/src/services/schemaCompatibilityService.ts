import { Prisma } from '@prisma/client';
import prisma from '../config/db';
import { getDatabaseErrorMessage } from '../utils/databaseErrors';

type LegacyColumnRepair = {
  name: string;
  ddl: string;
};

const AUTO_REPAIR_ENABLED = process.env.DB_AUTO_REPAIR_SCHEMA !== 'false';

const USER_COLUMN_REPAIRS: LegacyColumnRepair[] = [
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

let compatibilityCheckPromise: Promise<void> | null = null;
let compatibilityChecked = false;

const getExistingUserColumns = async (): Promise<Set<string>> => {
  const rows = await prisma.$queryRaw<Array<{ column_name: string }>>(Prisma.sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'User'
  `);

  return new Set(rows.map((row) => row.column_name));
};

export const ensureDatabaseSchemaCompatibility = async (reason = 'startup'): Promise<void> => {
  if (!AUTO_REPAIR_ENABLED || compatibilityChecked) {
    return;
  }

  if (compatibilityCheckPromise) {
    return compatibilityCheckPromise;
  }

  compatibilityCheckPromise = (async () => {
    try {
      const existingColumns = await getExistingUserColumns();

      if (existingColumns.size === 0) {
        console.warn('[DB] Schema compatibility check skipped because the "User" table was not found.');
        return;
      }

      const missingColumns = USER_COLUMN_REPAIRS.filter(
        (columnRepair) => !existingColumns.has(columnRepair.name)
      );

      if (missingColumns.length === 0) {
        compatibilityChecked = true;
        return;
      }

      console.warn(
        `[DB] Repairing legacy User schema drift (${reason}). Missing columns: ${missingColumns
          .map((columnRepair) => columnRepair.name)
          .join(', ')}`
      );

      for (const columnRepair of missingColumns) {
        await prisma.$executeRawUnsafe(columnRepair.ddl);
      }

      await prisma.$executeRawUnsafe(
        'CREATE UNIQUE INDEX IF NOT EXISTS "User_googleId_key" ON "User"("googleId") WHERE "googleId" IS NOT NULL'
      );

      compatibilityChecked = true;
      console.log('[DB] Legacy User schema compatibility repair completed.');
    } catch (error) {
      console.error(
        `[DB] Legacy schema compatibility repair failed (${reason}): ${getDatabaseErrorMessage(error)}`
      );
      throw error;
    }
  })().finally(() => {
    compatibilityCheckPromise = null;
  });

  return compatibilityCheckPromise;
};
