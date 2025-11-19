# 데이터베이스 스키마 설계

> 최종 업데이트: 2025-11-07

## 개요

이 프로젝트는 **PostgreSQL + pgvector** 기반 RAG 시스템을 사용하여 관계별 맞춤형 말투 조정 AI 챗봇을 구현합니다.

### 기술 스택

- **데이터베이스**: PostgreSQL 16 + pgvector
- **ORM**: Prisma
- **임베딩 모델**: OpenAI text-embedding-3-small (1536차원)
- **언어 모델**: GPT (OpenAI API)

---

## 10개 관계 카테고리

관계 카테고리는 상대방과의 관계를 세밀하게 분류하여 적절한 말투, 격식, 이모지 사용 빈도를 조정합니다.

### 1. FAMILY_ELDER_CLOSE

**대상**: 부모/조부모/삼촌·이모 등 어른 가족
**말투**: 친근 존댓말 (–요), 필요 시 높임 (–세요)
**호칭 예**: 아버지/어머니/할아버지/이모
**이모지**: 0~1
**메모**: 너무 딱딱한 –습니다는 과함 → 가족은 –요 권장

### 2. FAMILY_SIBLING_ELDER

**대상**: 형/오빠/언니/누나 (※ 화자 성별에 따라 호칭 자동 선택)
**말투**: 반말 중심, 상황에 따라 –요 혼용 가능
**호칭 예**: 형/오빠/언니/누나
**이모지**: 1~2
**메모**: 존중은 유지하되 친근함 강조

### 3. FAMILY_SIBLING_YOUNGER

**대상**: 남/여 동생
**말투**: 반말, 부드러운 어조 (명령형 지양)
**호칭 예**: 동생 이름/애칭
**이모지**: 1~2

### 4. PARTNER_INTIMATE

**대상**: 연인/배우자
**말투**: 다정한 반말, 애칭/애정표현 허용
**이모지**: 2~3
**메모**: 과도한 격식/사무적 표현 금지

### 5. FRIEND_CLOSE

**대상**: 친한 친구 (동갑/아래/위 모두, 친분이 핵심)
**말투**: 반말, 구어/속어 일부 허용
**이모지**: 1~2

### 6. ACQUAINTANCE_CASUAL

**대상**: 가벼운 지인/처음 만난 또래
**말투**: 기본 존댓말 (–요), 캐주얼
**호칭 예**: 이름+님/직함 모르면 호칭 회피
**이모지**: 0~1

### 7. WORK_SENIOR_FORMAL

**대상**: 상사/교수/연장자 고객 임원 (권한·격식 높음)
**말투**: 격식 존대 (–습니다/–하십시오)
**호칭 예**: 팀장님/부장님/교수님/대표님
**이모지**: 0
**메모**: 완곡 표현·근거 제시·보고체

### 8. WORK_SENIOR_FRIENDLY

**대상**: 가까운 선배·상사/멘토 (라이트한 관계)
**말투**: 존댓말 (–요), 완곡하되 캐주얼 가능
**호칭 예**: 선배님/이름+님/직함
**이모지**: 0~1

### 9. WORK_PEER

**대상**: 동료/타팀 협업자/파트너 동급
**말투**: 존댓말 (–요), 명확·간결
**호칭 예**: 이름+님/직함
**이모지**: 0~1

### 10. WORK_JUNIOR

**대상**: 후배/인턴/팀원 (연하·하급)
**말투**: 존댓말 (–요) 권장 (수평문화), 필요시 부드러운 지시
**호칭 예**: 이름+씨/님
**이모지**: 0~1
**메모**: 반말은 조직 문화·합의 없으면 지양

---

## 테이블 구조

### 1. users

사용자 테이블 (JWT 인증 지원)

| 컬럼명        | 타입         | 제약조건        | 설명                          |
| ------------- | ------------ | --------------- | ----------------------------- |
| id            | UUID         | PK              | 사용자 고유 ID                |
| username      | VARCHAR(50)  | UNIQUE NOT NULL | 사용자명                      |
| name          | VARCHAR(100) | NULL            | 사용자 이름 (카카오톡 파싱용) |
| email         | VARCHAR(255) | UNIQUE NOT NULL | 이메일 (로그인용)             |
| password_hash | VARCHAR(255) | NOT NULL        | 해싱된 비밀번호 (bcrypt)      |
| telegram_id   | VARCHAR(100) | UNIQUE NULL     | 텔레그램 봇 소유자 식별용     |
| refresh_token | VARCHAR(500) | NULL            | JWT Refresh Token             |
| created_at    | TIMESTAMP    | DEFAULT NOW()   | 생성 시간                     |

**인증 관련 컬럼:**

- `email`: 로그인 시 사용되는 고유 이메일 주소
- `password_hash`: bcrypt로 해싱된 비밀번호 (saltRounds: 10)
- `refresh_token`: 30일 유효한 JWT Refresh Token (로그아웃 시 null)

**텔레그램 관련 컬럼:**

- `telegram_id`: 텔레그램 봇 소유자를 식별하는 ID (추후 기능, 현재는 미사용)

### 2. partners

대화 상대방 테이블

| 컬럼명      | 타입         | 제약조건      | 설명             |
| ----------- | ------------ | ------------- | ---------------- |
| id          | UUID         | PK            | 상대방 고유 ID   |
| name        | VARCHAR(100) | NOT NULL      | 상대방 이름      |
| telegram_id | VARCHAR(100) | UNIQUE        | 텔레그램 연동 ID |
| created_at  | TIMESTAMP    | DEFAULT NOW() | 생성 시간        |

### 3. conversations

대화 세션 테이블

| 컬럼명     | 타입      | 제약조건          | 설명         |
| ---------- | --------- | ----------------- | ------------ |
| id         | UUID      | PK                | 대화 세션 ID |
| user_id    | UUID      | FK → users(id)    | 사용자 ID    |
| partner_id | UUID      | FK → partners(id) | 상대방 ID    |
| created_at | TIMESTAMP | DEFAULT NOW()     | 생성 시간    |
| updated_at | TIMESTAMP | AUTO UPDATE       | 수정 시간    |

**제약조건**:

- UNIQUE(user_id, partner_id)
- ON DELETE CASCADE

### 4. messages

메시지 테이블

| 컬럼명          | 타입        | 제약조건               | 설명                          |
| --------------- | ----------- | ---------------------- | ----------------------------- |
| id              | UUID        | PK                     | 메시지 ID                     |
| conversation_id | UUID        | FK → conversations(id) | 대화 세션 ID                  |
| role            | MessageRole | NOT NULL               | 'user', 'assistant', 'system' |
| text            | TEXT        | NOT NULL               | 메시지 내용                   |
| created_at      | TIMESTAMP   | DEFAULT NOW()          | 생성 시간                     |

**인덱스**:

- (conversation_id, created_at)

### 5. relationships

상대방별 관계 설정 테이블

| 컬럼명      | 타입                 | 제약조건          | 설명                                  |
| ----------- | -------------------- | ----------------- | ------------------------------------- |
| id          | UUID                 | PK                | 관계 설정 ID                          |
| user_id     | UUID                 | FK → users(id)    | 사용자 ID                             |
| partner_id  | UUID                 | FK → partners(id) | 상대방 ID                             |
| category    | RelationshipCategory | NOT NULL          | 관계 카테고리 (10개 중 선택)          |
| politeness  | PolitenessLevel      | DEFAULT 'POLITE'  | 'FORMAL', 'POLITE', 'CASUAL'          |
| vibe        | VibeType             | DEFAULT 'CALM'    | 'CALM', 'DIRECT', 'PLAYFUL', 'CARING' |
| emoji_level | SMALLINT             | DEFAULT 0         | 0~3 (이모지 사용 빈도)                |
| created_at  | TIMESTAMP            | DEFAULT NOW()     | 생성 시간                             |
| updated_at  | TIMESTAMP            | AUTO UPDATE       | 수정 시간                             |

**제약조건**:

- UNIQUE(user_id, partner_id)
- ON DELETE CASCADE

### 6. style_profiles

사용자별 전역 스타일 프로필

| 컬럼명          | 타입      | 제약조건              | 설명                                          |
| --------------- | --------- | --------------------- | --------------------------------------------- |
| id              | UUID      | PK                    | 프로필 ID                                     |
| user_id         | UUID      | UNIQUE FK → users(id) | 사용자 ID                                     |
| honorific_rules | JSONB     | DEFAULT '{}'          | 존댓말 규칙                                   |
| constraints     | JSONB     | DEFAULT '{}'          | 제약사항 (max_sentences, forbid_questions 등) |
| updated_at      | TIMESTAMP | AUTO UPDATE           | 수정 시간                                     |

**honorific_rules 예시**:

```json
{
  "ending": "~요",
  "forbidden_words": ["혹시", "여러 가지"]
}
```

**constraints 예시**:

```json
{
  "max_sentences": 1,
  "forbid_questions": true
}
```

---

## RAG 시스템 테이블 (pgvector)

### 7. tone_samples

톤 샘플 테이블 (few-shot 예시)

| 컬럼명     | 타입                 | 제약조건       | 설명                     |
| ---------- | -------------------- | -------------- | ------------------------ |
| id         | UUID                 | PK             | 샘플 ID                  |
| user_id    | UUID                 | FK → users(id) | 사용자 ID                |
| text       | TEXT                 | NOT NULL       | 샘플 텍스트              |
| category   | RelationshipCategory | NULL           | 관계 카테고리 (필터링용) |
| politeness | PolitenessLevel      | NULL           | 존댓말 레벨 (필터링용)   |
| vibe       | VibeType             | NULL           | 말투 분위기 (필터링용)   |
| embedding  | vector(1536)         | NULL           | 벡터 임베딩              |
| created_at | TIMESTAMP            | DEFAULT NOW()  | 생성 시간                |

**인덱스**:

- user_id
- category
- **HNSW (embedding) using vector_cosine_ops**

**사용 예시**:

```sql
-- 톤 샘플 유사도 검색 (상위 3개)
SELECT text, 1 - (embedding <=> query_embedding) as similarity
FROM tone_samples
WHERE user_id = 'xxx'
  AND category = 'FAMILY_ELDER_CLOSE'
  AND politeness = 'POLITE'
ORDER BY embedding <=> query_embedding
LIMIT 3;
```

### 8. knowledge_chunks (옵션)

지식 청크 테이블

| 컬럼명     | 타입         | 제약조건       | 설명        |
| ---------- | ------------ | -------------- | ----------- |
| id         | UUID         | PK             | 청크 ID     |
| user_id    | UUID         | FK → users(id) | 사용자 ID   |
| source     | VARCHAR(255) | NULL           | 소스 정보   |
| title      | VARCHAR(255) | NULL           | 제목        |
| chunk      | TEXT         | NOT NULL       | 텍스트 청크 |
| metadata   | JSONB        | DEFAULT '{}'   | 메타데이터  |
| embedding  | vector(1536) | NULL           | 벡터 임베딩 |
| created_at | TIMESTAMP    | DEFAULT NOW()  | 생성 시간   |

**인덱스**:

- user_id
- **HNSW (embedding) using vector_cosine_ops**

### 9. message_embeddings (옵션)

메시지 임베딩 테이블

| 컬럼명     | 타입         | 제약조건             | 설명        |
| ---------- | ------------ | -------------------- | ----------- |
| message_id | UUID         | PK FK → messages(id) | 메시지 ID   |
| embedding  | vector(1536) | NOT NULL             | 벡터 임베딩 |
| created_at | TIMESTAMP    | DEFAULT NOW()        | 생성 시간   |

**인덱스**:

- **HNSW (embedding) using vector_cosine_ops**

---

## 벡터 검색 최적화

### HNSW 인덱스

pgvector는 HNSW (Hierarchical Navigable Small World) 알고리즘을 사용하여 벡터 유사도 검색을 최적화합니다.

```sql
-- 인덱스 생성 예시
CREATE INDEX idx_tone_samples_embedding
ON tone_samples
USING hnsw (embedding vector_cosine_ops);
```

### 거리 메트릭

- **`<=>`**: 코사인 거리 (0~2, 0에 가까울수록 유사)
- **`<->`**: L2 거리 (유클리디안)
- **`<#>`**: 내적 거리

**권장**: 코사인 거리 (`<=>`)

---

## 마이그레이션 전략

### 1. 초기 설정

```bash
# Docker 컨테이너 시작 (PostgreSQL + pgvector)
docker-compose down -v
docker-compose up -d

# Prisma Client 생성
npx prisma generate

# 기존 DB와 동기화 (선택)
npx prisma db pull
```

### 2. 스키마 변경 시

```bash
# Prisma 스키마 수정 후
npx prisma generate

# 마이그레이션 생성
npx prisma migrate dev --name add_new_feature
```

### 3. 프로덕션 배포

```bash
# 마이그레이션 적용
npx prisma migrate deploy
```

---

## 예제 쿼리

### 1. 관계별 최근 대화 조회

```typescript
const messages = await prisma.message.findMany({
  where: {
    conversation: {
      user_id: userId,
      partner_id: partnerId,
    },
  },
  orderBy: { created_at: 'desc' },
  take: 10,
  include: {
    conversation: {
      include: {
        partner: true,
      },
    },
  },
});
```

### 2. 관계 설정 조회

```typescript
const relationship = await prisma.relationship.findUnique({
  where: {
    user_id_partner_id: {
      user_id: userId,
      partner_id: partnerId,
    },
  },
});
```

### 3. 톤 샘플 검색 (Prisma Raw Query)

```typescript
const toneSamples = await prisma.$queryRaw`
  SELECT id, text,
         1 - (embedding <=> ${queryEmbedding}::vector) as similarity
  FROM tone_samples
  WHERE user_id = ${userId}::uuid
    AND category = ${category}::"RelationshipCategory"
    AND politeness = ${politeness}::"PolitenessLevel"
  ORDER BY embedding <=> ${queryEmbedding}::vector
  LIMIT 3
`;
```

---

## 참고 자료

- **Prisma 문서**: https://www.prisma.io/docs
- **pgvector 문서**: https://github.com/pgvector/pgvector
- **PostgreSQL ENUM 타입**: https://www.postgresql.org/docs/current/datatype-enum.html
- **OpenAI 임베딩**: https://platform.openai.com/docs/guides/embeddings

---

## 다음 단계

1. Prisma Client 생성 및 NestJS 통합
2. 관계 설정 CRUD API 구현
3. 톤 샘플 관리 API 구현
4. OpenAI 임베딩 생성 워커 구현
5. RAG 검색 로직 구현
