# 변경 이력

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
- [ ] Prisma 모듈 NestJS 통합
- [ ] 관계 설정 CRUD API 구현
- [ ] 대화 관리 CRUD API 구현
- [ ] 톤 샘플 관리 API 구현

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
- [ ] 웹훅 설정
- [ ] 메시지 수신/송신 핸들러
- [ ] 에러 처리 및 로깅

---

## 참고 문서

- [NEW_DIRECTION.md](./NEW_DIRECTION.md) - 프로젝트 방향성 상세 변경사항
- [DB_SCHEMA.md](./DB_SCHEMA.md) - DB 스키마 상세 설명
- [SETUP_GUIDE.md](./SETUP_GUIDE.md) - 프로젝트 설정 가이드
- [README.md](./README.md) - 프로젝트 개요 및 빠른 시작
