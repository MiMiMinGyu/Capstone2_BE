import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';
import { LlmModule } from '../llm/llm.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [LlmModule, AuthModule],
  providers: [TelegramService],
  controllers: [TelegramController],
})
export class TelegramModule {}
