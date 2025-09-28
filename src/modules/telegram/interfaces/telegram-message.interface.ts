// 텔레그램 사용자 인터페이스
export interface TelegramUser {
  id: number;
  is_bot?: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

// 텔레그램 채팅 인터페이스
export interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

// 텔레그램 원본 메시지 인터페이스
export interface TelegramMessage {
  messageId?: number;
  from?: TelegramUser;
  chat: TelegramChat;
  text?: string;
  timestamp: Date;
}

// 저장된 메시지 인터페이스 (추가 필드 포함)
export interface SavedMessage extends TelegramMessage {
  id: number;
  isRead: boolean;
  aiRecommendations: string[];
  replied: boolean;
  selectedReply?: string;
}

// API 응답 인터페이스들
export interface MessageListResponse {
  messages: SavedMessage[];
  count: number;
}

export interface RecommendationsResponse {
  messageId: number;
  recommendations: string[];
}

export interface ReplyResponse {
  success: boolean;
  message: string;
}
