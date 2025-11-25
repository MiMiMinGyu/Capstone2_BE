import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

async function verifyToken() {
  console.log('\n🔍 JWT 토큰 검증\n');

  // 환경변수에서 JWT_SECRET 가져오기
  const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

  console.log('JWT_SECRET:', JWT_SECRET.substring(0, 10) + '...');

  // test@mju.ac.kr 계정으로 로그인 시도
  const testUser = await prisma.user.findUnique({
    where: { email: 'test@mju.ac.kr' },
  });

  if (!testUser) {
    console.log('❌ test@mju.ac.kr 계정을 찾을 수 없습니다');
    return;
  }

  console.log('\n✅ test@mju.ac.kr 계정 정보:');
  console.log(`  - ID: ${testUser.id}`);
  console.log(`  - 이름: ${testUser.name}`);
  console.log(`  - 이메일: ${testUser.email}`);

  // mingyu@example.com 계정도 확인
  const mingyuUser = await prisma.user.findUnique({
    where: { email: 'mingyu@example.com' },
  });

  if (mingyuUser) {
    console.log('\n⚠️ mingyu@example.com 계정 정보:');
    console.log(`  - ID: ${mingyuUser.id}`);
    console.log(`  - 이름: ${mingyuUser.name}`);
    console.log(`  - 이메일: ${mingyuUser.email}`);
  }

  console.log('\n💡 로그인 API를 호출해서 어떤 토큰이 반환되는지 확인이 필요합니다.');
  console.log('프론트엔드에서 localStorage에 저장된 토큰을 확인해주세요.');
  console.log('\n브라우저 개발자 도구 > Application > Local Storage > accessToken');

  await prisma.$disconnect();
}

verifyToken();
