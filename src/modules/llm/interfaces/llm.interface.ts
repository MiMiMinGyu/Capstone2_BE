/**
 * LLM 답변 생성 요청 파라미터
 */
export interface GenerateReplyRequest {
  userId: string; // 사용자 ID
  partnerId: string; // 대화 상대 Partner ID
  message: string; // 수신한 메시지 내용
}

/**
 * 유사도 측정 결과
 */
export interface SimilarityMetrics {
  average: number; // 평균 유사도 (0-100)
  max: number; // 최고 유사도 (0-100)
  min: number; // 최저 유사도 (0-100)
  distribution: Record<string, number>; // 유사도 분포
}

/**
 * LLM 답변 생성 응답
 */
export interface GenerateReplyResponse {
  reply: string; // 생성된 답변
  similarity?: SimilarityMetrics; // 생성된 답변의 유사도
  context?: {
    recentMessages?: string[]; // 최근 대화 맥락
    similarExamples?: string[]; // 유사한 말투 예시
    styleProfile?: string; // 말투 프로필 정보
    receiverInfo?: string; // 수신자 관계 정보
  };
}

/**
 * 다중 답변 생성 응답 (긍정/부정)
 */
export interface GenerateMultipleRepliesResponse {
  positiveReply: string; // 긍정적인 답변 (동의/수락)
  negativeReply: string; // 부정적인 답변 (거절/불가)
  positiveSimilarity?: SimilarityMetrics; // 긍정 답변 유사도
  negativeSimilarity?: SimilarityMetrics; // 부정 답변 유사도
  context?: {
    recentMessages?: string[]; // 최근 대화 맥락
    similarExamples?: string[]; // 유사한 말투 예시
    styleProfile?: string; // 말투 프로필 정보
    receiverInfo?: string; // 수신자 관계 정보
  };
}

/**
 * 최근 대화 컨텍스트
 */
export interface RecentContext {
  messages: Array<{
    sender: string;
    content: string;
    timestamp: Date;
  }>;
}

/**
 * 유사도 검색 결과
 */
export interface SimilarContext {
  examples: Array<{
    text: string;
    similarity: number; // 코사인 유사도 (0-1)
    previous_message?: string | null; // 대화 쌍: 상대방의 이전 메시지
  }>;
}

/**
 * 말투 프로필
 */
export interface StyleProfile {
  politenessLevel?: string; // 존댓말/반말
  vibeType?: string; // 말투 분위기
  characteristics: string[]; // 특징 리스트
}

/**
 * 수신자 정보
 */
export interface ReceiverInfo {
  name: string;
  category: string; // 관계 카테고리
  politeness?: string; // 존댓말 수준 (FORMAL, POLITE, CASUAL)
  vibe?: string; // 말투 분위기 (CALM, DIRECT, PLAYFUL, CARING)
  relationshipDescription?: string;
}
