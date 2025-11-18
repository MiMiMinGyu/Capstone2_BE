import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { OpenaiModule } from '../openai/openai.module';
import { GptController } from './gpt.controller';
import { GptService } from './gpt.service';

@Module({
  imports: [PrismaModule, OpenaiModule],
  controllers: [GptController],
  providers: [GptService],
  exports: [GptService],
})
export class GptModule {}
