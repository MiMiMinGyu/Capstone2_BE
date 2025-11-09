import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { KakaoTxtParser } from './parsers/kakao-txt.parser';
import {
  RelationshipCategory,
  PolitenessLevel,
  VibeType,
} from '@prisma/client';

@Injectable()
export class KakaoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly parser: KakaoTxtParser,
  ) {}

  /**
   * 카카오톡 txt 파일을 업로드하고 파싱하여 DB에 저장합니다
   */
  async uploadAndParse(
    userId: string,
    fileBuffer: Buffer,
    partnerName: string,
    category: RelationshipCategory,
  ) {
    try {
      // 0. 사용자 정보 조회 (이름 가져오기)
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });

      if (!user || !user.name) {
        throw new BadRequestException(
          '사용자 정보를 찾을 수 없습니다. 회원가입 시 이름을 입력했는지 확인해주세요.',
        );
      }

      // 1. 파일 파싱
      const content = fileBuffer.toString('utf-8');
      const messages = this.parser.parse(content);

      if (messages.length === 0) {
        throw new BadRequestException(
          '파일에서 메시지를 찾을 수 없습니다. 올바른 카카오톡 txt 파일인지 확인해주세요.',
        );
      }

      // 사용자 이름으로 필터링
      const myMessages = this.parser.filterMyMessages(messages, user.name);

      if (myMessages.length === 0) {
        throw new BadRequestException(
          `"${user.name}"이(가) 보낸 메시지를 찾을 수 없습니다. 카카오톡 파일에서 발신자 이름이 "${user.name}"과 일치하는지 확인해주세요.`,
        );
      }

      // 2. Partner 생성 또는 조회
      const partner = await this.prisma.partner.create({
        data: { name: partnerName },
      });

      // 3. Relationship 생성
      const relationship = await this.prisma.relationship.create({
        data: {
          user_id: userId,
          partner_id: partner.id,
          category,
          politeness: this.getDefaultPoliteness(category),
          vibe: this.getDefaultVibe(category),
          emoji_level: this.getDefaultEmojiLevel(category),
        },
      });

      // 4. tone_samples 배치 저장
      const toneSamplesData = myMessages.map((msg) => ({
        user_id: userId,
        text: msg.text,
        category,
        politeness: relationship.politeness,
        vibe: relationship.vibe,
        // embedding은 나중에 별도 API로 생성
      }));

      await this.prisma.toneSample.createMany({
        data: toneSamplesData,
      });

      // 5. 통계 정보 반환
      const statistics = this.parser.getStatistics(messages);

      return {
        partner_id: partner.id,
        partner_name: partner.name,
        relationship_id: relationship.id,
        relationship_category: relationship.category,
        total_messages: statistics.total_messages,
        my_messages_count: statistics.my_messages_count,
        other_messages_count: statistics.other_messages_count,
        tone_samples_created: myMessages.length,
        unique_senders: statistics.unique_senders,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(
        `파일 처리 중 오류가 발생했습니다: ${errorMessage}`,
      );
    }
  }

  /**
   * 사용자의 모든 Partner 목록을 조회합니다
   */
  async getPartners(userId: string) {
    const relationships = await this.prisma.relationship.findMany({
      where: { user_id: userId },
      include: {
        partner: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return relationships.map((rel) => ({
      partner_id: rel.partner.id,
      partner_name: rel.partner.name,
      relationship_category: rel.category,
      politeness: rel.politeness,
      vibe: rel.vibe,
      emoji_level: rel.emoji_level,
      created_at: rel.created_at,
    }));
  }

  /**
   * 관계 카테고리에 따른 기본 존댓말 레벨을 반환합니다
   */
  private getDefaultPoliteness(
    category: RelationshipCategory,
  ): PolitenessLevel {
    const politenessMap: Record<RelationshipCategory, PolitenessLevel> = {
      FAMILY_ELDER_CLOSE: PolitenessLevel.POLITE,
      FAMILY_SIBLING_ELDER: PolitenessLevel.CASUAL,
      FAMILY_SIBLING_YOUNGER: PolitenessLevel.CASUAL,
      PARTNER_INTIMATE: PolitenessLevel.CASUAL,
      FRIEND_CLOSE: PolitenessLevel.CASUAL,
      ACQUAINTANCE_CASUAL: PolitenessLevel.POLITE,
      WORK_SENIOR_FORMAL: PolitenessLevel.FORMAL,
      WORK_SENIOR_FRIENDLY: PolitenessLevel.POLITE,
      WORK_PEER: PolitenessLevel.POLITE,
      WORK_JUNIOR: PolitenessLevel.POLITE,
    };

    return politenessMap[category];
  }

  /**
   * 관계 카테고리에 따른 기본 분위기를 반환합니다
   */
  private getDefaultVibe(category: RelationshipCategory): VibeType {
    const vibeMap: Record<RelationshipCategory, VibeType> = {
      FAMILY_ELDER_CLOSE: VibeType.CARING,
      FAMILY_SIBLING_ELDER: VibeType.PLAYFUL,
      FAMILY_SIBLING_YOUNGER: VibeType.CARING,
      PARTNER_INTIMATE: VibeType.CARING,
      FRIEND_CLOSE: VibeType.PLAYFUL,
      ACQUAINTANCE_CASUAL: VibeType.CALM,
      WORK_SENIOR_FORMAL: VibeType.CALM,
      WORK_SENIOR_FRIENDLY: VibeType.CALM,
      WORK_PEER: VibeType.DIRECT,
      WORK_JUNIOR: VibeType.CALM,
    };

    return vibeMap[category];
  }

  /**
   * 관계 카테고리에 따른 기본 이모지 레벨을 반환합니다 (0~3)
   */
  private getDefaultEmojiLevel(category: RelationshipCategory): number {
    const emojiMap: Record<RelationshipCategory, number> = {
      FAMILY_ELDER_CLOSE: 0,
      FAMILY_SIBLING_ELDER: 1,
      FAMILY_SIBLING_YOUNGER: 1,
      PARTNER_INTIMATE: 2,
      FRIEND_CLOSE: 2,
      ACQUAINTANCE_CASUAL: 0,
      WORK_SENIOR_FORMAL: 0,
      WORK_SENIOR_FRIENDLY: 0,
      WORK_PEER: 0,
      WORK_JUNIOR: 0,
    };

    return emojiMap[category];
  }
}
