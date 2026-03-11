import { PrismaClient } from '@prisma/client';

console.log('Initializing Prisma with DB type:', process.env.DATABASE_URL?.split(':')[0]);
const prisma = new PrismaClient({
  log: ['warn', 'error'],
});

export default prisma;
