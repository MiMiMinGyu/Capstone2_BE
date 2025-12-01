/**
 * 벡터 유사도 분석 스크립트
 *
 * 목적: 발표 자료를 위한 수치 데이터 생성
 * - 코사인 유사도 공식 및 계산
 * - 벡터 간 거리 분포
 * - MMR 다양성 개선 효과
 */

import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * 코사인 유사도 계산 공식
 * similarity = (A · B) / (||A|| × ||B||)
 *
 * where:
 * - A · B = 벡터 내적 (dot product)
 * - ||A|| = 벡터 A의 크기 (magnitude)
 * - ||B|| = 벡터 B의 크기
 */
function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('벡터 차원이 일치하지 않습니다');
  }

  // 내적 계산 (A · B)
  let dotProduct = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
  }

  // 벡터 크기 계산 (||A||, ||B||)
  let magnitudeA = 0;
  let magnitudeB = 0;
  for (let i = 0; i < vecA.length; i++) {
    magnitudeA += vecA[i] * vecA[i];
    magnitudeB += vecB[i] * vecB[i];
  }
  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  // 코사인 유사도
  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * 유클리드 거리 계산 (PostgreSQL <=> 연산자와 동일)
 * distance = sqrt(Σ(ai - bi)²)
 */
function calculateEuclideanDistance(vecA: number[], vecB: number[]): number {
  let sum = 0;
  for (let i = 0; i < vecA.length; i++) {
    const diff = vecA[i] - vecB[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

async function analyzeVectorSimilarity() {
  try {
    console.log('📊 벡터 유사도 분석 시작\n');
    console.log('='.repeat(80));

    // 1. 사용자 조회
    const user = await prisma.user.findFirst();
    if (!user) {
      console.error('❌ 사용자를 찾을 수 없습니다.');
      return;
    }

    console.log(`✅ 사용자: ${user.name} (${user.email})\n`);

    // 2. 테스트 쿼리
    const testQueries = ['안녕?', '잘잤니?', '밥먹었어?'];

    for (const query of testQueries) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📝 쿼리: "${query}"`);
      console.log(`${'='.repeat(80)}\n`);

      // 2.1. 쿼리 임베딩 생성
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query,
        encoding_format: 'float',
      });

      const queryEmbedding = embeddingResponse.data[0].embedding;
      console.log(`📐 임베딩 차원: ${queryEmbedding.length}D (1536차원)\n`);

      // 2.2. 상위 10개 샘플 조회 (벡터 포함)
      const vectorString = `[${queryEmbedding.join(',')}]`;
      const samples = await prisma.$queryRaw<
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
        LIMIT 10
      `;

      console.log(`🔍 유사도 계산 결과 (상위 10개):\n`);
      console.log(`${'─'.repeat(80)}`);
      console.log(
        `${'순위'.padEnd(6)} ${'코사인 유사도'.padEnd(15)} ${'유클리드 거리'.padEnd(15)} 텍스트`,
      );
      console.log(`${'─'.repeat(80)}`);

      const similarities: Array<{
        text: string;
        cosineSimilarity: number;
        euclideanDistance: number;
      }> = [];

      for (let i = 0; i < samples.length; i++) {
        const sample = samples[i];

        // 벡터 파싱
        const sampleEmbedding = JSON.parse(sample.embedding) as number[];

        // 유사도 계산
        const cosineSim = calculateCosineSimilarity(
          queryEmbedding,
          sampleEmbedding,
        );
        const euclideanDist = calculateEuclideanDistance(
          queryEmbedding,
          sampleEmbedding,
        );

        similarities.push({
          text: sample.text,
          cosineSimilarity: cosineSim,
          euclideanDistance: euclideanDist,
        });

        console.log(
          `${String(i + 1).padEnd(6)} ${cosineSim.toFixed(4).padEnd(15)} ${euclideanDist.toFixed(4).padEnd(15)} ${sample.text}`,
        );
      }

      console.log(`${'─'.repeat(80)}\n`);

      // 2.3. 통계 계산
      const avgCosineSim =
        similarities.reduce((sum, s) => sum + s.cosineSimilarity, 0) /
        similarities.length;
      const maxCosineSim = Math.max(
        ...similarities.map((s) => s.cosineSimilarity),
      );
      const minCosineSim = Math.min(
        ...similarities.map((s) => s.cosineSimilarity),
      );

      const avgEuclideanDist =
        similarities.reduce((sum, s) => sum + s.euclideanDistance, 0) /
        similarities.length;
      const maxEuclideanDist = Math.max(
        ...similarities.map((s) => s.euclideanDistance),
      );
      const minEuclideanDist = Math.min(
        ...similarities.map((s) => s.euclideanDistance),
      );

      console.log(`📈 통계 요약:`);
      console.log(`   코사인 유사도:`);
      console.log(`      평균: ${avgCosineSim.toFixed(4)}`);
      console.log(`      최대: ${maxCosineSim.toFixed(4)}`);
      console.log(`      최소: ${minCosineSim.toFixed(4)}`);
      console.log(`      범위: ${(maxCosineSim - minCosineSim).toFixed(4)}\n`);

      console.log(`   유클리드 거리:`);
      console.log(`      평균: ${avgEuclideanDist.toFixed(4)}`);
      console.log(`      최대: ${maxEuclideanDist.toFixed(4)}`);
      console.log(`      최소: ${minEuclideanDist.toFixed(4)}`);
      console.log(
        `      범위: ${(maxEuclideanDist - minEuclideanDist).toFixed(4)}\n`,
      );

      // 2.4. 공식 설명
      console.log(`📐 사용된 수식:`);
      console.log(`   1. 코사인 유사도 = (A · B) / (||A|| × ||B||)`);
      console.log(`      - A · B: 벡터 내적`);
      console.log(`      - ||A||: 벡터 A의 크기`);
      console.log(`      - 범위: -1 ~ 1 (1에 가까울수록 유사)\n`);

      console.log(`   2. 유클리드 거리 = sqrt(Σ(ai - bi)²)`);
      console.log(`      - PostgreSQL <=> 연산자와 동일`);
      console.log(`      - 범위: 0 ~ ∞ (0에 가까울수록 유사)\n`);

      console.log(`   3. PostgreSQL 유사도 변환 = 1 - 유클리드거리`);
      console.log(
        `      - 예: distance=0.5 → similarity=0.5 (1 - 0.5 = 0.5)\n`,
      );
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log('✅ 분석 완료');
    console.log(`${'='.repeat(80)}\n`);
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeVectorSimilarity();
