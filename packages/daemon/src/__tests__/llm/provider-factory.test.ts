import { describe, it, expect } from 'vitest';
import { createProvider } from '../../llm/provider-factory.js';
import type { NexusConfig } from '@nexus-agent/shared';

const baseConfig: NexusConfig = {
  defaultModel: 'anthropic/claude-sonnet-4-5-20250929',
  providers: {
    anthropic: { apiKey: 'test-key' },
    openai: { apiKey: 'test-key' },
    google: { apiKey: 'test-key' },
    ollama: { baseUrl: 'http://localhost:11434/v1' },
    openrouter: { apiKey: 'test-key' },
    custom: { baseUrl: 'http://custom.api/v1', apiKey: 'test-key' },
  },
};

describe('createProvider', () => {
  it('creates anthropic provider', () => {
    const provider = createProvider('anthropic/claude-sonnet-4-5-20250929', baseConfig);
    expect(provider).toBeDefined();
  });

  it('creates openai provider', () => {
    const provider = createProvider('openai/gpt-4o', baseConfig);
    expect(provider).toBeDefined();
  });

  it('creates google provider', () => {
    const provider = createProvider('google/gemini-2.0-flash', baseConfig);
    expect(provider).toBeDefined();
  });

  it('creates ollama provider via openai compatibility', () => {
    const provider = createProvider('ollama/llama3', baseConfig);
    expect(provider).toBeDefined();
  });

  it('creates openrouter provider', () => {
    const provider = createProvider('openrouter/anthropic/claude-3-haiku', baseConfig);
    expect(provider).toBeDefined();
  });

  it('creates custom provider when baseUrl is set', () => {
    const provider = createProvider('custom/my-model', baseConfig);
    expect(provider).toBeDefined();
  });

  it('throws ConfigError for unknown provider without baseUrl', () => {
    expect(() => createProvider('unknown/model', baseConfig)).toThrow('Unknown provider');
  });
});
