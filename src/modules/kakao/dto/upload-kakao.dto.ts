import { IsString, IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RelationshipCategory } from '@prisma/client';

export class UploadKakaoDto {
  @ApiProperty({
    description: '대화 상대방 이름',
    example: '홍길동',
  })
  @IsString()
  @IsNotEmpty()
  partner_name: string;

  @ApiProperty({
    description: '관계 카테고리',
    enum: RelationshipCategory,
    example: RelationshipCategory.FRIEND_CLOSE,
  })
  @IsEnum(RelationshipCategory)
  @IsNotEmpty()
  relationship_category: RelationshipCategory;
}
