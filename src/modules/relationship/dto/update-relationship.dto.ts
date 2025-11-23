import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateRelationshipDto {
  @ApiProperty({
    description: '관계 카테고리',
    enum: [
      'FAMILY_ELDER_CLOSE',
      'FAMILY_SIBLING_ELDER',
      'FAMILY_SIBLING_YOUNGER',
      'PARTNER_INTIMATE',
      'FRIEND_CLOSE',
      'ACQUAINTANCE_CASUAL',
      'WORK_SENIOR_FORMAL',
      'WORK_SENIOR_FRIENDLY',
      'WORK_PEER',
      'WORK_JUNIOR',
    ],
    required: false,
  })
  @IsOptional()
  @IsEnum([
    'FAMILY_ELDER_CLOSE',
    'FAMILY_SIBLING_ELDER',
    'FAMILY_SIBLING_YOUNGER',
    'PARTNER_INTIMATE',
    'FRIEND_CLOSE',
    'ACQUAINTANCE_CASUAL',
    'WORK_SENIOR_FORMAL',
    'WORK_SENIOR_FRIENDLY',
    'WORK_PEER',
    'WORK_JUNIOR',
  ])
  category?: string;

  @ApiProperty({
    description: '존댓말/반말 수준',
    enum: ['FORMAL', 'POLITE', 'CASUAL'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['FORMAL', 'POLITE', 'CASUAL'])
  politeness?: string;

  @ApiProperty({
    description: '대화 분위기',
    enum: ['CALM', 'DIRECT', 'PLAYFUL', 'CARING'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['CALM', 'DIRECT', 'PLAYFUL', 'CARING'])
  vibe?: string;

  @ApiProperty({
    description: '이모지 사용 빈도 (0-5)',
    required: false,
    minimum: 0,
    maximum: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  emojiLevel?: number;
}
