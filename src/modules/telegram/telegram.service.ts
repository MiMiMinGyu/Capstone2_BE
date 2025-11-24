import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';
import {
  TelegramMessage,
  SavedMessage,
  TelegramChat,
  Recommendation,
} from './interfaces';
import { Subject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';
import { GptService } from '../gpt/gpt.service';

@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);
  private bot!: Telegraf;

  // 인메모리 스토리지 - 받은 메시지 저장용 (Phase 4에서 DB로 전환 예정)
  private receivedMessages: SavedMessage[] = [];
  private messageIdCounter = 1;

  // SSE를 위한 이벤트 스트림
  private messageEventSubject = new Subject<SavedMessage>();

  // 봇 소유자 user_id (환경변수에서 가져옴)
  private readonly defaultUserId: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly gptService: GptService,
  ) {
    this.defaultUserId = this.config.get<string>('DEFAULT_USER_ID') || '';
    if (!this.defaultUserId) {
      this.logger.error('DEFAULT_USER_ID is not set in environment variables');
    }
  }

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

      // 1-4. 트랜잭션으로 User 조회, Partner/Conversation upsert, Message 생성 (원자성 보장)
      const savedMessage = await this.prisma.$transaction(async (tx) => {
        // 1. User 찾기 (봇 소유자 - 서비스 회원)
        const user = await tx.user.findUnique({
          where: { id: this.defaultUserId },
        });

        if (!user) {
          throw new Error(`User not found: ${this.defaultUserId}`);
        }

        // 2. Partner upsert (telegram_id 기준 - 메시지 발신자)
        // 처음 대화하는 사람도 자동으로 Partner 생성
        const partner = await tx.partner.upsert({
          where: { telegram_id: telegramId },
          create: {
            name: message.from?.first_name || 'Unknown',
            telegram_id: telegramId,
          },
          update: {
            // 이름이 변경되었을 수 있으므로 업데이트
            name: message.from?.first_name || 'Unknown',
          },
        });

        this.logger.log(
          `Partner 확인/생성 완료: ${partner.name} (${partner.id})`,
        );

        // 3. Conversation upsert
        const conversation = await tx.conversation.upsert({
          where: {
            user_id_partner_id: {
              user_id: user.id,
              partner_id: partner.id,
            },
          },
          create: {
            user_id: user.id,
            partner_id: partner.id,
          },
          update: {
            updated_at: new Date(),
          },
        });

        // 4. Message 저장
        const savedMessage = await tx.message.create({
          data: {
            conversation_id: conversation.id,
            role: 'user',
            text: message.text || '',
          },
        });

        return savedMessage;
      });

      this.logger.log(`메시지 DB 저장 완료: ${savedMessage.id}`);

      // 5. 인메모리에도 저장 (기존 API 호환성)
      const inMemoryMessage: SavedMessage = {
        id: this.messageIdCounter++,
        ...message,
        isRead: false,
        aiRecommendations: [],
        replied: false,
      };
      this.receivedMessages.unshift(inMemoryMessage);

      // 6. SSE 이벤트 발송
      this.logger.log(`🔥 SSE 이벤트 발송 중...`);
      this.messageEventSubject.next(inMemoryMessage);
      this.logger.log(`✅ SSE 이벤트 발송 완료`);
    } catch (error) {
      this.logger.error(
        `메시지 저장 실패: ${error instanceof Error ? error.message : String(error)}`,
      );
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

  // GPT 기반 답변 생성 (DB 기반)
  async generateAIRecommendations(
    messageId: string,
  ): Promise<Recommendation[]> {
    this.logger.log(`[Telegram] GPT 답변 생성 시작 - messageId: ${messageId}`);

    try {
      // 1. DB에서 메시지 조회
      const message = await this.prisma.message.findUnique({
        where: { id: messageId },
        include: {
          conversation: {
            include: {
              partner: true,
            },
          },
        },
      });

      if (!message) {
        throw new Error(`Message not found: ${messageId}`);
      }

      if (message.role !== 'user') {
        throw new Error('Can only generate recommendations for user messages');
      }

      const partner = message.conversation.partner;
      const userId = message.conversation.user_id;

      this.logger.log(
        `[Telegram] 메시지 조회 완료: "${message.text}" from ${partner.name}`,
      );

      // 2. GptService를 통해 긍정/부정 답변 생성
      const gptResponse = await this.gptService.generateMultipleReplies(
        userId,
        partner.id,
        message.text || '',
      );

      this.logger.log(
        `[Telegram] GPT 답변 생성 완료 - 긍정: "${gptResponse.positiveReply}", 부정: "${gptResponse.negativeReply}"`,
      );

      // 3. 3개 답변 구성: 긍정, 부정, Default
      const recommendations: Recommendation[] = [
        {
          messageId: messageId,
          text: gptResponse.positiveReply,
          tone: 'positive',
        },
        {
          messageId: messageId,
          text: gptResponse.negativeReply,
          tone: 'negative',
        },
        {
          messageId: messageId,
          text: '지금은 답장하기 힘드니, 최대한 빠르게 확인하겠습니다!',
          isDefault: true,
        },
      ];

      return recommendations;
    } catch (error) {
      this.logger.error(
        `[Telegram] GPT 답변 생성 실패: ${error instanceof Error ? error.message : String(error)}`,
      );

      // 에러 발생 시 폴백 답변 반환
      const fallbackRecommendations: Recommendation[] = [
        {
          messageId: messageId,
          text: '알겠습니다!',
          tone: 'positive',
        },
        {
          messageId: messageId,
          text: '죄송하지만 어렵습니다.',
          tone: 'negative',
        },
        {
          messageId: messageId,
          text: '지금은 답장하기 힘드니, 최대한 빠르게 확인하겠습니다!',
          isDefault: true,
        },
      ];

      return fallbackRecommendations;
    }
  }

  // 사용자가 선택한 답변 전송 (DB 기반)
  async sendSelectedReply(
    messageId: string,
    selectedReply: string,
  ): Promise<void> {
    this.logger.log(
      `[Telegram] 답변 전송 시작 - messageId: ${messageId}, reply: "${selectedReply}"`,
    );

    try {
      // 1. DB에서 메시지 조회
      const message = await this.prisma.message.findUnique({
        where: { id: messageId },
        include: {
          conversation: {
            include: {
              partner: true,
            },
          },
        },
      });

      if (!message) {
        throw new Error(`Message not found: ${messageId}`);
      }

      const partner = message.conversation.partner;
      const telegramChatId = partner.telegram_id;

      if (!telegramChatId) {
        throw new Error(`Partner ${partner.name} has no telegram_id`);
      }

      // 2. 텔레그램으로 메시지 전송
      await this.bot.telegram.sendMessage(telegramChatId, selectedReply);

      // 3. DB에 답변 저장 (assistant 역할)
      await this.prisma.message.create({
        data: {
          conversation_id: message.conversation_id,
          role: 'assistant',
          text: selectedReply,
        },
      });

      this.logger.log(
        `[Telegram] 답변 전송 완료 - ${partner.name}에게: "${selectedReply}"`,
      );
    } catch (error) {
      this.logger.error(
        `[Telegram] 답변 전송 실패: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  // SSE 스트림 제공 메서드 (userId별 필터링)
  getMessageEventStream(userId: string): Observable<SavedMessage> {
    return this.messageEventSubject.asObservable().pipe(
      filter(() => {
        // 메시지의 수신자가 해당 userId인 경우만 전송
        // 현재는 DEFAULT_USER_ID와 비교 (모든 메시지가 이 사용자에게 전송됨)
        // TODO: 추후 multi-user 지원 시 message에 userId 필드 추가 필요
        return userId === this.defaultUserId;
      }),
    );
  }

  // 채팅 목록 조회 (대화 상대 목록)
  async getConversations(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: { user_id: userId },
      include: {
        partner: true,
        messages: {
          orderBy: { created_at: 'desc' },
          take: 1, // 마지막 메시지만
        },
      },
      orderBy: { updated_at: 'desc' },
    });

    return conversations.map((conv) => ({
      partner_id: conv.partner.id,
      partner_name: conv.partner.name,
      partner_telegram_id: conv.partner.telegram_id,
      last_message: conv.messages[0]?.text || null,
      last_message_time: conv.messages[0]?.created_at || conv.created_at,
      updated_at: conv.updated_at,
    }));
  }

  // 대화 히스토리 조회 (페이지네이션)
  async getConversationMessages(
    userId: string,
    partnerId: string,
    page: number,
    limit: number,
  ) {
    // Conversation 찾기
    const conversation = await this.prisma.conversation.findUnique({
      where: {
        user_id_partner_id: {
          user_id: userId,
          partner_id: partnerId,
        },
      },
      include: {
        partner: true,
      },
    });

    if (!conversation) {
      return {
        partner: null,
        messages: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      };
    }

    // 메시지 개수 조회
    const totalMessages = await this.prisma.message.count({
      where: { conversation_id: conversation.id },
    });

    // 메시지 조회 (페이지네이션)
    const messages = await this.prisma.message.findMany({
      where: { conversation_id: conversation.id },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      partner: {
        id: conversation.partner.id,
        name: conversation.partner.name,
        telegram_id: conversation.partner.telegram_id,
      },
      messages: messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        text: msg.text,
        created_at: msg.created_at,
      })),
      pagination: {
        page,
        limit,
        total: totalMessages,
        totalPages: Math.ceil(totalMessages / limit),
      },
    };
  }
}
