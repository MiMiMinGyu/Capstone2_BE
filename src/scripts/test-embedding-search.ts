/**
 * 임베딩 검색 테스트 스크립트
 *
 * 목적: "잘잤니?"와 같은 쿼리가 실제로 의미적으로 유사한 결과를 반환하는지 확인
 *
 * 사용법: npx ts-node src/scripts/test-embedding-search.ts
 */

import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function testEmbeddingSearch() {
  try {
    console.log('🔍 임베딩 검색 테스트 시작\n');

    // 1. 테스트할 쿼리들
    const testQueries = [
      '잘잤니?',
      '안녕',
      '밥먹었어?',
      '뭐해?',
    ];

    // 2. 사용자 ID 조회
    const user = await prisma.user.findFirst();
    if (!user) {
      console.error('❌ 사용자를 찾을 수 없습니다.');
      return;
    }

    console.log(`✅ 사용자: ${user.name} (${user.email})\n`);

    // 3. 각 쿼리에 대해 임베딩 검색 수행
    for (const query of testQueries) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📝 쿼리: "${query}"`);
      console.log(`${'='.repeat(80)}\n`);

      // 3.1. 쿼리 임베딩 생성
      console.log('⏳ 임베딩 생성 중...');
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query,
        encoding_format: 'float',
      });

      const embedding = embeddingResponse.data[0].embedding;
      const vectorString = `[${embedding.join(',')}]`;
      console.log(`✅ 임베딩 생성 완료 (차원: ${embedding.length})\n`);

      // 3.2. 하이브리드 검색 (BM25 + Vector)
      console.log('🔍 하이브리드 검색 중 (상위 10개)...\n');
      const results = await prisma.$queryRaw<
        Array<{
          text: string;
          similarity: number;
          keyword_score: number;
          vector_score: number;
          category: string | null;
          politeness: string | null;
          vibe: string | null;
        }>
      >`
        SELECT
          ts.text,
          (
            0.3 * COALESCE(ts_rank_cd(ts.text_search_vector, plainto_tsquery('simple', ${query})), 0) +
            0.7 * (1 - (ts.embedding <=> ${vectorString}::vector))
          ) as similarity,
          COALESCE(ts_rank_cd(ts.text_search_vector, plainto_tsquery('simple', ${query})), 0) as keyword_score,
          (1 - (ts.embedding <=> ${vectorString}::vector)) as vector_score,
          ts.category,
          ts.politeness,
          ts.vibe
        FROM tone_samples ts
        WHERE ts.user_id = ${user.id}::uuid
          AND ts.embedding IS NOT NULL
          AND ts.text_search_vector IS NOT NULL
        ORDER BY similarity DESC
        LIMIT 10
      `;

      // 3.3. 결과 출력
      if (results.length === 0) {
        console.log('❌ 검색 결과가 없습니다.');
        continue;
      }

      console.log(`✅ 검색 결과 (${results.length}개):\n`);
      results.forEach((result, index) => {
        console.log(
          `  ${index + 1}. [전체: ${result.similarity.toFixed(4)}, 키워드: ${result.keyword_score.toFixed(4)}, 벡터: ${result.vector_score.toFixed(4)}] ${result.text}`,
        );
        console.log(
          `     카테고리: ${result.category || 'N/A'}, 존댓말: ${result.politeness || 'N/A'}, 분위기: ${result.vibe || 'N/A'}\n`,
        );
      });

      // 3.4. 분석: 첫 글자가 같은 결과가 몇 개인지 확인
      const firstChar = query.charAt(0);
      const sameFirstChar = results.filter((r) =>
        r.text.startsWith(firstChar),
      );
      const percentage = ((sameFirstChar.length / results.length) * 100).toFixed(
        1,
      );

      console.log(`\n📊 분석:`);
      console.log(
        `   - 쿼리 첫 글자: "${firstChar}" 로 시작하는 결과: ${sameFirstChar.length}/${results.length} (${percentage}%)`,
      );

      if (parseInt(percentage) > 50) {
        console.log(
          `   ⚠️  경고: 첫 글자 일치 비율이 ${percentage}%로 너무 높습니다. 의미적 검색이 아닌 문자 매칭일 가능성이 있습니다.`,
        );
      } else {
        console.log(
          `   ✅ 정상: 의미적 유사도 검색이 올바르게 작동하는 것으로 보입니다.`,
        );
      }
    }

    console.log(`\n\n${'='.repeat(80)}`);
    console.log('✅ 테스트 완료');
    console.log(`${'='.repeat(80)}\n`);
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testEmbeddingSearch();
