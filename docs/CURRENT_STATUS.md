# 프로젝트 현재 상태

> 최종 업데이트: 2025-11-07 16:30

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
- `name` (VARCHAR(100), NULLABLE) - **중요: 카카오톡 파싱에 사용됨**
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
- Swagger Bearer 인증 통합

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

#### 3.3 Kakao 모듈 (카카오톡 업로드) ✅ **NEW!**
**구현된 기능:**
- ✅ `POST /kakao/upload` - 카카오톡 txt 파일 업로드
- ✅ `GET /kakao/partners` - 업로드된 Partner 목록 조회
- ✅ 두 가지 카카오톡 형식 지원:
  - 형식 1: `2024. 1. 15. 오후 3:45, 홍길동 : 안녕하세요`
  - 형식 2: `[이민규] [오후 1:03] 저는 아직 시간표도 못 짰습니다`
- ✅ 날짜 헤더 파싱: `--------------- 2025년 8월 5일 화요일 ---------------`
- ✅ 사용자 이름 기반 메시지 필터링 (user.name 사용)
- ✅ Partner & Relationship 자동 생성
- ✅ tone_samples 배치 저장
- ✅ JWT 인증 보호
- ✅ Multipart 파일 업로드 (multer)

**파일 구조:**
```
src/modules/kakao/
├── kakao.module.ts
├── kakao.controller.ts
├── kakao.service.ts
├── dto/
│   ├── upload-kakao.dto.ts
│   └── index.ts
└── parsers/
    └── kakao-txt.parser.ts
```

**파싱 로직:**
- 정규식 기반 메시지 파싱
- 날짜 헤더 인식 및 추적
- 초대 메시지, 시스템 메시지 자동 필터링
- 통계 정보 제공 (total_messages, my_messages_count, unique_senders)

#### 3.4 Telegram 봇 연동 ✅
- Long Polling 방식
- 텍스트 메시지 수신 및 저장 (인메모리)
- 메시지 전송 API
- AI 추천 답변 생성 (임시 하드코딩)
- 선택 답변 전송

#### 3.5 SSE (Server-Sent Events) 실시간 알림 ✅
- RxJS `Subject<SavedMessage>` 사용
- 엔드포인트: `GET /telegram/events`
- 새 메시지 도착 시 자동 알림

#### 3.6 기타 설정 ✅
- CORS 설정 (모든 origin 허용 - 개발 환경)
- Swagger API 문서 (`http://localhost:3000/api`)
  - Bearer 인증 통합 완료
  - App Controller 숨김 처리 (개발용 엔드포인트)
- TypeScript strict mode
- ESLint 설정
  - `_` 변수 경고 무시 패턴 추가

### 4. Git 워크플로우
- 현재 브랜치: `feat/kakao-upload`
- 최근 커밋:
  - JWT 기반 인증 시스템 구현 완료
  - 카카오톡 업로드 기능 완전 구현
  - 두 가지 카카오톡 형식 지원
  - 사용자 이름 기반 메시지 필터링

---

## 🔄 최근 업데이트 (2025-11-07)

### Kakao 모듈 완성 ✅
**구현 완료:**
- 카카오톡 txt 파일 업로드 API
- 두 가지 메시지 형식 지원 (날짜 포함 형식 + 대괄호 형식)
- 날짜 헤더 자동 인식 및 파싱
- 사용자 이름 기반 필터링 (JWT의 user.name 사용)
- Partner 및 Relationship 자동 생성
- tone_samples 배치 저장 (관계 카테고리별)
- 파싱 통계 정보 반환

**코드 품질:**
- TypeScript 타입 안정성 100%
- ESLint 오류 0개
- Prettier 포맷팅 적용
- 명확한 에러 메시지 (사용자 이름 불일치 등)

**주요 개선 사항:**
- 회원가입 시 `name` 필드 필수 (카카오톡 발신자 이름과 일치해야 함)
- Swagger Bearer 인증 통합
- App Controller 숨김 처리

---

## 🚧 현재 제한사항

### 미구현 기능
- ❌ **임베딩 생성**: OpenAI API 연동 미구현 (tone_samples의 embedding 컬럼 비어있음)
- ❌ **텔레그램 메시지 DB 저장**: 현재 인메모리 저장만
- ❌ **OpenAI GPT 통합**: AI 답변 하드코딩 (실제 GPT 호출 미구현)
- ❌ **Relationship 관리**: CRUD API 미구현 (생성만 가능)
- ❌ **Partner 관리**: 중복 체크 및 업데이트 로직 미구현

### 알려진 이슈
- 텔레그램 봇이 서버 재시작 시 인메모리 메시지 손실
- user_id 하드코딩 (텔레그램 서비스에서)
- Partner 중복 생성 가능 (같은 이름으로 여러 번 업로드 시)

---

## 📋 다음 단계

### 🎯 Phase 3: OpenAI 임베딩 생성 (우선순위: 높음)
**목표**: tone_samples의 텍스트를 OpenAI API로 임베딩 생성 → DB 저장

**구현 항목:**
1. **OpenAI Module 생성**
   - OpenAI SDK 설치 (`npm install openai`)
   - 환경 변수 설정 (`OPENAI_API_KEY`)

2. **Embedding Service 구현**
   - `POST /kakao/generate-embeddings` - 배치 임베딩 생성
   - text-embedding-3-small 모델 사용 (1536차원)
   - 배치 처리 (한 번에 100개씩)
   - 진행 상황 반환

3. **DB 저장 로직**
   - Prisma raw query로 vector 타입 저장
   - 이미 임베딩이 있는 항목은 스킵
   - 트랜잭션 처리

### 🎯 Phase 4: 텔레그램 DB 저장 (우선순위: 중간)
**목표**: 인메모리 → DB 영구 저장

**구현 항목:**
1. Partner 자동 매핑 (`telegram_id`)
2. Conversation & Message 저장
3. Relationship 확인 및 관계 설정 요청

### 🎯 Phase 5: GPT 통합 (우선순위: 중간)
**목표**: 실제 AI 답변 생성

**구현 항목:**
1. GPT Service (RAG 기반 답변 생성)
2. 벡터 검색으로 유사 메시지 찾기
3. 프롬프트 엔지니어링

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
npm run lint
```

### API 테스트
```bash
# Swagger 문서
http://localhost:3000/api

# 회원가입 (name 필수!)
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"mingyu","email":"mingyu@test.com","password":"123456","name":"이민규"}'

# 로그인
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"mingyu@test.com","password":"123456"}'

# 카카오톡 업로드 (Swagger 사용 권장)
# 1. Swagger에서 Authorize 클릭
# 2. access_token 입력
# 3. POST /kakao/upload에서 파일 업로드

# Partner 목록 조회
curl -X GET http://localhost:3000/kakao/partners \
  -H "Authorization: Bearer {ACCESS_TOKEN}"
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

## 📊 용량 관련 정보

### PostgreSQL 용량
- **테이블 최대 크기**: 32 TB
- **메시지 1개당 크기**:
  - 텍스트만 (embedding 없음): ~250 bytes
  - 텍스트 + embedding: ~6,400 bytes

### 예상 사용량
- 3,000 메시지 (embedding 없음): ~0.75 MB
- 3,000 메시지 (embedding 포함): ~19 MB
- 50개 파일 (150,000 메시지): ~1 GB
- **결론**: 수십 개 파일 업로드는 전혀 문제없음

---

## 🎯 핵심 기술 개념

### JWT 인증
- Access Token: 15분 유효 (자주 갱신으로 보안 강화)
- Refresh Token: 30일 유효 (DB 저장, 재로그인 불편 감소)
- Stateless 인증 (서버 재시작해도 로그인 유지)
- Bearer Token 방식 (`Authorization: Bearer {token}`)

### 카카오톡 파싱
- 두 가지 형식 지원 (날짜 포함, 대괄호 형식)
- 날짜 헤더 자동 인식
- 사용자 이름 기반 필터링 (JWT의 user.name 사용)
- 시스템 메시지 자동 필터링

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
