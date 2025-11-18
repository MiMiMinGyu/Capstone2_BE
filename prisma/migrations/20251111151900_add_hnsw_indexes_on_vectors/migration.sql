-- CreateIndex: HNSW 인덱스는 벡터 유사도 검색에 최적화됨
-- m=16: 그래프의 최대 연결 수 (기본값, 성능과 정확도 균형)
-- ef_construction=64: 인덱스 구축 시 탐색 깊이 (기본값)

-- ToneSample 테이블의 embedding 컬럼에 HNSW 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_tone_samples_embedding
ON "public"."tone_samples"
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- KnowledgeChunk 테이블의 embedding 컬럼에 HNSW 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding
ON "public"."knowledge_chunks"
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- MessageEmbedding 테이블의 embedding 컬럼에 HNSW 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_message_embeddings_embedding
ON "public"."message_embeddings"
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
