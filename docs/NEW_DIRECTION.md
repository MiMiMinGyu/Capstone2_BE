### 주요 변경 사항

**모델 체계: LLAMA → GPT 단일 체제**

- 모델 서빙/튜닝/체크포인트 운영 제거
- 백엔드는 컨텍스트 구성, RAG, 스타일 규칙 합성만 담당
- AI는 디코딩 및 프롬프트는 다루지 않음

**데이터 계층: PostgreSQL (메타데이터/원문) + pgvector (임베딩)**

- 벡터 DB는 별도 제품 X, Postgres 확장(pgvector)으로 사용
- 원문은 일반 컬럼, 검색용 임베딩은 VECTOR 컬럼에 저장

I/O 채널: Telegram API로 메시지 수신/송신 (구현 완료)

백엔드는 AI 호출을 위한 정보 제공자 역할

보안/운영: 초기 스코프에서 후순위, 최소한의 타임아웃/재시도/로그 생성에 초점

### 목표와 범위

**목표**

**:** 상대 메시지 수신 시, 최근 문맥 + 관계별 말투 규칙 + (옵션) 톤 샘플 few-shot + (옵션) 지식 스니펫을 조합하여 GPT가 “내 말투”로 답변하도록 백엔드 오케스트레이션 구현

**범위**

- 대화/관계/스타일 저장 및 조회
- 컨텍스트 생성 (최근 N턴, 스타일 병합)
- RAG 검색(tone_samples/knowledge_chunk)
- AI 파트 호출 (요청 페이로드 조립, 타임아웃/재시도)
- 응답 저장, 변환
- 임베딩 워커 (선택)

### 시스템 전반 구조 (개요)

입출력: Telegram ↔ Backend ↔ (AI 파트: GPT 호출)

데이터: PostgreSQL + pgvector

**백엔드 핵심 모듈**

- Conversation Service: 대화/메시지 저장, 조회
- Relationship/Style Service: 상대별 톤 프리셋, 전역 규칙 병합 → system_style
- Retrieval Service: pgvector 기반 tone few-shot + (옵션) knowledge top-K 검색
- Orchestrator: 컨텍스트 수집 → AI 페이로드 생성/호출 → 후처리(경량) → 저장/반환
- (옵션) Embedding Worker: tone/knowleedge/message 임베딩 생성, 업데이트

### DB 스키마 (최소 + RAG 1단계)

: 현재 Docker로 스키마 생성

**필수**

- `conversations(id, user_id, partner_id, created_at)`
- `messages(id, conv_id, role['user'|'assistant'|'system'], text, created_at)`
- `relationship(id, user_id, partner_id, politeness['존댓말'|'반말'], vibe['차분'|'직설'|'장난'|'배려'], emoji_level[0..3], UNIQUE(user_id, partner_id))`
- `style_profile(id, user_id, honorific_rules JSONB, constraints JSONB, updated_at)`

**RAG (1단계)**

- `tone_samples(id, user_id, text, relationship_tag, politeness, vibe, embedding VECTOR(1536))`
  - 인덱스: `HNSW + vector_cosine_ops` 추천
- _(옵션)_ `knowledge_chunks(id, user_id, source, title, chunk, metadata JSONB, embedding VECTOR(1536))`
- _(옵션)_ `message_embedding(message_id PK, embedding VECTOR(1536))`

**Docker 예시 (요지)**

- `postgres:16` + `pgvector` 확장 사용
- 초기화 스크립트에서 `CREATE EXTENSION IF NOT EXISTS vector;` 1회 실행
- 마이그레이션 도구(예: Prisma/Migrate 또는 Knex/Sequelize Migration)로 테이블 생성

### 백엔드 API 설계(계약)

**대화/메시지**

- `POST /api/conversations` → `{ userId, partnerId }` → `{ convId }`
- `GET /api/conversations/:convId/messages?limit=50` → 최근 메시지
- `POST /api/conversations/:convId/messages { text }`
  - 저장(role='user') → 컨텍스트+RAG → **AI 호출** → 저장(role='assistant') → `{ userMsgId, assistantMsgId, assistantText }`

**관계/스타일**

- `GET /api/relationship/:partnerId`
- `PUT /api/relationship/:partnerId { politeness?, vibe?, emoji_level? }`
- _(옵션)_ `GET/PUT /api/style/profile` (전역 규칙 CRUD)

**RAG 관리 (옵션)**

- `POST /api/tone-samples { text, relationship_tag?, politeness?, vibe? }`
- `POST /api/knowledge/upload { source?, title?, chunk, metadata? }`

=======================================================================================================================

### AI 파트 연동(백엔드 ↔ AI 서비스)

**백엔드 → AI 요청 페이로드(표준형)**

```json
{
  "system_style": {
    "politeness": "존댓말",
    "vibe": "차분",
    "emoji_level": 0,
    "constraints": { "max_sentences": 1, "forbid_questions": true },
    "honorific_rules": {
      "ending": "~요",
      "forbidden_words": ["혹시", "여러 가지"]
    }
  },
  "conversation_context": [
    { "role": "user", "text": "..." },
    { "role": "assistant", "text": "..." }
  ],
  "current_user_message": "밥 뭐 먹을래?",
  "tone_few_shots": ["오늘은 한식 어떠세요?", "가볍게 칼국수도 좋아요."],
  "knowledge_snippets": []
}
```

**AI → 백엔드 응답**

```json
{
  "text": "오늘은 한식 어떠세요?",
  "meta": { "used_tokens_total": 456, "refine_passes": 0 }
}
```

**실패 처리(최소)**

- 타임아웃/네트워크: 1회 재시도(백오프 200ms), 실패 시 **fallback** 텍스트 저장/반환
- 응답 검증: 빈 문자열/과도 길이 시 간단 트리밍

### 컨텍스트·RAG·후처리 로직(상세)

**컨텍스트 생성**

- **최근 N턴(6~10)** 메시지 조회
- `relationship` + `style_profile` 병합 → **system_style** 생성
  - 기본 제약: `max_sentences=1`, `forbid_questions=true` (초기값)
  - 존댓말이면 종결어 `~요` 권고

**톤 few-shot 검색(권장)**

- 1차 필터: `user_id` 일치 + `politeness`, `vibe`, `relationship_tag`(가능 시)
- 2차 유사도: `embedding <=> query_embedding` 오름차순
  - `query_embedding` 후보
    - (a) 현재 사용자 메시지 임베딩
    - (b) 고정 “말투 대표 문구” 임베딩(초기엔 이걸로 시작 권장)
- 상위 K(2~3) 문장만 추출하여 **few-shot**로 전달

**지식 스니펫(옵션)**

- 초기엔 **비활성(0개)** 권장 → 톤 안정화 이후 1~2개만 투입
- 검색: 동일한 방식으로 top-K 추출 → `knowledge_snippets`에 축약 텍스트 제공

**경량 후처리(선택)**

- 문장 수 제한: 초과 시 첫 문장만 유지
- 반문 금지: `?` → `.` 치환
- 존댓말 종결 보정: `~요` 미존재 시 간단 부착(마침표 보정 포함)
