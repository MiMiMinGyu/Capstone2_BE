import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';
import { GptModule } from '../gpt/gpt.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [GptModule, AuthModule],
  providers: [TelegramService],
  controllers: [TelegramController],
})
export class TelegramModule {}
