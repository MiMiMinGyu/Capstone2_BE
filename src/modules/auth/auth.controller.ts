import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RefreshDto } from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtUser, AuthResponse } from './interfaces';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: '회원가입',
    description: '새로운 사용자를 등록하고 JWT 토큰을 발급합니다.',
  })
  @ApiResponse({
    status: 201,
    description: '회원가입 성공',
    schema: {
      example: {
        user: {
          id: 'uuid',
          username: 'mingyu123',
          name: '김민규',
          email: 'mingyu@test.com',
          created_at: '2025-01-06T12:00:00Z',
        },
        access_token: 'eyJhbGc...',
        refresh_token: 'eyJhbGc...',
      },
    },
  })
  @ApiResponse({ status: 409, description: '이미 존재하는 사용자' })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponse> {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '로그인',
    description: '이메일과 비밀번호로 로그인하고 JWT 토큰을 발급받습니다.',
  })
  @ApiResponse({
    status: 200,
    description: '로그인 성공',
    schema: {
      example: {
        user: {
          id: 'uuid',
          username: 'mingyu123',
          name: '김민규',
          email: 'mingyu@test.com',
          created_at: '2025-01-06T12:00:00Z',
        },
        access_token: 'eyJhbGc...',
        refresh_token: 'eyJhbGc...',
      },
    },
  })
  @ApiResponse({ status: 401, description: '이메일 또는 비밀번호가 틀림' })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Access Token 갱신',
    description: 'Refresh Token으로 새로운 Access Token을 발급받습니다.',
  })
  @ApiResponse({
    status: 200,
    description: '토큰 갱신 성공',
    schema: {
      example: {
        access_token: 'eyJhbGc...',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: '유효하지 않거나 만료된 Refresh Token',
  })
  async refresh(
    @Body() refreshDto: RefreshDto,
  ): Promise<{ access_token: string }> {
    return this.authService.refresh(refreshDto.refresh_token);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '현재 사용자 정보 조회',
    description: 'JWT 토큰으로 인증된 사용자의 정보를 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '사용자 정보 조회 성공',
    schema: {
      example: {
        id: 'uuid',
        username: 'mingyu123',
        name: '김민규',
        email: 'mingyu@test.com',
        created_at: '2025-01-06T12:00:00Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: '인증되지 않음' })
  getMe(@Request() req: { user: JwtUser }): JwtUser {
    return req.user;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '로그아웃',
    description: 'Refresh Token을 무효화하여 로그아웃합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '로그아웃 성공',
    schema: {
      example: {
        message: 'Logged out successfully',
      },
    },
  })
  @ApiResponse({ status: 401, description: '인증되지 않음' })
  async logout(
    @Request() req: { user: JwtUser },
  ): Promise<{ message: string }> {
    return this.authService.logout(req.user.id);
  }
}
