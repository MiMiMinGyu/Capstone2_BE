import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  ChatMessage,
  EmbeddingResponse,
  ChatCompletionResponse,
} from './interfaces';

@Injectable()
export class OpenaiService {
  private readonly logger = new Logger(OpenaiService.name);
  private readonly client: OpenAI;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');

    if (!apiKey) {
      this.logger.error('OPENAI_API_KEY is not set in environment variables');
      throw new Error('OPENAI_API_KEY is required');
    }

    this.client = new OpenAI({ apiKey });
    this.logger.log('OpenAI client initialized successfully');
  }

  /**
   * 텍스트를 임베딩 벡터로 변환
   * @param text 임베딩할 텍스트
   * @returns 1536차원 벡터와 토큰 사용량
   */
  async createEmbedding(text: string): Promise<EmbeddingResponse> {
    try {
      const response = await this.client.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
        encoding_format: 'float',
      });

      return {
        embedding: response.data[0].embedding,
        tokens: response.usage.total_tokens,
      };
    } catch (error) {
      this.logger.error('Failed to create embedding', error);
      throw error;
    }
  }

  /**
   * 여러 텍스트를 배치로 임베딩 생성
   * @param texts 임베딩할 텍스트 배열
   * @returns 임베딩 배열과 총 토큰 사용량
   */
  async createEmbeddings(
    texts: string[],
  ): Promise<{ embeddings: number[][]; totalTokens: number }> {
    try {
      const response = await this.client.embeddings.create({
        model: 'text-embedding-3-small',
        input: texts,
        encoding_format: 'float',
      });

      return {
        embeddings: response.data.map((item) => item.embedding),
        totalTokens: response.usage.total_tokens,
      };
    } catch (error) {
      this.logger.error('Failed to create embeddings (batch)', error);
      throw error;
    }
  }

  /**
   * GPT 모델로 채팅 완성 생성
   * @param messages 대화 메시지 배열
   * @param options 옵션 (temperature, max_tokens 등)
   * @returns GPT 응답 텍스트와 토큰 사용량
   */
  async generateChatCompletion(
    messages: ChatMessage[],
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    },
  ): Promise<ChatCompletionResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model: options?.model || 'gpt-4o-mini',
        messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 60,
      });

      return {
        content: response.choices[0].message.content || '',
        tokens: {
          prompt: response.usage?.prompt_tokens || 0,
          completion: response.usage?.completion_tokens || 0,
          total: response.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      this.logger.error('Failed to generate chat completion', error);
      throw error;
    }
  }
}
