import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteUser() {
  try {
    const email = 'audwleo@mju.ac.kr';

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.log(`User with email ${email} not found.`);
      return;
    }

    await prisma.user.delete({
      where: { email },
    });

    console.log(`✅ User with email ${email} has been deleted successfully.`);
  } catch (error) {
    console.error('❌ Error deleting user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteUser();
