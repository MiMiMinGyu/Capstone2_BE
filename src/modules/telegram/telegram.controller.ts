import { Body, Controller, Post, Get, Sse, MessageEvent } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Observable } from 'rxjs';
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
  constructor(private readonly tg: TelegramService) {}

  // 프론트엔드에서 호출하는 메시지 전송 API
  @Post('send')
  @ApiOperation({ summary: '텔레그램 메시지 전송' })
  @ApiResponse({ status: 200, description: '메시지 전송 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  async send(@Body() body: SendMessageDto) {
    return this.tg.sendMessage(body.chatId, body.text);
  }

  // 받은 메시지 목록 조회 API
  @Get('messages')
  @ApiOperation({ summary: '받은 메시지 목록 조회' })
  @ApiResponse({ status: 200, description: '받은 메시지 목록' })
  getReceivedMessages() {
    return this.tg.getReceivedMessages();
  }

  // SSE 이벤트 스트림 - 새 메시지 실시간 알림
  @Sse('events')
  @ApiOperation({ summary: '새 메시지 SSE 이벤트 스트림' })
  @ApiResponse({ status: 200, description: 'SSE 연결 성공' })
  getMessageEvents(): Observable<MessageEvent> {
    return this.tg.getMessageStream();
  }

  // AI 추천 답변 생성 API
  @Post('recommendations')
  @ApiOperation({ summary: 'AI 추천 답변 생성' })
  @ApiResponse({ status: 200, description: 'AI 추천 답변 목록' })
  @ApiResponse({ status: 404, description: '메시지를 찾을 수 없음' })
  async generateRecommendations(@Body() dto: GenerateRecommendationsDto) {
    const recommendations = await this.tg.generateAIRecommendations(
      dto.messageId,
    );
    return { messageId: dto.messageId, recommendations };
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
}
