# 프론트엔드 업데이트 안내

> 최종 업데이트: 2025-11-24

## 📢 중요 공지

백엔드 API가 업데이트되었습니다. **일부 enum 값이 변경**되었고, **SSE 인증 방식이 추가**되었으며, **messageId 타입이 변경**되었으니 프론트엔드 코드를 업데이트해주세요.

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

## 🔴 messageId 타입 변경 (Breaking Change - 필수)

### 변경 사항
`POST /telegram/recommendations`와 `POST /telegram/reply` API의 **messageId 타입이 number에서 string(UUID)으로 변경**되었습니다.

### 변경 이유
- `/telegram/conversations/:partnerId/messages`에서 반환하는 메시지의 `id`가 UUID
- 이전에는 타입 불일치로 400 에러 발생
- DB 기반으로 통일하여 일관성 확보

### 기존 방식 (더 이상 작동하지 않음 ❌)
```typescript
// ❌ number 타입 전송 - 400 Bad Request 에러
POST /telegram/recommendations
{
  "messageId": 123  // number
}
```

### 신규 방식 (필수 ✅)
```typescript
// ✅ UUID string 타입 전송
POST /telegram/recommendations
{
  "messageId": "d70e7086-5367-4656-88fb-e670f1a43479"  // UUID string
}
```

### 프론트엔드 수정 방법

#### Before (수정 전)
```typescript
// ❌ 잘못된 코드
const message = messages[0]; // { id: "d70e7086-...", ... }
const messageId = parseInt(message.id); // NaN 발생!

const response = await fetch('/telegram/recommendations', {
  method: 'POST',
  body: JSON.stringify({ messageId }), // 400 에러
});
```

#### After (수정 후)
```typescript
// ✅ 올바른 코드
const message = messages[0]; // { id: "d70e7086-...", ... }

const response = await fetch('/telegram/recommendations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messageId: message.id  // UUID 그대로 전달
  }),
});
```

### API 변경 사항

#### 1. POST /telegram/recommendations
```typescript
// 요청
{
  "messageId": "d70e7086-5367-4656-88fb-e670f1a43479"  // ✅ UUID string
}

// 응답 (변경 없음)
{
  "recommendations": [
    {
      "messageId": "d70e7086-5367-4656-88fb-e670f1a43479",
      "text": "긍정 답변...",
      "tone": "positive"
    },
    ...
  ]
}
```

#### 2. POST /telegram/reply
```typescript
// 요청
{
  "messageId": "d70e7086-5367-4656-88fb-e670f1a43479",  // ✅ UUID string
  "selectedReply": "선택한 답변 텍스트"
}

// 응답 (변경 없음)
{
  "success": true,
  "message": "Reply sent successfully"
}
```

### 추가 개선사항
- **DB 기반으로 전환**: 서버 재시작 시에도 메시지 영구 보존
- **자동 저장**: 선택한 답변이 DB에 자동 저장되어 대화 히스토리에 포함됨

---

## 🔐 SSE 인증 방식 업데이트 (필수)

### 변경 사항
기존에 인증 없이 접근 가능했던 SSE 엔드포인트에 **JWT 토큰 인증이 추가**되었습니다.

### 기존 방식 (더 이상 작동하지 않음 ❌)
```typescript
// ❌ 인증 없이 연결 - 401 에러 발생
const eventSource = new EventSource('http://localhost:3000/telegram/events');
```

### 신규 방식 (필수 ✅)
```typescript
// ✅ 쿼리 파라미터로 JWT 토큰 전달
const accessToken = localStorage.getItem('accessToken');
const eventSource = new EventSource(
  `http://localhost:3000/telegram/events?token=${accessToken}`
);

// 메시지 수신
eventSource.addEventListener('newMessage', (event) => {
  const message = JSON.parse(event.data);
  console.log('새 메시지:', message);
});

// 에러 처리 (401 토큰 만료)
eventSource.onerror = (error) => {
  console.error('SSE 연결 실패:', error);
  eventSource.close();

  // 토큰 갱신 후 재연결
  refreshAccessToken().then((newToken) => {
    const newEventSource = new EventSource(
      `http://localhost:3000/telegram/events?token=${newToken}`
    );
    // 이벤트 리스너 다시 등록
  });
};
```

### 에러 응답
| 상태 코드 | 설명 | 대응 방법 |
|----------|------|----------|
| **401 Unauthorized** | 토큰 없음 | 쿼리 파라미터에 `token` 추가 |
| **401 Unauthorized** | 토큰 만료 | Refresh Token으로 토큰 갱신 후 재연결 |
| **401 Unauthorized** | 유효하지 않은 토큰 | 로그인 다시 진행 |

### 보안 개선 사항
✅ **인증된 사용자만 SSE 연결 가능**
✅ **userId별 메시지 필터링** (다른 사용자의 메시지 차단)
✅ **토큰 만료 시 자동 차단**

### 토큰 갱신 플로우 예시
```typescript
class SSEManager {
  private eventSource: EventSource | null = null;

  connect(token: string) {
    this.disconnect();

    this.eventSource = new EventSource(
      `${API_URL}/telegram/events?token=${token}`
    );

    this.eventSource.addEventListener('newMessage', (event) => {
      const message = JSON.parse(event.data);
      this.handleNewMessage(message);
    });

    this.eventSource.onerror = async () => {
      console.error('SSE 연결 끊김');
      this.disconnect();

      // 토큰 갱신 시도
      try {
        const newToken = await this.refreshToken();
        this.connect(newToken); // 재연결
      } catch (error) {
        console.error('토큰 갱신 실패:', error);
        // 로그인 페이지로 리다이렉트
      }
    };
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  async refreshToken(): Promise<string> {
    const refreshToken = localStorage.getItem('refreshToken');
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) throw new Error('토큰 갱신 실패');

    const { accessToken } = await response.json();
    localStorage.setItem('accessToken', accessToken);
    return accessToken;
  }
}
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

### 🔴 Breaking Changes (필수, 즉시)

- [ ] **messageId 타입 변경** (가장 중요!)
  - [ ] `/telegram/recommendations` 요청 시 messageId를 UUID string으로 전달
  - [ ] `/telegram/reply` 요청 시 messageId를 UUID string으로 전달
  - [ ] `parseInt()` 제거, message.id 그대로 사용

- [ ] **SSE 인증 방식 업데이트**
  - [ ] SSE 연결 시 쿼리 파라미터로 JWT 토큰 전달
  - [ ] 401 에러 처리 로직 구현
  - [ ] 토큰 갱신 후 SSE 재연결 로직 구현

### 📝 Enum 업데이트 (필수)

- [ ] `vibe` enum 값 변경 (4개 → 4개, 내용 변경)
  - [ ] SERIOUS 삭제, DIRECT 추가
  - [ ] ENERGETIC 삭제, CARING 추가

- [ ] `category` enum 값 변경 (기존 값 → 10개)
  - [ ] 10가지 세밀한 카테고리로 교체
  - [ ] 드롭다운 UI 업데이트

### 🎨 UI 개선 (선택)

- [ ] 추천 답변 UI 업데이트
  - [ ] `tone` 필드 활용하여 답변 구분 표시
  - [ ] `isDefault` 필드 활용하여 기본 답변 강조

---

## 📞 문의사항

업데이트 과정에서 문제가 발생하거나 궁금한 사항이 있으면 백엔드 팀에 문의해주세요.

**예상 작업 시간:**
- 🔴 messageId 타입 변경: 5-10분 (가장 간단하지만 필수!)
- SSE 인증 업데이트: 20-30분 (토큰 갱신 로직 포함)
- Enum 값 변경: 10-15분
- **총 예상 시간: 약 35-55분**

---

## 📚 추가 참고 문서

- [API 명세서](./API_SPECIFICATION.md)
- [관계 설정 기능 가이드](./RELATIONSHIP_FEATURE.md)
- [데이터베이스 스키마](./DB_SCHEMA.md)
