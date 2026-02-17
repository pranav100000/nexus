import { generateText, generateObject, jsonSchema } from 'ai';
import { LLMError } from '@nexus-agent/shared';
import type { NexusConfig } from '@nexus-agent/shared';
import { createProvider } from './provider-factory.js';
import type { ChatRequest, ChatResponse, JsonSchemaRequest, LLMService, StructuredRequest } from './types.js';

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-5-20250929': { input: 3, output: 15 },
  'claude-haiku-3-5-20241022': { input: 0.8, output: 4 },
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gemini-2.0-flash': { input: 0.075, output: 0.3 },
};

export class LLMServiceImpl implements LLMService {
  constructor(private config: NexusConfig) {}

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const provider = createProvider(request.model, this.config);

    try {
      const result = await generateText({
        model: provider,
        messages: request.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        maxTokens: request.maxTokens,
      });

      return {
        content: result.text,
        usage: {
          inputTokens: result.usage.promptTokens,
          outputTokens: result.usage.completionTokens,
        },
      };
    } catch (error) {
      throw new LLMError(
        error instanceof Error ? error.message : String(error),
        request.model.split('/')[0],
        request.model,
      );
    }
  }

  async structured<T>(request: StructuredRequest<T>): Promise<T> {
    const provider = createProvider(request.model, this.config);

    try {
      const { object } = await generateObject({
        model: provider,
        system: request.system,
        prompt: request.prompt,
        schema: request.schema,
        maxTokens: request.maxTokens,
      });

      return object;
    } catch (error) {
      throw new LLMError(
        error instanceof Error ? error.message : String(error),
        request.model.split('/')[0],
        request.model,
      );
    }
  }

  async structuredJson(request: JsonSchemaRequest): Promise<Record<string, unknown>> {
    const provider = createProvider(request.model, this.config);

    try {
      const { object } = await generateObject({
        model: provider,
        system: request.system,
        prompt: request.prompt,
        schema: jsonSchema(request.schema),
        maxTokens: request.maxTokens,
      });

      return object as Record<string, unknown>;
    } catch (error) {
      throw new LLMError(
        error instanceof Error ? error.message : String(error),
        request.model.split('/')[0],
        request.model,
      );
    }
  }

  estimateCost(inputTokens: number, outputTokens: number, model: string): number {
    const modelId = model.includes('/') ? model.split('/').slice(1).join('/') : model;
    const pricing = MODEL_PRICING[modelId];
    if (!pricing) return 0;
    return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
  }
}
