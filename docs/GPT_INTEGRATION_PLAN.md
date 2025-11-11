# GPT 통합 계획 (FastAPI → NestJS)

> 최종 업데이트: 2025-11-11 15:30

## 📋 개요

AI 팀으로부터 받은 FastAPI 기반 GPT 코드를 NestJS 백엔드에 통합하는 계획 문서입니다.

### 현재 상황
- ✅ AI 팀이 FastAPI로 GPT 프롬프트 로직 구현 완료 ([app.py](../app.py))
- ✅ NestJS에 DB 스키마 구축 완료 (tone_samples, relationships 등)
- ✅ Telegram 봇 연동 완료 (메시지 수신/저장)
- ⏳ 임베딩 생성 미구현
- ⏳ GPT 통합 미구현

### 통합 방향
**FastAPI를 별도 서버로 운영하지 않고, NestJS에 직접 통합**

**이유:**
1. DB 데이터가 이미 NestJS에 있음 (tone_samples, relationships)
2. 임베딩 생성도 NestJS에서 진행 예정
3. Telegram 연동도 NestJS에 구현됨
4. 별도 서버 운영 시 복잡도 증가 (배포, 관리)
5. AI 팀 요구사항(임베딩 유사도 검색)을 충족하려면 DB 필요

---

## 🔍 AI 팀 FastAPI 코드 분석

### 파일 정보
- **파일명**: `app.py`
- **프레임워크**: FastAPI
- **포트**: 8000
- **실행 명령**: `uvicorn app:app --reload`

### 주요 기능

#### 1. 카카오톡 텍스트 파싱
```python
def parse_kakao_text(file_content: str, target_name: str):
    """카카오톡 txt 대화 내용에서 target_name 사용자의 발화를 추출"""
    pattern = r'\[(?P<name>[^\]]+)\] \[(?P<time>[^\]]+)\] (?P<message>.+)'
    # ...
```
- **목적**: 업로드된 카카오톡 파일에서 특정 사용자의 발화만 추출
- **NestJS 상태**: ✅ 이미 구현됨 ([kakao-txt.parser.ts](../src/modules/kakao/parsers/kakao-txt.parser.ts))
- **통합 필요 여부**: ❌ 불필요 (NestJS 파서가 더 정교함)

#### 2. GPT 답변 생성 API
```python
@app.post("/generate")
async def generate_reply(
    file: UploadFile,
    target_name: str = Form(...),
    receiver: str = Form(...),
    message: str = Form(...)
):
```

**입력 파라미터:**
- `file`: 카카오톡 txt 파일 (매번 업로드)
- `target_name`: 화자 이름 (말투 모방 대상)
- `receiver`: 수신자 이름 (관계 정보)
- `message`: 입력 메시지

**처리 흐름:**
1. 카카오톡 파일 파싱
2. `target_name`의 발화 추출
3. 최근 300개 메시지를 프로필로 사용
4. GPT에 프롬프트 전송
5. 답변 생성 (짧게, 2-3문장)

**문제점:**
- ❌ DB 미사용 (매번 파일 업로드)
- ❌ 임베딩 유사도 검색 없음
- ❌ Relationships 테이블 미활용
- ❌ OpenAI API 키 하드코딩

#### 3. GPT 프롬프트 구조

**System Prompt:**
```python
f"너는 사용자 '{target_name}'의 말투를 모방하는 AI야. 반드시 주어진 말투 특징과 대화 상대의 관계를 반영해야 해.\n"
f"아래 대화록은 {target_name}의 실제 말투 예시야."
f"{target_name}의 문장 리듬, 감탄사, 억양, 말끝, 문장 길이를 세밀하게 분석해 그대로 반영해."
f"하지만 답변은 자연스럽고 짧게, 최대 두 문장에서 세 문장 이내로 핵심만 말해."
f"특히 단어 선택, 욕설/사투리, 감정 표현을 그대로 모방해야 해.\n\n"
f"{profile_text}\n\n"
f"현재 대화 상대는 {receiver}야. 대화 상대에 따라 문체를 전환하지만, 항상 {target_name}의 말투로.\n\n"
```

**User Prompt:**
```python
f"{receiver}: {message}"
```

**GPT 설정:**
- 모델: `gpt-4o-mini`
- Temperature: `0.7` (적당한 창의성)
- Max Tokens: `60` (짧은 답변 강제)

---

## 🎯 AI 팀 요구사항 vs 현재 구현

### AI 팀이 제시한 GPT 프롬프트 구조

```
GPT 프롬프트 입력 = {
  recent_context: 최근 대화 5개 (무조건 포함),
  similar_context: 임베딩 기반 유사 발화 top 3 (맥락 참고용),
  style_profile: 사용자 고유 말투 프로필 (txt),
  receiver: 상대방 정보 (존댓말/반말 등)
}
```

### 현재 NestJS 구현 상태

| 요구사항 | NestJS 구현 상태 | 설명 |
|---------|----------------|------|
| **recent_context** | ✅ 구현됨 | `getConversationMessages()` - 최근 N개 메시지 조회 |
| **similar_context** | ⏳ 미구현 | Phase 3 필요 (임베딩 생성 → pgvector 유사도 검색) |
| **style_profile** | ❓ 불명확 | AI 팀이 "txt 파일"이라고 언급, 구체적 구현 방법 미정 |
| **receiver** | ✅ 구현됨 | `relationships` 테이블 (category, politeness, vibe) |

### FastAPI app.py와의 차이점

| 항목 | FastAPI (app.py) | NestJS (현재) | 통합 후 |
|-----|-----------------|--------------|---------|
| **recent_context** | 최근 300개 (파일에서 파싱) | DB에서 조회 가능 | ✅ DB 기반 조회 |
| **similar_context** | ❌ 없음 | ⏳ 임베딩 필요 | ✅ pgvector 유사도 검색 |
| **style_profile** | 최근 300개 메시지 문자열 | ❓ 방법 미정 | ⚠️ AI 팀과 협의 필요 |
| **receiver** | 문자열만 (관계 정보 없음) | relationships 테이블 | ✅ DB 기반 관계 정보 |

---

## 📐 통합 아키텍처

### 최종 구조

```
┌─────────────────────────────────────────────────────────────┐
│                      NestJS Backend                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Telegram   │  │    Kakao     │  │     Auth     │      │
│  │   Controller │  │  Controller  │  │  Controller  │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                  │               │
│         v                 v                  v               │
│  ┌──────────────────────────────────────────────────┐       │
│  │              GptService (NEW!)                   │       │
│  │  - generateReply(userId, partnerId, message)     │       │
│  │  - buildPrompt(recent, similar, profile, receiver)│      │
│  └──────────────────────────────────────────────────┘       │
│         │                                                    │
│         v                                                    │
│  ┌──────────────────────────────────────────────────┐       │
│  │            OpenAI Module (NEW!)                  │       │
│  │  - createEmbedding(text)                         │       │
│  │  - generateChatCompletion(messages)              │       │
│  └──────────────────────────────────────────────────┘       │
│         │                                                    │
│         v                                                    │
│  ┌──────────────────────────────────────────────────┐       │
│  │              Prisma Service                      │       │
│  │  - tone_samples (with embeddings)                │       │
│  │  - relationships                                 │       │
│  │  - conversations, messages                       │       │
│  └──────────────────────────────────────────────────┘       │
│         │                                                    │
└─────────┼────────────────────────────────────────────────────┘
          v
┌─────────────────────────────────────────────────────────────┐
│            PostgreSQL 16 + pgvector 0.5.1                   │
│  - tone_samples.embedding (vector(1536))                    │
│  - HNSW 인덱스로 고속 유사도 검색                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ 구현 계획

### Phase 1: OpenAI 모듈 생성 (기반 작업)

**목표**: OpenAI API 연동 기반 구축

**작업 항목:**
1. OpenAI SDK 설치
   ```bash
   npm install openai
   ```

2. 환경 변수 설정
   ```bash
   # .env
   OPENAI_API_KEY=sk-proj-...
   ```

3. OpenAI Module 생성
   ```
   src/modules/openai/
   ├── openai.module.ts
   ├── openai.service.ts
   └── interfaces/
       └── openai.interface.ts
   ```

4. OpenAI Service 구현
   - `createEmbedding(text: string): Promise<number[]>` - 임베딩 생성
   - `generateChatCompletion(messages: Message[]): Promise<string>` - GPT 답변 생성

**예상 소요 시간**: 30분

---

### Phase 2: 임베딩 생성 (Phase 3)

**목표**: tone_samples의 텍스트를 임베딩으로 변환하여 DB 저장

**작업 항목:**
1. Embedding Service 메서드 추가 (OpenaiService)
   - `generateEmbeddings(texts: string[]): Promise<number[][]>` - 배치 임베딩

2. Kakao Service에 임베딩 생성 엔드포인트 추가
   - `POST /kakao/generate-embeddings` - 전체 tone_samples 임베딩 생성
   - 진행 상황 반환 (processed / total)

3. DB 저장 로직
   ```typescript
   await this.prisma.$executeRaw`
     UPDATE tone_samples
     SET embedding = ${embeddingVector}::vector
     WHERE id = ${id}
   `;
   ```

4. 배치 처리
   - 100개씩 묶어서 처리 (OpenAI API 제한)
   - 에러 처리 및 재시도 로직

**예상 소요 시간**: 1시간

---

### Phase 3: GPT Service 구현 (핵심)

**목표**: FastAPI의 GPT 로직을 NestJS로 포팅

**작업 항목:**

#### 3.1 GPT Module 생성
```
src/modules/gpt/
├── gpt.module.ts
├── gpt.controller.ts
├── gpt.service.ts
├── dto/
│   ├── generate-reply.dto.ts
│   └── index.ts
└── interfaces/
    ├── gpt-context.interface.ts
    └── index.ts
```

#### 3.2 GptService 메서드 구현

**1) `generateReply()` - 메인 메서드**
```typescript
async generateReply(
  userId: string,
  partnerId: string,
  message: string,
): Promise<string> {
  // 1. recent_context: 최근 대화 5개
  const recentMessages = await this.getRecentContext(userId, partnerId, 5);

  // 2. similar_context: 임베딩 유사도 top 3
  const similarMessages = await this.getSimilarContext(userId, message, 3);

  // 3. style_profile: 사용자 말투 프로필
  const styleProfile = await this.getStyleProfile(userId);

  // 4. receiver: 상대방 관계 정보
  const receiver = await this.getReceiverInfo(userId, partnerId);

  // 5. 프롬프트 구성
  const prompt = this.buildPrompt({
    recentMessages,
    similarMessages,
    styleProfile,
    receiver,
    message,
  });

  // 6. GPT 호출
  return this.openai.generateChatCompletion(prompt);
}
```

**2) `getRecentContext()` - 최근 대화 조회**
```typescript
async getRecentContext(
  userId: string,
  partnerId: string,
  limit: number,
): Promise<Message[]> {
  const conversation = await this.prisma.conversation.findUnique({
    where: {
      user_id_partner_id: { user_id: userId, partner_id: partnerId },
    },
  });

  return this.prisma.message.findMany({
    where: { conversation_id: conversation.id },
    orderBy: { created_at: 'desc' },
    take: limit,
  });
}
```

**3) `getSimilarContext()` - 임베딩 유사도 검색**
```typescript
async getSimilarContext(
  userId: string,
  message: string,
  limit: number,
): Promise<ToneSample[]> {
  // 1. 입력 메시지 임베딩 생성
  const embedding = await this.openai.createEmbedding(message);

  // 2. pgvector 유사도 검색 (cosine distance)
  const similar = await this.prisma.$queryRaw`
    SELECT id, text, category, politeness, vibe
    FROM tone_samples
    WHERE user_id = ${userId}
    ORDER BY embedding <=> ${embedding}::vector
    LIMIT ${limit}
  `;

  return similar;
}
```

**4) `getStyleProfile()` - 말투 프로필 조회**
```typescript
async getStyleProfile(userId: string): Promise<string> {
  // Option 1: style_profiles 테이블에서 가져오기 (AI 팀 요구사항 확인 필요)
  const profile = await this.prisma.styleProfile.findUnique({
    where: { user_id: userId },
  });

  if (profile?.profile_text) {
    return profile.profile_text;
  }

  // Option 2: tone_samples에서 최근 N개 가져오기 (FastAPI 방식)
  const samples = await this.prisma.toneSample.findMany({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' },
    take: 300,
    select: { text: true },
  });

  return samples.map(s => s.text).join('\n');
}
```

**5) `getReceiverInfo()` - 상대방 관계 정보**
```typescript
async getReceiverInfo(
  userId: string,
  partnerId: string,
): Promise<ReceiverInfo> {
  const relationship = await this.prisma.relationship.findUnique({
    where: {
      user_id_partner_id: { user_id: userId, partner_id: partnerId },
    },
    include: { partner: true },
  });

  return {
    name: relationship.partner.name,
    category: relationship.category,
    politeness: relationship.politeness,
    vibe: relationship.vibe,
  };
}
```

**6) `buildPrompt()` - 프롬프트 구성**
```typescript
buildPrompt(context: GptContext): ChatMessage[] {
  const {
    recentMessages,
    similarMessages,
    styleProfile,
    receiver,
    message,
  } = context;

  // System Prompt (FastAPI 참고)
  const systemContent = `
너는 사용자의 말투를 모방하는 AI야. 반드시 주어진 말투 특징과 대화 상대의 관계를 반영해야 해.

아래는 사용자의 실제 말투 예시야. 문장 리듬, 감탄사, 억양, 말끝, 문장 길이를 세밀하게 분석해 그대로 반영해.
하지만 답변은 자연스럽고 짧게, 최대 두 문장에서 세 문장 이내로 핵심만 말해. 불필요한 반복이나 긴 설명은 하지 마.
특히 단어 선택, 욕설/사투리, 감정 표현을 그대로 모방해야 해.

[말투 프로필]
${styleProfile}

[유사한 발화 예시] (참고용)
${similarMessages.map(s => s.text).join('\n')}

현재 대화 상대는 ${receiver.name}야.
관계: ${receiver.category}
말투: ${receiver.politeness}
분위기: ${receiver.vibe}

[최근 대화 맥락]
${recentMessages.map(m => `${m.role}: ${m.text}`).join('\n')}
`;

  // User Prompt
  const userContent = `${receiver.name}: ${message}`;

  return [
    { role: 'system', content: systemContent },
    { role: 'user', content: userContent },
  ];
}
```

#### 3.3 GPT Controller 구현

```typescript
@Controller('gpt')
@ApiTags('GPT')
@UseGuards(JwtAuthGuard)
export class GptController {
  constructor(private readonly gpt: GptService) {}

  @Post('generate')
  @ApiOperation({ summary: 'GPT 답변 생성' })
  async generateReply(
    @Req() req: RequestWithUser,
    @Body() dto: GenerateReplyDto,
  ) {
    const userId = req.user.userId;
    const reply = await this.gpt.generateReply(
      userId,
      dto.partner_id,
      dto.message,
    );
    return { reply };
  }
}
```

#### 3.4 DTO 정의

```typescript
// generate-reply.dto.ts
export class GenerateReplyDto {
  @IsUUID()
  @ApiProperty({ description: '대화 상대 ID' })
  partner_id: string;

  @IsString()
  @MinLength(1)
  @ApiProperty({ description: '입력 메시지' })
  message: string;
}
```

**예상 소요 시간**: 2-3시간

---

### Phase 4: Telegram 통합

**목표**: Telegram 메시지 수신 시 자동으로 GPT 답변 생성

**작업 항목:**

1. TelegramService에 GPT 연동
   ```typescript
   async handleReceivedMessage(message: TelegramMessage) {
     // 1. DB 저장 (기존 로직)
     await this.saveReceivedMessage(message);

     // 2. GPT 답변 생성 (NEW!)
     const reply = await this.gpt.generateReply(
       this.defaultUserId,
       partner.id,
       message.text,
     );

     // 3. SSE로 추천 답변 전송
     this.messageSubject.next({
       partnerId: partner.id,
       partnerName: partner.name,
       message: message.text,
       suggestedReplies: [reply], // AI 생성 답변
     });
   }
   ```

2. 답변 전송 API 수정
   - 기존: 인메모리에서 답변 조회
   - 변경: DB에서 대화 내역 조회 → GPT 호출 → 답변 생성

**예상 소요 시간**: 1시간

---

## 📊 비교: FastAPI vs NestJS 통합

| 기능 | FastAPI (app.py) | NestJS 통합 후 |
|-----|-----------------|---------------|
| **데이터 소스** | 매번 파일 업로드 | DB (tone_samples) |
| **recent_context** | 파일의 최근 300개 | DB의 최근 N개 (동적) |
| **similar_context** | ❌ 없음 | ✅ pgvector 유사도 검색 |
| **style_profile** | 최근 300개 메시지 문자열 | DB 또는 style_profiles 테이블 |
| **receiver** | 문자열만 | relationships 테이블 (상세 정보) |
| **임베딩** | ❌ 없음 | ✅ OpenAI API 연동 |
| **보안** | API 키 하드코딩 | 환경변수 (.env) |
| **배포** | 별도 서버 (포트 8000) | 단일 서버 (포트 3000) |
| **Telegram 연동** | ❌ 없음 | ✅ 자동 답변 생성 |

---

## 🔄 작업 순서 (우선순위)

### 1단계: OpenAI 모듈 (기반) ⭐⭐⭐
- OpenAI SDK 설치
- OpenaiService 구현 (임베딩, GPT)
- 환경변수 설정

### 2단계: 임베딩 생성 (Phase 3) ⭐⭐⭐
- tone_samples 임베딩 배치 생성
- pgvector 유사도 검색 테스트

### 3단계: GPT Service 구현 ⭐⭐⭐
- GptService 메서드 구현
- 프롬프트 구성 로직
- API 엔드포인트 추가

### 4단계: Telegram 통합 ⭐⭐
- 자동 답변 생성 연동
- SSE 추천 답변 전송

### 5단계: 테스트 및 최적화 ⭐
- E2E 테스트
- 프롬프트 튜닝
- 성능 최적화

---

## ⚠️ 주의사항 및 남은 질문

### AI 팀과 협의 필요 사항

1. **style_profile 구현 방법**
   - FastAPI: 최근 300개 메시지를 문자열로 연결
   - AI 팀 요구: "txt 파일"
   - **질문**: `style_profiles` 테이블을 사용할 것인가? 아니면 tone_samples에서 동적으로 가져올 것인가?

2. **임베딩 대상**
   - 현재: tone_samples만 임베딩 생성 예정
   - **질문**: messages 테이블도 임베딩이 필요한가? (message_embeddings 테이블 존재)

3. **GPT 모델 선택**
   - FastAPI: `gpt-4o-mini` (저렴, 빠름)
   - **질문**: 계속 mini 모델 사용? 아니면 gpt-4o?

### 보안 이슈

- ⚠️ **FastAPI의 OpenAI API 키가 코드에 하드코딩됨**
- 해당 키는 즉시 폐기하고 환경변수로 관리 필요
- NestJS에서는 `.env` 파일로 관리 (Git에 포함 안 됨)

---

## 📈 예상 비용 (OpenAI API)

### 임베딩 생성
- 모델: `text-embedding-3-small`
- 비용: **$0.02 / 1M tokens**
- 예상: 3,000개 메시지 (평균 50 토큰) = 150,000 tokens
- **비용**: $0.003 (약 4원) ← 매우 저렴!

### GPT 답변 생성
- 모델: `gpt-4o-mini`
- 입력: **$0.15 / 1M tokens**
- 출력: **$0.60 / 1M tokens**
- 1회 답변 예상 비용:
  - 입력: 1,000 tokens (프롬프트) → $0.00015
  - 출력: 60 tokens (답변) → $0.000036
  - **합계**: $0.000186 (약 0.25원/회)

**월 예상 비용 (1,000회 답변):**
- 1,000회 × $0.000186 = **$0.186** (약 250원)
- 매우 저렴하므로 비용 걱정 없음!

---

## 📚 참고 문서

- [FastAPI 원본 코드](../app.py)
- [CURRENT_STATUS.md](./CURRENT_STATUS.md) - 프로젝트 현재 상태
- [DB_SCHEMA.md](./DB_SCHEMA.md) - DB 스키마 상세
- [CHANGELOG.md](./CHANGELOG.md) - 변경 이력
- [OpenAI API 문서](https://platform.openai.com/docs/api-reference)

---

## ✅ 다음 액션 아이템

1. **지금 바로**: Phase 1 (OpenAI 모듈) 시작
2. **OpenAI 완료 후**: Phase 2 (임베딩 생성)
3. **임베딩 완료 후**: Phase 3 (GPT Service)
4. **GPT 완료 후**: Phase 4 (Telegram 통합)

**첫 작업: OpenAI Module 생성부터 시작할까요?**
