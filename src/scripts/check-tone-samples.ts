import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkToneSamples() {
  const userId = '5ffc7298-98c5-44d0-a62e-7a2ac180a64d';

  const samples = await prisma.toneSample.findMany({
    where: { user_id: userId },
    take: 30,
    orderBy: { created_at: 'desc' },
    select: { text: true },
  });

  console.log(`\n최근 Tone Sample 30개:\n`);
  samples.forEach((s, i) => {
    console.log(`${i + 1}. ${s.text}`);
  });

  await prisma.$disconnect();
}

checkToneSamples();
