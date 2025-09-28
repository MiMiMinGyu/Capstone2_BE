import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 전역 유효성 검증 파이프 설정 (DTO 검증용)
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Swagger 설정 - API 문서화를 위해 추가
  const config = new DocumentBuilder()
    .setTitle('LikeMe API')
    .setDescription('AI 답변 추천 서비스 API')
    .setVersion('1.0')
    .addTag('telegram', '텔레그램 봇 관련 API')
    .build();

  // Swagger 문서 생성 및 /api 경로에 설정
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3000);

  // 서버 시작 확인 메시지 (디버깅 및 접근성 향상을 위해 추가)
  console.log(
    `🚀 Server running on http://localhost:${process.env.PORT || 3000}`,
  );
  console.log(
    `📚 Swagger docs available at http://localhost:${process.env.PORT || 3000}/api`,
  );
}
void bootstrap();
