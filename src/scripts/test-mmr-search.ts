/**
 * MMR 검색 테스트 스크립트
 */

import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function testMMRSearch() {
  try {
    console.log('🔍 MMR 다양성 검색 테스트 시작\n');

    const testQueries = ['안녕', '잘잤니?', '밥먹었어?'];

    const user = await prisma.user.findFirst();
    if (!user) {
      console.error('❌ 사용자를 찾을 수 없습니다.');
      return;
    }

    console.log(`✅ 사용자: ${user.name} (${user.email})\n`);

    for (const query of testQueries) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📝 쿼리: "${query}"`);
      console.log(`${'='.repeat(80)}\n`);

      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query,
        encoding_format: 'float',
      });

      const embedding = embeddingResponse.data[0].embedding;
      const vectorString = `[${embedding.join(',')}]`;

      // MMR 검색
      const limit = 10;
      const candidates = await prisma.$queryRaw<
        Array<{ text: string; similarity: number }>
      >`
        SELECT
          ts.text,
          1 - (ts.embedding <=> ${vectorString}::vector) as similarity
        FROM tone_samples ts
        WHERE ts.user_id = ${user.id}::uuid
          AND ts.embedding IS NOT NULL
        ORDER BY ts.embedding <=> ${vectorString}::vector
        LIMIT ${limit * 10}
      `;

      // MMR 알고리즘
      const selected: Array<{ text: string; similarity: number }> = [];
      const remaining = [...candidates];
      const lambda = 0.7;

      while (selected.length < limit && remaining.length > 0) {
        let bestIdx = 0;
        let bestScore = -Infinity;

        for (let i = 0; i < remaining.length; i++) {
          const candidate = remaining[i];

          let maxSimilarity = 0;
          for (const sel of selected) {
            const diversity = calculateDiversity(candidate.text, sel.text);
            const sim = 1 - diversity;
            maxSimilarity = Math.max(maxSimilarity, sim);
          }

          const mmrScore = lambda * candidate.similarity - (1 - lambda) * maxSimilarity;

          if (mmrScore > bestScore) {
            bestScore = mmrScore;
            bestIdx = i;
          }
        }

        selected.push(remaining[bestIdx]);
        remaining.splice(bestIdx, 1);
      }

      console.log(`✅ MMR 검색 결과 (${selected.length}개):\n`);
      selected.forEach((result, index) => {
        console.log(
          `  ${index + 1}. [유사도: ${result.similarity.toFixed(4)}] ${result.text}`,
        );
      });

      // 분석
      const firstChar = query.charAt(0);
      const sameFirstChar = selected.filter((r) => r.text.startsWith(firstChar));
      const percentage = ((sameFirstChar.length / selected.length) * 100).toFixed(1);

      console.log(`\n📊 다양성 분석:`);
      console.log(
        `   - 쿼리 첫 글자: "${firstChar}" 로 시작하는 결과: ${sameFirstChar.length}/${selected.length} (${percentage}%)`,
      );

      if (parseInt(percentage) > 50) {
        console.log(`   ⚠️  경고: 첫 글자 일치 비율이 여전히 높습니다.`);
      } else {
        console.log(`   ✅ 좋음: 다양한 샘플이 선택되었습니다.`);
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

function calculateDiversity(str1: string, str2: string): number {
  const firstCharBonus = str1.charAt(0) !== str2.charAt(0) ? 0.5 : 0;
  const lengthDiff =
    Math.abs(str1.length - str2.length) / Math.max(str1.length, str2.length);
  const chars1 = new Set(str1.split(''));
  const chars2 = new Set(str2.split(''));
  const intersection = new Set([...chars1].filter((x) => chars2.has(x)));
  const union = new Set([...chars1, ...chars2]);
  const jaccardSimilarity = intersection.size / union.size;
  const jaccardDiversity = 1 - jaccardSimilarity;
  return Math.min(1, firstCharBonus + lengthDiff * 0.3 + jaccardDiversity * 0.2);
}

testMMRSearch();
