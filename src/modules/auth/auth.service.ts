import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto';
import { TokenPair, AuthResponse, JwtPayload } from './interfaces';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 회원가입
   */
  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const { username, email, password, name } = registerDto;

    // 중복 확인
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
    });

    if (existingUser) {
      if (existingUser.username === username) {
        throw new ConflictException('Username already exists');
      }
      if (existingUser.email === email) {
        throw new ConflictException('Email already exists');
      }
    }

    // 비밀번호 해싱
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // 사용자 생성
    const user = await this.prisma.user.create({
      data: {
        username,
        email,
        password_hash,
        name: name || null,
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        created_at: true,
      },
    });

    // JWT 토큰 생성
    const tokens = this.generateTokens(user.id);

    return {
      user,
      ...tokens,
    };
  }

  /**
   * 로그인
   */
  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { email, password } = loginDto;

    // 사용자 조회
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 비밀번호 검증
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // JWT 토큰 생성
    const tokens = this.generateTokens(user.id);

    // Refresh Token을 DB에 저장
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refresh_token: tokens.refresh_token },
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        created_at: user.created_at,
      },
      ...tokens,
    };
  }

  /**
   * Refresh Token으로 새 Access Token 발급
   */
  async refresh(refreshToken: string): Promise<{ access_token: string }> {
    try {
      // Refresh Token 검증
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret:
          this.configService.get<string>('JWT_SECRET') || 'default-secret',
      });

      // DB에서 사용자 조회
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // DB의 Refresh Token과 일치하는지 확인
      if (user.refresh_token !== refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // 새 Access Token 발급 (기본 설정 사용: 15분)
      const access_token = this.jwtService.sign({ sub: user.id });

      return { access_token };
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * 로그아웃 (Refresh Token 무효화)
   */
  async logout(userId: string): Promise<{ message: string }> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refresh_token: null },
    });

    return { message: 'Logged out successfully' };
  }

  /**
   * JWT 토큰 생성 (Access + Refresh)
   */
  private generateTokens(userId: string): TokenPair {
    const payload = { sub: userId };

    // Access Token (기본 설정 사용: 15분)
    const access_token = this.jwtService.sign(payload);

    // Refresh Token (30일)
    const refresh_token = this.jwtService.sign(payload, {
      expiresIn: '30d',
    });

    return { access_token, refresh_token };
  }
}
