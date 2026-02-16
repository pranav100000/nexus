import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { ConfigError } from '@nexus-agent/shared';
import type { NexusConfig } from '@nexus-agent/shared';

export function createProvider(modelString: string, config: NexusConfig) {
  const [providerName, ...rest] = modelString.split('/');
  const modelId = rest.join('/');
  const providerConfig = config.providers[providerName];

  switch (providerName) {
    case 'anthropic':
      return anthropic(modelId, { apiKey: providerConfig?.apiKey });
    case 'openai':
      return openai(modelId, { apiKey: providerConfig?.apiKey });
    case 'google':
      return google(modelId, { apiKey: providerConfig?.apiKey });
    case 'ollama':
      return openai(modelId, {
        baseURL: providerConfig?.baseUrl ?? 'http://localhost:11434/v1',
      });
    case 'openrouter':
      return openai(modelId, {
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: providerConfig?.apiKey,
      });
    default:
      if (providerConfig?.baseUrl) {
        return openai(modelId, {
          baseURL: providerConfig.baseUrl,
          apiKey: providerConfig?.apiKey,
        });
      }
      throw new ConfigError(`Unknown provider: ${providerName}`);
  }
}
