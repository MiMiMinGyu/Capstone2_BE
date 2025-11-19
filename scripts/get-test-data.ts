import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getTestData() {
  console.log('\n=== 테스트 데이터 조회 ===\n');

  // 1. 사용자 조회
  const users = await prisma.user.findMany({
    take: 3,
    select: { id: true, name: true, email: true },
  });
  console.log('📌 Users:');
  users.forEach((user) => {
    console.log(`   ID: ${user.id}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}\n`);
  });

  // 2. 첫 번째 유저의 파트너 조회
  if (users.length > 0) {
    const userId = users[0].id;
    const partners = await prisma.partner.findMany({
      where: {
        relationships: {
          some: {
            user_id: userId,
          },
        },
      },
      take: 3,
      select: { id: true, name: true },
    });

    console.log(`📌 Partners for user ${users[0].name}:`);
    partners.forEach((partner) => {
      console.log(`   ID: ${partner.id}`);
      console.log(`   Name: ${partner.name}\n`);
    });

    // 3. 임베딩 생성된 tone_samples 개수 확인
    const toneSampleCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM tone_samples
      WHERE user_id = ${userId}::uuid AND embedding IS NOT NULL
    `;
    console.log(
      `📌 ToneSamples with embeddings: ${Number(toneSampleCount[0].count)}개\n`,
    );

    // 4. 테스트용 Request Body 출력
    if (partners.length > 0) {
      console.log('=== 테스트용 Request Body ===\n');
      console.log(
        JSON.stringify(
          {
            userId: userId,
            partnerId: partners[0].id,
            message: '오늘 뭐해?',
          },
          null,
          2,
        ),
      );
    }
  }

  await prisma.$disconnect();
}

getTestData().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
