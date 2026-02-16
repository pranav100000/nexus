import { describe, it, expect } from 'vitest';
import { LLMServiceImpl } from '../../llm/llm-service.js';
import type { NexusConfig } from '@nexus-agent/shared';

const config: NexusConfig = {
  defaultModel: 'anthropic/claude-sonnet-4-5-20250929',
  providers: {},
};

describe('LLMServiceImpl', () => {
  describe('estimateCost', () => {
    const llm = new LLMServiceImpl(config);

    it('estimates cost for known models', () => {
      const cost = llm.estimateCost(1000, 500, 'anthropic/claude-sonnet-4-5-20250929');
      expect(cost).toBeGreaterThan(0);
      // 1000 * 3 / 1M + 500 * 15 / 1M = 0.003 + 0.0075 = 0.0105
      expect(cost).toBeCloseTo(0.0105, 4);
    });

    it('returns 0 for unknown models', () => {
      const cost = llm.estimateCost(1000, 500, 'unknown/model');
      expect(cost).toBe(0);
    });

    it('handles model strings with provider prefix', () => {
      const cost = llm.estimateCost(1000, 500, 'openai/gpt-4o');
      expect(cost).toBeGreaterThan(0);
    });
  });
});
