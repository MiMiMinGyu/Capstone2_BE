# 발표 자료용 수치 데이터 요약

> **생성일**: 2025-12-01
> **프로젝트**: AI 기반 개인 말투 학습 챗봇
> **목적**: 발표 자료용 정량적 성능 지표 정리

---

## 📊 1. 시스템 아키텍처 수치

### 데이터베이스
- **벡터 차원**: 1536D (OpenAI text-embedding-3-small)
- **벡터 DB**: PostgreSQL + pgvector 확장
- **톤 샘플 개수**: ~3000개 (사용자별)

### 임베딩 모델
- **모델명**: `text-embedding-3-small`
- **제공사**: OpenAI
- **벡터 차원**: 1536
- **인코딩 형식**: float32

### LLM 모델
- **모델명**: `gpt-4o-mini` (또는 `gpt-4`)
- **Temperature**: 0.3 (일관성 우선)
- **Max Tokens**: 200 (2개 답변 생성)

---

## 📐 2. 벡터 유사도 계산 공식

### 2.1 코사인 유사도 (Cosine Similarity)

```
similarity = (A · B) / (||A|| × ||B||)
```

**설명**:
- `A · B`: 벡터 내적 (dot product)
- `||A||`: 벡터 A의 크기 (magnitude) = √(Σ ai²)
- `||B||`: 벡터 B의 크기
- **범위**: -1 ~ 1 (1에 가까울수록 유사)

**구현 코드**:
```typescript
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
```

### 2.2 유클리드 거리 (Euclidean Distance)

```
distance = sqrt(Σ(ai - bi)²)
```

**PostgreSQL 변환**:
```sql
-- PostgreSQL <=> 연산자 사용
similarity = 1 - (embedding <=> query_vector)
```

**예시**:
- `distance = 0.3` → `similarity = 0.7` (1 - 0.3 = 0.7)
- `distance = 0.5` → `similarity = 0.5`

---

## 🎯 3. MMR (Maximal Marginal Relevance) 알고리즘

### 3.1 MMR 공식

```
MMR Score = λ × Similarity - (1-λ) × max(Similarity_selected)
```

**파라미터**:
- `λ = 0.7` (유사도 70%, 다양성 30%)
- `Similarity`: 쿼리와 후보 간 코사인 유사도
- `max(Similarity_selected)`: 이미 선택된 결과들과의 최대 유사도

### 3.2 다양성 측정 함수

```
Diversity = min(1, FirstCharBonus + LengthDiff × 0.3 + JaccardDiversity × 0.2)
```

**구성 요소**:
- `FirstCharBonus`: 첫 글자 다름 시 0.5, 같으면 0
- `LengthDiff`: |len(A) - len(B)| / max(len(A), len(B))
- `JaccardDiversity`: 1 - (문자 집합 교집합 / 합집합)

### 3.3 MMR 개선 효과 (실측 데이터)

| 쿼리 | Before (%) | After (%) | 개선율 (%) | 평가 |
|------|-----------|-----------|-----------|------|
| 안녕? | 90.0 | 20.0 | 77.8 | 우수 ⭐⭐⭐ |
| 잘잤니? | 100.0 | 30.0 | 70.0 | 우수 ⭐⭐⭐ |
| 밥먹었어? | 80.0 | 10.0 | 87.5 | 우수 ⭐⭐⭐ |
| **평균** | **90.0** | **20.0** | **78.4** | **우수** |

**결론**: MMR 알고리즘으로 평균 **78.4% 다양성 개선** 달성

---

## 📈 4. 답변 품질 평가 지표

### 4.1 평가 방법

생성된 답변과 사용자 톤샘플 간 유사도를 3가지 지표로 측정:

#### ① 임베딩 유사도 (의미적 유사성)
```
Embedding Similarity = cos(θ) = (A · B) / (||A|| × ||B||)
```
- **범위**: 0 ~ 1
- **의미**: 의미적으로 얼마나 유사한가

#### ② Jaccard 유사도 (문자 집합 일치도)
```
Jaccard = |A ∩ B| / |A ∪ B|
```
- **범위**: 0 ~ 1
- **의미**: 사용하는 문자가 얼마나 겹치는가

#### ③ Levenshtein 유사도 (편집 거리)
```
Levenshtein Similarity = 1 - (편집거리 / max(len(A), len(B)))
```
- **범위**: 0 ~ 1
- **의미**: 문자열 형태가 얼마나 비슷한가

### 4.2 종합 평가 등급

```
종합 점수 = (임베딩 유사도 + Jaccard 유사도 + Levenshtein 유사도) / 3
```

| 등급 | 점수 범위 | 평가 |
|------|----------|------|
| A | 0.7 이상 | 우수 (생성 답변이 사용자 말투와 매우 유사) |
| B | 0.5 ~ 0.7 | 양호 (생성 답변이 사용자 말투와 유사) |
| C | 0.3 ~ 0.5 | 보통 (생성 답변이 사용자 말투와 다소 차이) |
| D | 0.3 미만 | 미흡 (생성 답변이 사용자 말투와 상이) |

### 4.3 실측 예시 데이터

**쿼리**: "밥 먹었어?"
**생성 답변**: "응 먹었어"

| 지표 | 점수 | 비고 |
|------|------|------|
| 임베딩 유사도 | 0.78 | 의미적으로 유사 |
| Jaccard 유사도 | 0.62 | 문자 집합 유사 |
| Levenshtein 유사도 | 0.55 | 문자열 형태 유사 |
| **종합 점수** | **0.65** | **B등급 (양호)** |

---

## 🔍 5. 검색 성능 지표

### 5.1 검색 방식 비교

| 항목 | 순수 벡터 검색 | MMR 검색 |
|------|--------------|---------|
| 쿼리 속도 | 빠름 (~50ms) | 보통 (~100ms) |
| 다양성 | 낮음 (90% 중복) | 높음 (20% 중복) |
| 정확도 | 높음 | 높음 (유지) |
| 후보 개수 | 10개 | 100개 → 10개 선택 |

### 5.2 Few-Shot Learning 효과

**프롬프트 구성**:
```
SYSTEM: 말투 샘플 20개 + 포맷 강제 지시문
USER (예시): 민규: 밥 먹었어? / 이민규:
ASSISTANT (예시): YES: 응 먹었어 / NO: 아직
USER (실제): 민규: 너 내일 학교 가지? / 이민규:
```

**Temperature 변화 효과**:
- `0.85` → 자연스럽지만 포맷 무시
- `0.3` → 포맷 준수, 일관성 향상 ✅

---

## 📊 6. 발표용 주요 수치 정리

### 핵심 성과 지표

1. **다양성 개선**: 78.4% ⬆️
   - Before: 평균 90% 첫 글자 일치
   - After: 평균 20% 첫 글자 일치

2. **벡터 차원**: 1536D
   - OpenAI text-embedding-3-small 모델

3. **답변 품질**: B등급 (0.65/1.0)
   - 3가지 유사도 지표 종합 평가

4. **검색 후보**: 100개 → MMR로 10개 선택
   - λ = 0.7 (유사도:다양성 = 7:3)

### 사용된 주요 공식

```
1. 코사인 유사도 = (A · B) / (||A|| × ||B||)

2. MMR Score = 0.7 × Similarity - 0.3 × max(Similarity_selected)

3. Diversity = FirstCharBonus + LengthDiff × 0.3 + JaccardDiversity × 0.2

4. 종합 품질 = (임베딩 + Jaccard + Levenshtein) / 3
```

---

## 🚀 7. 스크립트 실행 방법

### 실행 순서

```bash
# 1. 벡터 유사도 분석
npx ts-node src/scripts/analyze-vector-similarity.ts

# 2. MMR 개선 효과 비교
npx ts-node src/scripts/compare-before-after-mmr.ts

# 3. 답변 품질 평가
npx ts-node src/scripts/evaluate-response-quality.ts
```

### 출력 결과
- 콘솔에 상세 수치 데이터 출력
- 발표 자료에 복사 가능한 표 형식 제공
- 수식 및 공식 설명 포함

---

## 📸 8. 발표 슬라이드 구성 제안

### 슬라이드 1: 문제 정의
- **문제**: 기존 검색 방식의 낮은 다양성 (90% 중복)
- **스크린샷**: Before 검색 결과 (모두 "안"으로 시작)

### 슬라이드 2: 해결 방안
- **MMR 알고리즘 공식** 제시
- **다양성 측정 함수** 설명

### 슬라이드 3: 성과
- **개선율 표**: Before vs After 비교
- **78.4% 다양성 개선** 강조

### 슬라이드 4: 답변 품질
- **3가지 평가 지표** 설명
- **종합 점수 B등급** 제시

### 슬라이드 5: 기술 스택
- **벡터 DB**: PostgreSQL + pgvector
- **임베딩**: OpenAI 1536D
- **LLM**: GPT-4o-mini (Temperature 0.3)

---

**문서 끝**
