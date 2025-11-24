import { IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// AI 추천 답변 생성 요청 DTO
export class GenerateRecommendationsDto {
  @ApiProperty({
    example: 'd70e7086-5367-4656-88fb-e670f1a43479',
    description: '메시지 ID (UUID)',
  })
  @IsUUID()
  messageId!: string;
}

// 사용자 선택 답변 전송 DTO
export class SendReplyDto {
  @ApiProperty({
    example: 'd70e7086-5367-4656-88fb-e670f1a43479',
    description: '메시지 ID (UUID)',
  })
  @IsUUID()
  messageId!: string;

  @ApiProperty({
    example: '그렇게 생각해! 나도 비슷하게 느꼈어',
    description: '사용자가 선택한 답변',
  })
  @IsString()
  selectedReply!: string;
}
