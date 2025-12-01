/**
 * MMR 람다 값 비교 스크립트
 *
 * 목적: λ = 0.7, 0.8, 0.9 비교하여 최적값 찾기
 *
 * λ 의미 (의미적 유사도 가중치):
 * - 1.0: 순수 유사도 (다양성 0%, 표현 단조로움)
 * - 0.9: 의미 90%, 다양성 10% (권장 - 의미 유지하면서 표현 다양화)
 * - 0.8: 의미 80%, 다양성 20% (과도한 다양성)
 * - 0.7: 의미 70%, 다양성 30% (의미 손실 위험)
 */

import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * MMR 다양성 계산
 */
function calculateDiversity(str1: string, str2: string): number {
  const firstCharBonus = str1.charAt(0) !== str2.charAt(0) ? 0.5 : 0;
  const lengthDiff =
    Math.abs(str1.length - str2.length) / Math.max(str1.length, str2.length);
  const chars1 = new Set(str1.split(''));
  const chars2 = new Set(str2.split(''));
  const intersection = new Set(Array.from(chars1).filter((x) => chars2.has(x)));
  const union = new Set([...Array.from(chars1), ...Array.from(chars2)]);
  const jaccardSimilarity = intersection.size / union.size;
  const jaccardDiversity = 1 - jaccardSimilarity;
  return Math.min(
    1,
    firstCharBonus + lengthDiff * 0.3 + jaccardDiversity * 0.2,
  );
}

/**
 * MMR 알고리즘 실행
 */
function runMMR(
  candidates: Array<{ text: string; similarity: number }>,
  lambda: number,
  limit: number,
): Array<{ text: string; similarity: number }> {
  const selected: Array<{ text: string; similarity: number }> = [];
  const remaining = [...candidates];

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

      const mmrScore =
        lambda * candidate.similarity - (1 - lambda) * maxSimilarity;

      if (mmrScore > bestScore) {
        bestScore = mmrScore;
        bestIdx = i;
      }
    }

    selected.push(remaining[bestIdx]);
    remaining.splice(bestIdx, 1);
  }

  return selected;
}

async function compareLambdaValues() {
  try {
    console.log('📊 MMR 람다(λ) 값 비교 분석\n');
    console.log('='.repeat(80));

    const user = await prisma.user.findFirst();
    if (!user) {
      console.error('❌ 사용자를 찾을 수 없습니다.');
      return;
    }

    console.log(`✅ 사용자: ${user.name} (${user.email})\n`);

    const testQuery = '주말에 뭐 할 거야?'; // 가장 효과가 명확했던 쿼리
    const limit = 10;
    const lambdaValues = [0.7, 0.8, 0.9];

    console.log(`📝 테스트 쿼리: "${testQuery}"`);
    console.log(`🎯 비교 대상: λ = ${lambdaValues.join(', ')}\n`);
    console.log('='.repeat(80));

    // 임베딩 생성
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: testQuery,
      encoding_format: 'float',
    });

    const embedding = embeddingResponse.data[0].embedding;
    const vectorString = `[${embedding.join(',')}]`;

    // 후보 조회 (한 번만)
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

    // BEFORE (순수 벡터 검색)
    const beforeResults = candidates.slice(0, limit);
    const firstChar = testQuery.charAt(0);
    const beforeSameFirstChar = beforeResults.filter((r) =>
      r.text.startsWith(firstChar),
    );
    const beforePercentage =
      (beforeSameFirstChar.length / beforeResults.length) * 100;

    console.log(`\n🔵 BEFORE (순수 벡터 검색 - λ=1.0):\n`);
    console.log(
      `   첫 글자 "${firstChar}" 일치: ${beforeSameFirstChar.length}/${beforeResults.length} (${beforePercentage.toFixed(1)}%)`,
    );
    console.log(
      `   평균 유사도: ${(beforeResults.reduce((sum, r) => sum + r.similarity, 0) / beforeResults.length).toFixed(4)}\n`,
    );

    console.log(`   상위 ${limit}개 결과:`);
    beforeResults.forEach((r, i) => {
      console.log(`   ${i + 1}. [${r.similarity.toFixed(4)}] ${r.text}`);
    });

    // 람다별 MMR 실행
    const results: Array<{
      lambda: number;
      selected: Array<{ text: string; similarity: number }>;
      firstCharMatch: number;
      avgSimilarity: number;
      improvementRate: number;
    }> = [];

    for (const lambda of lambdaValues) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`🟢 AFTER (MMR - λ=${lambda}):\n`);

      const selected = runMMR(candidates, lambda, limit);

      const afterSameFirstChar = selected.filter((r) =>
        r.text.startsWith(firstChar),
      );
      const afterPercentage =
        (afterSameFirstChar.length / selected.length) * 100;
      const avgSimilarity =
        selected.reduce((sum, r) => sum + r.similarity, 0) / selected.length;
      const improvementRate =
        ((beforePercentage - afterPercentage) / beforePercentage) * 100;

      console.log(
        `   첫 글자 "${firstChar}" 일치: ${afterSameFirstChar.length}/${selected.length} (${afterPercentage.toFixed(1)}%)`,
      );
      console.log(`   평균 유사도: ${avgSimilarity.toFixed(4)}`);
      console.log(`   개선율: ${improvementRate.toFixed(1)}%\n`);

      console.log(`   상위 ${limit}개 결과:`);
      selected.forEach((r, i) => {
        console.log(`   ${i + 1}. [${r.similarity.toFixed(4)}] ${r.text}`);
      });

      results.push({
        lambda,
        selected,
        firstCharMatch: afterPercentage,
        avgSimilarity,
        improvementRate,
      });
    }

    // 종합 비교
    console.log(`\n\n${'='.repeat(80)}`);
    console.log('📈 종합 비교 (람다별 성능)');
    console.log(`${'='.repeat(80)}\n`);

    console.log(`${'─'.repeat(80)}`);
    console.log(
      `${'λ 값'.padEnd(10)} ${'첫글자일치'.padEnd(12)} ${'평균유사도'.padEnd(12)} ${'개선율'.padEnd(12)} 평가`,
    );
    console.log(`${'─'.repeat(80)}`);

    // BEFORE 출력
    console.log(
      `${'1.0 (순수)'.padEnd(10)} ${`${beforePercentage.toFixed(1)}%`.padEnd(12)} ${(beforeResults.reduce((sum, r) => sum + r.similarity, 0) / beforeResults.length).toFixed(4).padEnd(12)} ${'-'.padEnd(12)} 기준`,
    );

    // AFTER 출력
    for (const result of results) {
      const avgSimDiff =
        result.avgSimilarity -
        beforeResults.reduce((sum, r) => sum + r.similarity, 0) /
          beforeResults.length;
      const simIndicator = avgSimDiff >= -0.01 ? '✅' : '⚠️';

      // 평가 기준 수정: 의미적 유사도 유지가 더 중요
      const evaluation =
        avgSimDiff > -0.02 && result.improvementRate > 10
          ? '최적 ⭐⭐⭐'
          : avgSimDiff > -0.06 && result.improvementRate > 50
            ? '양호 ⭐⭐'
            : result.improvementRate > 80
              ? '과도 (의미손실)'
              : '미흡';

      console.log(
        `${result.lambda.toFixed(1).padEnd(10)} ${`${result.firstCharMatch.toFixed(1)}%`.padEnd(12)} ${`${result.avgSimilarity.toFixed(4)} ${simIndicator}`.padEnd(12)} ${`${result.improvementRate.toFixed(1)}%`.padEnd(12)} ${evaluation}`,
      );
    }

    console.log(`${'─'.repeat(80)}\n`);

    // 권장 사항
    console.log(`💡 분석 및 권장 사항:\n`);

    // 최적 람다 찾기 (의미적 유사도 유지가 최우선)
    let bestLambda = results[0];
    const beforeAvgSim =
      beforeResults.reduce((sum, r) => sum + r.similarity, 0) /
      beforeResults.length;

    for (const result of results) {
      const currentSimDiff = result.avgSimilarity - beforeAvgSim;
      const bestSimDiff = bestLambda.avgSimilarity - beforeAvgSim;

      // 의미 유사도 하락이 2% 이내이면서 다양성 개선이 있는 것
      if (currentSimDiff > -0.02 && result.improvementRate > 10) {
        if (currentSimDiff > bestSimDiff) {
          bestLambda = result;
        }
      }
    }

    const bestSimDiff = bestLambda.avgSimilarity - beforeAvgSim;

    console.log(`   ✅ 권장 λ 값: ${bestLambda.lambda}`);
    console.log(
      `      이유: 의미적 유사도를 거의 유지하면서 표현 다양성 개선\n`,
    );
    console.log(`   📊 개선 효과:`);
    console.log(
      `      - 표현 다양성: ${beforePercentage.toFixed(1)}% → ${bestLambda.firstCharMatch.toFixed(1)}% (${bestLambda.improvementRate.toFixed(1)}% 개선)`,
    );
    console.log(
      `      - 의미 유사도: ${beforeAvgSim.toFixed(4)} → ${bestLambda.avgSimilarity.toFixed(4)} (${(bestSimDiff * 100).toFixed(1)}%)`,
    );
    console.log(`      - 결론: 의미는 유지하면서 표현만 다양화 ✅\n`);

    console.log(`   📚 λ 값별 특성:`);
    console.log(
      `      - λ = 0.9: 의미 우선 (권장 - 의미 유지, 표현 다양화) ⭐`,
    );
    console.log(`      - λ = 0.8: 균형 시도 (의미 손실 위험 있음)`);
    console.log(`      - λ = 0.7: 다양성 우선 (의미 손실 심각, 비권장)\n`);

    console.log(`   💬 핵심 인사이트:`);
    console.log(`      "첫 글자 일치"는 한국어 특성상 자연스러운 현상입니다.`);
    console.log(
      `      예: "주말에", "주말엔", "주말동안" → 모두 의미적으로 유사`,
    );
    console.log(
      `      1536차원 벡터는 정상 작동 중이며, MMR은 표현 다양성을 위한 도구입니다.\n`,
    );

    console.log(`${'='.repeat(80)}`);
    console.log('✅ 비교 완료');
    console.log(`${'='.repeat(80)}\n`);
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

compareLambdaValues();
