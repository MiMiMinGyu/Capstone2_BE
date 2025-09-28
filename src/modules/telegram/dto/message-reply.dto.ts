import { IsString, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// AI 추천 답변 생성 요청 DTO
export class GenerateRecommendationsDto {
  @ApiProperty({
    example: 1,
    description: '메시지 ID',
  })
  @IsNumber()
  messageId!: number;
}

// 사용자 선택 답변 전송 DTO
export class SendReplyDto {
  @ApiProperty({
    example: 1,
    description: '메시지 ID',
  })
  @IsNumber()
  messageId!: number;

  @ApiProperty({
    example: '그렇게 생각해! 나도 비슷하게 느꼈어',
    description: '사용자가 선택한 답변',
  })
  @IsString()
  selectedReply!: string;
}
