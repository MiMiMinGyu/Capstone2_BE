import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class GenerateReplyDto {
  @ApiProperty({
    description: '사용자 ID (UUID)',
    example: '5ffc7298-98c5-44d0-a62e-7a2ac180a64d',
  })
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @ApiProperty({
    description: '대화 상대 Partner ID (UUID)',
    example: '716d0ed5-c04e-4315-aa8c-05c5ade05b7e',
  })
  @IsNotEmpty()
  @IsUUID()
  partnerId: string;

  @ApiProperty({
    description: '수신한 메시지 내용',
    example: '오늘 뭐해?',
  })
  @IsNotEmpty()
  @IsString()
  message: string;
}
