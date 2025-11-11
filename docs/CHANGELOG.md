# 변경 이력

## [2025-11-11 15:30] AI 팀 FastAPI 코드 수령 및 통합 계획 수립

### 주요 변경사항

#### 1. AI 팀 FastAPI 코드 분석
**수령 파일:**
- `app.py` - FastAPI 기반 GPT 프롬프트 로직 구현

**분석 결과:**
- GPT 모델: `gpt-4o-mini` (저렴, 빠름)
- Temperature: 0.7, Max Tokens: 60 (짧은 답변)
- 프롬프트: 말투 프로필 + 수신자 정보 포함
- **문제점**: DB 미사용, 임베딩 없음, API 키 하드코딩

#### 2. 통합 계획 수립
**결정 사항:**
- FastAPI를 별도 서버로 운영하지 않음
- NestJS에 직접 통합하기로 결정

**이유:**
1. DB 데이터가 이미 NestJS에 있음
2. 임베딩 생성도 NestJS에서 진행 예정
3. Telegram 연동도 NestJS에 구현됨
4. 별도 서버 운영 시 복잡도 증가

#### 3. GPT 통합 계획 문서 작성
**새로 생성된 문서:**
- `docs/GPT_INTEGRATION_PLAN.md` - 완벽한 통합 계획서 (600줄)

**포함 내용:**
- FastAPI 코드 상세 분석
- AI 팀 요구사항 vs 현재 구현 비교
- 통합 아키텍처 설계
- Phase별 구현 계획 (Phase 1-4)
- 예상 소요 시간 및 비용 분석
- 코드 예제 (TypeScript)

#### 4. AI 팀 요구사항 검증
**요구사항 항목:**
```
GPT 프롬프트 입력 = {
  recent_context: 최근 대화 5개 (무조건 포함),
  similar_context: 임베딩 기반 유사 발화 top 3 (맥락 참고용),
  style_profile: 사용자 고유 말투 프로필 (txt),
  receiver: 상대방 정보 (존댓말/반말 등)
}
```

**구현 상태:**
- ✅ `recent_context`: 구현됨 (getConversationMessages)
- ⏳ `similar_context`: Phase 2 필요 (임베딩 생성)
- ❓ `style_profile`: AI 팀과 협의 필요 (txt 파일 방법 불명확)
- ✅ `receiver`: 구현됨 (relationships 테이블)

#### 5. 문서 업데이트
**수정된 문서:**
- `docs/CURRENT_STATUS.md` - AI 팀 코드 수령 및 통합 계획 반영
- `docs/CHANGELOG.md` - 현재 파일 업데이트

**추가된 섹션:**
- GPT 통합 로드맵 (Phase 1-4)
- FastAPI 코드 분석 결과
- AI 팀 요구사항 검증

### 다음 작업 (Phase 1)
- [ ] OpenAI SDK 설치 (`npm install openai`)
- [ ] 환경변수 설정 (`OPENAI_API_KEY`)
- [ ] OpenAI Module 생성
- [ ] OpenaiService 구현 (임베딩, GPT)

---

## [2025-11-11 14:00] Phase 4: Telegram DB 저장 구현 + Prisma 마이그레이션 전환

### 주요 변경사항

#### 1. Prisma 마이그레이션 방식 전환
**변경 사항:**
- ❌ 삭제: `init.sql` (더 이상 사용하지 않음)
- ✅ 채택: Prisma 마이그레이션으로 단일 소스 관리
- `docker-compose.yml`에서 init.sql 마운트 제거

**이유:**
- 스키마 동기화 문제 해결 (init.sql vs schema.prisma)
- 버전 관리 및 협업 편의성 향상
- 데이터베이스 변경 이력 추적

#### 2. User 스키마에 telegram_id 추가
**변경 사항:**
- `users` 테이블에 `telegram_id` VARCHAR(100) UNIQUE 컬럼 추가
- 마이그레이션: `20251111103555_add_telegram_id_to_user`

**사용 목적:**
- 텔레그램 봇 소유자 식별 (추후 기능)
- 현재는 TEMP_USER_ID로 하드코딩 상태

#### 3. Telegram 메시지 DB 저장 로직 구현
**구현 파일:**
- `src/modules/telegram/telegram.service.ts` - `saveReceivedMessage` 메서드 수정

**구현 내용:**
```typescript
// 1. Partner upsert (telegram_id 기준)
// 2. User 조회 (현재: TEMP_USER_ID, 추후: 환경변수)
// 3. Conversation upsert (user_id + partner_id)
// 4. Message 저장 (role: user)
// 5. 인메모리 저장 (기존 API 호환성)
// 6. SSE 이벤트 발송
```

**아키텍처 명확화:**
- **User**: 봇 소유자 (서비스 회원, JWT 인증)
- **Partner**: 메시지 발신자 (외부 텔레그램 사용자, telegram_id 식별)

#### 4. 문서 업데이트
**수정된 문서:**
- `docs/SETUP_GUIDE.md` - Prisma 마이그레이션 워크플로우 추가
- `docs/CURRENT_STATUS.md` - Phase 4 진행 상황 반영
- `docs/CHANGELOG.md` - 변경 이력 기록 (현재 파일)

**추가된 섹션:**
- Prisma 마이그레이션 관리 방법
- 스키마 변경 워크플로우
- 트러블슈팅 가이드

### 파일 변경 사항
- ❌ 삭제: `init.sql`
- ✅ 수정: `docker-compose.yml` - init.sql 마운트 제거
- ✅ 수정: `prisma/schema.prisma` - telegram_id 필드 추가
- ✅ 추가: `prisma/migrations/20251111103555_add_telegram_id_to_user/`
- ✅ 수정: `src/modules/telegram/telegram.service.ts` - DB 저장 로직
- ✅ 수정: `docs/SETUP_GUIDE.md`
- ✅ 수정: `docs/CURRENT_STATUS.md`
- ✅ 수정: `docs/CHANGELOG.md`

### TODO (다음 단계)
- [ ] TEMP_USER_ID를 환경변수로 대체
- [ ] 채팅 목록 API 구현 (`GET /telegram/conversations`)
- [ ] 대화 히스토리 API 구현 (`GET /telegram/conversations/:partnerId/messages`)
- [ ] Relationship 관리 API 구현

---

## [2025-11-07 16:30] Kakao 모듈 완전 구현

### 주요 변경사항

#### 1. 카카오톡 파일 업로드 기능 완성
**구현된 기능:**
- ✅ `POST /kakao/upload` - 카카오톡 txt 파일 업로드 및 파싱
- ✅ `GET /kakao/partners` - Partner 목록 조회
- ✅ 두 가지 카카오톡 형식 지원
- ✅ 사용자 이름 기반 메시지 필터링
- ✅ Partner & Relationship 자동 생성
- ✅ tone_samples 배치 저장

#### 2. KakaoTxt Parser 구현
**지원 형식:**
- 형식 1: `2024. 1. 15. 오후 3:45, 홍길동 : 안녕하세요`
- 형식 2: `[이민규] [오후 1:03] 저는 아직 시간표도 못 짰습니다`
- 날짜 헤더: `--------------- 2025년 8월 5일 화요일 ---------------`

**파싱 로직:**
- 정규식 기반 메시지 추출
- 날짜 헤더 자동 인식 및 추적
- 시스템 메시지 (초대 메시지 등) 자동 필터링
- 타임스탬프 생성 (오전/오후 → 24시간 변환)

#### 3. 사용자 이름 기반 필터링
**변경 사항:**
- 기존: `"나"` 하드코딩 방식
- 개선: JWT에서 `user.name` 가져와서 사용
- 회원가입 시 `name` 필드 필수 (카카오톡 발신자 이름과 일치해야 함)

**에러 처리:**
- 사용자 정보 없음: "사용자 정보를 찾을 수 없습니다"
- 이름 불일치: "이민규이(가) 보낸 메시지를 찾을 수 없습니다"
- 명확한 에러 메시지로 UX 향상

#### 4. Kakao 모듈 구조
```
src/modules/kakao/
├── kakao.module.ts
├── kakao.controller.ts
├── kakao.service.ts
├── dto/
│   ├── upload-kakao.dto.ts  # partner_name, relationship_category
│   └── index.ts
└── parsers/
    └── kakao-txt.parser.ts  # 두 가지 형식 파싱
```

#### 5. Swagger 개선
**변경 사항:**
- Bearer 인증 통합 완료 (`@ApiBearerAuth('access-token')`)
- App Controller 숨김 처리 (`@ApiExcludeController()`)
- 상세한 API 문서화 (request/response 예시)
- Multipart 파일 업로드 스키마 정의

#### 6. ESLint 설정 개선
**추가된 규칙:**
```javascript
'@typescript-eslint/no-unused-vars': [
  'warn',
  {
    argsIgnorePattern: '^_',
    varsIgnorePattern: '^_',
    caughtErrorsIgnorePattern: '^_',
  },
]
```
- 구조 분해에서 `_` 사용 시 경고 무시

#### 7. 기술적 개선사항
- TypeScript 타입 안정성 100% 유지
- RequestWithUser 인터페이스 정의
- 명확한 에러 처리 및 메시지
- Prettier 포맷팅 적용

### 파일 변경 사항
- 추가: `src/modules/kakao/*` (6개 파일)
- 수정: `src/app.module.ts` - KakaoModule 추가
- 수정: `src/main.ts` - Bearer 인증 설정
- 수정: `src/app.controller.ts` - Swagger 숨김
- 수정: `eslint.config.mjs` - unused vars 규칙
- 수정: `docs/CURRENT_STATUS.md` - 최신 상태 반영

### 다음 단계
- Phase 3: OpenAI 임베딩 생성 구현
- Phase 4: 텔레그램 DB 저장
- Phase 5: GPT 통합 (RAG 기반 답변)

---

## [2025-11-07] Auth 모듈 완전 구현 및 최적화

### 주요 변경사항

#### 1. JWT 기반 인증 시스템 완성
**구현된 기능:**
- ✅ 회원가입 (`POST /auth/register`)
- ✅ 로그인 (`POST /auth/login`)
- ✅ Access Token 갱신 (`POST /auth/refresh`)
- ✅ 현재 사용자 정보 조회 (`GET /auth/me`)
- ✅ 로그아웃 (`POST /auth/logout`)

**보안 구현:**
- bcrypt 비밀번호 해싱 (saltRounds: 10)
- JWT Access Token (15분 유효)
- JWT Refresh Token (30일 유효, DB 저장)
- Passport JWT Strategy
- JWT Auth Guard (인증 보호)

#### 2. Auth 모듈 구조
```
src/modules/auth/
├── auth.module.ts          # 모듈 설정
├── auth.controller.ts      # 5개 엔드포인트
├── auth.service.ts         # 인증 로직
├── dto/                    # 요청 검증
│   ├── register.dto.ts
│   ├── login.dto.ts
│   ├── refresh.dto.ts
│   └── index.ts
├── guards/
│   └── jwt-auth.guard.ts   # 인증 가드
├── interfaces/             # 타입 정의
│   ├── jwt-user.interface.ts
│   ├── auth-response.interface.ts
│   └── index.ts
└── strategies/
    └── jwt.strategy.ts     # JWT 전략
```

#### 3. 데이터베이스 스키마 업데이트
**users 테이블 컬럼 추가:**
- `email` VARCHAR(255) UNIQUE NOT NULL - 로그인용 이메일
- `password_hash` VARCHAR(255) NOT NULL - 해싱된 비밀번호
- `refresh_token` VARCHAR(500) - Refresh Token 저장

#### 4. 문서화 완료
**새로 생성된 문서:**
- `docs/API_SPECIFICATION.md` - 프론트엔드용 완벽한 API 명세
- `docs/AUTH_ARCHITECTURE.md` - JWT 인증 아키텍처 완벽 가이드 (1000줄)
- `docs/CURRENT_STATUS.md` - 프로젝트 현재 상태
- `docs/IMPLEMENTATION_PLAN.md` - 전체 구현 계획

**업데이트된 문서:**
- `docs/FRONTEND_INTEGRATION.md` - Auth 연동 예시 코드 추가
- `README.md` - 프로젝트 개요 업데이트
- `docs/DB_SCHEMA.md` - users 테이블 스키마 업데이트
- `docs/CHANGELOG.md` - 변경 이력 업데이트 (현재 파일)

**삭제된 문서:**
- `docs/NEW_DIRECTION.md` - 더 이상 필요 없음

#### 5. 코드 품질
- TypeScript 타입 안정성 100%
- ESLint 오류 0개
- class-validator를 통한 DTO 검증
- Swagger API 문서화 완료
- 인터페이스 통합 및 재사용성 향상

#### 6. 기술 스택 추가
**인증 관련:**
- `@nestjs/passport` - Passport 통합
- `@nestjs/jwt` - JWT 지원
- `passport-jwt` - JWT Strategy
- `bcrypt` - 비밀번호 해싱

---

## [2025-01-04] 프로젝트 방향성 변경 및 DB 스키마 재설계

### 주요 변경사항

#### 1. 아키텍처 변경
- **모델**: LLAMA (자체 서빙) → GPT (OpenAI API 호출)
- **벡터 DB**: Chroma/Pinecone → PostgreSQL + pgvector 확장
- **메시징**: 카카오톡 텍스트 파싱 → Telegram Bot API

#### 2. 데이터베이스 스키마 재설계

**새로운 테이블**:
- `users` - 사용자 테이블 (다중 사용자 지원)
- `partners` - 대화 상대방 테이블
- `conversations` - 대화 세션 테이블
- `messages` - 메시지 테이블
- `relationships` - 상대방별 관계 설정 (10개 카테고리)
- `style_profiles` - 사용자별 전역 스타일 프로필
- `tone_samples` - 톤 샘플 테이블 (RAG, pgvector)
- `knowledge_chunks` - 지식 청크 테이블 (RAG, 옵션)
- `message_embeddings` - 메시지 임베딩 테이블 (옵션)

**삭제된 테이블**:
- `partners` (구버전) - 새 스키마로 대체
- `conversation_history` (구버전) - `messages` 테이블로 대체

#### 3. 10개 관계 카테고리 도입

**가족 관계** (3개):
1. `FAMILY_ELDER_CLOSE` - 부모/조부모 등 어른 가족
2. `FAMILY_SIBLING_ELDER` - 형/오빠/언니/누나
3. `FAMILY_SIBLING_YOUNGER` - 남/여 동생

**친밀한 관계** (2개):
4. `PARTNER_INTIMATE` - 연인/배우자
5. `FRIEND_CLOSE` - 친한 친구

**일반 관계** (1개):
6. `ACQUAINTANCE_CASUAL` - 가벼운 지인

**업무 관계** (4개):
7. `WORK_SENIOR_FORMAL` - 상사/교수/임원
8. `WORK_SENIOR_FRIENDLY` - 가까운 선배/멘토
9. `WORK_PEER` - 동료/협업자
10. `WORK_JUNIOR` - 후배/팀원

각 카테고리별로 **말투**, **격식**, **이모지 사용 빈도**를 세밀하게 조정

#### 4. 파일 변경

**새로 생성된 파일**:
- `prisma/schema.prisma` - Prisma 스키마 정의
- `DB_SCHEMA.md` - DB 스키마 상세 설명 문서
- `SETUP_GUIDE.md` - 프로젝트 설정 가이드
- `CHANGELOG.md` - 변경 이력 (현재 파일)

**업데이트된 파일**:
- `README.md` - 새로운 프로젝트 개요 및 가이드
- `init.sql` - PostgreSQL + pgvector 기반 새 스키마
- `docker-compose.yml` - ankane/pgvector 이미지 사용
- `.gitignore` - Python 캐시 제외 추가

**삭제된 파일**:
- `NEXT_STEPS.md` - 구버전 Prisma 설정 가이드 (SETUP_GUIDE.md로 대체)
- `test_connection.py` - 구버전 테스트 스크립트
- `test_db.py` - 구버전 테스트 스크립트

#### 5. 기술 스택 변경

**데이터베이스**:
- PostgreSQL 15 → PostgreSQL 16 (ankane/pgvector:v0.5.1)
- pgvector 확장 추가

**ORM**:
- Prisma 도입 (schema.prisma 작성 완료)

**AI/임베딩**:
- OpenAI GPT API
- OpenAI text-embedding-3-small (1536차원)

---

## [이전] 초기 설정

### 초기 구현 내용
- NestJS 프로젝트 생성
- Docker Compose로 PostgreSQL 설정
- 기본 테이블 (partners, conversation_history) 생성
- Telegram Bot API 연동 기본 구현

---

## 다음 작업 (예정)

### 백엔드 개발
- [x] Prisma 모듈 NestJS 통합 ✅
- [x] Auth 모듈 구현 (JWT 인증) ✅
- [ ] 관계 설정 CRUD API 구현
- [ ] 대화 관리 CRUD API 구현
- [ ] 톤 샘플 관리 API 구현
- [ ] 카카오톡 txt 파일 업로드 및 파싱

### AI/RAG 시스템
- [ ] OpenAI API 연동
- [ ] 임베딩 생성 워커 구현
- [ ] pgvector 유사도 검색 구현
- [ ] RAG 컨텍스트 구성 로직

### 오케스트레이션
- [ ] 컨텍스트 수집 로직
- [ ] AI 페이로드 생성
- [ ] GPT 호출 및 재시도 로직
- [ ] 응답 후처리 (문장 수 제한, 반문 금지 등)

### Telegram 연동
- [x] Telegram 봇 연동 (Long Polling) ✅
- [x] SSE 실시간 메시지 알림 ✅
- [ ] 텔레그램 메시지 DB 저장
- [ ] 웹훅 설정 (옵션)
- [ ] 에러 처리 및 로깅

---

## 참고 문서

- [API_SPECIFICATION.md](./API_SPECIFICATION.md) - API 명세서 (프론트엔드용)
- [AUTH_ARCHITECTURE.md](./AUTH_ARCHITECTURE.md) - JWT 인증 아키텍처 가이드
- [FRONTEND_INTEGRATION.md](./FRONTEND_INTEGRATION.md) - 프론트엔드 연동 가이드
- [CURRENT_STATUS.md](./CURRENT_STATUS.md) - 프로젝트 현재 상태
- [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) - 전체 구현 계획
- [DB_SCHEMA.md](./DB_SCHEMA.md) - DB 스키마 상세 설명
- [SETUP_GUIDE.md](./SETUP_GUIDE.md) - 프로젝트 설정 가이드
- [README.md](./README.md) - 프로젝트 개요 및 빠른 시작
