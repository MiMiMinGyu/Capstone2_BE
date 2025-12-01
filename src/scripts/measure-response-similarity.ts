import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 코사인 유사도 계산
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

async function measureResponseSimilarity(
  userId: string,
  generatedResponse: string,
) {
  try {
    console.log('📊 생성된 답변과 Tone Sample 유사도 분석 시작...\n');
    console.log(`분석할 답변: "${generatedResponse}"\n`);

    // 1. 생성된 답변을 임베딩으로 변환
    console.log('🔄 생성된 답변 임베딩 중...');
    const responseEmbedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: generatedResponse,
    });
    const responseVector = responseEmbedding.data[0].embedding;
    console.log('✅ 임베딩 완료\n');

    // 2. 사용자의 모든 tone sample 가져오기
    console.log('🔍 사용자의 Tone Sample 조회 중...');
    const toneSamples = await prisma.$queryRaw<
      Array<{ id: string; text: string; embedding: number[] }>
    >`
      SELECT id, text, embedding::text
      FROM tone_samples
      WHERE user_id = ${userId}::uuid
      AND embedding IS NOT NULL
    `;

    if (toneSamples.length === 0) {
      console.log('❌ Tone Sample이 없습니다.');
      return;
    }

    console.log(`✅ ${toneSamples.length}개의 Tone Sample 발견\n`);

    // 3. 각 tone sample과의 유사도 계산
    console.log('📈 유사도 계산 중...\n');
    const similarities = toneSamples.map((sample) => {
      // PostgreSQL vector 타입을 파싱 (문자열 "[0.1, 0.2, ...]" 형태)
      const embeddingStr = sample.embedding as unknown as string;
      const sampleVector = embeddingStr
        .replace(/^\[|\]$/g, '')
        .split(',')
        .map(Number);

      const similarity = cosineSimilarity(responseVector, sampleVector);
      return {
        id: sample.id,
        text: sample.text,
        similarity,
      };
    });

    // 4. 유사도 순으로 정렬
    similarities.sort((a, b) => b.similarity - a.similarity);

    // 5. 통계 계산
    const avgSimilarity =
      similarities.reduce((sum, s) => sum + s.similarity, 0) /
      similarities.length;
    const maxSimilarity = similarities[0].similarity;
    const minSimilarity = similarities[similarities.length - 1].similarity;

    // 6. 결과 출력
    console.log('=' .repeat(80));
    console.log('📊 유사도 분석 결과');
    console.log('='.repeat(80));
    console.log(`\n📈 전체 통계:`);
    console.log(`   평균 유사도: ${(avgSimilarity * 100).toFixed(2)}%`);
    console.log(`   최고 유사도: ${(maxSimilarity * 100).toFixed(2)}%`);
    console.log(`   최저 유사도: ${(minSimilarity * 100).toFixed(2)}%`);

    console.log(`\n🏆 가장 유사한 Tone Sample TOP 5:`);
    similarities.slice(0, 5).forEach((item, index) => {
      console.log(
        `\n   ${index + 1}. 유사도: ${(item.similarity * 100).toFixed(2)}%`,
      );
      console.log(`      텍스트: "${item.text}"`);
    });

    console.log(`\n📉 가장 덜 유사한 Tone Sample TOP 5:`);
    similarities.slice(-5).reverse().forEach((item, index) => {
      console.log(
        `\n   ${index + 1}. 유사도: ${(item.similarity * 100).toFixed(2)}%`,
      );
      console.log(`      텍스트: "${item.text}"`);
    });

    // 7. 유사도 분포
    console.log(`\n📊 유사도 분포:`);
    const ranges = [
      { min: 0.9, max: 1.0, label: '90-100%' },
      { min: 0.8, max: 0.9, label: '80-90%' },
      { min: 0.7, max: 0.8, label: '70-80%' },
      { min: 0.6, max: 0.7, label: '60-70%' },
      { min: 0.5, max: 0.6, label: '50-60%' },
      { min: 0.0, max: 0.5, label: '0-50%' },
    ];

    ranges.forEach((range) => {
      const count = similarities.filter(
        (s) => s.similarity >= range.min && s.similarity < range.max,
      ).length;
      const percentage = ((count / similarities.length) * 100).toFixed(1);
      const bar = '█'.repeat(Math.round((count / similarities.length) * 50));
      console.log(`   ${range.label}: ${count}개 (${percentage}%) ${bar}`);
    });

    console.log('\n' + '='.repeat(80));

    // 8. 평가 메시지
    console.log('\n💡 평가:');
    if (avgSimilarity >= 0.8) {
      console.log(
        '   ✅ 생성된 답변이 사용자의 말투와 매우 유사합니다! (80% 이상)',
      );
    } else if (avgSimilarity >= 0.7) {
      console.log(
        '   ✔️  생성된 답변이 사용자의 말투와 유사합니다. (70-80%)',
      );
    } else if (avgSimilarity >= 0.6) {
      console.log(
        '   ⚠️  생성된 답변이 사용자의 말투와 어느 정도 유사합니다. (60-70%)',
      );
    } else {
      console.log(
        '   ❌ 생성된 답변이 사용자의 말투와 많이 다릅니다. (60% 미만)',
      );
      console.log(
        '      → 프롬프트 개선이나 더 많은 Tone Sample 수집이 필요할 수 있습니다.',
      );
    }

    console.log('\n');
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 사용 예시
const userId = process.argv[2];
const generatedResponse = process.argv[3];

if (!userId || !generatedResponse) {
  console.log('사용법: npx ts-node measure-response-similarity.ts <userId> "<생성된 답변>"');
  console.log('\n예시:');
  console.log('npx ts-node measure-response-similarity.ts "user-uuid-here" "오늘 날씨 진짜 좋다~ 산책하러 가자!"');
  process.exit(1);
}

measureResponseSimilarity(userId, generatedResponse);
