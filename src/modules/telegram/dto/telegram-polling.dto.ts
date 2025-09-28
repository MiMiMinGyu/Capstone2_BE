import {
  IsNumber,
  IsString,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TelegramUserDto {
  @IsNumber()
  id!: number;

  @IsString()
  first_name!: string;

  @IsString()
  @IsOptional()
  last_name?: string;

  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  language_code?: string;
}

export class TelegramChatDto {
  @IsNumber()
  id!: number;

  @IsString()
  type!: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  first_name?: string;

  @IsString()
  @IsOptional()
  last_name?: string;
}

export class TelegramMessageDto {
  @IsNumber()
  message_id!: number;

  @IsNumber()
  date!: number;

  @ValidateNested()
  @Type(() => TelegramUserDto)
  from!: TelegramUserDto;

  @ValidateNested()
  @Type(() => TelegramChatDto)
  chat!: TelegramChatDto;

  @IsString()
  @IsOptional()
  text?: string;
}

export class TelegramPollingDto {
  @IsNumber()
  update_id!: number;

  @ValidateNested()
  @Type(() => TelegramMessageDto)
  @IsOptional()
  message?: TelegramMessageDto;
}
