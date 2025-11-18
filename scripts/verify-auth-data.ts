import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // test@mju.ac.kr 유저 정보
  const user = await prisma.user.findUnique({
    where: { email: 'test@mju.ac.kr' },
  });

  console.log('\n=== 로그인 계정 정보 ===');
  console.log('Email:', user?.email);
  console.log('User ID:', user?.id);
  console.log('Name:', user?.name);

  if (!user) {
    console.log('\n❌ test@mju.ac.kr 계정을 찾을 수 없습니다!');
    await prisma.$disconnect();
    return;
  }

  // 이 유저의 파트너들
  const partners = await prisma.partner.findMany({
    where: {
      relationships: {
        some: { user_id: user.id },
      },
    },
    include: {
      relationships: {
        where: { user_id: user.id },
        select: {
          category: true,
          politeness: true,
          vibe: true,
        },
      },
    },
  });

  console.log('\n=== 파트너 목록 ===');
  partners.forEach((p, idx) => {
    console.log(`\n${idx + 1}. ${p.name}`);
    console.log(`   Partner ID: ${p.id}`);
    console.log(`   Category: ${p.relationships[0]?.category}`);
    console.log(`   Politeness: ${p.relationships[0]?.politeness}`);
    console.log(`   Vibe: ${p.relationships[0]?.vibe}`);
  });

  // 임베딩 개수 확인
  const embCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count
    FROM tone_samples
    WHERE user_id = ${user.id}::uuid AND embedding IS NOT NULL
  `;

  console.log(`\n=== 임베딩 정보 ===`);
  console.log(`임베딩 생성된 ToneSamples: ${Number(embCount[0].count)}개`);

  if (partners.length > 0) {
    console.log(`\n=== Swagger 테스트용 Request Body ===\n`);
    console.log(
      JSON.stringify(
        {
          userId: user.id,
          partnerId: partners[0].id,
          message: '오늘 뭐해?',
        },
        null,
        2,
      ),
    );
  }

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
