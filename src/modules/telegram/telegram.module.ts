import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';
import { GptModule } from '../gpt/gpt.module';

@Module({
  imports: [GptModule],
  providers: [TelegramService],
  controllers: [TelegramController],
})
export class TelegramModule {}
