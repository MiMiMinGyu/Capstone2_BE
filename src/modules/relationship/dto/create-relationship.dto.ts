import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateRelationshipDto {
  @ApiProperty({
    description: 'Partner ID (UUID)',
    example: '716d0ed5-c04e-4315-aa8c-05c5ade05b7e',
  })
  @IsUUID()
  partnerId: string;
  @ApiProperty({
    description: '관계 카테고리',
    enum: [
      'FRIEND_CLOSE',
      'FRIEND_CASUAL',
      'FAMILY',
      'COWORKER',
      'SENIOR',
      'JUNIOR',
      'ROMANTIC_PARTNER',
      'ACQUAINTANCE_CLOSE',
      'ACQUAINTANCE_CASUAL',
      'PROFESSIONAL',
    ],
    example: 'FRIEND_CLOSE',
  })
  @IsEnum([
    'FRIEND_CLOSE',
    'FRIEND_CASUAL',
    'FAMILY',
    'COWORKER',
    'SENIOR',
    'JUNIOR',
    'ROMANTIC_PARTNER',
    'ACQUAINTANCE_CLOSE',
    'ACQUAINTANCE_CASUAL',
    'PROFESSIONAL',
  ])
  category: string;

  @ApiProperty({
    description: '존댓말/반말 수준',
    enum: ['FORMAL', 'POLITE', 'CASUAL'],
    required: false,
    default: 'POLITE',
  })
  @IsOptional()
  @IsEnum(['FORMAL', 'POLITE', 'CASUAL'])
  politeness?: string;

  @ApiProperty({
    description: '대화 분위기',
    enum: ['SERIOUS', 'CALM', 'PLAYFUL', 'ENERGETIC'],
    required: false,
    default: 'CALM',
  })
  @IsOptional()
  @IsEnum(['SERIOUS', 'CALM', 'PLAYFUL', 'ENERGETIC'])
  vibe?: string;

  @ApiProperty({
    description: '이모지 사용 빈도 (0-5)',
    required: false,
    minimum: 0,
    maximum: 5,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  emojiLevel?: number;
}
