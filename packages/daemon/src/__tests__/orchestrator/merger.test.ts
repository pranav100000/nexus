import { describe, it, expect } from 'vitest';
import { ResultMerger } from '../../orchestrator/merger.js';
import type { SubtaskResult } from '@nexus-agent/shared';

describe('ResultMerger', () => {
  const merger = new ResultMerger();

  it('merges multiple agent results', () => {
    const results: SubtaskResult[] = [
      {
        agentName: 'security-reviewer',
        summary: 'Found 1 issue',
        findings: [{ severity: 'warning', message: 'SQL injection risk', file: 'app.ts', line: 42 }],
        confidence: 0.85,
        approve: false,
        tokenUsage: { input: 500, output: 200 },
        cost: 0.005,
        durationMs: 2000,
      },
      {
        agentName: 'perf-analyzer',
        summary: 'No issues',
        findings: [],
        confidence: 0.95,
        approve: true,
        tokenUsage: { input: 400, output: 100 },
        cost: 0.003,
        durationMs: 1500,
      },
    ];

    const merged = merger.merge(results);
    expect(merged.findings).toHaveLength(1);
    expect(merged.approve).toBe(false); // One agent disapproved
    expect(merged.totalCost).toBeCloseTo(0.008);
    expect(merged.totalDurationMs).toBe(2000); // Max of all durations
    expect(merged.agentResults).toHaveLength(2);
    expect(merged.summary).toContain('security-reviewer');
    expect(merged.summary).toContain('perf-analyzer');
  });

  it('deduplicates identical findings', () => {
    const finding = { severity: 'critical' as const, message: 'Same issue', file: 'x.ts', line: 1 };
    const results: SubtaskResult[] = [
      {
        agentName: 'agent-a',
        summary: 'Found issue',
        findings: [finding],
        confidence: 0.9,
        approve: false,
        tokenUsage: { input: 0, output: 0 },
        cost: 0,
        durationMs: 100,
      },
      {
        agentName: 'agent-b',
        summary: 'Also found issue',
        findings: [finding],
        confidence: 0.8,
        approve: false,
        tokenUsage: { input: 0, output: 0 },
        cost: 0,
        durationMs: 100,
      },
    ];

    const merged = merger.merge(results);
    expect(merged.findings).toHaveLength(1); // Deduplicated
  });

  it('sorts findings by severity', () => {
    const results: SubtaskResult[] = [
      {
        agentName: 'agent',
        summary: 'Issues found',
        findings: [
          { severity: 'info', message: 'info issue' },
          { severity: 'critical', message: 'critical issue' },
          { severity: 'warning', message: 'warning issue' },
        ],
        confidence: 0.9,
        approve: false,
        tokenUsage: { input: 0, output: 0 },
        cost: 0,
        durationMs: 100,
      },
    ];

    const merged = merger.merge(results);
    expect(merged.findings[0].severity).toBe('critical');
    expect(merged.findings[1].severity).toBe('warning');
    expect(merged.findings[2].severity).toBe('info');
  });

  it('approves when all agents approve', () => {
    const results: SubtaskResult[] = [
      {
        agentName: 'a', summary: 'ok', findings: [], confidence: 1, approve: true,
        tokenUsage: { input: 0, output: 0 }, cost: 0, durationMs: 0,
      },
      {
        agentName: 'b', summary: 'ok', findings: [], confidence: 1, approve: true,
        tokenUsage: { input: 0, output: 0 }, cost: 0, durationMs: 0,
      },
    ];
    expect(merger.merge(results).approve).toBe(true);
  });
});
