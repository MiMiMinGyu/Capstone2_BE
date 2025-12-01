import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listIds() {
  console.log('='.repeat(80));
  console.log('📋 사용자 및 Partner 목록');
  console.log('='.repeat(80));

  // 사용자 목록
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  console.log('\n👤 사용자 목록:');
  users.forEach((u) => {
    console.log(`   ${u.name || u.email}: ${u.id}`);
  });

  // Partner 목록
  const partners = await prisma.partner.findMany({
    select: {
      id: true,
      name: true,
    },
  });

  console.log('\n👥 Partner 목록:');
  partners.forEach((p) => {
    console.log(`   ${p.name}: ${p.id}`);
  });

  // 관계 목록
  const relationships = await prisma.relationship.findMany({
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      partner: {
        select: {
          name: true,
        },
      },
    },
  });

  console.log('\n🔗 설정된 관계:');
  if (relationships.length === 0) {
    console.log('   ❌ 설정된 관계가 없습니다!');
  } else {
    relationships.forEach((rel) => {
      console.log(
        `   ${rel.user.name || rel.user.email} ↔ ${rel.partner.name}: ${rel.category} (${rel.politeness}, ${rel.vibe})`,
      );
    });
  }

  console.log('\n' + '='.repeat(80));

  await prisma.$disconnect();
}

listIds();
