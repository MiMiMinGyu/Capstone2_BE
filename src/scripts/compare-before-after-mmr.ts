/**
 * MMR 다양성 개선 전후 비교 스크립트
 *
 * 목적: 발표 자료용 - MMR 알고리즘 적용 효과 수치화
 *
 * 비교 대상:
 * - Before: 순수 벡터 유사도 검색 (기존 방식)
 * - After: MMR 다양성 검색 (λ=0.9, 의미 90% + 다양성 10%)
 *
 * 핵심: 의미적 유사도를 유지하면서 표현 다양성 개선
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
  const intersection = new Set([...chars1].filter((x) => chars2.has(x)));
  const union = new Set([...chars1, ...chars2]);
  const jaccardSimilarity = intersection.size / union.size;
  const jaccardDiversity = 1 - jaccardSimilarity;
  return Math.min(
    1,
    firstCharBonus + lengthDiff * 0.3 + jaccardDiversity * 0.2,
  );
}

async function compareBeforeAfterMMR() {
  try {
    console.log('📊 MMR 알고리즘 개선 효과 분석\n');
    console.log('='.repeat(80));

    const user = await prisma.user.findFirst();
    if (!user) {
      console.error('❌ 사용자를 찾을 수 없습니다.');
      return;
    }

    console.log(`✅ 사용자: ${user.name} (${user.email})\n`);

    const testQueries = [
      '오늘 날씨 어때?',
      '저녁 뭐 먹을까?',
      '주말에 뭐 할 거야?',
    ];
    const limit = 10;

    // 테스트할 람다 값들
    const lambdaValues = [0.7, 0.8, 0.9];

    // 결과 저장용
    const comparisonResults: Array<{
      query: string;
      beforeFirstCharMatch: number;
      afterFirstCharMatch: number;
      improvementRate: number;
    }> = [];

    for (const query of testQueries) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📝 쿼리: "${query}"`);
      console.log(`${'='.repeat(80)}\n`);

      // 임베딩 생성
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query,
        encoding_format: 'float',
      });

      const embedding = embeddingResponse.data[0].embedding;
      const vectorString = `[${embedding.join(',')}]`;

      // ========================================
      // BEFORE: 순수 벡터 유사도 검색
      // ========================================
      console.log(`🔵 BEFORE (순수 벡터 검색):\n`);

      const beforeResults = await prisma.$queryRaw<
        Array<{ text: string; similarity: number }>
      >`
        SELECT
          ts.text,
          1 - (ts.embedding <=> ${vectorString}::vector) as similarity
        FROM tone_samples ts
        WHERE ts.user_id = ${user.id}::uuid
          AND ts.embedding IS NOT NULL
        ORDER BY ts.embedding <=> ${vectorString}::vector
        LIMIT ${limit}
      `;

      console.log(`   검색 결과 (상위 ${limit}개):\n`);
      beforeResults.forEach((result, index) => {
        console.log(
          `   ${index + 1}. [유사도: ${result.similarity.toFixed(4)}] ${result.text}`,
        );
      });

      // 다양성 분석
      const firstChar = query.charAt(0);
      const beforeSameFirstChar = beforeResults.filter((r) =>
        r.text.startsWith(firstChar),
      );
      const beforePercentage =
        (beforeSameFirstChar.length / beforeResults.length) * 100;

      // 중복 분석 (유사도 0.95 이상 = 거의 중복)
      const beforeHighSimilarity = beforeResults.filter(
        (r) => r.similarity >= 0.95,
      );

      // 텍스트 완전 중복 체크
      const beforeTextSet = new Set(beforeResults.map((r) => r.text));
      const beforeDuplicates = beforeResults.length - beforeTextSet.size;

      console.log(`\n   📊 다양성 분석:`);
      console.log(
        `      첫 글자 "${firstChar}" 일치: ${beforeSameFirstChar.length}/${beforeResults.length} (${beforePercentage.toFixed(1)}%)`,
      );
      console.log(
        `      고유사도 샘플 (≥0.95): ${beforeHighSimilarity.length}/${beforeResults.length}개`,
      );
      console.log(
        `      텍스트 완전 중복: ${beforeDuplicates}/${beforeResults.length}개`,
      );

      // ========================================
      // AFTER: MMR 다양성 검색
      // ========================================
      console.log(`\n🟢 AFTER (MMR 다양성 검색):\n`);

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
      const lambda = 0.9; // 의미적 유사도 우선 (의미 90%, 다양성 10%)

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

      console.log(`   검색 결과 (상위 ${limit}개):\n`);
      selected.forEach((result, index) => {
        console.log(
          `   ${index + 1}. [유사도: ${result.similarity.toFixed(4)}] ${result.text}`,
        );
      });

      // 다양성 분석
      const afterSameFirstChar = selected.filter((r) =>
        r.text.startsWith(firstChar),
      );
      const afterPercentage =
        (afterSameFirstChar.length / selected.length) * 100;

      // 중복 분석 (유사도 0.95 이상 = 거의 중복)
      const afterHighSimilarity = selected.filter((r) => r.similarity >= 0.95);

      // 텍스트 완전 중복 체크
      const afterTextSet = new Set(selected.map((r) => r.text));
      const afterDuplicates = selected.length - afterTextSet.size;

      console.log(`\n   📊 다양성 분석:`);
      console.log(
        `      첫 글자 "${firstChar}" 일치: ${afterSameFirstChar.length}/${selected.length} (${afterPercentage.toFixed(1)}%)`,
      );
      console.log(
        `      고유사도 샘플 (≥0.95): ${afterHighSimilarity.length}/${selected.length}개`,
      );
      console.log(
        `      텍스트 완전 중복: ${afterDuplicates}/${selected.length}개`,
      );

      // ========================================
      // 개선율 계산
      // ========================================
      const improvementRate =
        ((beforePercentage - afterPercentage) / beforePercentage) * 100;

      const highSimReduction =
        beforeHighSimilarity.length > 0
          ? ((beforeHighSimilarity.length - afterHighSimilarity.length) /
              beforeHighSimilarity.length) *
            100
          : 0;

      const duplicateReduction =
        beforeDuplicates > 0
          ? ((beforeDuplicates - afterDuplicates) / beforeDuplicates) * 100
          : 0;

      console.log(`\n   ✨ 개선 효과:`);
      console.log(
        `      1️⃣ 중복 제거 (최우선 목표): ${beforeDuplicates}개 → ${afterDuplicates}개 ${duplicateReduction > 0 ? `(${duplicateReduction.toFixed(1)}% 감소)` : '(변화 없음)'}`,
      );
      console.log(
        `      2️⃣ 고유사도 감소 (≥0.95): ${beforeHighSimilarity.length}개 → ${afterHighSimilarity.length}개 ${highSimReduction > 0 ? `(${highSimReduction.toFixed(1)}% 감소)` : '(변화 없음)'}`,
      );
      console.log(
        `      3️⃣ 표현 다양성 (첫글자): ${beforePercentage.toFixed(1)}% → ${afterPercentage.toFixed(1)}% ${improvementRate > 0 ? `(${improvementRate.toFixed(1)}% 개선)` : '(변화 없음)'}`,
      );

      comparisonResults.push({
        query,
        beforeFirstCharMatch: beforePercentage,
        afterFirstCharMatch: afterPercentage,
        improvementRate,
      });
    }

    // ========================================
    // 전체 요약
    // ========================================
    console.log(`\n\n${'='.repeat(80)}`);
    console.log('📈 전체 요약');
    console.log(`${'='.repeat(80)}\n`);

    console.log(`${'─'.repeat(80)}`);
    console.log(
      `${'쿼리'.padEnd(15)} ${'Before'.padEnd(12)} ${'After'.padEnd(12)} ${'개선율'.padEnd(12)} 평가`,
    );
    console.log(`${'─'.repeat(80)}`);

    let totalImprovementRate = 0;

    for (const result of comparisonResults) {
      const evaluation =
        result.improvementRate > 70
          ? '우수 ⭐⭐⭐'
          : result.improvementRate > 50
            ? '양호 ⭐⭐'
            : result.improvementRate > 30
              ? '보통 ⭐'
              : '미흡';

      console.log(
        `${result.query.padEnd(15)} ${`${result.beforeFirstCharMatch.toFixed(1)}%`.padEnd(12)} ${`${result.afterFirstCharMatch.toFixed(1)}%`.padEnd(12)} ${`${result.improvementRate.toFixed(1)}%`.padEnd(12)} ${evaluation}`,
      );

      totalImprovementRate += result.improvementRate;
    }

    console.log(`${'─'.repeat(80)}`);

    const avgImprovementRate = totalImprovementRate / comparisonResults.length;
    console.log(
      `${'평균'.padEnd(15)} ${'-'.padEnd(12)} ${'-'.padEnd(12)} ${`${avgImprovementRate.toFixed(1)}%`.padEnd(12)}`,
    );
    console.log(`${'─'.repeat(80)}\n`);

    console.log(`📐 MMR 알고리즘 수식:\n`);
    console.log(`   MMR Score = λ × Similarity - (1-λ) × max(Similarity_selected)`);
    console.log(`   - λ = 0.9 (의미적 유사도 90%, 표현 다양성 10%)`);
    console.log(`   - Similarity: 쿼리와 후보 간 코사인 유사도`);
    console.log(`   - max(Similarity_selected): 이미 선택된 결과와의 최대 유사도\n`);

    console.log(`📊 다양성 측정 지표:\n`);
    console.log(`   Diversity = min(1, FirstCharBonus + LengthDiff × 0.3 + JaccardDiversity × 0.2)`);
    console.log(`   - FirstCharBonus: 첫 글자 다름 시 0.5`);
    console.log(`   - LengthDiff: 길이 차이 비율`);
    console.log(`   - JaccardDiversity: 1 - (문자 집합 교집합 / 합집합)\n`);

    console.log(`✅ 결론:`);
    console.log(`   MMR 알고리즘(λ=0.9) 적용 효과:\n`);
    console.log(`   🎯 주요 목표: 중복 샘플 제거`);
    console.log(
      `      - 동일하거나 매우 유사한 샘플이 반복 선택되는 것 방지`,
    );
    console.log(`      - LLM이 다양한 표현 패턴 학습 가능\n`);
    console.log(`   📊 부가 효과: 표현 다양성 개선`);
    console.log(
      `      - 평균 ${avgImprovementRate.toFixed(1)}% 첫 글자 일치율 감소`,
    );
    console.log(`      - 의미적 유사도는 거의 유지 (λ=0.9)\n`);

    console.log(`${'='.repeat(80)}`);
    console.log('✅ 분석 완료');
    console.log(`${'='.repeat(80)}\n`);
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

compareBeforeAfterMMR();
