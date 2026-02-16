import { anthropic, createAnthropic } from '@ai-sdk/anthropic';
import { openai, createOpenAI } from '@ai-sdk/openai';
import { google, createGoogleGenerativeAI } from '@ai-sdk/google';
import { ConfigError } from '@nexus-agent/shared';
import type { NexusConfig } from '@nexus-agent/shared';

export function createProvider(modelString: string, config: NexusConfig) {
  const [providerName, ...rest] = modelString.split('/');
  const modelId = rest.join('/');
  const providerConfig = config.providers[providerName];

  switch (providerName) {
    case 'anthropic':
      if (providerConfig?.apiKey) {
        return createAnthropic({ apiKey: providerConfig.apiKey })(modelId);
      }
      return anthropic(modelId);
    case 'openai':
      if (providerConfig?.apiKey) {
        return createOpenAI({ apiKey: providerConfig.apiKey })(modelId);
      }
      return openai(modelId);
    case 'google':
      if (providerConfig?.apiKey) {
        return createGoogleGenerativeAI({ apiKey: providerConfig.apiKey })(modelId);
      }
      return google(modelId);
    case 'ollama':
      return createOpenAI({
        baseURL: providerConfig?.baseUrl ?? 'http://localhost:11434/v1',
        apiKey: 'ollama',
      })(modelId);
    case 'openrouter':
      return createOpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: providerConfig?.apiKey,
      })(modelId);
    default:
      if (providerConfig?.baseUrl) {
        return createOpenAI({
          baseURL: providerConfig.baseUrl,
          apiKey: providerConfig?.apiKey,
        })(modelId);
      }
      throw new ConfigError(`Unknown provider: ${providerName}`);
  }
}
