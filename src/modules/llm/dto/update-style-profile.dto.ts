import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateStyleProfileDto {
  @ApiProperty({
    description: '사용자 정의 말투 지침',
    example:
      '- 비속어와 욕설을 사용하지 않음\n- 느낌표(!)를 거의 사용하지 않음\n- ㄷㄷ, ~, ㅋㅋㅋㅋ(연속 4개 이상) 사용 자제\n- 친구들에게는 반말, 선배에게는 존댓말\n- 짧고 간결한 문장 선호',
    required: false,
  })
  @IsOptional()
  @IsString()
  customGuidelines?: string;
}
