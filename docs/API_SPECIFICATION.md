# API 명세서 (Frontend Integration)

> 최종 업데이트: 2025-11-18
>
> **Base URL**: `http://localhost:3000`
>
> **Swagger 문서**: `http://localhost:3000/api`

---

## 📑 목차

1. [인증 (Authentication)](#1-인증-authentication)
2. [카카오톡 (Kakao)](#2-카카오톡-kakao)
3. [텔레그램 (Telegram)](#3-텔레그램-telegram)
4. [파트너 (Partners)](#4-파트너-partners)
5. [관계 (Relationships)](#5-관계-relationships) ✨ **NEW!**
6. [공통 타입 정의](#6-공통-타입-정의)
7. [에러 응답](#7-에러-응답)

---

## 1. 인증 (Authentication)

### 1.1 회원가입

**POST** `/auth/register`

새로운 사용자를 등록하고 JWT 토큰을 발급합니다.

**요청 Body:**
```json
{
  "username": "mingyu123",      // 필수, 최소 3자
  "email": "mingyu@test.com",   // 필수, 유효한 이메일
  "password": "password123",    // 필수, 최소 6자
  "name": "김민규"              // 선택
}
```

**응답 (201 Created):**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "mingyu123",
    "name": "김민규",
    "email": "mingyu@test.com",
    "created_at": "2025-01-06T12:00:00.000Z"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**에러 응답:**
- `409 Conflict` - 이미 존재하는 username 또는 email
- `400 Bad Request` - 유효성 검증 실패

---

### 1.2 로그인

**POST** `/auth/login`

이메일과 비밀번호로 로그인하고 JWT 토큰을 발급받습니다.

**요청 Body:**
```json
{
  "email": "mingyu@test.com",
  "password": "password123"
}
```

**응답 (200 OK):**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "mingyu123",
    "name": "김민규",
    "email": "mingyu@test.com",
    "created_at": "2025-01-06T12:00:00.000Z"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**에러 응답:**
- `401 Unauthorized` - 이메일 또는 비밀번호가 틀림

---

### 1.3 토큰 갱신

**POST** `/auth/refresh`

Refresh Token을 사용하여 새로운 Access Token을 발급받습니다.

**요청 Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**응답 (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**에러 응답:**
- `401 Unauthorized` - 유효하지 않거나 만료된 Refresh Token

**참고:**
- Access Token은 15분 유효
- Refresh Token은 30일 유효
- Access Token 만료 시 자동으로 갱신 필요

---

### 1.4 현재 사용자 정보 조회

**GET** `/auth/me`

JWT 토큰으로 인증된 사용자의 정보를 조회합니다.

**요청 Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**응답 (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "mingyu123",
  "name": "김민규",
  "email": "mingyu@test.com",
  "created_at": "2025-01-06T12:00:00.000Z"
}
```

**에러 응답:**
- `401 Unauthorized` - 인증되지 않음 (토큰 없음 또는 만료)

---

### 1.5 로그아웃

**POST** `/auth/logout`

Refresh Token을 무효화하여 로그아웃합니다.

**요청 Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**응답 (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

**에러 응답:**
- `401 Unauthorized` - 인증되지 않음

**참고:**
- 로그아웃 후 Refresh Token은 DB에서 삭제됨
- 클라이언트는 로컬 스토리지의 토큰도 삭제 필요

---

## 2. 카카오톡 (Kakao)

### 2.1 카카오톡 txt 파일 업로드

**POST** `/kakao/upload`

카카오톡 내보내기 txt 파일을 업로드하여 메시지를 파싱하고 tone_samples에 저장합니다.

**요청 Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: multipart/form-data
```

**요청 Body (multipart/form-data):**
```typescript
{
  file: File,                      // 필수, 카카오톡 txt 파일
  partner_name: string,            // 필수, 상대방 이름 (예: "홍길동", "친구들 외 2명")
  relationship_category: string    // 필수, 관계 카테고리 (아래 목록 참조)
}
```

**Relationship Categories:**
- `FAMILY` - 가족
- `CLOSE_FRIEND` - 친한 친구
- `FRIEND` - 친구
- `ACQUAINTANCE` - 지인
- `COLLEAGUE` - 동료
- `SENIOR` - 선배
- `JUNIOR` - 후배
- `BUSINESS` - 비즈니스 관계
- `ROMANTIC` - 연인
- `OTHER` - 기타

**지원하는 카카오톡 형식:**
```
형식 1: 2024. 1. 15. 오후 3:45, 홍길동 : 안녕하세요
형식 2: [이민규] [오후 1:03] 저는 아직 시간표도 못 짰습니다

날짜 헤더: --------------- 2025년 8월 5일 화요일 ---------------
```

**응답 (201 Created):**
```json
{
  "message": "카카오톡 파일 업로드 성공",
  "partner": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "홍길동",
    "platform": "KAKAO",
    "external_id": null
  },
  "relationship": {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "user_id": "770e8400-e29b-41d4-a716-446655440000",
    "partner_id": "550e8400-e29b-41d4-a716-446655440000",
    "category": "CLOSE_FRIEND",
    "created_at": "2025-11-07T12:00:00.000Z"
  },
  "statistics": {
    "total_messages": 3142,
    "my_messages_count": 1523,
    "other_messages_count": 1619,
    "unique_senders": ["이민규", "홍길동"]
  },
  "tone_samples_saved": 1523
}
```

**에러 응답:**
- `400 Bad Request` - 파일 없음, 파일에서 메시지를 찾을 수 없음
- `400 Bad Request` - "사용자 이름과 일치하는 메시지가 없습니다. 회원가입 시 입력한 이름(현재: {user.name})과 카카오톡 대화에서 사용한 이름이 같은지 확인해주세요."
- `400 Bad Request` - 잘못된 relationship_category
- `401 Unauthorized` - 인증되지 않음

**TypeScript 타입 정의:**
```typescript
interface UploadKakaoDto {
  partner_name: string;
  relationship_category:
    | 'FAMILY'
    | 'CLOSE_FRIEND'
    | 'FRIEND'
    | 'ACQUAINTANCE'
    | 'COLLEAGUE'
    | 'SENIOR'
    | 'JUNIOR'
    | 'BUSINESS'
    | 'ROMANTIC'
    | 'OTHER';
}

interface UploadKakaoResponse {
  message: string;
  partner: {
    id: string;
    name: string;
    platform: 'KAKAO';
    external_id: string | null;
  };
  relationship: {
    id: string;
    user_id: string;
    partner_id: string;
    category: string;
    created_at: string;
  };
  statistics: {
    total_messages: number;
    my_messages_count: number;
    other_messages_count: number;
    unique_senders: string[];
  };
  tone_samples_saved: number;
}
```

**프론트엔드 사용 예시 (Axios):**
```typescript
import axios from 'axios';

async function uploadKakaoFile(
  file: File,
  partnerName: string,
  relationshipCategory: string,
  accessToken: string
) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('partner_name', partnerName);
  formData.append('relationship_category', relationshipCategory);

  const response = await axios.post<UploadKakaoResponse>(
    'http://localhost:3000/kakao/upload',
    formData,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return response.data;
}
```

**중요 사항:**
1. **사용자 이름 일치**: 회원가입 시 입력한 `name` 필드와 카카오톡 대화에서 표시되는 이름이 정확히 일치해야 합니다.
   - 예: 카카오톡에서 "[이민규]"로 표시되면 회원가입 시 name을 "이민규"로 입력
2. **Partner 자동 생성**: 같은 partner_name으로 여러 번 업로드하면 중복 생성될 수 있음 (향후 개선 예정)
3. **임베딩 미생성**: 현재는 텍스트만 저장되며, 임베딩은 별도 API로 생성 필요 (Phase 3 예정)

---

### 2.2 Partner 목록 조회

**GET** `/kakao/partners`

현재 사용자가 업로드한 모든 Partner 목록을 조회합니다.

**요청 Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**응답 (200 OK):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "홍길동",
    "platform": "KAKAO",
    "external_id": null,
    "relationships": [
      {
        "id": "660e8400-e29b-41d4-a716-446655440000",
        "category": "CLOSE_FRIEND",
        "created_at": "2025-11-07T12:00:00.000Z"
      }
    ],
    "_count": {
      "tone_samples": 1523
    }
  },
  {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "name": "김철수",
    "platform": "KAKAO",
    "external_id": null,
    "relationships": [
      {
        "id": "880e8400-e29b-41d4-a716-446655440000",
        "category": "FRIEND",
        "created_at": "2025-11-06T10:00:00.000Z"
      }
    ],
    "_count": {
      "tone_samples": 842
    }
  }
]
```

**에러 응답:**
- `401 Unauthorized` - 인증되지 않음

**TypeScript 타입 정의:**
```typescript
interface Partner {
  id: string;
  name: string;
  platform: 'KAKAO' | 'TELEGRAM';
  external_id: string | null;
  relationships: Array<{
    id: string;
    category: string;
    created_at: string;
  }>;
  _count: {
    tone_samples: number;
  };
}

type GetPartnersResponse = Partner[];
```

---

## 3. 텔레그램 (Telegram)

### 3.1 받은 메시지 목록 조회

**GET** `/telegram/messages`

받은 메시지 목록을 조회합니다.

**응답 (200 OK):**
```json
[
  {
    "id": 1,
    "messageId": 12345,
    "from": {
      "id": 987654321,
      "first_name": "김철수",
      "username": "kimcs"
    },
    "chat": {
      "id": 987654321,
      "type": "private",
      "first_name": "김철수"
    },
    "text": "안녕하세요! 오늘 어떠세요?",
    "timestamp": "2025-01-15T10:30:00.000Z",
    "isRead": false,
    "aiRecommendations": [],
    "replied": false
  }
]
```

**중요 사항:**
1. **인메모리 저장**: 현재 서버 재시작 시 데이터 손실 (Phase 4에서 DB 저장으로 전환 예정)
2. **텔레그램 봇 특성**:
   - 봇으로 받은 메시지는 일반 텔레그램 앱에서 확인 불가 (API 전용)
   - Long Polling 방식: 서버가 2-3초마다 텔레그램 서버에 새 메시지 확인
   - 서버 꺼져있을 때 받은 메시지는 24시간 보관 (24시간 내 서버 재시작 필요)
3. **채팅 목록 구현**: `from.id`로 그룹핑하여 대화 상대별 목록 생성 가능 (Phase 4에서 백엔드 API 추가 예정)

---

### 3.2 AI 추천 답변 생성

**POST** `/telegram/recommendations`

특정 메시지에 대한 AI 추천 답변을 생성합니다.

**요청 Body:**
```json
{
  "messageId": 1
}
```

**응답 (200 OK):**
```json
{
  "messageId": 1,
  "recommendations": [
    "안녕하세요! 저도 좋은 하루 보내고 있어요 😊",
    "네, 오늘 날씨가 좋네요!",
    "감사합니다! 당신도 좋은 하루 되세요"
  ]
}
```

**참고:**
- 현재 GPT-4 기반 AI 답변 생성 (RAG + Relationship 설정 반영)

---

### 3.3 선택한 답변 전송

**POST** `/telegram/reply`

사용자가 선택한 답변을 텔레그램으로 전송합니다.

**요청 Body:**
```json
{
  "messageId": 1,
  "selectedReply": "안녕하세요! 저도 좋은 하루 보내고 있어요 😊"
}
```

**응답 (200 OK):**
```json
{
  "success": true,
  "message": "Reply sent successfully"
}
```

---

### 3.4 메시지 직접 전송

**POST** `/telegram/send`

프론트엔드에서 직접 텔레그램으로 메시지를 전송합니다.

**요청 Body:**
```json
{
  "chatId": 987654321,
  "text": "안녕하세요!"
}
```

**응답 (200 OK):**
```json
{
  "success": true,
  "message": "Message sent successfully"
}
```

---

### 3.5 봇 상태 확인

**GET** `/telegram/status`

텔레그램 봇의 현재 상태를 확인합니다.

**응답 (200 OK):**
```json
{
  "status": "Telegram bot is running",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

---

### 3.6 실시간 메시지 알림 (SSE)

**GET** `/telegram/events`

Server-Sent Events를 통해 새 메시지를 실시간으로 수신합니다.

**응답 (Event Stream):**
```
event: message
data: {"id":2,"messageId":12346,"from":{...},"text":"새 메시지","timestamp":"2025-01-15T10:35:00.000Z"}
```

**프론트엔드 사용 예시:**
```javascript
const eventSource = new EventSource('http://localhost:3000/telegram/events');

eventSource.onmessage = (event) => {
  const newMessage = JSON.parse(event.data);
  console.log('새 메시지 도착:', newMessage);
};

eventSource.onerror = (error) => {
  console.error('SSE 연결 오류:', error);
  eventSource.close();
};
```

---

### 3.7 대화 목록 조회 (예정 - Phase 5) 🚧

**GET** `/telegram/conversations`

모든 대화 상대 목록을 조회합니다.

**요청 Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**응답 (200 OK):**
```json
[
  {
    "partner": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "김철수",
      "telegram_id": "987654321"
    },
    "relationship": {
      "category": "FRIEND_CLOSE",
      "politeness": "CASUAL",
      "vibe": "PLAYFUL",
      "emoji_level": 2
    },
    "lastMessage": {
      "text": "안녕하세요!",
      "timestamp": "2025-01-15T10:30:00.000Z",
      "role": "user"
    },
    "unreadCount": 3,
    "totalMessages": 25
  }
]
```

---

### 3.8 대화 히스토리 조회 (예정 - Phase 5) 🚧

**GET** `/telegram/conversations/:partnerId/messages`

특정 상대와의 대화 기록을 조회합니다.

**URL Parameters:**
- `partnerId`: Partner UUID

**Query Parameters:**
- `limit`: 페이지당 메시지 수 (기본값: 50)
- `offset`: 시작 위치 (기본값: 0)

**응답 (200 OK):**
```json
{
  "partner": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "김철수",
    "telegram_id": "987654321"
  },
  "messages": [
    {
      "id": "uuid",
      "role": "user",
      "text": "안녕하세요!",
      "created_at": "2025-01-15T10:30:00.000Z"
    },
    {
      "id": "uuid",
      "role": "assistant",
      "text": "네, 안녕하세요!",
      "created_at": "2025-01-15T10:31:00.000Z"
    }
  ],
  "total": 25,
  "hasMore": false
}
```

---

## 4. 파트너 (Partners) - 미구현

### 4.1 파트너 목록 조회 (예정)

**GET** `/partners`

사용자의 파트너 목록을 조회합니다.

---

### 4.2 파트너 생성 (예정)

**POST** `/partners`

새로운 파트너를 생성합니다.

---

## 5. 관계 (Relationships) ✨

Partner와의 관계 설정을 관리하는 API입니다. 관계 설정에 따라 GPT 답변 생성 시 톤과 스타일이 조정됩니다.

### 5.1 관계 목록 조회

**GET** `/relationships`

사용자의 모든 관계 설정을 조회합니다.

**요청 Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**응답 (200 OK):**
```json
[
  {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "user_id": "5ffc7298-98c5-44d0-a62e-7a2ac180a64d",
    "partner_id": "716d0ed5-c04e-4315-aa8c-05c5ade05b7e",
    "category": "FRIEND_CLOSE",
    "politeness": "CASUAL",
    "vibe": "PLAYFUL",
    "emoji_level": 3,
    "created_at": "2025-11-18T07:00:00.000Z",
    "updated_at": "2025-11-18T07:00:00.000Z",
    "partner": {
      "id": "716d0ed5-c04e-4315-aa8c-05c5ade05b7e",
      "name": "홍길동",
      "telegram_id": "123456789"
    }
  }
]
```

**에러 응답:**
- `401 Unauthorized` - 인증되지 않음

---

### 5.2 특정 관계 조회

**GET** `/relationships/:id`

ID로 특정 관계를 조회합니다.

**요청 Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**URL Parameters:**
- `id`: Relationship ID (UUID)

**응답 (200 OK):**
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "user_id": "5ffc7298-98c5-44d0-a62e-7a2ac180a64d",
  "partner_id": "716d0ed5-c04e-4315-aa8c-05c5ade05b7e",
  "category": "FRIEND_CLOSE",
  "politeness": "CASUAL",
  "vibe": "PLAYFUL",
  "emoji_level": 3,
  "created_at": "2025-11-18T07:00:00.000Z",
  "updated_at": "2025-11-18T07:00:00.000Z",
  "partner": {
    "id": "716d0ed5-c04e-4315-aa8c-05c5ade05b7e",
    "name": "홍길동",
    "telegram_id": "123456789"
  }
}
```

**에러 응답:**
- `401 Unauthorized` - 인증되지 않음
- `404 Not Found` - 관계를 찾을 수 없음

---

### 5.3 관계 생성

**POST** `/relationships`

Partner와의 새로운 관계를 설정합니다.

**요청 Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**요청 Body:**
```json
{
  "partnerId": "716d0ed5-c04e-4315-aa8c-05c5ade05b7e",
  "category": "FRIEND_CLOSE",
  "politeness": "CASUAL",
  "vibe": "PLAYFUL",
  "emojiLevel": 3
}
```

**필수 필드:**
- `partnerId` (string, UUID): Partner ID
- `category` (string): 관계 카테고리 (아래 목록 참조)

**선택 필드:**
- `politeness` (string): 존댓말/반말 수준 (기본값: `POLITE`)
- `vibe` (string): 대화 분위기 (기본값: `CALM`)
- `emojiLevel` (number, 0-5): 이모지 사용 빈도 (기본값: 0)

**Relationship Categories:**
- `FAMILY_ELDER_CLOSE` - 부모/조부모/삼촌·이모 등 어른 가족
- `FAMILY_SIBLING_ELDER` - 형/오빠/언니/누나
- `FAMILY_SIBLING_YOUNGER` - 남/여 동생
- `PARTNER_INTIMATE` - 연인/배우자
- `FRIEND_CLOSE` - 친한 친구
- `ACQUAINTANCE_CASUAL` - 가벼운 지인/처음 만난 또래
- `WORK_SENIOR_FORMAL` - 상사/교수/연장자 고객/임원
- `WORK_SENIOR_FRIENDLY` - 가까운 선배·상사/멘토
- `WORK_PEER` - 동료/타팀 협업자/파트너 동급
- `WORK_JUNIOR` - 후배/인턴/팀원

**Politeness Levels:**
- `FORMAL` - 격식 존댓말 (–습니다/–하십시오)
- `POLITE` - 일반 존댓말 (–요)
- `CASUAL` - 반말

**Vibe Types:**
- `CALM` - 차분
- `DIRECT` - 직설적
- `PLAYFUL` - 장난스러운
- `CARING` - 배려하는

**Emoji Level:** 0~5 (0: 없음, 5: 매우 많음)

**응답 (201 Created):**
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "user_id": "5ffc7298-98c5-44d0-a62e-7a2ac180a64d",
  "partner_id": "716d0ed5-c04e-4315-aa8c-05c5ade05b7e",
  "category": "FRIEND_CLOSE",
  "politeness": "CASUAL",
  "vibe": "PLAYFUL",
  "emoji_level": 3,
  "created_at": "2025-11-18T07:00:00.000Z",
  "updated_at": "2025-11-18T07:00:00.000Z",
  "partner": {
    "id": "716d0ed5-c04e-4315-aa8c-05c5ade05b7e",
    "name": "홍길동",
    "telegram_id": "123456789"
  }
}
```

**에러 응답:**
- `400 Bad Request` - 잘못된 카테고리 또는 값
- `404 Not Found` - Partner를 찾을 수 없음
- `409 Conflict` - 이미 관계가 설정됨 (같은 Partner와 중복)
- `401 Unauthorized` - 인증되지 않음

---

### 5.4 관계 수정

**PATCH** `/relationships/:id`

관계 정보를 수정합니다. 원하는 필드만 업데이트할 수 있습니다.

**요청 Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**URL Parameters:**
- `id`: Relationship ID (UUID)

**요청 Body (모든 필드 선택):**
```json
{
  "category": "FRIEND_CASUAL",
  "politeness": "POLITE",
  "vibe": "CALM",
  "emojiLevel": 2
}
```

**응답 (200 OK):**
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "user_id": "5ffc7298-98c5-44d0-a62e-7a2ac180a64d",
  "partner_id": "716d0ed5-c04e-4315-aa8c-05c5ade05b7e",
  "category": "FRIEND_CASUAL",
  "politeness": "POLITE",
  "vibe": "CALM",
  "emoji_level": 2,
  "created_at": "2025-11-18T07:00:00.000Z",
  "updated_at": "2025-11-18T07:05:00.000Z",
  "partner": {
    "id": "716d0ed5-c04e-4315-aa8c-05c5ade05b7e",
    "name": "홍길동",
    "telegram_id": "123456789"
  }
}
```

**에러 응답:**
- `401 Unauthorized` - 인증되지 않음
- `404 Not Found` - 관계를 찾을 수 없음

---

### 5.5 관계 삭제

**DELETE** `/relationships/:id`

관계를 삭제합니다. GPT 답변 생성 시 기본 설정으로 돌아갑니다.

**요청 Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**URL Parameters:**
- `id`: Relationship ID (UUID)

**응답 (200 OK):**
```json
{
  "message": "Relationship deleted successfully"
}
```

**에러 응답:**
- `401 Unauthorized` - 인증되지 않음
- `404 Not Found` - 관계를 찾을 수 없음

---

### 5.6 TypeScript 타입 정의

```typescript
interface CreateRelationshipDto {
  partnerId: string;
  category: RelationshipCategory;
  politeness?: PolitenessLevel;
  vibe?: VibeType;
  emojiLevel?: number;
}

interface UpdateRelationshipDto {
  category?: RelationshipCategory;
  politeness?: PolitenessLevel;
  vibe?: VibeType;
  emojiLevel?: number;
}

interface Relationship {
  id: string;
  user_id: string;
  partner_id: string;
  category: RelationshipCategory;
  politeness: PolitenessLevel;
  vibe: VibeType;
  emoji_level: number;
  created_at: string;
  updated_at: string;
  partner: {
    id: string;
    name: string;
    telegram_id: string;
  };
}
```

---

### 5.7 프론트엔드 사용 예시

```typescript
import axios from 'axios';

// 관계 생성
async function createRelationship(partnerId: string, accessToken: string) {
  const response = await axios.post<Relationship>(
    'http://localhost:3000/relationships',
    {
      partnerId: partnerId,
      category: 'FRIEND_CLOSE',
      politeness: 'CASUAL',
      vibe: 'PLAYFUL',
      emojiLevel: 3
    },
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
}

// 관계 목록 조회
async function getRelationships(accessToken: string) {
  const response = await axios.get<Relationship[]>(
    'http://localhost:3000/relationships',
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );
  return response.data;
}

// 관계 수정
async function updateRelationship(
  relationshipId: string,
  updates: UpdateRelationshipDto,
  accessToken: string
) {
  const response = await axios.patch<Relationship>(
    `http://localhost:3000/relationships/${relationshipId}`,
    updates,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
}

// 관계 삭제
async function deleteRelationship(relationshipId: string, accessToken: string) {
  const response = await axios.delete(
    `http://localhost:3000/relationships/${relationshipId}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );
  return response.data;
}
```

---

## 6. 공통 타입 정의

### 6.1 User
```typescript
interface User {
  id: string;                // UUID
  username: string;
  name: string | null;
  email: string;
  created_at: Date;
}
```

### 6.2 AuthResponse
```typescript
interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
}
```

### 6.3 TelegramUser
```typescript
interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}
```

### 6.4 TelegramChat
```typescript
interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}
```

### 6.5 SavedMessage
```typescript
interface SavedMessage {
  id: number;
  messageId?: number;
  from?: TelegramUser;
  chat: TelegramChat;
  text?: string;
  timestamp: string;
  isRead: boolean;
  aiRecommendations: string[];
  replied: boolean;
  selectedReply?: string;
}
```

### 6.6 RelationshipCategory (Enum)
```typescript
enum RelationshipCategory {
  FAMILY_ELDER_CLOSE = 'FAMILY_ELDER_CLOSE',
  FAMILY_SIBLING_ELDER = 'FAMILY_SIBLING_ELDER',
  FAMILY_SIBLING_YOUNGER = 'FAMILY_SIBLING_YOUNGER',
  PARTNER_INTIMATE = 'PARTNER_INTIMATE',
  FRIEND_CLOSE = 'FRIEND_CLOSE',
  ACQUAINTANCE_CASUAL = 'ACQUAINTANCE_CASUAL',
  WORK_SENIOR_FORMAL = 'WORK_SENIOR_FORMAL',
  WORK_SENIOR_FRIENDLY = 'WORK_SENIOR_FRIENDLY',
  WORK_PEER = 'WORK_PEER',
  WORK_JUNIOR = 'WORK_JUNIOR',
}
```

### 6.7 PolitenessLevel (Enum)
```typescript
enum PolitenessLevel {
  FORMAL = 'FORMAL',       // 격식 존대 (-습니다)
  POLITE = 'POLITE',       // 존댓말 (-요)
  CASUAL = 'CASUAL',       // 반말
}
```

### 6.8 VibeType (Enum)
```typescript
enum VibeType {
  CALM = 'CALM',           // 차분
  DIRECT = 'DIRECT',       // 직설적
  PLAYFUL = 'PLAYFUL',     // 장난스러운
  CARING = 'CARING',       // 배려하는
}
```

---

## 7. 에러 응답

### 7.1 표준 에러 형식
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

### 7.2 HTTP 상태 코드

| 코드 | 설명 |
|------|------|
| 200 | OK - 요청 성공 |
| 201 | Created - 리소스 생성 성공 |
| 400 | Bad Request - 잘못된 요청 (유효성 검증 실패) |
| 401 | Unauthorized - 인증 실패 |
| 403 | Forbidden - 권한 없음 |
| 404 | Not Found - 리소스를 찾을 수 없음 |
| 409 | Conflict - 리소스 충돌 (중복 등) |
| 500 | Internal Server Error - 서버 내부 오류 |

---

## 8. 인증 흐름

### 8.1 로그인 및 토큰 저장
```typescript
// 1. 로그인
const loginResponse = await fetch('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

const { access_token, refresh_token, user } = await loginResponse.json();

// 2. 토큰 저장 (localStorage 또는 sessionStorage)
localStorage.setItem('access_token', access_token);
localStorage.setItem('refresh_token', refresh_token);
localStorage.setItem('user', JSON.stringify(user));
```

### 8.2 API 요청 시 토큰 사용
```typescript
// Axios 인터셉터 예시
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### 8.3 토큰 자동 갱신
```typescript
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 401 에러이고 재시도가 아닌 경우
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const response = await axios.post('/auth/refresh', {
          refresh_token: refreshToken
        });

        const { access_token } = response.data;
        localStorage.setItem('access_token', access_token);

        // 원래 요청 재시도
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return axios(originalRequest);

      } catch (refreshError) {
        // Refresh Token도 만료됨 → 로그인 페이지로
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
```

### 8.4 로그아웃
```typescript
// 1. 서버에 로그아웃 요청
await axios.post('/auth/logout');

// 2. 로컬 스토리지 정리
localStorage.removeItem('access_token');
localStorage.removeItem('refresh_token');
localStorage.removeItem('user');

// 3. 로그인 페이지로 리다이렉트
window.location.href = '/login';
```

---

## 9. 환경 변수

### 9.1 프론트엔드 (.env)
```
VITE_API_BASE_URL=http://localhost:3000
VITE_WS_URL=http://localhost:3000
```

### 9.2 백엔드 (.env)
```
DATABASE_URL=postgresql://admin:admin1234@localhost:5433/chatbot_db
JWT_SECRET=your-super-secret-key-change-in-production
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
OPENAI_API_KEY=sk-your-openai-api-key
```

---

## 10. 주의사항

1. **CORS 설정**: 현재 모든 origin 허용 (개발 환경). 프로덕션에서는 특정 도메인만 허용 필요
2. **토큰 보안**: localStorage 사용 시 XSS 공격 주의. httpOnly Cookie 사용 권장
3. **에러 처리**: 네트워크 오류, API 오류에 대한 적절한 에러 처리 구현 필요
4. **로딩 상태**: API 호출 중 로딩 상태 표시
5. **SSE 연결 관리**: 페이지 이탈 시 `eventSource.close()` 호출 필요

---

## 11. 다음 예정 기능

### Phase 5: 텔레그램 DB 저장 + 채팅 목록 (진행 예정) 🚧
- `GET /telegram/conversations` - 대화 상대 목록 조회
- `GET /telegram/conversations/:partnerId/messages` - 대화 히스토리 조회
- 텔레그램 메시지 DB 영구 저장

### 완료된 기능 ✅
- ~~`POST /auth/register`~~ - 회원가입
- ~~`POST /auth/login`~~ - 로그인
- ~~`POST /kakao/upload`~~ - 카카오톡 txt 파일 업로드
- ~~`GET /kakao/partners`~~ - Partner 목록 조회
- ~~`POST /openai/generate-embeddings`~~ - 임베딩 생성
- ~~`POST /gpt/generate-reply`~~ - GPT 답변 생성 (RAG + Relationship)
- ~~`GET /relationships`~~ - 관계 목록 조회
- ~~`POST /relationships`~~ - 관계 생성
- ~~`PATCH /relationships/:id`~~ - 관계 수정
- ~~`DELETE /relationships/:id`~~ - 관계 삭제

---

**문의 및 피드백**:
- Swagger 문서: http://localhost:3000/api
- 프로젝트 문서: `docs/` 폴더 참조
