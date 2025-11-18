/**
 * OpenAI Chat Message 인터페이스
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * OpenAI 임베딩 응답 인터페이스
 */
export interface EmbeddingResponse {
  embedding: number[];
  tokens: number;
}

/**
 * OpenAI GPT 응답 인터페이스
 */
export interface ChatCompletionResponse {
  content: string;
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };
}
