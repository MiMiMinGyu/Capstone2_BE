import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('🔍 DB 상태 확인 중...\n');

    // 1. 사용자 정보 조회
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    console.log('👤 사용자 목록:');
    users.forEach((user) => {
      console.log(`  - ${user.name} (${user.email}) - ID: ${user.id}`);
    });
    console.log('');

    // 2. 각 사용자별 style_profiles 확인
    for (const user of users) {
      console.log(`\n📋 ${user.name}의 style_profile:`);

      const styleProfile = await prisma.styleProfile.findUnique({
        where: { user_id: user.id },
      });

      if (styleProfile) {
        console.log(`  ✅ style_profile 존재`);
        console.log(
          `  - honorific_rules: ${JSON.stringify(styleProfile.honorific_rules)}`,
        );
        console.log(
          `  - constraints: ${JSON.stringify(styleProfile.constraints)}`,
        );
        console.log(
          `  - custom_guidelines: ${styleProfile.custom_guidelines ? '있음 ✓' : 'NULL ✗'}`,
        );

        if (styleProfile.custom_guidelines) {
          console.log(`\n  📝 custom_guidelines 내용:`);
          console.log(
            `  ${styleProfile.custom_guidelines.split('\n').join('\n  ')}`,
          );
        }
      } else {
        console.log(`  ❌ style_profile 없음`);
      }

      // 3. tone_samples 개수 확인
      const toneSamplesCount = await prisma.toneSample.count({
        where: { user_id: user.id },
      });

      console.log(`\n📊 ${user.name}의 tone_samples: ${toneSamplesCount}개`);

      // 4. 임베딩 여부 확인 (raw query)
      const embeddingStats = await prisma.$queryRaw<
        Array<{ with_embedding: number; without_embedding: number }>
      >`
        SELECT
          COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END)::int as with_embedding,
          COUNT(CASE WHEN embedding IS NULL THEN 1 END)::int as without_embedding
        FROM tone_samples
        WHERE user_id = ${user.id}::uuid
      `;

      if (embeddingStats.length > 0) {
        const stats = embeddingStats[0];
        console.log(`  - 임베딩 있음: ${stats.with_embedding}개`);
        console.log(`  - 임베딩 없음: ${stats.without_embedding}개`);
      }

      // 5. 관계(relationship) 정보
      const relationships = await prisma.relationship.findMany({
        where: { user_id: user.id },
        include: { partner: true },
      });

      console.log(`\n👥 ${user.name}의 관계 목록: ${relationships.length}개`);
      relationships.forEach((rel) => {
        console.log(
          `  - ${rel.partner.name} (${rel.category}) - ${rel.politeness}, ${rel.vibe}`,
        );
      });
    }
  } catch (error) {
    console.error('❌ 에러 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
