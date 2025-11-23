# 프론트엔드 업데이트 안내

> 최종 업데이트: 2025-11-23

## 📢 중요 공지

백엔드 API가 업데이트되었습니다. **일부 enum 값이 변경**되었으니 프론트엔드 코드를 업데이트해주세요.

---

## ✅ 변경 사항 없음 (그대로 사용 가능)

다음 항목들은 **수정 불필요**하며 기존 코드 그대로 사용 가능합니다:

- ✅ **존댓말 수준** (FORMAL, POLITE, CASUAL)
- ✅ **이모지 레벨** (0-5)
- ✅ **API 엔드포인트** (POST/GET/PATCH/DELETE /relationships)
- ✅ **요청/응답 구조** (필드명 동일)

---

## ⚠️ 필수 업데이트: Enum 값 변경

### 1. 대화 분위기 (vibe) 변경

프론트엔드 드롭다운 옵션을 아래와 같이 **변경**해주세요.

#### 기존 (사용 불가 ❌)
```typescript
const vibeOptions = [
  { value: 'SERIOUS', label: '진지한' },      // ❌ 삭제됨
  { value: 'CALM', label: '차분한' },
  { value: 'PLAYFUL', label: '장난스러운' },
  { value: 'ENERGETIC', label: '활발한' }     // ❌ 삭제됨
];
```

#### 신규 (필수 적용 ✅)
```typescript
const vibeOptions = [
  { value: 'CALM', label: '차분' },
  { value: 'DIRECT', label: '직설적' },       // 신규 추가
  { value: 'PLAYFUL', label: '장난스러운' },
  { value: 'CARING', label: '배려하는' }      // 신규 추가
];
```

**변경 이유:**
- 더 명확한 톤 구분
- GPT 프롬프트 생성 시 정확한 답변 톤 조절

---

### 2. 관계 카테고리 (category) 변경

기존의 단순한 카테고리 대신, **더 세밀한 10가지 카테고리**를 사용합니다.

#### 기존 (사용 불가 ❌)
```typescript
const categoryOptions = [
  { value: 'FRIEND_CLOSE', label: '친한 친구' },
  { value: 'FRIEND_CASUAL', label: '지인' },        // ❌ 삭제됨
  { value: 'FAMILY', label: '가족' },               // ❌ 너무 광범위
  { value: 'COWORKER', label: '동료' },             // ❌ 삭제됨
  // ...
];
```

#### 신규 (필수 적용 ✅)
```typescript
const categoryOptions = [
  // 가족
  { value: 'FAMILY_ELDER_CLOSE', label: '부모/조부모' },
  { value: 'FAMILY_SIBLING_ELDER', label: '형/오빠/언니/누나' },
  { value: 'FAMILY_SIBLING_YOUNGER', label: '남/여동생' },

  // 친구/연인
  { value: 'PARTNER_INTIMATE', label: '연인/배우자' },
  { value: 'FRIEND_CLOSE', label: '친한 친구' },
  { value: 'ACQUAINTANCE_CASUAL', label: '가벼운 지인' },

  // 직장
  { value: 'WORK_SENIOR_FORMAL', label: '상사/교수/임원' },
  { value: 'WORK_SENIOR_FRIENDLY', label: '가까운 선배/멘토' },
  { value: 'WORK_PEER', label: '동료/파트너' },
  { value: 'WORK_JUNIOR', label: '후배/인턴/팀원' }
];
```

**변경 이유:**
- 더 정확한 관계 정의
- 각 관계에 맞는 세밀한 톤 조절
- 프론트엔드 문서(RELATIONSHIP_FEATURE.md)와 일치

---

## 🎯 API 사용 예시

### 관계 생성
```typescript
POST /relationships
Content-Type: application/json
Authorization: Bearer {access_token}

{
  "partnerId": "abc-123",
  "category": "FRIEND_CLOSE",      // ✅ 10가지 중 선택
  "politeness": "CASUAL",           // ✅ FORMAL, POLITE, CASUAL
  "vibe": "PLAYFUL",                // ✅ CALM, DIRECT, PLAYFUL, CARING
  "emojiLevel": 3                   // ✅ 0-5
}
```

**응답:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "partner_id": "abc-123",
  "category": "FRIEND_CLOSE",
  "politeness": "CASUAL",
  "vibe": "PLAYFUL",
  "emoji_level": 3,
  "created_at": "2025-11-23T00:00:00.000Z",
  "updated_at": "2025-11-23T00:00:00.000Z",
  "partner": {
    "id": "abc-123",
    "name": "홍길동",
    "telegram_id": "123456789"
  }
}
```

---

### 관계 수정
```typescript
PATCH /relationships/:id
Content-Type: application/json
Authorization: Bearer {access_token}

{
  "category": "WORK_SENIOR_FORMAL", // ✅ 선택적 업데이트
  "politeness": "FORMAL",
  "vibe": "CALM",
  "emojiLevel": 0
}
```

---

## 🆕 추천 답변 API 업데이트

`POST /telegram/recommendations` API도 업데이트되었습니다.

### 변경 사항:
- 총 **3개 답변** 반환 (기존 1개 → 3개)
- 긍정, 부정, Default 답변 제공
- `tone`, `isDefault` 필드 추가

### 새로운 응답 형식:
```json
{
  "recommendations": [
    {
      "messageId": "123",
      "text": "ㅇㅋㅇㅋ 😆🍗 몇시에 어디서 볼까? 🍻",
      "tone": "positive"     // ✅ 긍정 답변
    },
    {
      "messageId": "123",
      "text": "아 미안 ㅠㅠ 오늘 약속 있어서 다음에 가자 😭",
      "tone": "negative"     // ✅ 부정 답변
    },
    {
      "messageId": "123",
      "text": "지금은 답장하기 힘드니, 최대한 빠르게 확인하겠습니다!",
      "isDefault": true      // ✅ Default 답변
    }
  ]
}
```

**프론트엔드 처리 예시:**
```typescript
recommendations.forEach(rec => {
  if (rec.isDefault) {
    // Default 답변 - 다른 색상/아이콘 표시
    renderDefaultOption(rec.text);
  } else if (rec.tone === 'positive') {
    // 긍정 답변 - 초록색/👍
    renderPositiveOption(rec.text);
  } else if (rec.tone === 'negative') {
    // 부정 답변 - 빨간색/👎
    renderNegativeOption(rec.text);
  }
});
```

---

## 📌 중요 참고사항

### 1. 관계 미설정 시 기본 동작
- 관계를 설정하지 않은 상대에게는 **ACQUAINTANCE_CASUAL (격식 있는 존댓말)** 톤으로 답변 생성
- 안전하고 중립적인 톤 사용

### 2. 관계 설정 영구 저장
- 한 번 설정한 관계는 **PostgreSQL DB에 영구 저장**
- 재로그인, 서버 재시작 후에도 유지됨
- 같은 Partner에 대해 중복 설정 불가 (409 Conflict 에러 반환)

### 3. 관계 설정 변경 즉시 반영
- 관계 설정을 변경하면 **다음 답변부터 즉시 반영**
- 기존 생성된 답변에는 영향 없음

---

## 🔧 프론트엔드 수정 작업 체크리스트

- [ ] `vibe` enum 값 변경 (4개 → 4개, 내용 변경)
  - [ ] SERIOUS 삭제, DIRECT 추가
  - [ ] ENERGETIC 삭제, CARING 추가

- [ ] `category` enum 값 변경 (기존 값 → 10개)
  - [ ] 10가지 세밀한 카테고리로 교체
  - [ ] 드롭다운 UI 업데이트

- [ ] 추천 답변 UI 업데이트 (선택사항)
  - [ ] `tone` 필드 활용하여 답변 구분 표시
  - [ ] `isDefault` 필드 활용하여 기본 답변 강조

---

## 📞 문의사항

업데이트 과정에서 문제가 발생하거나 궁금한 사항이 있으면 백엔드 팀에 문의해주세요.

**예상 작업 시간:** 10-15분 (enum 값만 업데이트)

---

## 📚 추가 참고 문서

- [API 명세서](./API_SPECIFICATION.md)
- [관계 설정 기능 가이드](./RELATIONSHIP_FEATURE.md)
- [데이터베이스 스키마](./DB_SCHEMA.md)
