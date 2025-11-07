# 구현 계획 (Implementation Plan)

> 최종 업데이트: 2025-11-06

## 🎯 프로젝트 목표

**"나처럼 답장하는 AI 챗봇"**
- 카카오톡 대화 히스토리를 학습하여 사용자의 말투를 모방
- 관계별로 적절한 어조와 격식 수준 자동 조정
- 텔레그램으로 수신한 메시지에 대해 AI가 추천 답변 제공

---

## 🏗️ 시스템 아키텍처

```
[프론트엔드]
    │
    ├─ 카카오톡 txt 업로드
    │   └→ POST /kakao/upload (파일 업로드)
    │
    ├─ 관계 설정
    │   └→ POST /relationships (관계 카테고리 선택)
    │
    └─ 실시간 메시지 처리
        └→ SSE /telegram/events (실시간 알림)
        └→ POST /telegram/generate-reply (AI 답변 생성)

[백엔드 - NestJS]
    │
    ├─ Auth Module (JWT 인증)
    ├─ Kakao Module (파일 파싱 & 저장)
    ├─ Telegram Module (봇 연동 & 메시지 관리)
    ├─ OpenAI Module (임베딩 & GPT)
    └─ Prisma Module (DB 접근)

[데이터베이스 - PostgreSQL + pgvector]
    │
    ├─ users (사용자 정보 + 인증)
    ├─ partners (대화 상대방)
    ├─ relationships (관계 설정)
    ├─ tone_samples (말투 학습 데이터 + 벡터)
    ├─ conversations (대화 세션)
    └─ messages (메시지 히스토리)

[외부 API]
    │
    ├─ Telegram Bot API (메시지 수신/발송)
    └─ OpenAI API (임베딩 + GPT)
```

---

## 📋 구현 Phase

### **Phase 1: 인증 시스템** 🔐
**우선순위:** 최고 (모든 기능의 기반)
**예상 시간:** 2-3시간

#### 1.1 DB 스키마 수정
```sql
ALTER TABLE users ADD COLUMN email VARCHAR(255) UNIQUE NOT NULL;
ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NOT NULL;
ALTER TABLE users ADD COLUMN refresh_token VARCHAR(500);
```

#### 1.2 NestJS 패키지 설치
```bash
npm install @nestjs/passport @nestjs/jwt passport passport-jwt bcrypt
npm install -D @types/passport-jwt @types/bcrypt
```

#### 1.3 Auth Module 구현
**파일 구조:**
```
src/modules/auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── dto/
│   ├── register.dto.ts
│   └── login.dto.ts
├── strategies/
│   └── jwt.strategy.ts
└── guards/
    └── jwt-auth.guard.ts
```

**API 엔드포인트:**
- `POST /auth/register` - 회원가입
  ```typescript
  Body: { username: string, email: string, password: string }
  Response: { user: User, access_token: string }
  ```

- `POST /auth/login` - 로그인
  ```typescript
  Body: { email: string, password: string }
  Response: { access_token: string, user: User }
  ```

- `GET /auth/me` - 현재 사용자 정보
  ```typescript
  Headers: { Authorization: "Bearer <token>" }
  Response: { user: User }
  ```

#### 1.4 JWT Guard 적용
```typescript
// 모든 컨트롤러에 적용
@UseGuards(JwtAuthGuard)
@Get('profile')
getProfile(@Request() req) {
  return req.user; // JWT에서 자동 추출된 사용자 정보
}
```

---

### **Phase 2: 카카오톡 업로드 기능** 📤
**우선순위:** 높음 (핵심 기능)
**예상 시간:** 3-4시간

#### 2.1 NestJS 패키지 설치
```bash
npm install @nestjs/platform-express multer
npm install -D @types/multer
```

#### 2.2 Kakao Module 구현
**파일 구조:**
```
src/modules/kakao/
├── kakao.module.ts
├── kakao.controller.ts
├── kakao.service.ts
├── dto/
│   └── upload-kakao.dto.ts
└── parsers/
    └── kakao-txt.parser.ts
```

#### 2.3 파싱 로직
**카카오톡 txt 형식:**
```
2024. 1. 15. 오후 3:45, 홍길동 : 안녕하세요
2024. 1. 15. 오후 3:46, 나 : 네 안녕하세요
```

**파서 구현:**
```typescript
// kakao-txt.parser.ts
export class KakaoTxtParser {
  private readonly messageRegex =
    /(\d{4}\.\s\d{1,2}\.\s\d{1,2})\.\s(오전|오후)\s(\d{1,2}:\d{2}),\s([^:]+)\s:\s(.+)/;

  parse(fileContent: string) {
    const lines = fileContent.split('\n');
    const messages = [];

    for (const line of lines) {
      const match = line.match(this.messageRegex);
      if (match) {
        const [_, date, period, time, sender, text] = match;
        messages.push({
          date,
          period,
          time,
          sender: sender.trim(),
          text: text.trim()
        });
      }
    }

    return messages;
  }

  filterMyMessages(messages: ParsedMessage[], myName: string = '나') {
    return messages.filter(msg => msg.sender === myName);
  }
}
```

#### 2.4 API 엔드포인트
```typescript
POST /kakao/upload
Headers: { Authorization: "Bearer <token>" }
Body (multipart/form-data):
  - file: File (txt)
  - partner_name: string
  - relationship_category: RelationshipCategory

Response: {
  partner_id: string,
  total_messages: number,
  my_messages_count: number,
  tone_samples_created: number
}
```

#### 2.5 DB 저장 플로우
```typescript
// kakao.service.ts
async uploadAndParse(userId: string, file: Buffer, partnerName: string, category: RelationshipCategory) {
  // 1. 파일 파싱
  const content = file.toString('utf-8');
  const messages = this.parser.parse(content);
  const myMessages = this.parser.filterMyMessages(messages);

  // 2. Partner 생성
  const partner = await this.prisma.partner.create({
    data: { name: partnerName }
  });

  // 3. Relationship 생성
  await this.prisma.relationship.create({
    data: {
      user_id: userId,
      partner_id: partner.id,
      category,
      politeness: this.getDefaultPoliteness(category),
      vibe: this.getDefaultVibe(category),
      emoji_level: this.getDefaultEmojiLevel(category)
    }
  });

  // 4. tone_samples 배치 저장
  await this.prisma.toneSample.createMany({
    data: myMessages.map(msg => ({
      user_id: userId,
      text: msg.text,
      category,
      politeness: this.getDefaultPoliteness(category),
      vibe: this.getDefaultVibe(category),
      // embedding은 나중에 배치로 생성
    }))
  });

  return {
    partner_id: partner.id,
    total_messages: messages.length,
    my_messages_count: myMessages.length,
    tone_samples_created: myMessages.length
  };
}
```

#### 2.6 임베딩 생성 (별도 API)
```typescript
POST /kakao/generate-embeddings
Headers: { Authorization: "Bearer <token>" }

Response: {
  processed: number,
  skipped: number (이미 임베딩 있는 것)
}
```

---

### **Phase 3: 텔레그램 DB 저장** 💾
**우선순위:** 높음
**예상 시간:** 2시간

#### 3.1 Telegram Service 수정
**변경 사항:**
```typescript
// 기존: 인메모리 저장
private receivedMessages: SavedMessage[] = [];

// 변경: DB 저장
async saveReceivedMessage(ctx: Context) {
  const userId = await this.getCurrentUserId(); // JWT 또는 설정

  // 1. Partner upsert
  const partner = await this.prisma.partner.upsert({
    where: { telegram_id: ctx.from.id.toString() },
    create: {
      name: ctx.from.first_name || ctx.from.username || 'Unknown',
      telegram_id: ctx.from.id.toString(),
    },
    update: {}
  });

  // 2. Relationship 확인
  const relationship = await this.prisma.relationship.findUnique({
    where: {
      user_id_partner_id: {
        user_id: userId,
        partner_id: partner.id
      }
    }
  });

  if (!relationship) {
    // SSE로 프론트엔드에 알림: "관계 설정 필요"
    this.messageEventSubject.next({
      type: 'relationship_required',
      partner_id: partner.id,
      partner_name: partner.name
    });
    return;
  }

  // 3. Conversation upsert
  const conversation = await this.prisma.conversation.upsert({
    where: {
      user_id_partner_id: {
        user_id: userId,
        partner_id: partner.id
      }
    },
    create: { user_id: userId, partner_id: partner.id },
    update: { updated_at: new Date() }
  });

  // 4. Message 저장
  const message = await this.prisma.message.create({
    data: {
      conversation_id: conversation.id,
      role: 'user', // 상대방이 보낸 메시지
      text: ctx.message.text
    }
  });

  // 5. SSE 이벤트 발송
  this.messageEventSubject.next({
    type: 'new_message',
    message_id: message.id,
    partner_id: partner.id,
    text: message.text
  });
}
```

---

### **Phase 4: OpenAI 통합** 🤖
**우선순위:** 중간
**예상 시간:** 3-4시간

#### 4.1 NestJS 패키지 설치
```bash
npm install openai
```

#### 4.2 OpenAI Module 구현
**파일 구조:**
```
src/modules/openai/
├── openai.module.ts
├── openai.service.ts
├── services/
│   ├── embedding.service.ts
│   └── gpt.service.ts
└── dto/
    └── generate-reply.dto.ts
```

#### 4.3 Embedding Service
```typescript
// embedding.service.ts
async generateEmbedding(text: string): Promise<number[]> {
  const response = await this.openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });

  return response.data[0].embedding;
}

async generateBatchEmbeddings(userId: string) {
  const samples = await this.prisma.toneSample.findMany({
    where: { user_id: userId, embedding: null }
  });

  for (const sample of samples) {
    const embedding = await this.generateEmbedding(sample.text);

    await this.prisma.$executeRaw`
      UPDATE tone_samples
      SET embedding = ${embedding}::vector
      WHERE id = ${sample.id}::uuid
    `;
  }

  return { processed: samples.length };
}
```

#### 4.4 GPT Service (RAG)
```typescript
// gpt.service.ts
async generateReply(partnerId: string, messageText: string, userId: string) {
  // 1. Relationship 조회
  const relationship = await this.prisma.relationship.findUnique({
    where: { user_id_partner_id: { user_id: userId, partner_id: partnerId } },
    include: { partner: true }
  });

  // 2. 메시지 임베딩 생성
  const queryEmbedding = await this.embeddingService.generateEmbedding(messageText);

  // 3. RAG 검색 (유사한 말투 샘플)
  const similarSamples = await this.prisma.$queryRaw`
    SELECT text,
           1 - (embedding <=> ${queryEmbedding}::vector) as similarity
    FROM tone_samples
    WHERE user_id = ${userId}::uuid
      AND category = ${relationship.category}::"RelationshipCategory"
    ORDER BY embedding <=> ${queryEmbedding}::vector
    LIMIT 5
  `;

  // 4. 대화 히스토리 조회
  const conversation = await this.prisma.conversation.findUnique({
    where: {
      user_id_partner_id: { user_id: userId, partner_id: partnerId }
    },
    include: {
      messages: {
        orderBy: { created_at: 'desc' },
        take: 10
      }
    }
  });

  // 5. GPT 프롬프트 생성
  const prompt = this.buildPrompt(
    messageText,
    relationship,
    similarSamples,
    conversation?.messages || []
  );

  // 6. GPT 호출
  const response = await this.openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: prompt.system },
      ...prompt.history,
      { role: 'user', content: messageText }
    ],
    temperature: 0.8,
    max_tokens: 200
  });

  const aiReply = response.choices[0].message.content;

  // 7. DB 저장
  await this.prisma.message.create({
    data: {
      conversation_id: conversation.id,
      role: 'assistant',
      text: aiReply
    }
  });

  return { reply: aiReply };
}

private buildPrompt(
  messageText: string,
  relationship: Relationship,
  similarSamples: any[],
  history: Message[]
) {
  const systemPrompt = `
당신은 사용자의 말투를 모방하는 AI입니다.

**관계 설정:**
- 상대방: ${relationship.partner.name}
- 관계: ${relationship.category}
- 존댓말 레벨: ${relationship.politeness}
- 분위기: ${relationship.vibe}
- 이모지 빈도: ${relationship.emoji_level}/3

**학습된 말투 예시:**
${similarSamples.map(s => `- "${s.text}"`).join('\n')}

**지시사항:**
1. 위 예시들과 비슷한 말투, 어조, 문체를 사용하세요.
2. 관계 설정에 맞는 존댓말/반말을 사용하세요.
3. 이모지 빈도를 지켜주세요.
4. 자연스럽고 간결하게 답변하세요.
`;

  const conversationHistory = history.reverse().map(msg => ({
    role: msg.role,
    content: msg.text
  }));

  return {
    system: systemPrompt,
    history: conversationHistory
  };
}
```

---

## 🗂️ DB 스키마 수정

### 필요한 변경사항

#### 1. users 테이블
```sql
ALTER TABLE users
ADD COLUMN email VARCHAR(255) UNIQUE NOT NULL DEFAULT 'temp@example.com',
ADD COLUMN password_hash VARCHAR(255) NOT NULL DEFAULT '',
ADD COLUMN refresh_token VARCHAR(500);

-- 기본값 제거 (마이그레이션 후)
ALTER TABLE users
ALTER COLUMN email DROP DEFAULT,
ALTER COLUMN password_hash DROP DEFAULT;
```

#### 2. Prisma 스키마 업데이트
```prisma
model User {
  id               String           @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  username         String           @unique @db.VarChar(50)
  email            String           @unique @db.VarChar(255)
  password_hash    String           @db.VarChar(255)
  refresh_token    String?          @db.VarChar(500)
  created_at       DateTime?        @default(now()) @db.Timestamp(6)
  // ... 나머지 관계
}
```

---

## 📊 API 엔드포인트 전체 목록

### Auth
- `POST /auth/register` - 회원가입
- `POST /auth/login` - 로그인
- `GET /auth/me` - 현재 사용자 정보

### Kakao
- `POST /kakao/upload` - 카카오톡 txt 업로드
- `POST /kakao/generate-embeddings` - 임베딩 배치 생성
- `GET /kakao/partners` - 업로드된 Partner 목록

### Telegram
- `GET /telegram/events` - SSE 실시간 알림
- `POST /telegram/generate-reply` - AI 답변 생성
- `POST /telegram/send-reply` - 선택한 답변 전송
- `GET /telegram/status` - 봇 상태 확인

### Relationships
- `GET /relationships` - 내 관계 목록
- `POST /relationships` - 새 관계 생성
- `PATCH /relationships/:id` - 관계 수정
- `DELETE /relationships/:id` - 관계 삭제

---

## 🧪 테스트 시나리오

### 1. 회원가입 → 로그인
```bash
# 회원가입
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"mingyu","email":"mingyu@test.com","password":"password123"}'

# 로그인
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"mingyu@test.com","password":"password123"}'

# 응답: { "access_token": "eyJhbGc..." }
```

### 2. 카카오톡 업로드
```bash
curl -X POST http://localhost:3000/kakao/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@kakao_홍길동.txt" \
  -F "partner_name=홍길동" \
  -F "relationship_category=FRIEND_CLOSE"
```

### 3. 임베딩 생성
```bash
curl -X POST http://localhost:3000/kakao/generate-embeddings \
  -H "Authorization: Bearer <token>"
```

### 4. 텔레그램 실시간 수신
```bash
# 브라우저 Console
const es = new EventSource('http://localhost:3000/telegram/events', {
  headers: { 'Authorization': 'Bearer <token>' }
});

es.onmessage = (e) => console.log(JSON.parse(e.data));
```

### 5. AI 답변 생성
```bash
curl -X POST http://localhost:3000/telegram/generate-reply \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"partner_id":"<uuid>","message_text":"오늘 뭐해?"}'
```

---

## 📦 필요한 NPM 패키지

```bash
# 인증
npm install @nestjs/passport @nestjs/jwt passport passport-jwt bcrypt
npm install -D @types/passport-jwt @types/bcrypt

# 파일 업로드
npm install @nestjs/platform-express multer
npm install -D @types/multer

# OpenAI
npm install openai

# 기타 (이미 설치됨)
# - @nestjs/config
# - @prisma/client
# - prisma
# - telegraf
# - rxjs
```

---

## 🚀 배포 고려사항

### 환경 변수 (.env)
```bash
# Database
DATABASE_URL=postgresql://admin:admin1234@localhost:5433/chatbot_db

# JWT
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# Telegram
TELEGRAM_BOT_TOKEN=your-bot-token

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key
```

### Docker Compose (프로덕션)
- PostgreSQL + pgvector
- NestJS 앱
- Nginx (프론트엔드 서빙)

---

## 📈 성능 최적화

### 1. 임베딩 생성 최적화
- 배치 처리 (한 번에 100개씩)
- 큐 시스템 (BullMQ) 고려

### 2. RAG 검색 최적화
- HNSW 인덱스 이미 적용됨
- 필터링 최소화 (category 인덱스 활용)

### 3. 캐싱
- Redis 도입 고려 (Relationship 캐싱)

---

## 🎯 다음 액션

1. **DB 스키마 수정** (users 테이블 - email, password_hash 추가)
2. **Auth Module 구현** (JWT 인증)
3. **Kakao Module 구현** (파일 업로드 + 파싱)
4. **Telegram Service 수정** (DB 저장)
5. **OpenAI Module 구현** (임베딩 + GPT)

**추정 총 개발 시간:** 12-15시간
