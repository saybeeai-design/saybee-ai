import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function makeAdmin() {
  const users = await prisma.user.findMany();
  if (users.length === 0) {
    console.log("No users found.");
    process.exit(0);
  }
  
  // Make the first user an admin (or all users if testing)
  for (const user of users) {
    await prisma.user.update({
      where: { id: user.id },
      data: { role: 'ADMIN' }
    });
    console.log(`User ${user.email} is now an ADMIN.`);
  }
}

makeAdmin().catch(console.error).finally(() => prisma.$disconnect());
