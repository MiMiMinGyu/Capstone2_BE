import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: '사용자 이름',
    example: '김민규',
  })
  @IsString()
  @IsOptional()
  name?: string;
}
