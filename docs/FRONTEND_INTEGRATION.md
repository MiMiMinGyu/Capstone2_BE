# LikeMe API - 프론트엔드 연동 가이드

> 최종 업데이트: 2025-11-07

## 📋 프로젝트 개요

AI 답변 추천 서비스 백엔드 API입니다. JWT 기반 인증을 통해 사용자별 개인화된 서비스를 제공하며, 텔레그램 봇을 통해 메시지를 수신하고 AI 추천 답변을 제공합니다.

---

## 🎯 주요 플로우

### 1. 인증 플로우
```
[사용자] → [회원가입/로그인] → [JWT 토큰 발급]
                ↓
[로컬스토리지 저장] → [API 요청 시 토큰 포함]
                ↓
    [Access Token 만료] → [Refresh Token으로 갱신]
```

### 2. 메시지 처리 플로우
```
[제3자] → [텔레그램 봇] → [백엔드 저장] → [SSE로 실시간 알림]
                                      ↓
                            [프론트엔드에서 조회]
                                      ↓
                              [AI 추천 답변 생성]
                                      ↓
[제3자] ← [텔레그램 봇] ← [답변 전송] ← [사용자가 선택]
```

---

## 🔗 API 엔드포인트

### **기본 URL**
```
http://localhost:3000
```

### **API 문서**
```
http://localhost:3000/api
```

### **상세 API 명세서**
전체 API 명세는 `docs/API_SPECIFICATION.md` 참조

---

## 🔐 인증 (Authentication)

### 1. 회원가입

```typescript
const register = async (userData: RegisterData) => {
  try {
    const response = await fetch('http://localhost:3000/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: userData.username,
        email: userData.email,
        password: userData.password,
        name: userData.name, // 선택
      }),
    });

    if (!response.ok) {
      throw new Error('Registration failed');
    }

    const data = await response.json();

    // 토큰 저장
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    localStorage.setItem('user', JSON.stringify(data.user));

    return data;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

// 사용 예시
interface RegisterData {
  username: string;
  email: string;
  password: string;
  name?: string;
}
```

---

### 2. 로그인

```typescript
const login = async (email: string, password: string) => {
  try {
    const response = await fetch('http://localhost:3000/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const data = await response.json();

    // 토큰 저장
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    localStorage.setItem('user', JSON.stringify(data.user));

    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};
```

---

### 3. 로그아웃

```typescript
const logout = async () => {
  try {
    const token = localStorage.getItem('access_token');

    await fetch('http://localhost:3000/auth/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    // 로컬 스토리지 정리
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');

    // 로그인 페이지로 리다이렉트
    window.location.href = '/login';
  } catch (error) {
    console.error('Logout error:', error);
  }
};
```

---

### 4. 토큰 자동 갱신 (Axios 인터셉터)

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000',
});

// 요청 인터셉터 - 토큰 자동 추가
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 응답 인터셉터 - 토큰 자동 갱신
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 401 에러이고 재시도가 아닌 경우
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');

        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post('http://localhost:3000/auth/refresh', {
          refresh_token: refreshToken
        });

        const { access_token } = response.data;
        localStorage.setItem('access_token', access_token);

        // 원래 요청 재시도
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);

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

export default api;
```

---

### 5. 사용자 정보 조회

```typescript
const getCurrentUser = async () => {
  try {
    const response = await api.get('/auth/me');
    return response.data;
  } catch (error) {
    console.error('Get user error:', error);
    throw error;
  }
};
```

---

## 📨 텔레그램 메시지 처리

### 1. 실시간 메시지 수신 (SSE - 권장)

```typescript
// React 예시
import { useEffect, useState } from 'react';

function MessageListener() {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const eventSource = new EventSource('http://localhost:3000/telegram/events');

    eventSource.onmessage = (event) => {
      const newMessage = JSON.parse(event.data);
      console.log('새 메시지 도착:', newMessage);

      // 메시지 목록에 추가
      setMessages(prev => [newMessage, ...prev]);

      // 알림 표시
      showNotification(newMessage);
    };

    eventSource.onerror = (error) => {
      console.error('SSE 연결 오류:', error);
      eventSource.close();

      // 재연결 시도
      setTimeout(() => {
        // 재연결 로직
      }, 5000);
    };

    // 클린업
    return () => {
      eventSource.close();
    };
  }, []);

  return (
    <div>
      {messages.map(msg => (
        <MessageCard key={msg.id} message={msg} />
      ))}
    </div>
  );
}
```

---

### 2. 메시지 목록 조회 (폴링 - 대안)

```typescript
const fetchMessages = async () => {
  try {
    const response = await api.get('/telegram/messages');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch messages:', error);
    throw error;
  }
};

// 주기적으로 새 메시지 확인
useEffect(() => {
  const interval = setInterval(() => {
    fetchMessages().then(messages => {
      setMessages(messages);
    });
  }, 5000); // 5초마다

  return () => clearInterval(interval);
}, []);
```

---

### 3. AI 추천 답변 생성

```typescript
const generateRecommendations = async (messageId: number) => {
  try {
    const response = await api.post('/telegram/recommendations', {
      messageId
    });
    return response.data.recommendations;
  } catch (error) {
    console.error('Failed to generate recommendations:', error);
    throw error;
  }
};

// 사용 예시
const handleGenerateReply = async (messageId: number) => {
  setLoading(true);
  try {
    const recommendations = await generateRecommendations(messageId);
    setRecommendations(recommendations);
  } catch (error) {
    alert('추천 답변 생성에 실패했습니다.');
  } finally {
    setLoading(false);
  }
};
```

---

### 4. 답변 전송

```typescript
const sendReply = async (messageId: number, selectedReply: string) => {
  try {
    const response = await api.post('/telegram/reply', {
      messageId,
      selectedReply
    });
    return response.data;
  } catch (error) {
    console.error('Failed to send reply:', error);
    throw error;
  }
};

// 사용 예시
const handleSendReply = async (reply: string) => {
  try {
    await sendReply(selectedMessage.id, reply);
    alert('답장이 전송되었습니다!');
    // 메시지 목록 새로고침
    fetchMessages();
  } catch (error) {
    alert('답장 전송에 실패했습니다.');
  }
};
```

---

## 💡 상태 관리 예시 (React + Context)

### AuthContext

```typescript
// contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  username: string;
  name: string | null;
  email: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 초기 로드 시 사용자 정보 확인
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await fetch('http://localhost:3000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const data = await response.json();

    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    localStorage.setItem('user', JSON.stringify(data.user));

    setUser(data.user);
  };

  const logout = async () => {
    const token = localStorage.getItem('access_token');

    if (token) {
      await fetch('http://localhost:3000/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
    }

    localStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

---

## 📝 TypeScript 타입 정의

```typescript
// types/api.ts

export interface User {
  id: string;
  username: string;
  name: string | null;
  email: string;
  created_at: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
}

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

export interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface SavedMessage {
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

export interface RecommendationsResponse {
  messageId: number;
  recommendations: string[];
}

export interface ReplyResponse {
  success: boolean;
  message: string;
}
```

---

## 🔧 환경 설정

### .env.development (프론트엔드)

```
VITE_API_BASE_URL=http://localhost:3000
VITE_WS_URL=http://localhost:3000
```

### Vite Config (CORS 프록시)

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
});
```

---

## ⚠️ 주의사항

### 1. 보안
- **토큰 저장**: localStorage는 XSS 공격에 취약. httpOnly Cookie 사용 권장
- **HTTPS**: 프로덕션에서는 반드시 HTTPS 사용
- **토큰 만료**: Access Token은 15분, Refresh Token은 30일 유효

### 2. 에러 처리
```typescript
// 모든 API 호출에 에러 처리 추가
try {
  const data = await api.get('/some-endpoint');
} catch (error) {
  if (error.response?.status === 401) {
    // 인증 오류 - 로그인 페이지로
  } else if (error.response?.status === 500) {
    // 서버 오류
    alert('서버 오류가 발생했습니다.');
  } else {
    // 네트워크 오류
    alert('네트워크 오류가 발생했습니다.');
  }
}
```

### 3. SSE 연결 관리
```typescript
// 페이지 이탈 시 SSE 연결 종료
useEffect(() => {
  return () => {
    eventSource.close();
  };
}, []);
```

### 4. 로딩 상태
```typescript
// API 호출 중 로딩 표시
const [loading, setLoading] = useState(false);

const fetchData = async () => {
  setLoading(true);
  try {
    const data = await api.get('/endpoint');
    // 데이터 처리
  } finally {
    setLoading(false);
  }
};
```

---

## 🎨 UI/UX 권장사항

1. **로그인 화면**
   - 회원가입/로그인 탭 구분
   - "로그인 상태 유지" 체크박스 (localStorage vs sessionStorage)
   - 비밀번호 표시/숨김 토글

2. **메시지 목록**
   - 읽지 않은 메시지 강조 표시
   - 시간 표시 (상대 시간: "5분 전")
   - 답장 완료된 메시지는 회색으로 표시

3. **AI 추천 답변**
   - 3개 옵션을 카드 형태로 표시
   - 각 카드에 "선택" 버튼
   - 생성 중 로딩 스피너 표시

4. **실시간 알림**
   - 새 메시지 도착 시 브라우저 알림
   - 읽지 않은 메시지 개수 배지 표시

5. **반응형 디자인**
   - 모바일, 태블릿, 데스크톱 지원
   - 터치 제스처 지원 (스와이프 등)

---

## 📚 참고 문서

- `docs/API_SPECIFICATION.md` - 전체 API 명세서
- `docs/CURRENT_STATUS.md` - 프로젝트 현재 상태
- `docs/AUTH_ARCHITECTURE.md` - JWT 인증 아키텍처
- Swagger 문서: http://localhost:3000/api

---

## 🚀 다음 단계

- 카카오톡 txt 파일 업로드 UI
- 파트너 관리 UI
- 관계 설정 UI (10개 카테고리)
- 실제 AI 답변 생성 (OpenAI 통합 후)
