import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRelationship() {
  const userId = process.argv[2];
  const partnerId = process.argv[3];

  if (!userId || !partnerId) {
    console.log('사용법: npx ts-node src/scripts/check-relationship.ts <userId> <partnerId>');
    process.exit(1);
  }

  console.log('='.repeat(80));
  console.log('🔍 관계 설정 확인');
  console.log('='.repeat(80));

  // 1. Partner 정보
  const partner = await prisma.partner.findUnique({
    where: { id: partnerId },
  });

  if (!partner) {
    console.log(`❌ Partner를 찾을 수 없습니다: ${partnerId}`);
    return;
  }

  console.log(`\n📋 Partner 정보:`);
  console.log(`   이름: ${partner.name}`);
  console.log(`   ID: ${partner.id}`);

  // 2. Relationship 확인
  const relationship = await prisma.relationship.findFirst({
    where: {
      user_id: userId,
      partner_id: partnerId,
    },
  });

  console.log(`\n🔗 관계 설정:`);
  if (!relationship) {
    console.log(`   ❌ 관계가 설정되지 않았습니다!`);
    console.log(`   ⚠️  이 경우 기본값인 ACQUAINTANCE_CASUAL (격식 있는 존댓말)이 적용됩니다.`);
    console.log(`\n💡 해결 방법:`);
    console.log(`   POST /relationships 엔드포인트를 사용하여 관계를 설정하세요.`);
    console.log(`   예시: { "partnerId": "${partnerId}", "category": "FRIEND_CLOSE", "politeness": "CASUAL", "vibe": "PLAYFUL", "emojiLevel": 2 }`);
  } else {
    console.log(`   ✅ 관계가 설정되어 있습니다:`);
    console.log(`      카테고리: ${relationship.category}`);
    console.log(`      격식 수준: ${relationship.politeness}`);
    console.log(`      분위기: ${relationship.vibe}`);
    console.log(`      이모지 레벨: ${relationship.emoji_level}`);

    // 카테고리별 예상 말투
    const categoryMap: Record<string, string> = {
      FAMILY_ELDER_CLOSE: '가까운 어른 가족 - 친근하되 예의 있게',
      FAMILY_SIBLING_ELDER: '형/누나 - 편한 반말 중심',
      FAMILY_SIBLING_YOUNGER: '동생 - 부드러운 반말',
      PARTNER_INTIMATE: '연인/배우자 - 다정한 반말',
      FRIEND_CLOSE: '친한 친구 - 편한 반말',
      ACQUAINTANCE_CASUAL: '아는 사람 - 캐주얼 존댓말',
      WORK_SENIOR_FORMAL: '상사/교수 - 매우 격식있는 존대말',
      WORK_SENIOR_FRIENDLY: '가까운 선배/멘토 - 친근하되 존중하는 존댓말',
      WORK_PEER: '동료 - 정중한 존댓말',
      WORK_JUNIOR: '후배 - 존중하는 존댓말',
    };

    console.log(`\n📝 예상 말투 스타일:`);
    console.log(`   ${categoryMap[relationship.category] || relationship.category}`);

    if (
      relationship.category === 'FRIEND_CLOSE' &&
      relationship.politeness === 'CASUAL' &&
      relationship.vibe === 'PLAYFUL'
    ) {
      console.log(`\n✅ 친한친구/반말/장난스러운 설정이 올바르게 되어 있습니다!`);
    }

    if (
      relationship.category === 'FRIEND_CLOSE' &&
      relationship.politeness !== 'CASUAL'
    ) {
      console.log(`\n⚠️  주의: 친한 친구인데 politeness가 ${relationship.politeness}로 설정되어 있습니다.`);
      console.log(`   CASUAL로 변경하면 더 자연스러운 반말이 생성됩니다.`);
    }
  }

  // 3. Tone Sample 통계
  const toneSamples = await prisma.toneSample.findMany({
    where: {
      user_id: userId,
    },
    select: {
      politeness: true,
      vibe: true,
    },
  });

  console.log(`\n📊 Tone Sample 통계 (총 ${toneSamples.length}개):`);

  const politenessCount: Record<string, number> = {};
  const vibeCount: Record<string, number> = {};

  toneSamples.forEach((sample) => {
    if (sample.politeness) {
      politenessCount[sample.politeness] =
        (politenessCount[sample.politeness] || 0) + 1;
    }
    if (sample.vibe) {
      vibeCount[sample.vibe] = (vibeCount[sample.vibe] || 0) + 1;
    }
  });

  console.log(`   격식 분포:`);
  Object.entries(politenessCount).forEach(([key, count]) => {
    const percentage = ((count / toneSamples.length) * 100).toFixed(1);
    console.log(`      ${key}: ${count}개 (${percentage}%)`);
  });

  console.log(`   분위기 분포:`);
  Object.entries(vibeCount).forEach(([key, count]) => {
    const percentage = ((count / toneSamples.length) * 100).toFixed(1);
    console.log(`      ${key}: ${count}개 (${percentage}%)`);
  });

  console.log('\n' + '='.repeat(80));

  await prisma.$disconnect();
}

checkRelationship();
