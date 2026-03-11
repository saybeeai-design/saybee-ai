import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Promote all existing local users to ADMIN for testing purposes
  const result = await prisma.user.updateMany({
    data: { role: 'ADMIN' },
  });
  
  console.log(`Successfully promoted ${result.count} users to ADMIN role.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
