import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPartner() {
  try {
    const userId = '75f7f032-ae95-48d6-8779-31518ed83bf4'; // 이민규

    const conversations = await prisma.conversation.findMany({
      where: { user_id: userId },
      include: {
        partner: true,
        messages: {
          orderBy: { created_at: 'desc' },
          take: 3,
        },
      },
    });

    console.log(`\n📞 이민규의 대화방 목록:\n`);
    conversations.forEach((conv) => {
      console.log(`Partner: ${conv.partner.name} (ID: ${conv.partner.id})`);
      console.log(`  Telegram ID: ${conv.partner.telegram_id}`);
      console.log(`  최근 메시지 ${conv.messages.length}개:`);
      conv.messages.forEach((msg) => {
        console.log(`    - [${msg.role}] ${msg.text?.substring(0, 50)}`);
      });
      console.log('');
    });

    // 재영 찾기
    const jaeyoung = await prisma.partner.findFirst({
      where: { name: '재영' },
      include: {
        relationships: {
          where: { user_id: userId },
        },
      },
    });

    if (jaeyoung) {
      console.log(`\n👤 재영 파트너 정보:`);
      console.log(`  - ID: ${jaeyoung.id}`);
      console.log(`  - Telegram ID: ${jaeyoung.telegram_id}`);
      console.log(`  - 관계: ${jaeyoung.relationships[0]?.category || '없음'}`);
      console.log(
        `  - 말투: ${jaeyoung.relationships[0]?.politeness}, ${jaeyoung.relationships[0]?.vibe}`,
      );
    }
  } catch (error) {
    console.error('❌ 에러 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPartner();
