# MMR (Maximal Marginal Relevance) 알고리즘 설명

발표 참고 자료

---

## 🎯 MMR이란?

**Maximal Marginal Relevance (최대 한계 관련성)**

검색 결과에서 **관련성(Relevance)**과 **다양성(Diversity)**의 균형을 맞추는 알고리즘

---

## ❓ 왜 필요한가?

### 문제 상황

**순수 벡터 검색의 한계:**

```
쿼리: "안녕?"

순수 벡터 검색 결과:
1. [0.98] 안녕
2. [0.97] 안녕!
3. [0.96] 안녕~
4. [0.95] 안녕ㅎㅎ
5. [0.94] 안녕하세요
...

문제:
→ 거의 동일한 표현만 반복
→ LLM이 다양한 패턴을 학습하기 어려움
→ 생성된 답변이 단조로움
```

### MMR 적용 후

```
쿼리: "안녕?"

MMR 검색 결과:
1. [0.98] 안녕
2. [0.85] 하이
3. [0.82] 방가
4. [0.80] 어
5. [0.78] 응?
...

개선:
→ 의미는 유사하지만 표현이 다양
→ LLM이 여러 스타일 학습 가능
→ 더 자연스러운 답변 생성
```

---

## 🔬 작동 원리

### 공식

```
MMR Score = λ × Similarity(query, candidate)
            - (1-λ) × max(Similarity(candidate, selected))
```

**파라미터:**
- **λ (람다)**: 관련성 vs 다양성 비율
  - λ = 1.0: 순수 유사도 (다양성 0%)
  - λ = 0.9: 유사도 90% + 다양성 10% ← **권장**
  - λ = 0.7: 유사도 70% + 다양성 30%

**동작 과정:**
1. 첫 번째 결과: 가장 유사한 샘플 선택
2. 두 번째 결과부터:
   - 쿼리와의 유사도 (높을수록 좋음)
   - 이미 선택된 것과의 유사도 (낮을수록 좋음)
   - 두 요소의 균형을 맞춰 선택

---

## 📊 실제 적용 결과

### 우리 프로젝트에서

```
테스트 쿼리: "주말에 뭐 할 거야?"

BEFORE (순수 벡터):
- 고유사도 샘플 (≥0.95): 0개
- 텍스트 완전 중복: 0개
- 첫 글자 "주" 일치: 70%

AFTER (MMR λ=0.9):
- 고유사도 샘플 (≥0.95): 0개
- 텍스트 완전 중복: 0개
- 첫 글자 "주" 일치: 60%

개선율: 14.3%
```

**발견:**
- 현재 데이터는 이미 중복이 적음
- MMR의 주요 가치는 **중복 방지**
- 표현 다양성은 **부가적 효과**

---

## 💡 핵심 인사이트

### 1. MMR의 주요 목적

```
우선순위:
1️⃣ 중복 샘플 제거 (가장 중요)
2️⃣ 표현 다양성 개선 (부가적)
```

### 2. λ 값 선택

```
λ = 0.9 권장 이유:
- 의미적 유사도는 최우선
- 관련 없는 샘플이 포함되면 LLM 답변 품질 하락
- 과도한 다양성(λ=0.7)은 위험
```

### 3. 데이터 특성에 따른 효과

```
중복이 많은 데이터:
- MMR 효과 큼
- 예: "안녕", "안녕!", "안녕~" 반복

중복이 적은 데이터:
- MMR 효과 작음
- 이미 벡터 검색이 다양한 결과 제공
```

---

## 🎓 학술적 배경

### 원본 논문

- **제목**: "The Use of MMR, Diversity-Based Reranking for Reordering Documents and Producing Summaries"
- **저자**: Jaime Carbonell, Jade Goldstein (1998)
- **출판**: SIGIR 1998

### 핵심 아이디어

```
검색 결과는 두 가지를 만족해야 함:
1. 쿼리와 관련성 높음 (Relevance)
2. 서로 다양함 (Diversity)

MMR은 이 둘의 최적 균형점을 찾음
```

---

## 🔍 우리 구현의 특징

### 다양성 측정 함수

```typescript
function calculateDiversity(str1: string, str2: string): number {
  const firstCharBonus = str1.charAt(0) !== str2.charAt(0) ? 0.5 : 0;
  const lengthDiff = Math.abs(str1.length - str2.length) / Math.max(str1.length, str2.length);
  const jaccardDiversity = 1 - jaccardSimilarity(str1, str2);

  return Math.min(1, firstCharBonus + lengthDiff × 0.3 + jaccardDiversity × 0.2);
}
```

**고려 요소:**
1. 첫 글자 차이 (가중치 0.5)
2. 길이 차이 (가중치 0.3)
3. Jaccard 다양성 (가중치 0.2)

---

## 📝 발표 시 강조할 점

### 1. 문제 정의가 명확

```
"순수 벡터 검색은 중복된 샘플을 선택할 수 있습니다.
MMR은 이를 방지하여 LLM이 다양한 표현을 학습하도록 합니다."
```

### 2. 알고리즘 이해

```
"MMR은 단순히 다양성만 추구하지 않습니다.
의미적 유사도를 유지하면서 중복을 제거하는 균형잡힌 접근입니다."
```

### 3. 실무 적용

```
"λ=0.9를 선택한 이유는 의미적 관련성이 최우선이기 때문입니다.
사용자 말투를 모방하려면 관련성 높은 샘플이 필수적입니다."
```

### 4. 정직한 평가

```
"현재 데이터는 중복이 적어 MMR 효과가 제한적입니다.
하지만 데이터가 증가하면 MMR의 가치가 더 커질 것입니다."
```

---

## 🚀 향후 개선 방향

### 1. 적응형 λ 값

```python
if has_duplicates(results):
    lambda = 0.7  # 다양성 우선
else:
    lambda = 0.9  # 관련성 우선
```

### 2. 의미적 다양성 측정

```
현재: 첫 글자, 길이, Jaccard (표면적)
개선: 임베딩 거리, 주제 모델링 (의미적)
```

### 3. 동적 임계값

```
고유사도 임계값을 데이터셋에 따라 조정:
- 중복 많음: 0.90
- 중복 보통: 0.95
- 중복 적음: 0.98
```

---

## 📚 참고 자료

### 논문
- Carbonell & Goldstein (1998). "The Use of MMR, Diversity-Based Reranking"
- Zhai et al. (2003). "Beyond Independent Relevance"

### 구현 참고
- LangChain MMR Implementation
- Pinecone Vector Database Documentation

### 평가 기준
- STS Benchmark (SemEval)
- OpenAI Embeddings Best Practices

---

## 🎯 결론

**MMR의 가치:**
1. ✅ 중복 제거 → LLM 학습 품질 향상
2. ✅ 표현 다양성 → 더 자연스러운 답변
3. ✅ 의미 유지 → 관련성 있는 샘플 보장

**우리 프로젝트에서:**
- 현재는 효과 제한적 (중복 적음)
- 향후 데이터 증가 시 필수적
- λ=0.9가 최적 (의미 우선)

**학습 성과:**
- 알고리즘 원리 이해
- 하이퍼파라미터 튜닝 경험
- 실무 적용 시 고려사항 학습
