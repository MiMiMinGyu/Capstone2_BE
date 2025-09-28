# 다음 작업 계획 및 개선사항

## 🎯 **현재 상태 요약**

### ✅ **완료된 기능들**
- [x] 텔레그램 봇 기본 구조 (풀링 방식)
- [x] 메시지 수신 및 저장 (인메모리)
- [x] RESTful API 4개 엔드포인트
- [x] AI 추천 답변 시뮬레이션 (3개 옵션)
- [x] 완전한 타입 안전성 (TypeScript)
- [x] Swagger API 문서화
- [x] ESLint 규칙 준수

### 📁 **프로젝트 구조**
```
src/
├── modules/
│   └── telegram/
│       ├── dto/                    # 요청/응답 DTO
│       │   ├── send-message.dto.ts
│       │   ├── message-reply.dto.ts
│       │   └── index.ts
│       ├── interfaces/             # 타입 정의
│       │   ├── telegram-message.interface.ts
│       │   └── index.ts
│       ├── telegram.controller.ts  # REST API 엔드포인트
│       ├── telegram.service.ts     # 비즈니스 로직
│       └── telegram.module.ts      # 모듈 설정
├── app.module.ts                   # 메인 모듈
└── main.ts                         # 서버 진입점 (Swagger 설정)
```

---

## 🚀 **우선순위 높은 다음 작업들**

### **1. Flask AI 서버 연동 (최우선)**
```typescript
// 현재: 시뮬레이션
private async getAIRecommendation(text: string): Promise<string[]> {
  // 하드코딩된 응답들
}

// 목표: 실제 AI 서버 연동
private async getAIRecommendation(text: string): Promise<string[]> {
  const response = await fetch('http://flask-ai-server:5000/recommend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: text, userId: 'user123' })
  });
  return await response.json();
}
```

**작업 내용:**
- HTTP 클라이언트 설정 (axios 추천)
- AI 서버 API 스펙 확인 후 연동
- 에러 처리 및 fallback 로직 구현
- 환경변수로 AI 서버 URL 관리

### **2. 데이터베이스 연동**
**현재 문제점:** 서버 재시작 시 모든 메시지 손실

**권장 DB:** PostgreSQL + TypeORM

```bash
npm install @nestjs/typeorm typeorm pg @types/pg
```

**Entity 예시:**
```typescript
@Entity()
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  telegramMessageId: number;

  @Column('jsonb')
  fromUser: TelegramUser;

  @Column('jsonb')
  chat: TelegramChat;

  @Column()
  text: string;

  @Column('jsonb', { default: [] })
  aiRecommendations: string[];

  @Column({ default: false })
  replied: boolean;

  @Column({ nullable: true })
  selectedReply: string;

  @CreateDateColumn()
  createdAt: Date;
}
```

### **3. 실시간 업데이트 (WebSocket)**
**현재 문제점:** 프론트엔드에서 폴링으로 새 메시지 확인

```bash
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
```

**WebSocket Gateway 구현:**
```typescript
@WebSocketGateway({ cors: true })
export class TelegramGateway {
  @WebSocketServer()
  server: Server;

  // 새 메시지 수신 시 프론트엔드에 실시간 전송
  broadcastNewMessage(message: SavedMessage) {
    this.server.emit('newMessage', message);
  }
}
```

### **4. 사용자 인증 및 권한 관리**
```bash
npm install @nestjs/passport passport passport-jwt @nestjs/jwt
```

**현재:** 누구나 API 접근 가능  
**목표:** JWT 토큰 기반 인증

---

## 🔧 **중간 우선순위 개선사항**

### **5. 환경별 설정 관리**
```typescript
// config/configuration.ts
export default () => ({
  database: {
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
  },
  ai: {
    serverUrl: process.env.AI_SERVER_URL,
    apiKey: process.env.AI_API_KEY,
  },
});
```

### **6. 로깅 시스템 개선**
```bash
npm install winston nest-winston
```

### **7. 메시지 필터링 및 검색**
- 날짜별 메시지 조회
- 답장 완료/미완료 필터링
- 텍스트 검색 기능

### **8. AI 추천 답변 개선**
- 사용자별 학습된 말투 적용
- 대화 맥락 고려
- 감정 분석 기반 답변 생성

---

## 🛡️ **보안 및 안정성 개선**

### **9. 입력 검증 강화**
```typescript
// DTO에 더 엄격한 검증 추가
export class SendMessageDto {
  @IsString()
  @Length(1, 4096) // 텔레그램 메시지 길이 제한
  @IsNotEmpty()
  text!: string;

  @IsNumber()
  @IsPositive()
  chatId!: number;
}
```

### **10. 에러 처리 개선**
```typescript
// Custom Exception Filter
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    // 상세한 에러 로깅 및 사용자 친화적 응답
  }
}
```

### **11. Rate Limiting**
```bash
npm install @nestjs/throttler
```

---

## 📊 **성능 최적화**

### **12. 캐싱 구현**
```bash
npm install @nestjs/cache-manager cache-manager
```

- AI 추천 결과 캐싱
- 자주 조회되는 메시지 캐싱

### **13. 페이지네이션**
```typescript
@Get('messages')
async getMessages(
  @Query('page') page: number = 1,
  @Query('limit') limit: number = 20,
) {
  // 페이지네이션 로직
}
```

---

## 🧪 **테스트 구현**

### **14. 단위 테스트**
```bash
npm run test
```

### **15. E2E 테스트**
```bash
npm run test:e2e
```

**테스트 케이스:**
- 메시지 수신 및 저장
- AI 추천 생성
- 답변 전송
- 에러 상황 처리

---

## 🚀 **배포 준비**

### **16. Docker 설정**
```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start:prod"]
```

### **17. CI/CD 파이프라인**
- GitHub Actions 설정
- 자동 테스트 및 배포

---

## 📱 **프론트엔드 지원 기능**

### **18. CORS 설정 개선**
```typescript
app.enableCors({
  origin: [
    'http://localhost:3000',  // 개발환경
    'https://yourdomain.com', // 프로덕션
  ],
  credentials: true,
});
```

### **19. API 버전 관리**
```typescript
@Controller({ version: '1', path: 'telegram' })
export class TelegramController {
  // v1 API
}
```

---

## 🔄 **즉시 시작 가능한 작업 순서**

1. **Flask AI 서버 연동** (가장 중요)
2. **PostgreSQL 데이터베이스 설정**
3. **WebSocket 실시간 업데이트**
4. **사용자 인증 시스템**
5. **프론트엔드 개발 시작**

---

## 💡 **새 클로드 세션 시작 시 참고사항**

### **프로젝트 파악을 위한 체크리스트:**
1. `package.json` 확인 - 설치된 패키지들
2. `.env.development` 확인 - 환경 변수 설정
3. `src/modules/telegram/` 폴더 구조 파악
4. `FRONTEND_INTEGRATION.md` 읽기 - API 스펙 이해
5. `http://localhost:3000/api` 접속 - Swagger 문서 확인

### **주요 명령어:**
```bash
npm run start:dev    # 개발 서버 실행
npm run build       # 빌드 테스트
npm run test        # 테스트 실행
```

### **핵심 파일들:**
- `src/modules/telegram/telegram.service.ts` - 메인 비즈니스 로직
- `src/modules/telegram/telegram.controller.ts` - API 엔드포인트
- `src/modules/telegram/interfaces/telegram-message.interface.ts` - 타입 정의

**이 문서를 기반으로 다음 작업을 체계적으로 진행할 수 있습니다.**