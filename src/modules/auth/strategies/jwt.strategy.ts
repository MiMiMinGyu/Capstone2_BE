import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { JwtUser, JwtPayload } from '../interfaces';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'default-secret',
    });

    this.logger.log('[JWT] JwtStrategy initialized');
  }

  async validate(payload: JwtPayload): Promise<JwtUser> {
    this.logger.log(`[JWT] 🔑 Token validation started`);
    this.logger.log(`[JWT] Payload: ${JSON.stringify(payload)}`);

    // JWT payload에서 user_id 추출
    const userId = payload.sub;
    this.logger.log(`[JWT] Extracted userId: ${userId}`);

    // DB에서 사용자 확인
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        created_at: true,
      },
    });

    if (!user) {
      this.logger.error(`[JWT] ❌ User not found in DB: ${userId}`);
      throw new UnauthorizedException('User not found');
    }

    this.logger.log(`[JWT] ✅ User validated: ${user.email} (${user.id})`);

    // Request 객체에 user 정보 추가
    // @UseGuards(JwtAuthGuard) 사용 시 req.user로 접근 가능
    return user;
  }
}
