import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GenerateReplyDto, UpdateStyleProfileDto } from './dto';
import { LlmService } from './llm.service';
import { GenerateReplyResponse } from './interfaces/llm.interface';
import { Request } from 'express';

@ApiTags('LLM')
@ApiBearerAuth('access-token')
@Controller('llm')
@UseGuards(JwtAuthGuard)
export class LlmController {
  constructor(private readonly llmService: LlmService) {}

  @Post('generate')
  @ApiOperation({
    summary: 'LLM 답변 생성',
    description:
      '사용자의 말투를 모방하여 LLM 기반 답변을 생성합니다. 벡터 유사도 검색으로 말투 예시를 찾고, 최근 대화 맥락과 관계 정보를 활용합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '답변 생성 성공',
    schema: {
      example: {
        reply: '오 ㅋㅋ 나도 별로 안 바쁨',
        context: {
          recentMessages: [],
          similarExamples: ['ㅇㅇ 그럼', '알겠어 ㅋㅋ', '오케이~'],
          styleProfile:
            '존댓말/반말: CASUAL, 말투 분위기: PLAYFUL, 분석된 대화 샘플: 523개',
          receiverInfo: '친구 (FRIEND_CLOSE)',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: '인증 실패 (JWT 토큰 없음)' })
  @ApiResponse({
    status: 404,
    description: '사용자 또는 파트너를 찾을 수 없음',
  })
  async generateReply(
    @Body() dto: GenerateReplyDto,
  ): Promise<GenerateReplyResponse> {
    return this.llmService.generateReply(
      dto.userId,
      dto.partnerId,
      dto.message,
    );
  }

  @Post('style-profile')
  @ApiOperation({
    summary: '말투 설정 저장/업데이트',
    description:
      '사용자 정의 말투 지침을 저장합니다. LLM 답변 생성 시 우선적으로 참고됩니다.',
  })
  @ApiResponse({
    status: 200,
    description: '말투 설정 저장 성공',
    schema: {
      example: {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        user_id: '5ffc7298-98c5-44d0-a62e-7a2ac180a64d',
        custom_guidelines:
          '- 비속어와 욕설을 사용하지 않음\n- 느낌표(!)를 거의 사용하지 않음',
        updated_at: '2025-11-18T06:30:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async updateStyleProfile(
    @Req() req: Request & { user: { id: string } },
    @Body() dto: UpdateStyleProfileDto,
  ) {
    return this.llmService.updateStyleProfile(req.user.id, dto);
  }

  @Get('style-profile')
  @ApiOperation({
    summary: '말투 설정 조회',
    description: '현재 사용자의 말투 설정을 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '말투 설정 조회 성공',
    schema: {
      example: {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        user_id: '5ffc7298-98c5-44d0-a62e-7a2ac180a64d',
        custom_guidelines:
          '- 비속어와 욕설을 사용하지 않음\n- 느낌표(!)를 거의 사용하지 않음',
        updated_at: '2025-11-18T06:30:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 404, description: '말투 설정을 찾을 수 없음' })
  async getStyleProfile(@Req() req: Request & { user: { id: string } }) {
    return this.llmService.getStyleProfileSettings(req.user.id);
  }

  @Delete('style-profile')
  @ApiOperation({
    summary: '말투 설정 삭제',
    description: '사용자 정의 말투 설정을 삭제하고 기본값으로 돌아갑니다.',
  })
  @ApiResponse({
    status: 200,
    description: '말투 설정 삭제 성공',
    schema: {
      example: {
        message: 'Style profile deleted successfully',
      },
    },
  })
  @ApiResponse({ status: 404, description: '말투 설정을 찾을 수 없음' })
  async deleteStyleProfile(@Req() req: Request & { user: { id: string } }) {
    return this.llmService.deleteStyleProfile(req.user.id);
  }
}
