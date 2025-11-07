# 프로젝트 현재 상태

> 최종 업데이트: 2025-11-07

## ✅ 완료된 작업

### 1. 인프라 설정
- **Docker + PostgreSQL 16 + pgvector 0.5.1** 설정 완료
  - 포트: 5433
  - 데이터베이스: `chatbot_db`
  - 사용자: `admin`
  - `init.sql`로 9개 테이블 자동 생성
  - pgvector 확장 설치 및 HNSW 인덱스 생성됨

### 2. 데이터베이스 스키마
**생성된 테이블 (9개):**
```sql
users, partners, conversations, messages, relationships,
style_profiles, tone_samples, knowledge_chunks, message_embeddings
```

**벡터 컬럼:**
- `tone_samples.embedding`: vector(1536) - OpenAI text-embedding-3-small 차원
- `knowledge_chunks.embedding`: vector(1536)
- `message_embeddings.embedding`: vector(1536)
- HNSW 인덱스: `idx_tone_samples_embedding` (cosine similarity)

**Users 테이블 (Auth 지원):**
- `id` (UUID, Primary Key)
- `username` (VARCHAR(50), UNIQUE, NOT NULL)
- `name` (VARCHAR(100), NULLABLE)
- `email` (VARCHAR(255), UNIQUE, NOT NULL)
- `password_hash` (VARCHAR(255), NOT NULL)
- `refresh_token` (VARCHAR(500), NULLABLE)
- `created_at` (TIMESTAMP, DEFAULT NOW())

### 3. NestJS 백엔드

#### 3.1 Prisma ORM 통합 ✅
- `PrismaModule` 구현 (`src/prisma/`)
- Prisma DB Pull 완료 (9개 모델 동기화)
- Prisma Client 생성 완료
- 모든 테이블, 관계, Enum 타입 매핑 완료

#### 3.2 Auth 모듈 (JWT 인증) ✅
**구현된 기능:**
- ✅ `POST /auth/register` - 회원가입 (username, email, password, name)
- ✅ `POST /auth/login` - 로그인 (email, password)
- ✅ `POST /auth/refresh` - Access Token 갱신
- ✅ `GET /auth/me` - 현재 사용자 정보 조회
- ✅ `POST /auth/logout` - 로그아웃 (Refresh Token 무효화)

**보안 구현:**
- bcrypt 비밀번호 해싱 (saltRounds: 10)
- JWT Access Token (15분 유효)
- JWT Refresh Token (30일 유효, DB 저장)
- Passport JWT Strategy
- JWT Auth Guard (인증 보호)

**파일 구조:**
```
src/modules/auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── dto/
│   ├── register.dto.ts
│   ├── login.dto.ts
│   ├── refresh.dto.ts
│   └── index.ts
├── guards/
│   └── jwt-auth.guard.ts
├── interfaces/
│   ├── jwt-user.interface.ts
│   ├── auth-response.interface.ts
│   └── index.ts
└── strategies/
    └── jwt.strategy.ts
```

#### 3.3 Telegram 봇 연동 ✅
- Long Polling 방식
- 텍스트 메시지 수신 및 저장 (인메모리)
- 메시지 전송 API
- AI 추천 답변 생성 (임시 하드코딩)
- 선택 답변 전송

#### 3.4 SSE (Server-Sent Events) 실시간 알림 ✅
- RxJS `Subject<SavedMessage>` 사용
- 엔드포인트: `GET /telegram/events`
- 새 메시지 도착 시 자동 알림

#### 3.5 기타 설정 ✅
- CORS 설정 (모든 origin 허용 - 개발 환경)
- Swagger API 문서 (`http://localhost:3000/api`)
- TypeScript strict mode
- ESLint 설정

### 4. Git 워크플로우
- 현재 브랜치: `feat/auth`
- 최근 커밋:
  - Auth 모듈 완전 구현 및 최적화
  - TypeScript 타입 시스템 개선
  - 인터페이스 통합 및 코드 구조 개선

---

## 🔄 최근 업데이트 (2025-11-07)

### Auth 모듈 완성 ✅
**구현 완료:**
- JWT 기반 인증 시스템
- Access Token (15분) + Refresh Token (30일)
- 회원가입, 로그인, 로그아웃, 토큰 갱신
- DB에 Refresh Token 저장 및 검증
- Passport JWT Strategy + Guard
- DTO Validation (class-validator)
- Swagger API 문서화

**코드 품질:**
- TypeScript 타입 안정성 100%
- ESLint 오류 0개
- 인터페이스 통합 및 재사용성 향상
- 명확한 폴더 구조 및 파일 분리

---

## 🚧 현재 제한사항

### 미구현 기능
- ❌ **텔레그램 메시지 DB 저장**: 현재 인메모리 저장만
- ❌ **카카오톡 업로드**: 파일 업로드 및 파싱 기능 미구현
- ❌ **OpenAI 통합**: AI 답변 하드코딩 (실제 GPT 호출 미구현)
- ❌ **Relationship 관리**: CRUD API 미구현
- ❌ **Partner 관리**: CRUD API 미구현
- ❌ **임베딩 생성**: OpenAI API 연동 미구현

### 알려진 이슈
- 텔레그램 봇이 서버 재시작 시 인메모리 메시지 손실
- user_id 하드코딩 (텔레그램 서비스에서)

---

## 📋 다음 단계

### 🎯 Phase 2: 카카오톡 업로드 기능 (우선순위: 높음)
**목표**: 프론트엔드에서 txt 파일 업로드 → 자동 파싱 → DB 저장

**구현 항목:**
1. **파일 업로드 API**
   - `POST /kakao/upload` - Multipart 파일 업로드
   - 파라미터: `file`, `partner_name`, `relationship_category`
   - 응답: 저장된 메시지 개수, tone_samples 개수

2. **파싱 로직**
   - 정규식으로 카카오톡 txt 파싱
   - "나" 메시지만 추출 → `tone_samples` 저장
   - 배치 삽입 최적화 (`createMany`)

3. **Partner & Relationship 생성**
   - 업로드 시 Partner 자동 생성
   - Relationship 자동 생성 (사용자 선택 기반)

### 🎯 Phase 3: 텔레그램 DB 저장 (우선순위: 중간)
**목표**: 인메모리 → DB 영구 저장

**구현 항목:**
1. Partner 자동 매핑 (`telegram_id`)
2. Conversation & Message 저장
3. Relationship 확인 및 관계 설정 요청

### 🎯 Phase 4: OpenAI 통합 (우선순위: 중간)
**목표**: 실제 AI 답변 생성

**구현 항목:**
1. Embedding Service (OpenAI API)
2. GPT Service (RAG 기반 답변 생성)
3. 배치 임베딩 생성

---

## 🔧 유용한 명령어

### Docker 관리
```bash
# 컨테이너 시작
docker-compose up -d

# 로그 확인
docker-compose logs -f postgres

# DB 접속
docker exec -it chatbot_db psql -U admin -d chatbot_db

# 테이블 목록 확인
docker exec -it chatbot_db psql -U admin -d chatbot_db -c "\dt"
```

### Prisma 관리
```bash
# DB 스키마 가져오기
npx prisma db pull

# Prisma Client 생성
npx prisma generate

# Prisma Studio (DB GUI)
npx prisma studio
```

### 애플리케이션 실행
```bash
# 개발 모드
npm run start:dev

# 빌드
npm run build

# 프로덕션 모드
npm run start:prod

# TypeScript 타입 체크
npx tsc --noEmit

# ESLint 체크
npx eslint "src/**/*.ts"
```

### API 테스트
```bash
# Swagger 문서
http://localhost:3000/api

# 회원가입
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test123","email":"test@test.com","password":"123456","name":"테스트"}'

# 로그인
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456"}'

# 사용자 정보 조회
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer {ACCESS_TOKEN}"

# SSE 연결 테스트 (브라우저 Console)
const es = new EventSource('http://localhost:3000/telegram/events');
es.onmessage = e => console.log(JSON.parse(e.data));

# 텔레그램 봇 상태 확인
curl http://localhost:3000/telegram/status
```

---

## 📚 참고 문서

- `README.md` - 프로젝트 개요 및 빠른 시작
- `docs/DB_SCHEMA.md` - 데이터베이스 스키마 상세 설명
- `docs/SETUP_GUIDE.md` - 설치 및 설정 가이드
- `docs/API_SPECIFICATION.md` - API 명세서 (프론트엔드용)
- `docs/FRONTEND_INTEGRATION.md` - 프론트엔드 연동 가이드
- `docs/AUTH_ARCHITECTURE.md` - JWT 인증 아키텍처 가이드
- `docs/IMPLEMENTATION_PLAN.md` - 전체 구현 계획
- `docs/CHANGELOG.md` - 변경 이력

---

## 🎯 핵심 기술 개념

### JWT 인증
- Access Token: 15분 유효 (자주 갱신으로 보안 강화)
- Refresh Token: 30일 유효 (DB 저장, 재로그인 불편 감소)
- Stateless 인증 (서버 재시작해도 로그인 유지)
- Bearer Token 방식 (`Authorization: Bearer {token}`)

### SSE (Server-Sent Events)
- 서버 → 클라이언트 단방향 실시간 통신
- WebSocket보다 간단, HTTP 기반
- RxJS Subject/Observable로 구현

### pgvector
- PostgreSQL 확장
- 벡터 유사도 검색 (cosine, L2, inner product)
- HNSW 알고리즘으로 빠른 근사 최근접 이웃 검색
- 1536차원 벡터 지원 (OpenAI embedding)

### RAG (Retrieval-Augmented Generation)
- AI 응답에 검색된 컨텍스트 추가
- 벡터 DB에서 유사한 예시 검색
- GPT 프롬프트에 포함하여 더 정확한 답변 생성

### 10개 관계 카테고리
- 상대방과의 관계에 따라 말투 자동 조정
- 존댓말/반말, 이모지 빈도, 격식 수준 차별화
- DB의 `relationships` 테이블에서 관리
