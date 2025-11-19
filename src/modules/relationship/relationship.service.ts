import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRelationshipDto, UpdateRelationshipDto } from './dto';
import {
  RelationshipCategory,
  PolitenessLevel,
  VibeType,
} from '@prisma/client';

@Injectable()
export class RelationshipService {
  private readonly logger = new Logger(RelationshipService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 관계 생성
   * @param userId 사용자 ID
   * @param dto CreateRelationshipDto
   */
  async create(userId: string, dto: CreateRelationshipDto) {
    this.logger.log(
      `[Relationship] 관계 생성 - userId: ${userId}, partnerId: ${dto.partnerId}`,
    );

    // Partner 존재 확인
    const partner = await this.prisma.partner.findUnique({
      where: { id: dto.partnerId },
    });

    if (!partner) {
      throw new NotFoundException(
        `Partner not found with id: ${dto.partnerId}`,
      );
    }

    // 중복 관계 확인
    const existingRelationship = await this.prisma.relationship.findUnique({
      where: {
        user_id_partner_id: {
          user_id: userId,
          partner_id: dto.partnerId,
        },
      },
    });

    if (existingRelationship) {
      throw new ConflictException(
        `Relationship already exists for partner: ${dto.partnerId}`,
      );
    }

    // 관계 생성
    const relationship = await this.prisma.relationship.create({
      data: {
        user_id: userId,
        partner_id: dto.partnerId,
        category: dto.category as RelationshipCategory,
        politeness: dto.politeness as PolitenessLevel,
        vibe: dto.vibe as VibeType,
        emoji_level: dto.emojiLevel,
      },
      include: {
        partner: {
          select: {
            id: true,
            name: true,
            telegram_id: true,
          },
        },
      },
    });

    this.logger.log(`[Relationship] ✅ 관계 생성 완료: ${relationship.id}`);

    return relationship;
  }

  /**
   * 사용자의 모든 관계 조회
   * @param userId 사용자 ID
   */
  async findAll(userId: string) {
    this.logger.log(`[Relationship] 관계 목록 조회 - userId: ${userId}`);

    const relationships = await this.prisma.relationship.findMany({
      where: { user_id: userId },
      include: {
        partner: {
          select: {
            id: true,
            name: true,
            telegram_id: true,
          },
        },
      },
      orderBy: { updated_at: 'desc' },
    });

    this.logger.log(
      `[Relationship] ✅ 관계 목록 조회 완료: ${relationships.length}개`,
    );

    return relationships;
  }

  /**
   * 특정 관계 조회
   * @param userId 사용자 ID
   * @param relationshipId 관계 ID
   */
  async findOne(userId: string, relationshipId: string) {
    this.logger.log(
      `[Relationship] 관계 조회 - userId: ${userId}, relationshipId: ${relationshipId}`,
    );

    const relationship = await this.prisma.relationship.findFirst({
      where: {
        id: relationshipId,
        user_id: userId, // 본인의 관계만 조회 가능
      },
      include: {
        partner: {
          select: {
            id: true,
            name: true,
            telegram_id: true,
          },
        },
      },
    });

    if (!relationship) {
      throw new NotFoundException(
        `Relationship not found with id: ${relationshipId}`,
      );
    }

    return relationship;
  }

  /**
   * 관계 수정
   * @param userId 사용자 ID
   * @param relationshipId 관계 ID
   * @param dto UpdateRelationshipDto
   */
  async update(
    userId: string,
    relationshipId: string,
    dto: UpdateRelationshipDto,
  ) {
    this.logger.log(
      `[Relationship] 관계 수정 - userId: ${userId}, relationshipId: ${relationshipId}`,
    );

    // 관계 수정 (user_id 체크 포함, 없으면 자동으로 404 에러)
    try {
      const updatedRelationship = await this.prisma.relationship.update({
        where: {
          id: relationshipId,
          user_id: userId, // 본인의 관계만 수정 가능
        },
        data: {
          ...(dto.category && {
            category: dto.category as RelationshipCategory,
          }),
          ...(dto.politeness !== undefined && {
            politeness: dto.politeness as PolitenessLevel,
          }),
          ...(dto.vibe !== undefined && { vibe: dto.vibe as VibeType }),
          ...(dto.emojiLevel !== undefined && {
            emoji_level: dto.emojiLevel,
          }),
        },
        include: {
          partner: {
            select: {
              id: true,
              name: true,
              telegram_id: true,
            },
          },
        },
      });

      this.logger.log(`[Relationship] ✅ 관계 수정 완료: ${relationshipId}`);

      return updatedRelationship;
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(
          `Relationship not found with id: ${relationshipId}`,
        );
      }
      throw error;
    }
  }

  /**
   * 관계 삭제
   * @param userId 사용자 ID
   * @param relationshipId 관계 ID
   */
  async remove(userId: string, relationshipId: string) {
    this.logger.log(
      `[Relationship] 관계 삭제 - userId: ${userId}, relationshipId: ${relationshipId}`,
    );

    // 관계 삭제 (user_id 체크 포함)
    try {
      await this.prisma.relationship.delete({
        where: {
          id: relationshipId,
          user_id: userId, // 본인의 관계만 삭제 가능
        },
      });

      this.logger.log(`[Relationship] ✅ 관계 삭제 완료: ${relationshipId}`);

      return { message: 'Relationship deleted successfully' };
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(
          `Relationship not found with id: ${relationshipId}`,
        );
      }
      throw error;
    }
  }
}
