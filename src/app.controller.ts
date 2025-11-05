import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('/test-db')
  async testDb() {
    const users = await this.prisma.user.findMany();
    const partners = await this.prisma.partner.findMany();
    const relationships = await this.prisma.relationship.findMany({
      include: {
        partner: true,
      },
    });

    return {
      message: '✅ Database connection successful',
      data: {
        users: users.length,
        partners: partners.length,
        relationships: relationships.length,
      },
    };
  }
}
