/**
 * 생성된 답변 품질 평가 스크립트
 *
 * 목적: LLM이 생성한 답변이 실제 사용자 말투와 얼마나 유사한지 수치화
 *
 * 평가 방법:
 * 1. 임베딩 유사도: 생성 답변 vs 톤샘플 평균 유사도
 * 2. 문자 수준 유사도: Jaccard, Levenshtein
 * 3. 형태소 일치율
 */

import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * 코사인 유사도 계산
 */
function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magnitudeA += vecA[i] * vecA[i];
    magnitudeB += vecB[i] * vecB[i];
  }

  return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}

/**
 * Jaccard 유사도 (문자 집합 기반)
 * similarity = |A ∩ B| / |A ∪ B|
 */
function calculateJaccardSimilarity(strA: string, strB: string): number {
  const setA = new Set(strA.split(''));
  const setB = new Set(strB.split(''));

  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);

  return intersection.size / union.size;
}

/**
 * Levenshtein 거리 (편집 거리)
 * 한 문자열을 다른 문자열로 변환하는데 필요한 최소 편집 횟수
 */
function calculateLevenshteinDistance(strA: string, strB: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= strB.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= strA.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= strB.length; i++) {
    for (let j = 1; j <= strA.length; j++) {
      if (strB.charAt(i - 1) === strA.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1, // deletion
        );
      }
    }
  }

  return matrix[strB.length][strA.length];
}

/**
 * 정규화된 Levenshtein 유사도 (0~1)
 */
function calculateNormalizedLevenshtein(strA: string, strB: string): number {
  const distance = calculateLevenshteinDistance(strA, strB);
  const maxLength = Math.max(strA.length, strB.length);
  return 1 - distance / maxLength;
}

async function evaluateResponseQuality() {
  try {
    console.log('📊 답변 품질 평가 시작\n');
    console.log('='.repeat(80));

    // 1. 사용자 조회
    const user = await prisma.user.findFirst();
    if (!user) {
      console.error('❌ 사용자를 찾을 수 없습니다.');
      return;
    }

    console.log(`✅ 사용자: ${user.name} (${user.email})\n`);

    // 2. 테스트 시나리오
    const testCases = [
      {
        query: '밥 먹었어?',
        generatedResponse: '응 먹었어', // LLM 생성 답변 예시
      },
      {
        query: '잘잤니?',
        generatedResponse: '잘잤어',
      },
      {
        query: '뭐해?',
        generatedResponse: '그냥 쉬고 있어',
      },
    ];

    for (const testCase of testCases) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📝 쿼리: "${testCase.query}"`);
      console.log(`🤖 생성 답변: "${testCase.generatedResponse}"`);
      console.log(`${'='.repeat(80)}\n`);

      // 2.1. 생성 답변 임베딩
      const responseEmbeddingResult = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: testCase.generatedResponse,
        encoding_format: 'float',
      });
      const responseEmbedding = responseEmbeddingResult.data[0].embedding;

      // 2.2. 유사한 톤샘플 조회 (상위 20개)
      const vectorString = `[${responseEmbedding.join(',')}]`;
      const toneSamples = await prisma.$queryRaw<
        Array<{
          text: string;
          embedding: string;
        }>
      >`
        SELECT
          ts.text,
          ts.embedding::text as embedding
        FROM tone_samples ts
        WHERE ts.user_id = ${user.id}::uuid
          AND ts.embedding IS NOT NULL
        ORDER BY ts.embedding <=> ${vectorString}::vector
        LIMIT 20
      `;

      console.log(`📚 분석 대상 톤샘플: ${toneSamples.length}개\n`);

      // 2.3. 유사도 계산
      const similarities: Array<{
        text: string;
        embeddingSimilarity: number;
        jaccardSimilarity: number;
        levenshteinSimilarity: number;
      }> = [];

      for (const sample of toneSamples) {
        const sampleEmbedding = JSON.parse(sample.embedding);

        const embeddingSim = calculateCosineSimilarity(
          responseEmbedding,
          sampleEmbedding,
        );
        const jaccardSim = calculateJaccardSimilarity(
          testCase.generatedResponse,
          sample.text,
        );
        const levenshteinSim = calculateNormalizedLevenshtein(
          testCase.generatedResponse,
          sample.text,
        );

        similarities.push({
          text: sample.text,
          embeddingSimilarity: embeddingSim,
          jaccardSimilarity: jaccardSim,
          levenshteinSimilarity: levenshteinSim,
        });
      }

      // 2.4. 상위 5개 출력 (임베딩 유사도 기준)
      similarities.sort((a, b) => b.embeddingSimilarity - a.embeddingSimilarity);

      console.log(`🔍 유사도 상위 5개 톤샘플 (임베딩 유사도 기준):\n`);
      console.log(`${'─'.repeat(80)}`);
      console.log(
        `${'순위'.padEnd(6)} ${'임베딩'.padEnd(10)} ${'Jaccard'.padEnd(10)} ${'Levenshtein'.padEnd(13)} 텍스트`,
      );
      console.log(`${'─'.repeat(80)}`);

      for (let i = 0; i < Math.min(5, similarities.length); i++) {
        const s = similarities[i];
        console.log(
          `${String(i + 1).padEnd(6)} ${s.embeddingSimilarity.toFixed(4).padEnd(10)} ${s.jaccardSimilarity.toFixed(4).padEnd(10)} ${s.levenshteinSimilarity.toFixed(4).padEnd(13)} ${s.text}`,
        );
      }
      console.log(`${'─'.repeat(80)}\n`);

      // 2.5. 각 지표별 평균 계산
      const avgEmbeddingSim =
        similarities.reduce((sum, s) => sum + s.embeddingSimilarity, 0) /
        similarities.length;
      const avgJaccardSim =
        similarities.reduce((sum, s) => sum + s.jaccardSimilarity, 0) /
        similarities.length;
      const avgLevenshteinSim =
        similarities.reduce((sum, s) => sum + s.levenshteinSimilarity, 0) /
        similarities.length;

      // 2.6. 각 지표별 평가 함수
      function evaluateScore(
        score: number,
        metricName: string,
      ): { level: string; interpretation: string } {
        if (metricName === '임베딩') {
          // OpenAI & STS Benchmark 기준
          if (score >= 0.8)
            return {
              level: '매우 유사',
              interpretation: '의미적으로 거의 동일',
            };
          if (score >= 0.6)
            return { level: '유사', interpretation: '의미적으로 유사' };
          if (score >= 0.4)
            return {
              level: '약간 관련',
              interpretation: '의미적으로 약간 관련',
            };
          return { level: '무관', interpretation: '의미적으로 무관' };
        } else {
          // Jaccard, Levenshtein (일반적 기준)
          if (score >= 0.7)
            return { level: '높음', interpretation: '문자 일치도 높음' };
          if (score >= 0.4)
            return { level: '중간', interpretation: '문자 일치도 보통' };
          return { level: '낮음', interpretation: '문자 일치도 낮음' };
        }
      }

      console.log(`📊 유사도 지표별 평가 결과:\n`);
      console.log(`${'='.repeat(80)}`);

      // 임베딩 유사도 (주 평가 지표)
      const embeddingEval = evaluateScore(avgEmbeddingSim, '임베딩');
      console.log(`\n1️⃣ 임베딩 유사도 (주 평가 지표):`);
      console.log(`   📈 점수: ${avgEmbeddingSim.toFixed(4)}`);
      console.log(`   ⭐ 평가: ${embeddingEval.level}`);
      console.log(`   💬 해석: ${embeddingEval.interpretation}`);
      console.log(`   📚 기준: STS Benchmark (0.8+ 매우유사, 0.6+ 유사, 0.4+ 약간관련)`);

      // Jaccard 유사도 (보조 지표)
      const jaccardEval = evaluateScore(avgJaccardSim, 'Jaccard');
      console.log(`\n2️⃣ Jaccard 유사도 (보조 지표 - 문자 집합):`);
      console.log(`   📈 점수: ${avgJaccardSim.toFixed(4)}`);
      console.log(`   ⭐ 평가: ${jaccardEval.level}`);
      console.log(`   💬 해석: ${jaccardEval.interpretation}`);
      console.log(
        `   ℹ️  참고: 사용하는 문자가 다르면 낮게 나옴 (예: "응" vs "네")`,
      );

      // Levenshtein 유사도 (보조 지표)
      const levenshteinEval = evaluateScore(avgLevenshteinSim, 'Levenshtein');
      console.log(`\n3️⃣ Levenshtein 유사도 (보조 지표 - 편집 거리):`);
      console.log(`   📈 점수: ${avgLevenshteinSim.toFixed(4)}`);
      console.log(`   ⭐ 평가: ${levenshteinEval.level}`);
      console.log(`   💬 해석: ${levenshteinEval.interpretation}`);
      console.log(
        `   ℹ️  참고: 길이가 다르면 낮게 나옴 (예: "응" vs "응 먹었어")`,
      );

      console.log(`\n${'='.repeat(80)}`);

      // 종합 평가 (임베딩 유사도 기준)
      let finalGrade = '';
      if (avgEmbeddingSim >= 0.8) finalGrade = 'A등급 (매우 유사)';
      else if (avgEmbeddingSim >= 0.6) finalGrade = 'B등급 (유사)';
      else if (avgEmbeddingSim >= 0.4) finalGrade = 'C등급 (약간 관련)';
      else finalGrade = 'D등급 (무관)';

      console.log(`\n🎯 최종 평가 (임베딩 유사도 기준):`);
      console.log(`   ${finalGrade}`);
      console.log(
        `   생성 답변이 사용자 말투와 ${embeddingEval.level}합니다.\n`,
      );
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log('📐 평가 지표 및 학술적 근거:');
    console.log(`${'='.repeat(80)}`);
    console.log(`\n1. 주 평가 지표: 임베딩 유사도 (코사인 유사도)`);
    console.log(`   - 의미적 유사성 측정`);
    console.log(`   - 공식: cos(θ) = (A · B) / (||A|| × ||B||)`);
    console.log(`   - 범위: 0 ~ 1`);
    console.log(`   📚 근거:`);
    console.log(`      - OpenAI Embeddings Guide (2024)`);
    console.log(`        "We recommend cosine similarity"`);
    console.log(`      - SentenceBERT 논문 (Reimers & Gurevych, EMNLP 2019)`);
    console.log(`        인용: 14,000+`);
    console.log(`      - STS Benchmark (SemEval 국제 표준)\n`);

    console.log(`2. 보조 지표: Jaccard 유사도`);
    console.log(`   - 문자 집합 일치도 측정 (참고용)`);
    console.log(`   - 공식: J(A,B) = |A ∩ B| / |A ∪ B|`);
    console.log(`   - 범위: 0 ~ 1\n`);

    console.log(`3. 보조 지표: Levenshtein 유사도`);
    console.log(`   - 편집 거리 기반 유사도 (참고용)`);
    console.log(`   - 공식: 1 - (편집거리 / max(len(A), len(B)))`);
    console.log(`   - 범위: 0 ~ 1\n`);

    console.log(`4. 평가 등급 기준 (STS Benchmark 참고)`);
    console.log(`   - A등급 (0.8 이상): 매우 유사 (High Similarity)`);
    console.log(`   - B등급 (0.6~0.8): 유사 (Similar)`);
    console.log(`   - C등급 (0.4~0.6): 약간 관련 (Somewhat Related)`);
    console.log(`   - D등급 (0.4 미만): 무관 (Unrelated)\n`);

    console.log(`${'='.repeat(80)}`);
    console.log('✅ 평가 완료');
    console.log(`${'='.repeat(80)}\n`);
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

evaluateResponseQuality();
