# LikeMe API - 프론트엔드 연동 가이드

## 📋 프로젝트 개요
AI 답변 추천 서비스 백엔드 API입니다. 텔레그램 봇을 통해 메시지를 수신하고, 사용자가 프론트엔드에서 AI 추천 답변을 선택하여 응답할 수 있습니다.

## 🎯 주요 플로우
```
[제3자] → [텔레그램 봇] → [백엔드 저장] → [프론트엔드에서 조회]
                                      ↓
                              [AI 추천 답변 생성]
                                      ↓
[제3자] ← [텔레그램 봇] ← [답변 전송] ← [사용자가 선택]
```

## 🔗 API 엔드포인트

### **기본 URL**
```
http://localhost:3000
```

### **API 문서**
```
http://localhost:3000/api
```

---

## 📨 **1. 받은 메시지 목록 조회**

### **GET** `/telegram/messages`

받은 메시지 목록을 조회합니다.

**응답 예시:**
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

---

## 🤖 **2. AI 추천 답변 생성**

### **POST** `/telegram/recommendations`

특정 메시지에 대한 AI 추천 답변을 생성합니다.

**요청 Body:**
```json
{
  "messageId": 1
}
```

**응답 예시:**
```json
{
  "messageId": 1,
  "recommendations": [
    "그렇게 생각해! 안녕하세요! 오늘 어떠세요?에 대해서 나도 비슷하게 느꼈어",
    "맞아 맞아~ 나도 안녕하세요! 오늘 어떠세요? 때문에 고민했던 적 있어",
    "아 진짜? 안녕하세요! 오늘 어떠세요? 얘기 들으니까 공감돼"
  ]
}
```

---

## 📤 **3. 선택한 답변 전송**

### **POST** `/telegram/reply`

사용자가 선택한 답변을 텔레그램으로 전송합니다.

**요청 Body:**
```json
{
  "messageId": 1,
  "selectedReply": "안녕하세요! 저도 오늘 좋은 하루 보내고 있어요 😊"
}
```

**응답 예시:**
```json
{
  "success": true,
  "message": "Reply sent successfully"
}
```

---

## 📱 **4. 메시지 직접 전송 (옵션)**

### **POST** `/telegram/send`

프론트엔드에서 직접 텔레그램으로 메시지를 전송할 수 있습니다.

**요청 Body:**
```json
{
  "chatId": 987654321,
  "text": "안녕하세요!"
}
```

---

## 🔍 **5. 봇 상태 확인**

### **GET** `/telegram/status`

텔레그램 봇의 현재 상태를 확인합니다.

**응답 예시:**
```json
{
  "status": "Telegram bot is running",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

---

## 💡 **프론트엔드 구현 권장사항**

### **1. 실시간 업데이트**
```javascript
// 주기적으로 새 메시지 확인 (폴링)
const checkNewMessages = async () => {
  try {
    const response = await fetch('/telegram/messages');
    const messages = await response.json();
    // 새 메시지 UI 업데이트
  } catch (error) {
    console.error('Failed to fetch messages:', error);
  }
};

// 5초마다 새 메시지 확인
setInterval(checkNewMessages, 5000);
```

### **2. AI 추천 답변 요청**
```javascript
const generateRecommendations = async (messageId) => {
  try {
    const response = await fetch('/telegram/recommendations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messageId })
    });
    const data = await response.json();
    return data.recommendations;
  } catch (error) {
    console.error('Failed to generate recommendations:', error);
  }
};
```

### **3. 답변 전송**
```javascript
const sendReply = async (messageId, selectedReply) => {
  try {
    const response = await fetch('/telegram/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messageId, selectedReply })
    });
    const result = await response.json();
    if (result.success) {
      // UI에서 답장 완료 표시
    }
  } catch (error) {
    console.error('Failed to send reply:', error);
  }
};
```

### **4. 상태 관리 예시 (React)**
```javascript
const [messages, setMessages] = useState([]);
const [selectedMessage, setSelectedMessage] = useState(null);
const [recommendations, setRecommendations] = useState([]);

// 메시지 목록 로드
useEffect(() => {
  const loadMessages = async () => {
    const response = await fetch('/telegram/messages');
    const data = await response.json();
    setMessages(data);
  };
  
  loadMessages();
  const interval = setInterval(loadMessages, 5000);
  return () => clearInterval(interval);
}, []);
```

---

## 🔧 **환경 설정**

### **환경 변수 (.env.development)**
```
NODE_ENV=development
PORT=3000
TELEGRAM_BOT_TOKEN=your_bot_token_here
```

### **서버 실행**
```bash
npm run start:dev
```

---

## 📝 **타입 정의 (TypeScript 프론트엔드용)**

```typescript
interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

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

interface RecommendationsResponse {
  messageId: number;
  recommendations: string[];
}

interface ReplyResponse {
  success: boolean;
  message: string;
}
```

---

## ⚠️ **주의사항**

1. **CORS 설정**: 프론트엔드 도메인에 맞게 CORS 설정 필요
2. **에러 처리**: 네트워크 오류, API 오류에 대한 적절한 에러 처리 구현
3. **로딩 상태**: API 호출 중 로딩 상태 표시
4. **실시간성**: 현재는 폴링 방식이므로 실시간성에 한계 있음 (추후 WebSocket 고려)
5. **봇 토큰**: 실제 텔레그램 봇 토큰 설정 필요

---

## 🎨 **UI/UX 권장사항**

1. **메시지 목록**: 읽지 않은 메시지 강조 표시
2. **AI 추천**: 3개 옵션을 카드 형태로 표시
3. **답장 완료**: 답장한 메시지는 회색으로 표시
4. **실시간 알림**: 새 메시지 도착 시 알림
5. **응답 시간**: AI 추천 생성 중 로딩 스피너 표시