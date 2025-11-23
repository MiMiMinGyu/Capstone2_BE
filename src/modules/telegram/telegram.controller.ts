import {
  Body,
  Controller,
  Post,
  Get,
  Sse,
  MessageEvent,
  Param,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { JwtService } from '@nestjs/jwt';
import { TelegramService } from './telegram.service';
import {
  SendMessageDto,
  GenerateRecommendationsDto,
  SendReplyDto,
} from './dto';

// Swagger 태그 설정 - API 문서에서 텔레그램 관련 엔드포인트 그룹화
@ApiTags('telegram')
@Controller('telegram')
export class TelegramController {
  constructor(
    private readonly tg: TelegramService,
    private readonly jwtService: JwtService,
  ) {}

  // 프론트엔드에서 호출하는 메시지 전송 API
  @Post('send')
  @ApiOperation({ summary: '텔레그램 메시지 전송' })
  @ApiResponse({ status: 200, description: '메시지 전송 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  async send(@Body() body: SendMessageDto) {
    return this.tg.sendMessage(body.chatId, body.text);
  }

  // 받은 메시지 목록 조회 API (인메모리)
  @Get('messages')
  @ApiOperation({ summary: '받은 메시지 목록 조회 (인메모리)' })
  @ApiResponse({ status: 200, description: '받은 메시지 목록' })
  getReceivedMessages() {
    return this.tg.getReceivedMessages();
  }

  // 채팅 목록 조회 API (DB 기반)
  @Get('conversations')
  @ApiOperation({ summary: '대화 상대 목록 조회' })
  @ApiResponse({
    status: 200,
    description: '대화 상대 목록 (마지막 메시지 포함)',
  })
  async getConversations() {
    // TODO: JWT에서 userId 가져오기
    const userId = '75f7f032-ae95-48d6-8779-31518ed83bf4';
    return this.tg.getConversations(userId);
  }

  // 대화 히스토리 조회 API
  @Get('conversations/:partnerId/messages')
  @ApiOperation({ summary: '특정 상대와의 대화 기록 조회' })
  @ApiResponse({
    status: 200,
    description: '대화 메시지 목록 (페이지네이션)',
  })
  async getConversationMessages(
    @Param('partnerId') partnerId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    // TODO: JWT에서 userId 가져오기
    const userId = '75f7f032-ae95-48d6-8779-31518ed83bf4';
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '50', 10);

    return this.tg.getConversationMessages(
      userId,
      partnerId,
      pageNum,
      limitNum,
    );
  }

  // AI 추천 답변 생성 API
  @Post('recommendations')
  @ApiOperation({ summary: 'AI 추천 답변 생성 (긍정/부정/Default)' })
  @ApiResponse({
    status: 200,
    description: 'AI 추천 답변 목록 (긍정, 부정, Default 총 3개)',
  })
  @ApiResponse({ status: 404, description: '메시지를 찾을 수 없음' })
  async generateRecommendations(@Body() dto: GenerateRecommendationsDto) {
    const recommendations = await this.tg.generateAIRecommendations(
      dto.messageId,
    );
    return { recommendations };
  }

  // 사용자 선택 답변 전송 API
  @Post('reply')
  @ApiOperation({ summary: '사용자 선택 답변 전송' })
  @ApiResponse({ status: 200, description: '답변 전송 성공' })
  @ApiResponse({ status: 404, description: '메시지를 찾을 수 없음' })
  async sendReply(@Body() dto: SendReplyDto) {
    await this.tg.sendSelectedReply(dto.messageId, dto.selectedReply);
    return { success: true, message: 'Reply sent successfully' };
  }

  // 텔레그램 봇 상태 확인 API (헬스체크용)
  @Get('status')
  @ApiOperation({ summary: '텔레그램 봇 상태 확인' })
  @ApiResponse({ status: 200, description: '봇 상태 정보' })
  getStatus() {
    return {
      status: 'Telegram bot is running',
      timestamp: new Date().toISOString(),
    };
  }

  // SSE 엔드포인트 - 새 메시지 실시간 알림
  @Get('events')
  @Sse()
  @ApiOperation({
    summary: '새 메시지 실시간 알림 (SSE)',
    description:
      '쿼리 파라미터로 JWT 토큰을 전달해야 합니다. 예: /telegram/events?token=your_jwt_token',
  })
  @ApiQuery({
    name: 'token',
    required: true,
    description: 'JWT 액세스 토큰',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @ApiResponse({ status: 200, description: '실시간 메시지 스트림' })
  @ApiResponse({
    status: 401,
    description: '인증 실패 (토큰 없음 또는 만료됨)',
  })
  getMessageEvents(@Query('token') token: string): Observable<MessageEvent> {
    // 1. 토큰 검증
    if (!token) {
      throw new UnauthorizedException(
        '토큰이 제공되지 않았습니다. 쿼리 파라미터로 token을 전달해주세요.',
      );
    }

    let userId: string;
    try {
      const payload = this.jwtService.verify<{ id: string }>(token);
      userId = payload.id;
      console.log(`📡 SSE 연결 시작됨 - userId: ${userId}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Invalid token';
      console.error(`❌ SSE 인증 실패: ${errorMessage}`);
      throw new UnauthorizedException('유효하지 않거나 만료된 토큰입니다.');
    }

    // 2. 해당 사용자의 메시지만 필터링하여 스트림 반환
    return this.tg.getMessageEventStream(userId).pipe(
      map((message) => {
        console.log(
          `📤 SSE 메시지 전송 (userId: ${userId}): ${message.id} - ${message.text}`,
        );
        return {
          data: JSON.stringify(message),
          type: 'newMessage',
        };
      }),
    );
  }
}
