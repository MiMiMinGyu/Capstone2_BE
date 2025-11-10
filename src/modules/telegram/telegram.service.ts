import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';
import { TelegramMessage, SavedMessage, TelegramChat } from './interfaces';
import { Subject, Observable } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);
  private bot!: Telegraf;

  // 인메모리 스토리지 - 받은 메시지 저장용 (Phase 4에서 DB로 전환 예정)
  private receivedMessages: SavedMessage[] = [];
  private messageIdCounter = 1;

  // SSE를 위한 이벤트 스트림
  private messageEventSubject = new Subject<SavedMessage>();

  // 임시 user_id (추후 JWT에서 가져오도록 수정 필요)
  private readonly TEMP_USER_ID = '75f7f032-ae95-48d6-8779-31518ed83bf4';

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');

    if (!token) {
      this.logger.warn(
        'TELEGRAM_BOT_TOKEN is not defined - Telegram bot disabled',
      );
      return; // 토큰이 없으면 조용히 스킵
    }

    this.bot = new Telegraf(token);

    // 텍스트 메시지 수신 시 처리 로직 (풀링 방식) - 자동 응답 제거, 저장만 수행
    this.bot.on('text', async (ctx) => {
      const message: TelegramMessage = {
        messageId: ctx.message?.message_id,
        from: ctx.from || undefined,
        chat: this.extractChatInfo(ctx.chat),
        text: ctx.message?.text,
        timestamp: new Date(),
      };

      this.logger.log(
        `Message received - from=${ctx.from?.id} chat=${ctx.chat?.id} text="${ctx.message?.text}"`,
      );

      // 메시지 저장 (프론트엔드에서 조회할 수 있도록)
      await this.saveReceivedMessage(message);

      // 자동 응답하지 않음 - 사용자가 프론트엔드에서 선택해서 보낼 예정
      this.logger.log(`Message saved with ID: ${this.messageIdCounter - 1}`);
    });

    // await 제거: 비동기로 실행하여 HTTP 서버 시작 블로킹 방지
    this.bot
      .launch()
      .then(() => {
        this.logger.log('✅ Telegram bot launched (long polling)');
      })
      .catch((error: Error) => {
        this.logger.error(`❌ Failed to launch Telegram bot: ${error.message}`);
      });

    process.once('SIGINT', () => this.bot.stop('SIGINT'));
    process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
  }

  // 프론트엔드에서 호출하는 메시지 전송 API
  async sendMessage(chatId: number | string, text: string) {
    try {
      await this.bot.telegram.sendMessage(chatId, text);
      this.logger.log(`Message sent to chat ${chatId}`);
    } catch (error) {
      this.logger.error(`Failed to send message: ${error}`);
      throw error;
    }
  }

  // 텔레그램 채팅 정보 안전하게 추출하는 헬퍼 메서드
  private extractChatInfo(chat: unknown): TelegramChat {
    if (!chat || typeof chat !== 'object') {
      return {
        id: 0,
        type: 'private',
      };
    }

    const chatObj = chat as Record<string, unknown>;
    const id = typeof chatObj.id === 'number' ? chatObj.id : 0;
    const type = this.validateChatType(chatObj.type);

    const baseInfo = { id, type };

    // 채팅 타입별로 안전하게 속성 추출
    switch (type) {
      case 'private':
        return {
          ...baseInfo,
          first_name:
            typeof chatObj.first_name === 'string'
              ? chatObj.first_name
              : undefined,
          last_name:
            typeof chatObj.last_name === 'string'
              ? chatObj.last_name
              : undefined,
          username:
            typeof chatObj.username === 'string' ? chatObj.username : undefined,
        };
      case 'group':
      case 'supergroup':
        return {
          ...baseInfo,
          title: typeof chatObj.title === 'string' ? chatObj.title : undefined,
          username:
            typeof chatObj.username === 'string' ? chatObj.username : undefined,
        };
      case 'channel':
        return {
          ...baseInfo,
          title: typeof chatObj.title === 'string' ? chatObj.title : undefined,
          username:
            typeof chatObj.username === 'string' ? chatObj.username : undefined,
        };
      default:
        return baseInfo;
    }
  }

  // 채팅 타입 검증 헬퍼 메서드
  private validateChatType(
    type: unknown,
  ): 'private' | 'group' | 'supergroup' | 'channel' {
    const validTypes = ['private', 'group', 'supergroup', 'channel'] as const;
    return validTypes.includes(
      type as 'private' | 'group' | 'supergroup' | 'channel',
    )
      ? (type as (typeof validTypes)[number])
      : 'private';
  }

  // 받은 메시지 저장 메서드 (DB 저장)
  private async saveReceivedMessage(message: TelegramMessage): Promise<void> {
    try {
      const telegramId = message.from?.id?.toString();
      if (!telegramId) {
        this.logger.warn('메시지에 발신자 정보가 없습니다');
        return;
      }

      // 1. Partner upsert (telegram_id 기준)
      const partner = await this.prisma.partner.upsert({
        where: { telegram_id: telegramId },
        create: {
          name: message.from?.first_name || 'Unknown',
          telegram_id: telegramId,
        },
        update: {},
      });

      this.logger.log(
        `Partner 확인/생성 완료: ${partner.name} (${partner.id})`,
      );

      // 2. Conversation upsert
      const conversation = await this.prisma.conversation.upsert({
        where: {
          user_id_partner_id: {
            user_id: this.TEMP_USER_ID,
            partner_id: partner.id,
          },
        },
        create: {
          user_id: this.TEMP_USER_ID,
          partner_id: partner.id,
        },
        update: {
          updated_at: new Date(),
        },
      });

      // 3. Message 저장
      const savedMessage = await this.prisma.message.create({
        data: {
          conversation_id: conversation.id,
          role: 'user',
          text: message.text || '',
        },
      });

      this.logger.log(`메시지 DB 저장 완료: ${savedMessage.id}`);

      // 4. 인메모리에도 저장 (기존 API 호환성)
      const inMemoryMessage: SavedMessage = {
        id: this.messageIdCounter++,
        ...message,
        isRead: false,
        aiRecommendations: [],
        replied: false,
      };
      this.receivedMessages.unshift(inMemoryMessage);

      // 5. SSE 이벤트 발송
      this.logger.log(`🔥 SSE 이벤트 발송 중...`);
      this.messageEventSubject.next(inMemoryMessage);
      this.logger.log(`✅ SSE 이벤트 발송 완료`);
    } catch (error) {
      this.logger.error(`메시지 저장 실패: ${error}`);
    }
  }

  // 받은 메시지 목록 조회
  getReceivedMessages(): SavedMessage[] {
    return this.receivedMessages;
  }

  // 특정 메시지 조회
  getMessageById(id: number): SavedMessage | undefined {
    return this.receivedMessages.find((msg) => msg.id === id);
  }

  // AI 답변 추천 생성 (추후 Flask AI 서버와 연동 예정)
  async generateAIRecommendations(messageId: number): Promise<string[]> {
    const message = this.getMessageById(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    this.logger.log(`Generating AI recommendations for: ${message.text}`);

    // 실제 AI 서버 호출 시뮬레이션 (지연 추가)
    await new Promise((resolve) => setTimeout(resolve, 500));

    // AI 추천 답변 (임시 하드코딩)
    const recommendations = [
      `지금 연락하기 힘든 상황이라 이따 연락할게.`,
      `${message.text}? 좋지.`,
      `나 아무거나 다 괜찮아`,
      `응, 알겠어.`,
      `오케이 땡큐~`,
    ];

    // 메시지에 AI 추천 답변 저장
    message.aiRecommendations = recommendations;
    this.logger.log(
      `AI recommendations generated: ${JSON.stringify(recommendations)}`,
    );

    return recommendations;
  }

  // 사용자가 선택한 답변 전송
  async sendSelectedReply(
    messageId: number,
    selectedReply: string,
  ): Promise<void> {
    const message = this.getMessageById(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    try {
      await this.bot.telegram.sendMessage(message.chat.id, selectedReply);

      // 답장 완료 표시
      message.replied = true;
      message.selectedReply = selectedReply;

      this.logger.log(
        `Reply sent to chat ${message.chat.id}: ${selectedReply}`,
      );
    } catch (error) {
      this.logger.error(`Failed to send reply: ${error}`);
      throw error;
    }
  }

  // SSE 스트림 제공 메서드
  getMessageEventStream(): Observable<SavedMessage> {
    return this.messageEventSubject.asObservable();
  }
}
