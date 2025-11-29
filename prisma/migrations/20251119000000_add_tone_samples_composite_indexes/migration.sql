-- CreateIndex: 복합 인덱스로 SQL 집계 쿼리 최적화
-- LLMService.getStyleProfile()에서 사용되는 WHERE user_id = ? AND politeness IS NOT NULL 쿼리 최적화

-- ToneSample 테이블의 (user_id, politeness) 복합 인덱스
CREATE INDEX IF NOT EXISTS idx_tone_samples_user_politeness
ON "public"."tone_samples" (user_id, politeness);

-- ToneSample 테이블의 (user_id, vibe) 복합 인덱스
CREATE INDEX IF NOT EXISTS idx_tone_samples_user_vibe
ON "public"."tone_samples" (user_id, vibe);
