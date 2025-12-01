# LikeMe AI 챗봇 프로젝트 기능 요약

> **작성일**: 2025-01-30
> **목적**: 프로젝트 보고서 작성용 기능 목록 및 구현 내역 정리

---

## 📋 목차

1. [프로젝트 개요](#프로젝트-개요)
2. [핵심 기능](#핵심-기능)
3. [기술 스택](#기술-스택)
4. [주요 모듈별 구현 내역](#주요-모듈별-구현-내역)
5. [LLM 답변 생성 시스템](#llm-답변-생성-시스템)
6. [데이터베이스 스키마](#데이터베이스-스키마)
7. [성능 최적화](#성능-최적화)
8. [보안 및 인증](#보안-및-인증)

---

## 프로젝트 개요

### 프로젝트명

**LikeMe AI 챗봇 백엔드**

### 프로젝트 목적

사용자의 실제 말투를 학습하여, 대화 상대와의 관계에 따라 적절한 톤(말투, 격식, 이모지)으로 자동 답변을 생성하는 AI 챗봇 시스템

### 핵심 가치

- **개인화된 말투 학습**: 사용자의 2,000+ 대화 샘플 분석
- **관계 기반 맞춤 응답**: 10개 관계 카테고리별 자동 톤 조정
- **실시간 메시징**: Telegram 봇 연동 및 SSE 실시간 알림

---

## 핵심 기능

### 1. 관계 기반 말투 조정 시스템

**10개 관계 카테고리**:

| 카테고리                 | 대상        | 말투 특징            | 이모지 레벨 |
| ------------------------ | ----------- | -------------------- | ----------- |
| `FAMILY_ELDER_CLOSE`     | 부모/조부모 | 친근 존댓말 (-요)    | 0~1         |
| `FAMILY_SIBLING_ELDER`   | 형/누나     | 반말 중심, -요 혼용  | 1~2         |
| `FAMILY_SIBLING_YOUNGER` | 동생        | 부드러운 반말        | 1~2         |
| `PARTNER_INTIMATE`       | 연인/배우자 | 다정한 반말          | 2~3         |
| `FRIEND_CLOSE`           | 친한 친구   | 반말, 구어 허용      | 1~2         |
| `ACQUAINTANCE_CASUAL`    | 가벼운 지인 | 캐주얼 존댓말 (-요)  | 0~1         |
| `WORK_SENIOR_FORMAL`     | 상사/교수   | 격식 존대 (-습니다)  | 0           |
| `WORK_SENIOR_FRIENDLY`   | 선배/멘토   | 존댓말 (-요), 캐주얼 | 0~1         |
| `WORK_PEER`              | 동료/협업자 | 존댓말 (-요), 간결   | 0~1         |
| `WORK_JUNIOR`            | 후배/팀원   | 존댓말 (-요) 권장    | 0~1         |

**관계 설정 항목**:

- `politeness`: FORMAL, POLITE, CASUAL
- `vibe`: CALM, DIRECT, PLAYFUL, CARING
- `emoji_level`: 0 (사용 안 함) ~ 3 (매우 자주)

---

### 2. RAG (Retrieval-Augmented Generation) 시스템

**개요**:

- 사용자의 과거 대화 톤 샘플을 벡터 DB에 저장
- 새 메시지 수신 시 유사한 대화 패턴을 검색하여 LLM에 제공
- 일관성 있는 말투 재현

**구현 기술**:

- **임베딩 모델**: OpenAI `text-embedding-3-small` (1536차원)
- **벡터 검색**: PostgreSQL `pgvector` 확장 (HNSW 인덱스)
- **유사도 측정**: 코사인 유사도 (Cosine Similarity)

**검색 전략** (2025-01-30 개선):

1. **상대방별 우선순위 검색** (50개 샘플):
   - 현재 대화 상대와의 실제 대화 (40%)
   - 같은 관계 카테고리 대화 (40%)
   - 전체 유사 샘플 (20%)

2. **대화 쌍(Pair) 학습**:
   - 상대방 메시지 → 내 답변 형식으로 검색
   - 맥락 이해 향상

---

### 3. LLM 기반 답변 생성

**사용 모델**:

- OpenAI GPT-4o-mini
- Temperature: 0.85 (자연스러운 표현 위해 상향 조정)

**답변 생성 방식**:

- **긍정/부정 2가지 답변** 동시 생성
  - YES: 동의/수락하는 답변
  - NO: 거절/불가 답변
- 사용자가 선택하여 전송

**프롬프트 엔지니어링 기법** (2025-01-30 개선):

#### a) Chain-of-Thought 프롬프팅

LLM이 4단계 사고 과정을 거쳐 답변 생성:

1. 메시지 의도 파악
2. 관계 설정 확인 (반말/존댓말, 분위기)
3. 말투 패턴 적용 (종결어, 연결어, 감탄사)
4. 자연스러운 답변 생성

#### b) Few-shot Learning with Conversation Pairs

기존 고립된 문장 → 대화 쌍 제공으로 변경:

```
[변경 전]
- "응 괜찮아"
- "나도 그렇게 생각해"

[변경 후]
[상대] 오늘 저녁 뭐 먹을까?
[나] 음 글쎄 아무거나 ㅋㅋ

[상대] 이거 어떻게 생각해?
[나] 나도 비슷하게 생각하는데
```

#### c) 말투 패턴 분석 및 제공

사용자의 독특한 말투 습관을 추출하여 LLM에 제공:

- **문장 종결 패턴**: "~ㅋㅋ", "~함", "~듯" 등
- **연결어**: "근데", "그런데", "그리고", "그래서" 등
- **감탄사/축약어**: "ㅋㅋ", "ㅎㅎ", "음", "아" 등
- **문장 길이**: 평균/중앙값 통계
- **이모지 사용률**: 전체 메시지 중 이모지 포함 비율

---

### 4. Telegram 봇 연동

**기능**:

- Long Polling 방식으로 실시간 메시지 수신
- 수신한 메시지 자동 DB 저장 및 임베딩 생성
- LLM 답변 추천 (긍정/부정 2가지)

**메시지 처리 플로우**:

```
Telegram 메시지 수신
  ↓
DB 저장 (messages, tone_samples)
  ↓
임베딩 생성 (비동기)
  ↓
LLM 답변 생성
  ↓
SSE로 프론트엔드에 실시간 전송
```

---

### 5. 실시간 알림 (SSE)

**기능**:

- Server-Sent Events로 새 메시지 도착 시 프론트엔드에 실시간 알림
- 대화방별 구독 관리

**엔드포인트**:

- `GET /api/conversations/:conversationId/events`

**이벤트 타입**:

- `new-message`: 새 메시지 도착
- `keep-alive`: 연결 유지 (30초마다)

---

### 6. 카카오톡 대화 업로드

**기능**:

- 카카오톡 텍스트 파일 업로드 → 자동 파싱 → 톤 샘플 생성
- 내 메시지만 추출하여 학습 데이터로 활용

**파싱 기능**:

- 날짜/시간, 발신자, 메시지 내용 분리
- 이모티콘/사진/동영상 등 필터링
- 중복 제거

---

### 7. 사용자 정의 말투 규칙

**기능**:

- 사용자가 직접 작성한 말투 규칙을 LLM에 우선 적용
- 예: "문장부호 사용하지 않기", "특정 단어 사용 금지" 등

**DB 저장**:

- `style_profiles` 테이블의 `custom_guidelines` 컬럼

---

## 기술 스택

### Backend

- **프레임워크**: NestJS (TypeScript)
- **런타임**: Node.js 18+
- **ORM**: Prisma 5.x

### Database

- **DBMS**: PostgreSQL 16
- **벡터 검색**: pgvector 0.5.0
- **인덱스**: HNSW (Hierarchical Navigable Small World)

### AI/ML

- **LLM**: OpenAI GPT-4o-mini
- **임베딩**: OpenAI text-embedding-3-small (1536차원)
- **Temperature**: 0.85

### External APIs

- **메시징**: Telegram Bot API
- **AI**: OpenAI API

### DevOps

- **컨테이너**: Docker, Docker Compose
- **환경 관리**: dotenv
- **코드 품질**: ESLint, Prettier

---

## 주요 모듈별 구현 내역

### 1. Auth Module (인증)

**파일**: `src/modules/auth/`

**구현 기능**:

- JWT 기반 인증
- Passport.js 통합
- `JwtAuthGuard` 적용

**JWT Payload**:

```typescript
{
  sub: string; // 사용자 ID (UUID)
  email: string; // 이메일
  iat: number; // 발급 시간
  exp: number; // 만료 시간
}
```

**보안 설정**:

- Access Token 만료: 7일
- 비밀키: 환경변수로 관리 (`JWT_SECRET`)

---

### 2. User Module (사용자)

**파일**: `src/modules/user/`

**구현 기능**:

- 회원가입 (이메일/비밀번호)
- 로그인 (JWT 토큰 발급)
- 프로필 조회

**엔드포인트**:

- `POST /api/auth/register` - 회원가입
- `POST /api/auth/login` - 로그인
- `GET /api/users/profile` - 내 프로필 조회 (인증 필요)

---

### 3. Partner Module (대화 상대)

**파일**: `src/modules/partner/`

**구현 기능**:

- 대화 상대 목록 조회
- 대화 상대 추가/수정/삭제
- Telegram 계정 연동 (telegram_id)

**엔드포인트**:

- `GET /api/partners` - 대화 상대 목록
- `POST /api/partners` - 대화 상대 추가
- `PUT /api/partners/:id` - 대화 상대 수정
- `DELETE /api/partners/:id` - 대화 상대 삭제

---

### 4. Relationship Module (관계 설정)

**파일**: `src/modules/relationship/`

**구현 기능**:

- 대화 상대별 관계 설정 조회/수정
- 10개 카테고리 관리
- 말투 설정 (politeness, vibe, emoji_level)

**엔드포인트**:

- `GET /api/relationships/:partnerId` - 관계 설정 조회
- `PUT /api/relationships/:partnerId` - 관계 설정 수정

**설정 항목**:

```typescript
{
  category: RelationshipCategory; // 10개 중 선택
  politeness: 'FORMAL' | 'POLITE' | 'CASUAL';
  vibe: 'CALM' | 'DIRECT' | 'PLAYFUL' | 'CARING';
  emoji_level: 0 | 1 | 2 | 3;
}
```

---

### 5. Conversation Module (대화)

**파일**: `src/modules/conversation/`

**구현 기능**:

- 대화방 생성 (대화 상대별 1개)
- 대화방 목록 조회
- 메시지 목록 조회
- 새 메시지 전송

**엔드포인트**:

- `GET /api/conversations` - 대화방 목록
- `POST /api/conversations` - 대화방 생성
- `GET /api/conversations/:id/messages` - 메시지 조회
- `POST /api/conversations/:id/messages` - 메시지 전송

**SSE 알림**:

- `GET /api/conversations/:id/events` - 실시간 메시지 알림

---

### 6. Tone Sample Module (톤 샘플)

**파일**: `src/modules/tone-sample/`

**구현 기능**:

- 톤 샘플 조회/추가/삭제
- 카카오톡 대화 업로드 및 파싱
- 임베딩 자동 생성 (비동기)

**엔드포인트**:

- `GET /api/tone-samples` - 톤 샘플 목록
- `POST /api/tone-samples` - 톤 샘플 추가
- `DELETE /api/tone-samples/:id` - 톤 샘플 삭제
- `POST /api/tone-samples/upload` - 카카오톡 파일 업로드

**카카오톡 파싱 기능**:

- 날짜/시간, 발신자, 메시지 분리
- 내 메시지만 추출
- 이모티콘/사진 필터링
- 중복 메시지 제거

---

### 7. LLM Module (답변 생성)

**파일**: `src/modules/llm/`

**구현 기능**:

- 긍정/부정 2가지 답변 생성
- 관계 설정 기반 톤 조정
- RAG 검색 (유사 톤 샘플)
- Chain-of-Thought 프롬프팅

**엔드포인트**:

- `POST /api/llm/generate` - 답변 생성

**내부 로직**:

#### a) `getStyleProfile()` - 말투 프로필 분석

9개 병렬 쿼리 실행:

1. Politeness 통계
2. Vibe 통계
3. 전체 샘플 개수
4. 자주 쓰는 표현 (20개 랜덤 샘플)
5. 문장 길이 통계 (평균, 중앙값)
6. 이모지 사용률
7. **문장 종결 패턴** (상위 10개)
8. **연결어 패턴** (상위 5개)
9. **감탄사 패턴** (상위 8개)

#### b) `getSimilarContext()` - 유사 대화 검색

3단계 우선순위 검색 (partnerId 있을 때):

1. 현재 상대와 주고받은 대화 (40%)
2. 같은 관계 카테고리 대화 (40%)
3. 전체 유사 샘플 (20%)

**대화 쌍(Pair) 포함**:

- SQL `LAG()` 윈도우 함수로 이전 메시지 추출
- 질문-답변 형식으로 LLM에 제공

#### c) `buildMultipleRepliesPrompt()` - 프롬프트 생성

Chain-of-Thought 구조:

1. 메시지 의도 파악
2. 관계 설정 확인
3. 말투 패턴 적용
4. 답변 생성

#### d) `generateMultipleReplies()` - LLM 호출

- OpenAI GPT-4o-mini 호출
- Temperature: 0.85
- Max Tokens: 150

---

### 8. Telegram Module (봇)

**파일**: `src/modules/telegram/`

**구현 기능**:

- Long Polling으로 메시지 수신
- 자동 대화 상대 생성 (처음 연락한 경우)
- 자동 대화방 생성
- 메시지 DB 저장 및 임베딩 생성
- SSE 실시간 알림 발송

**메시지 처리**:

1. Telegram 메시지 수신
2. Partner 확인/생성
3. Conversation 확인/생성
4. Message 저장
5. Tone Sample 생성 (내 메시지만)
6. 임베딩 생성 (비동기)
7. SSE 이벤트 발송

---

### 9. OpenAI Module (AI)

**파일**: `src/modules/openai/`

**구현 기능**:

- ChatGPT API 호출
- 임베딩 생성 (text-embedding-3-small)
- 에러 핸들링

**메서드**:

- `generateChatCompletion()` - GPT 대화 생성
- `createEmbedding()` - 텍스트 임베딩 생성

---

### 10. Style Profile Module (스타일 프로필)

**파일**: `src/modules/style-profile/`

**구현 기능**:

- 사용자 정의 말투 규칙 조회/수정
- 말투 특징 자동 분석

**엔드포인트**:

- `GET /api/style-profiles` - 내 스타일 프로필 조회
- `PUT /api/style-profiles` - 사용자 정의 규칙 수정

---

## LLM 답변 생성 시스템

### 전체 플로우

```
1. 메시지 수신
   ↓
2. 사용자 정보 조회
   ↓
3. 컨텍스트 수집 (병렬)
   - 최근 대화 20개
   - 유사 톤 샘플 50개 (상대방별 우선순위)
   - 말투 프로필 분석 (9개 쿼리)
   - 관계 설정 정보
   - 사용자 정의 규칙
   ↓
4. 프롬프트 생성
   - Chain-of-Thought 구조
   - 대화 쌍 예시 포함
   - 말투 패턴 분석 결과 포함
   ↓
5. LLM API 호출
   - GPT-4o-mini
   - Temperature: 0.85
   ↓
6. 응답 파싱
   - YES/NO 형식 분리
   ↓
7. 결과 반환
```

### 성능 지표

- **응답 시간**: 3.5~5초
  - 임베딩 생성: ~0.5초
  - DB 쿼리 (병렬): ~0.5초
  - LLM API 호출: ~2~3초

- **검색 정확도**: 코사인 유사도 기반
  - 상위 50개 샘플 활용
  - 상대방별 우선순위 적용

---

## 데이터베이스 스키마

### 주요 테이블

#### 1. `users` - 사용자

```sql
- id (UUID, PK)
- email (UNIQUE)
- password (hashed)
- name
- created_at
```

#### 2. `partners` - 대화 상대

```sql
- id (UUID, PK)
- user_id (FK → users)
- name
- telegram_id (UNIQUE, nullable)
- created_at
```

#### 3. `relationships` - 관계 설정

```sql
- id (UUID, PK)
- user_id (FK → users)
- partner_id (FK → partners)
- category (ENUM: 10개 카테고리)
- politeness (ENUM: FORMAL, POLITE, CASUAL)
- vibe (ENUM: CALM, DIRECT, PLAYFUL, CARING)
- emoji_level (INT: 0~3)
- UNIQUE (user_id, partner_id)
```

#### 4. `conversations` - 대화방

```sql
- id (UUID, PK)
- user_id (FK → users)
- partner_id (FK → partners)
- last_message_at
- UNIQUE (user_id, partner_id)
```

#### 5. `messages` - 메시지

```sql
- id (UUID, PK)
- conversation_id (FK → conversations)
- partner_id (FK → partners)
- text
- is_from_me (BOOLEAN)
- role (ENUM: user, assistant)
- created_at
```

#### 6. `tone_samples` - 톤 샘플

```sql
- id (UUID, PK)
- user_id (FK → users)
- message_id (FK → messages, nullable)
- text
- politeness
- vibe
- embedding (VECTOR(1536))  ← pgvector
- created_at
```

**인덱스**:

- HNSW 인덱스: `embedding vector_cosine_ops` (빠른 유사도 검색)

#### 7. `style_profiles` - 스타일 프로필

```sql
- id (UUID, PK)
- user_id (FK → users, UNIQUE)
- custom_guidelines (TEXT, nullable)
- created_at
- updated_at
```

---

## 성능 최적화

### 1. 병렬 처리

- 컨텍스트 수집 시 5개 쿼리 병렬 실행
  - `Promise.all([...])`
  - 응답 시간 단축

### 2. 벡터 인덱스

- HNSW 인덱스 사용
- 코사인 유사도 검색 최적화
- 2,000+ 샘플에서 50개 검색: ~0.1초

### 3. 캐싱 (추후 적용 예정)

- Redis 캐싱 고려 중
- 임베딩 결과 캐싱
- 자주 조회되는 관계 설정 캐싱

---

## 보안 및 인증

### 1. JWT 인증

- Access Token 기반 인증
- Passport.js JWT Strategy
- 모든 API 엔드포인트에 `@UseGuards(JwtAuthGuard)` 적용

### 2. 비밀번호 암호화

- bcrypt 해싱 (salt rounds: 10)

### 3. 환경변수 관리

- `.env` 파일로 민감 정보 관리
  - `JWT_SECRET`
  - `OPENAI_API_KEY`
  - `TELEGRAM_BOT_TOKEN`
  - `DATABASE_URL`

### 4. CORS 설정

- 프론트엔드 도메인만 허용
- Credentials 포함 허용 (쿠키/인증 헤더)

---

## 주요 개선 사항 (2025-01-30)

### 1. 말투 패턴 추출 기능 추가

- 문장 종결 패턴 분석 (끝 2글자)
- 연결어 패턴 추출 (근데, 그런데, 그리고 등)
- 감탄사 패턴 추출 (ㅋㅋ, 음, 아 등)

**구현 위치**: `llm.service.ts:getStyleProfile()`

### 2. 상대방별 대화 히스토리 우선순위

- 3단계 검색 전략 (40% + 40% + 20%)
- 현재 상대와의 실제 대화 우선

**구현 위치**: `llm.service.ts:getSimilarContext()`

### 3. Few-shot Learning 구조 개선

- 고립된 문장 → 대화 쌍 형식
- SQL `LAG()` 윈도우 함수 활용

**구현 위치**: `llm.service.ts:getSimilarContext()`, `buildMultipleRepliesPrompt()`

### 4. Chain-of-Thought 프롬프팅

- 4단계 사고 과정 명시
- LLM 추론 품질 향상

**구현 위치**: `llm.service.ts:buildMultipleRepliesPrompt()`

### 5. Temperature 최적화

- 0.7 → 0.85로 상향 조정
- 더 자연스럽고 다양한 표현 생성

**구현 위치**: `llm.service.ts:generateMultipleReplies()`

---

## 향후 개선 계획

### 1. 성능 최적화

- [ ] Redis 캐싱 도입
- [ ] 임베딩 배치 생성
- [ ] DB 쿼리 최적화

### 2. 기능 확장

- [ ] 음성 메시지 지원
- [ ] 이미지 분석 및 대화
- [ ] 다국어 지원

### 3. 모니터링

- [ ] Prometheus + Grafana 연동
- [ ] 로그 수집 (Winston, ELK)
- [ ] 에러 추적 (Sentry)

---

## 참고 자료

### 사용 기술 문서

- [NestJS](https://docs.nestjs.com)
- [Prisma](https://www.prisma.io/docs)
- [pgvector](https://github.com/pgvector/pgvector)
- [OpenAI API](https://platform.openai.com/docs)
- [Telegram Bot API](https://core.telegram.org/bots/api)

### 프로젝트 내부 문서

- [DB_SCHEMA.md](./DB_SCHEMA.md) - 데이터베이스 상세 스키마
- [NEW_DIRECTION.md](./NEW_DIRECTION.md) - 프로젝트 방향 변경 이력
- [CURRENT_STATUS.md](./CURRENT_STATUS.md) - 현재 상태 및 다음 단계

---

**문서 작성일**: 2025-01-30
**작성자**: LikeMe AI 챗봇 개발팀
**버전**: 1.0
