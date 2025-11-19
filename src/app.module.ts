import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { TelegramModule } from './modules/telegram/telegram.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { KakaoModule } from './modules/kakao/kakao.module';
import { OpenaiModule } from './modules/openai/openai.module';
import { GptModule } from './modules/gpt/gpt.module';
import { RelationshipModule } from './modules/relationship/relationship.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    KakaoModule,
    OpenaiModule,
    GptModule,
    RelationshipModule,
    TelegramModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
