import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkEmbeddings() {
  const result = await prisma.$queryRaw<
    Array<{ user_id: string; count: bigint }>
  >`
    SELECT user_id, COUNT(*) as count
    FROM tone_samples
    WHERE embedding IS NOT NULL
    GROUP BY user_id
  `;

  console.log('\n=== 임베딩 생성된 유저 ===\n');

  for (const row of result) {
    const user = await prisma.user.findUnique({
      where: { id: row.user_id },
      select: { name: true, email: true },
    });

    console.log(`User: ${user?.name} (${user?.email})`);
    console.log(`  - user_id: ${row.user_id}`);
    console.log(`  - 임베딩 개수: ${Number(row.count)}개\n`);
  }

  await prisma.$disconnect();
}

checkEmbeddings();
