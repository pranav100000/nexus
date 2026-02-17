import { describe, it, expect } from 'vitest';
import { ResultMerger } from '../../orchestrator/merger.js';
import type { SubtaskResult } from '@nexus-agent/shared';

describe('ResultMerger', () => {
  const merger = new ResultMerger();

  it('merges multiple agent results', () => {
    const results: SubtaskResult[] = [
      {
        agentName: 'security-reviewer',
        output: {
          summary: 'Found 1 issue',
          findings: [{ severity: 'warning', message: 'SQL injection risk', file: 'app.ts', line: 42 }],
          confidence: 0.85,
          approve: false,
        },
        tokenUsage: { input: 500, output: 200 },
        cost: 0.005,
        durationMs: 2000,
      },
      {
        agentName: 'perf-analyzer',
        output: {
          summary: 'No issues',
          findings: [],
          confidence: 0.95,
          approve: true,
        },
        tokenUsage: { input: 400, output: 100 },
        cost: 0.003,
        durationMs: 1500,
      },
    ];

    const merged = merger.merge(results);
    expect(merged.agentOutputs['security-reviewer']).toBeDefined();
    expect(merged.agentOutputs['perf-analyzer']).toBeDefined();
    expect(merged.totalCost).toBeCloseTo(0.008);
    expect(merged.totalDurationMs).toBe(2000);
    expect(merged.agentResults).toHaveLength(2);
    expect(merged.summary).toContain('security-reviewer');
    expect(merged.summary).toContain('perf-analyzer');
  });

  it('collects heterogeneous agent outputs', () => {
    const results: SubtaskResult[] = [
      {
        agentName: 'security-reviewer',
        output: {
          summary: 'Looks secure',
          findings: [],
          confidence: 0.9,
          approve: true,
        },
        tokenUsage: { input: 0, output: 0 },
        cost: 0,
        durationMs: 100,
      },
      {
        agentName: 'custom-agent',
        output: {
          summary: 'Custom analysis complete',
          data: { score: 42, tags: ['a', 'b'] },
        },
        tokenUsage: { input: 0, output: 0 },
        cost: 0,
        durationMs: 100,
      },
    ];

    const merged = merger.merge(results);
    expect(merged.agentOutputs['security-reviewer'].approve).toBe(true);
    expect(merged.agentOutputs['custom-agent'].data).toEqual({ score: 42, tags: ['a', 'b'] });
    expect(merged.summary).toContain('security-reviewer');
    expect(merged.summary).toContain('custom-agent');
  });

  it('builds summary from agent output summaries', () => {
    const results: SubtaskResult[] = [
      {
        agentName: 'a', output: { summary: 'ok' },
        tokenUsage: { input: 0, output: 0 }, cost: 0, durationMs: 0,
      },
      {
        agentName: 'b', output: { summary: 'also ok' },
        tokenUsage: { input: 0, output: 0 }, cost: 0, durationMs: 0,
      },
    ];
    const merged = merger.merge(results);
    expect(merged.summary).toContain('**a**: ok');
    expect(merged.summary).toContain('**b**: also ok');
  });

  it('handles agents without summary in output', () => {
    const results: SubtaskResult[] = [
      {
        agentName: 'no-summary-agent',
        output: { data: 'hello' },
        tokenUsage: { input: 0, output: 0 },
        cost: 0,
        durationMs: 100,
      },
    ];

    const merged = merger.merge(results);
    expect(merged.summary).toBe('');
    expect(merged.agentOutputs['no-summary-agent']).toEqual({ data: 'hello' });
  });
});
