import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// 텔레그램 메시지 전송을 위한 DTO (프론트엔드에서 사용)
export class SendMessageDto {
  // 텔레그램 채팅 ID (Swagger 문서화 추가)
  @ApiProperty({
    example: 123456789,
    description: '텔레그램 채팅 ID',
  })
  @IsNotEmpty()
  chatId!: number | string;

  // 전송할 메시지 텍스트 (필수 필드)
  @ApiProperty({
    example: '안녕하세요!',
    description: '전송할 메시지 텍스트',
  })
  @IsString()
  text!: string;

  // 메시지 파싱 모드 (옵션얼 - Markdown, HTML 등)
  @ApiPropertyOptional({
    example: 'Markdown',
    description: '메시지 파싱 모드',
  })
  @IsString()
  @IsOptional()
  parse_mode?: string;

  // 키보드 마크업 (옵션얼 - 버튼 등 추가 UI)
  @ApiPropertyOptional({
    description: '키보드 마크업',
  })
  @IsOptional()
  reply_markup?: any;
}
