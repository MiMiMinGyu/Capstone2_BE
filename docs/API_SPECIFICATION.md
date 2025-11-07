# API 명세서 (Frontend Integration)

> 최종 업데이트: 2025-11-07
>
> **Base URL**: `http://localhost:3000`
>
> **Swagger 문서**: `http://localhost:3000/api`

---

## 📑 목차

1. [인증 (Authentication)](#1-인증-authentication)
2. [텔레그램 (Telegram)](#2-텔레그램-telegram)
3. [파트너 (Partners)](#3-파트너-partners-미구현)
4. [관계 (Relationships)](#4-관계-relationships-미구현)
5. [공통 타입 정의](#5-공통-타입-정의)
6. [에러 응답](#6-에러-응답)

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

## 2. 텔레그램 (Telegram)

### 2.1 받은 메시지 목록 조회

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

**참고:**
- 현재 인메모리 저장 (서버 재시작 시 데이터 손실)

---

### 2.2 AI 추천 답변 생성

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
- 현재 하드코딩된 추천 답변 (OpenAI 통합 예정)

---

### 2.3 선택한 답변 전송

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

### 2.4 메시지 직접 전송

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

### 2.5 봇 상태 확인

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

### 2.6 실시간 메시지 알림 (SSE)

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

## 3. 파트너 (Partners) - 미구현

### 3.1 파트너 목록 조회 (예정)

**GET** `/partners`

사용자의 파트너 목록을 조회합니다.

---

### 3.2 파트너 생성 (예정)

**POST** `/partners`

새로운 파트너를 생성합니다.

---

## 4. 관계 (Relationships) - 미구현

### 4.1 관계 목록 조회 (예정)

**GET** `/relationships`

사용자의 관계 설정 목록을 조회합니다.

---

### 4.2 관계 생성/수정 (예정)

**POST** `/relationships`

새로운 관계를 생성하거나 수정합니다.

---

## 5. 공통 타입 정의

### 5.1 User
```typescript
interface User {
  id: string;                // UUID
  username: string;
  name: string | null;
  email: string;
  created_at: Date;
}
```

### 5.2 AuthResponse
```typescript
interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
}
```

### 5.3 TelegramUser
```typescript
interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}
```

### 5.4 TelegramChat
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

### 5.5 SavedMessage
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

### 5.6 RelationshipCategory (Enum)
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

### 5.7 PolitenessLevel (Enum)
```typescript
enum PolitenessLevel {
  FORMAL = 'FORMAL',       // 격식 존대 (-습니다)
  POLITE = 'POLITE',       // 존댓말 (-요)
  CASUAL = 'CASUAL',       // 반말
}
```

### 5.8 VibeType (Enum)
```typescript
enum VibeType {
  CALM = 'CALM',           // 차분
  DIRECT = 'DIRECT',       // 직설적
  PLAYFUL = 'PLAYFUL',     // 장난스러운
  CARING = 'CARING',       // 배려하는
}
```

---

## 6. 에러 응답

### 6.1 표준 에러 형식
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

### 6.2 HTTP 상태 코드

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

## 7. 인증 흐름

### 7.1 로그인 및 토큰 저장
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

### 7.2 API 요청 시 토큰 사용
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

### 7.3 토큰 자동 갱신
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

### 7.4 로그아웃
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

## 8. 환경 변수

### 8.1 프론트엔드 (.env)
```
VITE_API_BASE_URL=http://localhost:3000
VITE_WS_URL=http://localhost:3000
```

### 8.2 백엔드 (.env)
```
DATABASE_URL=postgresql://admin:admin1234@localhost:5433/chatbot_db
JWT_SECRET=your-super-secret-key-change-in-production
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
OPENAI_API_KEY=sk-your-openai-api-key
```

---

## 9. 주의사항

1. **CORS 설정**: 현재 모든 origin 허용 (개발 환경). 프로덕션에서는 특정 도메인만 허용 필요
2. **토큰 보안**: localStorage 사용 시 XSS 공격 주의. httpOnly Cookie 사용 권장
3. **에러 처리**: 네트워크 오류, API 오류에 대한 적절한 에러 처리 구현 필요
4. **로딩 상태**: API 호출 중 로딩 상태 표시
5. **SSE 연결 관리**: 페이지 이탈 시 `eventSource.close()` 호출 필요

---

## 10. 다음 예정 기능

- `POST /kakao/upload` - 카카오톡 txt 파일 업로드
- `POST /kakao/generate-embeddings` - 임베딩 배치 생성
- `GET /partners` - 파트너 목록 조회
- `GET /relationships` - 관계 설정 목록 조회
- `POST /relationships` - 관계 생성/수정
- `POST /telegram/generate-reply` - 실제 AI 답변 생성 (OpenAI)

---

**문의 및 피드백**:
- Swagger 문서: http://localhost:3000/api
- 프로젝트 문서: `docs/` 폴더 참조
