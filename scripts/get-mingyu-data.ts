import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const userId = '5ffc7298-98c5-44d0-a62e-7a2ac180a64d';

  const partners = await prisma.partner.findMany({
    where: {
      relationships: {
        some: { user_id: userId },
      },
    },
    take: 1,
  });

  console.log('\n=== Swagger 테스트용 Request Body ===\n');
  console.log(
    JSON.stringify(
      {
        userId: userId,
        partnerId: partners[0]?.id || '',
        message: '오늘 뭐해?',
      },
      null,
      2,
    ),
  );

  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
