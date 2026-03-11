import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

async function testGeneration() {
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log("No user found.");
    process.exit(1);
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production',
    { expiresIn: '1d' }
  );

  const interview = await prisma.interview.findFirst({ where: { userId: user.id } });
  if (!interview) {
    console.log("No interview found for user", user.id);
    process.exit(1);
  }

  console.log("Testing generation for Interview: ", interview.id);

  try {
    const res = await fetch(`http://localhost:5000/api/interviews/${interview.id}/generate-question`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ speakQuestion: false })
    });
    const data = await res.json();
    console.log(res.status, data);
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}

testGeneration();
