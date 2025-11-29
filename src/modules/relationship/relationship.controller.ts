import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateRelationshipDto, UpdateRelationshipDto } from './dto';
import { RelationshipService } from './relationship.service';

@ApiTags('Relationships')
@ApiBearerAuth('access-token')
@Controller('relationships')
@UseGuards(JwtAuthGuard)
export class RelationshipController {
  constructor(private readonly relationshipService: RelationshipService) {}

  @Post()
  @ApiOperation({
    summary: '관계 생성',
    description:
      'Partner와의 관계를 설정합니다. category, politeness, vibe 등을 지정할 수 있습니다.',
  })
  @ApiResponse({
    status: 201,
    description: '관계 생성 성공',
    schema: {
      example: {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        user_id: '5ffc7298-98c5-44d0-a62e-7a2ac180a64d',
        partner_id: '716d0ed5-c04e-4315-aa8c-05c5ade05b7e',
        category: 'FRIEND_CLOSE',
        politeness: 'CASUAL',
        vibe: 'PLAYFUL',
        emoji_level: 3,
        created_at: '2025-11-18T07:00:00.000Z',
        updated_at: '2025-11-18T07:00:00.000Z',
        partner: {
          id: '716d0ed5-c04e-4315-aa8c-05c5ade05b7e',
          name: '홍길동',
          telegram_id: '123456789',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiResponse({ status: 404, description: 'Partner를 찾을 수 없음' })
  @ApiResponse({ status: 409, description: '이미 존재하는 관계' })
  async create(
    @Req() req: Request & { user: { id: string } },
    @Body() dto: CreateRelationshipDto,
  ) {
    return this.relationshipService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({
    summary: '관계 목록 조회',
    description: '현재 사용자의 모든 관계를 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '관계 목록 조회 성공',
    schema: {
      example: [
        {
          id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          user_id: '5ffc7298-98c5-44d0-a62e-7a2ac180a64d',
          partner_id: '716d0ed5-c04e-4315-aa8c-05c5ade05b7e',
          category: 'FRIEND_CLOSE',
          politeness: 'CASUAL',
          vibe: 'PLAYFUL',
          emoji_level: 3,
          created_at: '2025-11-18T07:00:00.000Z',
          updated_at: '2025-11-18T07:00:00.000Z',
          partner: {
            id: '716d0ed5-c04e-4315-aa8c-05c5ade05b7e',
            name: '홍길동',
            telegram_id: '123456789',
          },
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async findAll(@Req() req: Request & { user: { id: string } }) {
    return this.relationshipService.findAll(req.user.id);
  }

  @Get(':id')
  @ApiOperation({
    summary: '특정 관계 조회',
    description: 'ID로 특정 관계를 조회합니다.',
  })
  @ApiParam({
    name: 'id',
    description: 'Relationship ID (UUID)',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: '관계 조회 성공',
    schema: {
      example: {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        user_id: '5ffc7298-98c5-44d0-a62e-7a2ac180a64d',
        partner_id: '716d0ed5-c04e-4315-aa8c-05c5ade05b7e',
        category: 'FRIEND_CLOSE',
        politeness: 'CASUAL',
        vibe: 'PLAYFUL',
        emoji_level: 3,
        created_at: '2025-11-18T07:00:00.000Z',
        updated_at: '2025-11-18T07:00:00.000Z',
        partner: {
          id: '716d0ed5-c04e-4315-aa8c-05c5ade05b7e',
          name: '홍길동',
          telegram_id: '123456789',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiResponse({ status: 404, description: '관계를 찾을 수 없음' })
  async findOne(
    @Req() req: Request & { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.relationshipService.findOne(req.user.id, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: '관계 수정',
    description:
      '관계 정보를 수정합니다. 원하는 필드만 업데이트할 수 있습니다.',
  })
  @ApiParam({
    name: 'id',
    description: 'Relationship ID (UUID)',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: '관계 수정 성공',
    schema: {
      example: {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        user_id: '5ffc7298-98c5-44d0-a62e-7a2ac180a64d',
        partner_id: '716d0ed5-c04e-4315-aa8c-05c5ade05b7e',
        category: 'FRIEND_CASUAL',
        politeness: 'POLITE',
        vibe: 'CALM',
        emoji_level: 2,
        created_at: '2025-11-18T07:00:00.000Z',
        updated_at: '2025-11-18T07:05:00.000Z',
        partner: {
          id: '716d0ed5-c04e-4315-aa8c-05c5ade05b7e',
          name: '홍길동',
          telegram_id: '123456789',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiResponse({ status: 404, description: '관계를 찾을 수 없음' })
  async update(
    @Req() req: Request & { user: { id: string } },
    @Param('id') id: string,
    @Body() dto: UpdateRelationshipDto,
  ) {
    return this.relationshipService.update(req.user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: '관계 삭제',
    description:
      '관계를 삭제합니다. LLM 답변 생성 시 기본 설정으로 돌아갑니다.',
  })
  @ApiParam({
    name: 'id',
    description: 'Relationship ID (UUID)',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: '관계 삭제 성공',
    schema: {
      example: {
        message: 'Relationship deleted successfully',
      },
    },
  })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiResponse({ status: 404, description: '관계를 찾을 수 없음' })
  async remove(
    @Req() req: Request & { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.relationshipService.remove(req.user.id, id);
  }
}
