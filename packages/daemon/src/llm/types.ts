import type { z } from 'zod';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  maxTokens?: number;
}

export interface ChatResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface StructuredRequest<T> {
  model: string;
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  maxTokens?: number;
}

export interface LLMService {
  chat(request: ChatRequest): Promise<ChatResponse>;
  structured<T>(request: StructuredRequest<T>): Promise<T>;
  estimateCost(inputTokens: number, outputTokens: number, model: string): number;
}
