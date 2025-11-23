import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { KakaoTxtParser } from './parsers/kakao-txt.parser';
import { OpenaiService } from '../openai/openai.service';
import {
  RelationshipCategory,
  PolitenessLevel,
  VibeType,
} from '@prisma/client';

@Injectable()
export class KakaoService {
  private readonly logger = new Logger(KakaoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly parser: KakaoTxtParser,
    private readonly openai: OpenaiService,
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

      // 2-4. 트랜잭션으로 Partner, Relationship, ToneSample 생성 (원자성 보장)
      const { partner, relationship } = await this.prisma.$transaction(
        async (tx) => {
          // 2. Partner 생성
          const partner = await tx.partner.create({
            data: { name: partnerName },
          });

          // 3. Relationship 생성
          const relationship = await tx.relationship.create({
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

          await tx.toneSample.createMany({
            data: toneSamplesData,
          });

          return { partner, relationship };
        },
      );

      // 5. 통계 정보 반환 (사용자 이름 전달)
      const statistics = this.parser.getStatistics(messages, user.name);

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

  /**
   * 사용자의 모든 tone_samples에 대해 임베딩을 생성합니다
   * @param userId 사용자 ID
   * @returns 처리 결과 통계
   */
  async generateEmbeddings(userId: string) {
    this.logger.log(`Starting embedding generation for user: ${userId}`);

    // 1. 임베딩이 없는 tone_samples 조회 (raw query 사용)
    const toneSamples = await this.prisma.$queryRaw<
      Array<{ id: string; text: string }>
    >`
      SELECT id, text
      FROM tone_samples
      WHERE user_id = ${userId}::uuid
        AND embedding IS NULL
    `;

    if (toneSamples.length === 0) {
      this.logger.log('No tone samples found without embeddings');
      return {
        total: 0,
        processed: 0,
        failed: 0,
        message: '임베딩 생성이 필요한 tone sample이 없습니다.',
      };
    }

    this.logger.log(
      `Found ${toneSamples.length} tone samples without embeddings`,
    );

    const BATCH_SIZE = 100; // OpenAI API 제한 고려
    let processed = 0;
    let failed = 0;

    // 2. 배치 단위로 임베딩 생성
    for (let i = 0; i < toneSamples.length; i += BATCH_SIZE) {
      const batch = toneSamples.slice(i, i + BATCH_SIZE);
      this.logger.log(
        `Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(toneSamples.length / BATCH_SIZE)} (${batch.length} items)`,
      );

      try {
        // 배치로 임베딩 생성
        const texts = batch.map((sample) => sample.text);
        const { embeddings, totalTokens } =
          await this.openai.createEmbeddings(texts);

        this.logger.log(
          `Generated ${embeddings.length} embeddings, used ${totalTokens} tokens`,
        );

        // 3. DB에 저장 (병렬 처리로 성능 최적화)
        const updatePromises = batch.map(async (sample, j) => {
          const embedding = embeddings[j];
          const vectorString = `[${embedding.join(',')}]`;

          return this.prisma.$executeRaw`
            UPDATE tone_samples
            SET embedding = ${vectorString}::vector
            WHERE id = ${sample.id}::uuid
          `;
        });

        const results = await Promise.allSettled(updatePromises);

        // 결과 집계
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            processed++;
          } else {
            this.logger.error(
              `Failed to save embedding for sample ${batch[index].id}`,
              result.reason,
            );
            failed++;
          }
        });
      } catch (error) {
        this.logger.error(
          `Failed to process batch starting at index ${i}`,
          error,
        );
        failed += batch.length;
      }
    }

    this.logger.log(
      `Embedding generation completed. Processed: ${processed}, Failed: ${failed}`,
    );

    return {
      total: toneSamples.length,
      processed,
      failed,
      message: `임베딩 생성 완료: ${processed}개 성공, ${failed}개 실패`,
    };
  }
}
