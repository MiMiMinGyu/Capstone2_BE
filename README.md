# LikeMe AI 챗봇 백엔드

관계별 맞춤형 말투 조정 AI 챗봇 시스템

## 프로젝트 개요

상대방과의 관계에 따라 적절한 말투, 격식, 이모지를 자동으로 조정하여 자연스러운 대화를 생성하는 AI 챗봇 백엔드입니다.

**📌 현재 프로젝트 상태 및 다음 단계**: [CURRENT_STATUS.md](./docs/CURRENT_STATUS.md)

### 주요 기능
- **10개 관계 카테고리** 기반 말투 조정
- **RAG (Retrieval-Augmented Generation)** 시스템
- **PostgreSQL + pgvector** 기반 벡터 검색
- **Telegram API** 연동
- **GPT 모델** 활용

---

## 기술 스택

- **프레임워크**: NestJS (TypeScript)
- **데이터베이스**: PostgreSQL 16 + pgvector
- **ORM**: Prisma
- **AI 모델**: OpenAI GPT API
- **임베딩**: OpenAI text-embedding-3-small (1536차원)
- **메시징**: Telegram Bot API
- **컨테이너**: Docker Compose

---

## 10개 관계 카테고리

| 카테고리 | 대상 | 말투 | 이모지 |
|----------|------|------|--------|
| FAMILY_ELDER_CLOSE | 부모/조부모 등 어른 가족 | 친근 존댓말 (–요) | 0~1 |
| FAMILY_SIBLING_ELDER | 형/오빠/언니/누나 | 반말 중심, –요 혼용 | 1~2 |
| FAMILY_SIBLING_YOUNGER | 남/여 동생 | 부드러운 반말 | 1~2 |
| PARTNER_INTIMATE | 연인/배우자 | 다정한 반말 | 2~3 |
| FRIEND_CLOSE | 친한 친구 | 반말, 구어 허용 | 1~2 |
| ACQUAINTANCE_CASUAL | 가벼운 지인 | 캐주얼 존댓말 (–요) | 0~1 |
| WORK_SENIOR_FORMAL | 상사/교수/임원 | 격식 존대 (–습니다) | 0 |
| WORK_SENIOR_FRIENDLY | 가까운 선배/멘토 | 존댓말 (–요), 캐주얼 | 0~1 |
| WORK_PEER | 동료/협업자 | 존댓말 (–요), 간결 | 0~1 |
| WORK_JUNIOR | 후배/팀원 | 존댓말 (–요) 권장 | 0~1 |

상세 내용: [DB_SCHEMA.md](./docs/DB_SCHEMA.md)

---

## 빠른 시작

### 1. 사전 요구사항
- Node.js 18 이상
- Docker & Docker Compose
- npm 또는 yarn

### 2. 환경 설정

`.env` 파일 생성:
```bash
# 데이터베이스
DATABASE_URL="postgresql://admin:admin1234@localhost:5433/chatbot_db"
POSTGRES_PASSWORD=admin1234

# OpenAI API
OPENAI_API_KEY=your_openai_api_key

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
```

### 3. 데이터베이스 시작

```bash
# PostgreSQL + pgvector 컨테이너 시작
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 컨테이너 상태 확인
docker ps
```

### 4. 패키지 설치

```bash
npm install
```

### 5. Prisma 설정

```bash
# Prisma Client 생성
npx prisma generate

# (옵션) Prisma Studio 실행 (DB GUI)
npx prisma studio
```

### 6. 애플리케이션 실행

```bash
# 개발 모드
npm run start:dev

# 프로덕션 모드
npm run build
npm run start:prod
```

---

## 데이터베이스 관리

### 스키마 확인
```bash
# Prisma Studio (웹 GUI)
npx prisma studio

# psql 직접 접속
docker exec -it chatbot_db psql -U admin -d chatbot_db
```

### 마이그레이션
```bash
# 기존 DB 스키마 가져오기
npx prisma db pull

# 새 마이그레이션 생성
npx prisma migrate dev --name migration_name

# 프로덕션 배포
npx prisma migrate deploy
```

### 데이터베이스 초기화
```bash
# 컨테이너 및 볼륨 완전 삭제 후 재생성
docker-compose down -v
docker-compose up -d
```

---

## 프로젝트 구조

```
likeme-like-me-api/
├── prisma/
│   └── schema.prisma           # Prisma 스키마 정의
├── src/
│   ├── prisma/                 # Prisma 모듈
│   ├── conversation/           # 대화 관리 모듈
│   ├── relationship/           # 관계 설정 모듈
│   ├── tone-sample/            # 톤 샘플 관리 모듈
│   ├── embedding/              # 임베딩 생성 워커
│   ├── orchestrator/           # AI 오케스트레이션
│   ├── telegram/               # 텔레그램 봇 연동
│   └── app.module.ts
├── docker-compose.yml          # PostgreSQL + pgvector 설정
├── init.sql                    # DB 초기화 스크립트
├── .env                        # 환경 변수
├── NEW_DIRECTION.md            # 프로젝트 방향성 변경사항
└── DB_SCHEMA.md                # DB 스키마 상세 설명
```

---

## API 엔드포인트 (계획)

### 대화 관리
- `POST /api/conversations` - 대화 세션 생성
- `GET /api/conversations/:id/messages` - 메시지 조회
- `POST /api/conversations/:id/messages` - 메시지 전송 (AI 응답 생성)

### 관계 설정
- `GET /api/relationships/:partnerId` - 관계 설정 조회
- `PUT /api/relationships/:partnerId` - 관계 설정 업데이트

### 톤 샘플 (RAG)
- `POST /api/tone-samples` - 톤 샘플 추가
- `GET /api/tone-samples` - 톤 샘플 조회

### 지식 베이스 (옵션)
- `POST /api/knowledge/upload` - 지식 업로드
- `GET /api/knowledge` - 지식 조회

---

## 개발 가이드

### 테스트
```bash
# 단위 테스트
npm run test

# E2E 테스트
npm run test:e2e

# 테스트 커버리지
npm run test:cov
```

### 코드 포맷팅
```bash
# Prettier 실행
npm run format

# ESLint 실행
npm run lint
```

---

## 시스템 아키텍처

```
┌─────────────┐
│  Telegram   │
│   Client    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────┐
│           NestJS Backend                │
│  ┌─────────────────────────────────┐   │
│  │  Orchestrator                    │   │
│  │  - 컨텍스트 수집                   │   │
│  │  - RAG 검색 (tone + knowledge)   │   │
│  │  - AI 페이로드 생성               │   │
│  └─────────────┬───────────────────┘   │
│                │                        │
│  ┌─────────────▼───────────────────┐   │
│  │  PostgreSQL + pgvector          │   │
│  │  - conversations                 │   │
│  │  - messages                      │   │
│  │  - relationships (10 categories) │   │
│  │  - tone_samples (vector search)  │   │
│  └─────────────────────────────────┘   │
└──────────────┬──────────────────────────┘
               │
               ▼
        ┌─────────────┐
        │  OpenAI API │
        │   (GPT)     │
        └─────────────┘
```

---

## 주요 변경 사항

프로젝트 초기 방향에서 다음과 같이 변경되었습니다:

### 변경 전
- LLAMA 모델 자체 서빙
- 벡터 DB (Chroma/Pinecone) 별도 운영
- 카카오톡 텍스트 파싱

### 변경 후
- GPT 모델 API 호출
- PostgreSQL + pgvector 확장
- Telegram API 연동

상세 내용: [NEW_DIRECTION.md](./docs/NEW_DIRECTION.md)

---

## 문제 해결

### 데이터베이스 연결 실패
```bash
# Docker 컨테이너 상태 확인
docker ps

# 컨테이너 재시작
docker-compose restart

# 로그 확인
docker-compose logs postgres
```

### Prisma 타입 오류
```bash
# Prisma Client 재생성
npx prisma generate

# 캐시 삭제 후 재빌드
rm -rf node_modules/.prisma
npm run build
```

### pgvector 확장 오류
```bash
# 컨테이너 재생성 (볼륨 포함)
docker-compose down -v
docker-compose up -d

# psql에서 확장 확인
docker exec -it chatbot_db psql -U admin -d chatbot_db -c "SELECT * FROM pg_extension WHERE extname = 'vector';"
```

---

## 라이선스

MIT

---

## 참고 자료

- [NestJS 문서](https://docs.nestjs.com)
- [Prisma 문서](https://www.prisma.io/docs)
- [pgvector GitHub](https://github.com/pgvector/pgvector)
- [OpenAI API 문서](https://platform.openai.com/docs)
- [Telegram Bot API](https://core.telegram.org/bots/api)

---

## 완료된 작업

- [x] PostgreSQL + pgvector Docker 설정
- [x] Prisma 스키마 정의 및 Client 생성
- [x] Prisma 모듈 NestJS 통합
- [x] Telegram 봇 연동 (Long Polling)
- [x] SSE (Server-Sent Events) 실시간 메시지 알림
- [x] CORS 설정

## 다음 단계

1. **Prisma DB 동기화** (기존 DB 스키마를 Prisma로 가져오기)
   ```bash
   npx prisma db pull
   npx prisma generate
   ```
2. **Conversation Service 구현** (대화/메시지 CRUD)
3. **Relationship Service 구현** (관계 설정 CRUD)
4. **Style Service 구현** (스타일 프로필 관리)
5. **OpenAI API 연동** (GPT 호출, 임베딩 생성)
6. **Retrieval Service 구현** (RAG 검색 로직)
7. **Orchestrator 구현** (컨텍스트 수집 → AI 호출 → 후처리)
8. **Tone Sample 관리 API** 구현

**주의**: DB 테이블은 이미 `docker-compose`의 `init.sql`로 생성되어 있습니다. Prisma 마이그레이션이 아닌 동기화(`db pull`)가 필요합니다.
