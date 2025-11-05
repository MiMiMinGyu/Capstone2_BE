-- ===================================================================
-- 챗봇 프로젝트 데이터베이스 초기화 스크립트
-- PostgreSQL + pgvector 기반 RAG 시스템
-- PostgreSQL 컨테이너 최초 생성 시 자동으로 실행됩니다.
-- ===================================================================

-- UUID 확장 활성화 (UUID 타입 사용을 위해 필요)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- pgvector 확장 활성화 (벡터 연산을 위해 필요)
CREATE EXTENSION IF NOT EXISTS vector;

-- ===================================================================
-- 열거형 타입 정의
-- ===================================================================

-- 관계 카테고리 (10개)
CREATE TYPE "RelationshipCategory" AS ENUM (
  'FAMILY_ELDER_CLOSE',      -- 부모/조부모/삼촌·이모 등 어른 가족
  'FAMILY_SIBLING_ELDER',    -- 형/오빠/언니/누나
  'FAMILY_SIBLING_YOUNGER',  -- 남/여 동생
  'PARTNER_INTIMATE',        -- 연인/배우자
  'FRIEND_CLOSE',            -- 친한 친구
  'ACQUAINTANCE_CASUAL',     -- 가벼운 지인/처음 만난 또래
  'WORK_SENIOR_FORMAL',      -- 상사/교수/연장자 고객 임원
  'WORK_SENIOR_FRIENDLY',    -- 가까운 선배·상사/멘토
  'WORK_PEER',               -- 동료/타팀 협업자/파트너 동급
  'WORK_JUNIOR'              -- 후배/인턴/팀원
);

-- 존댓말 레벨
CREATE TYPE "PolitenessLevel" AS ENUM (
  'FORMAL',   -- 격식 존댓말 (–습니다/–하십시오)
  'POLITE',   -- 일반 존댓말 (–요)
  'CASUAL'    -- 반말
);

-- 말투 분위기
CREATE TYPE "VibeType" AS ENUM (
  'CALM',     -- 차분
  'DIRECT',   -- 직설
  'PLAYFUL',  -- 장난
  'CARING'    -- 배려
);

-- 메시지 역할
CREATE TYPE "MessageRole" AS ENUM (
  'user',
  'assistant',
  'system'
);

-- ===================================================================
-- 테이블 생성
-- ===================================================================

-- 1. 사용자 테이블
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. 대화 상대방 테이블
CREATE TABLE IF NOT EXISTS partners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    telegram_id VARCHAR(100) UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. 대화 세션 테이블
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, partner_id)
);

-- 4. 메시지 테이블
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role "MessageRole" NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. 관계 설정 테이블
CREATE TABLE IF NOT EXISTS relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    category "RelationshipCategory" NOT NULL,
    politeness "PolitenessLevel" DEFAULT 'POLITE',
    vibe "VibeType" DEFAULT 'CALM',
    emoji_level SMALLINT DEFAULT 0 CHECK (emoji_level >= 0 AND emoji_level <= 3),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, partner_id)
);

-- 6. 스타일 프로필 테이블
CREATE TABLE IF NOT EXISTS style_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    honorific_rules JSONB DEFAULT '{}',
    constraints JSONB DEFAULT '{}',
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 7. 톤 샘플 테이블 (RAG)
CREATE TABLE IF NOT EXISTS tone_samples (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    category "RelationshipCategory",
    politeness "PolitenessLevel",
    vibe "VibeType",
    embedding vector(1536),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 8. 지식 청크 테이블 (RAG - 옵션)
CREATE TABLE IF NOT EXISTS knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source VARCHAR(255),
    title VARCHAR(255),
    chunk TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    embedding vector(1536),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 9. 메시지 임베딩 테이블 (옵션)
CREATE TABLE IF NOT EXISTS message_embeddings (
    message_id UUID PRIMARY KEY REFERENCES messages(id) ON DELETE CASCADE,
    embedding vector(1536) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ===================================================================
-- 인덱스 생성
-- ===================================================================

-- Conversations 인덱스
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_partner_id ON conversations(partner_id);

-- Messages 인덱스
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at);

-- Relationships 인덱스
CREATE INDEX IF NOT EXISTS idx_relationships_user_id ON relationships(user_id);
CREATE INDEX IF NOT EXISTS idx_relationships_partner_id ON relationships(partner_id);

-- Tone Samples 인덱스
CREATE INDEX IF NOT EXISTS idx_tone_samples_user_id ON tone_samples(user_id);
CREATE INDEX IF NOT EXISTS idx_tone_samples_category ON tone_samples(category);

-- pgvector HNSW 인덱스 (벡터 유사도 검색 최적화)
-- 코사인 유사도 기반
CREATE INDEX IF NOT EXISTS idx_tone_samples_embedding ON tone_samples USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding ON knowledge_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_message_embeddings_embedding ON message_embeddings USING hnsw (embedding vector_cosine_ops);

-- Knowledge Chunks 인덱스
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_user_id ON knowledge_chunks(user_id);

-- ===================================================================
-- 샘플 데이터 삽입
-- ===================================================================

-- 기본 사용자 추가
INSERT INTO users (username) VALUES ('default_user')
ON CONFLICT (username) DO NOTHING;

-- 샘플 상대방 추가
INSERT INTO partners (name, telegram_id) VALUES
    ('부모님', NULL),
    ('친구', NULL),
    ('상사님', NULL)
ON CONFLICT (telegram_id) DO NOTHING;

-- 샘플 관계 설정
WITH default_user AS (SELECT id FROM users WHERE username = 'default_user'),
     partner_parent AS (SELECT id FROM partners WHERE name = '부모님'),
     partner_friend AS (SELECT id FROM partners WHERE name = '친구'),
     partner_boss AS (SELECT id FROM partners WHERE name = '상사님')
INSERT INTO relationships (user_id, partner_id, category, politeness, vibe, emoji_level)
SELECT
    u.id,
    p.id,
    c.category,
    c.politeness,
    c.vibe,
    c.emoji_level
FROM default_user u
CROSS JOIN (
    SELECT
        (SELECT id FROM partner_parent) as id,
        'FAMILY_ELDER_CLOSE'::"RelationshipCategory" as category,
        'POLITE'::"PolitenessLevel" as politeness,
        'CARING'::"VibeType" as vibe,
        1 as emoji_level
    UNION ALL
    SELECT
        (SELECT id FROM partner_friend),
        'FRIEND_CLOSE'::"RelationshipCategory",
        'CASUAL'::"PolitenessLevel",
        'PLAYFUL'::"VibeType",
        2
    UNION ALL
    SELECT
        (SELECT id FROM partner_boss),
        'WORK_SENIOR_FORMAL'::"RelationshipCategory",
        'FORMAL'::"PolitenessLevel",
        'CALM'::"VibeType",
        0
) c(id, category, politeness, vibe, emoji_level)
JOIN partners p ON p.id = c.id
ON CONFLICT (user_id, partner_id) DO NOTHING;

-- 샘플 톤 샘플 추가 (임베딩은 애플리케이션에서 생성)
WITH default_user AS (SELECT id FROM users WHERE username = 'default_user')
INSERT INTO tone_samples (user_id, text, category, politeness, vibe)
SELECT
    u.id,
    t.text,
    t.category,
    t.politeness,
    t.vibe
FROM default_user u
CROSS JOIN (VALUES
    ('오늘은 한식 어떠세요?', 'FAMILY_ELDER_CLOSE'::"RelationshipCategory", 'POLITE'::"PolitenessLevel", 'CARING'::"VibeType"),
    ('가볍게 칼국수도 좋아요.', 'FAMILY_ELDER_CLOSE'::"RelationshipCategory", 'POLITE'::"PolitenessLevel", 'CARING'::"VibeType"),
    ('이번 주말에 영화 볼래?', 'FRIEND_CLOSE'::"RelationshipCategory", 'CASUAL'::"PolitenessLevel", 'PLAYFUL'::"VibeType"),
    ('좋아! 토요일 오후 2시 어때?', 'FRIEND_CLOSE'::"RelationshipCategory", 'CASUAL'::"PolitenessLevel", 'PLAYFUL'::"VibeType"),
    ('보고서 작성이 완료되었습니다.', 'WORK_SENIOR_FORMAL'::"RelationshipCategory", 'FORMAL'::"PolitenessLevel", 'CALM'::"VibeType"),
    ('검토 부탁드립니다.', 'WORK_SENIOR_FORMAL'::"RelationshipCategory", 'FORMAL'::"PolitenessLevel", 'CALM'::"VibeType")
) t(text, category, politeness, vibe);

-- ===================================================================
-- 초기화 완료 메시지
-- ===================================================================

DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE '챗봇 데이터베이스 초기화가 완료되었습니다.';
    RAISE NOTICE '===========================================';
    RAISE NOTICE '확장: uuid-ossp, pgvector';
    RAISE NOTICE '테이블: users, partners, conversations, messages';
    RAISE NOTICE '       relationships, style_profiles';
    RAISE NOTICE '       tone_samples, knowledge_chunks, message_embeddings';
    RAISE NOTICE '관계 카테고리: 10개 (FAMILY, PARTNER, FRIEND, WORK 등)';
    RAISE NOTICE '샘플 데이터: 사용자 1명, 상대방 3명, 관계 3개, 톤 샘플 6개';
    RAISE NOTICE '===========================================';
END $$;
