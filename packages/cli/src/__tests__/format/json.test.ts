import { describe, it, expect } from 'vitest';
import { formatResultJson, formatEventJson, formatAgentListJson } from '../../format/json.js';
import type { TaskResult, TaskEvent, AgentInfo } from '@nexus-agent/shared';

describe('json formatters', () => {
  it('formatResultJson produces valid JSON', () => {
    const result: TaskResult = {
      summary: 'test',
      findings: [],
      approve: true,
      totalCost: 0.01,
      totalDurationMs: 500,
      agentResults: [],
    };
    const json = formatResultJson(result);
    const parsed = JSON.parse(json);
    expect(parsed.summary).toBe('test');
    expect(parsed.approve).toBe(true);
  });

  it('formatEventJson produces valid JSON', () => {
    const event: TaskEvent = {
      type: 'progress',
      taskId: 'abc',
      agentName: 'test',
      status: 'started',
      message: 'Running...',
      timestamp: new Date(),
    };
    const json = formatEventJson(event);
    const parsed = JSON.parse(json);
    expect(parsed.type).toBe('progress');
  });

  it('formatAgentListJson produces valid JSON array', () => {
    const agents: AgentInfo[] = [
      {
        name: 'test-agent',
        description: 'A test agent',
        capabilities: ['review'],
        languages: ['typescript'],
        model: 'anthropic/claude-sonnet',
      },
    ];
    const json = formatAgentListJson(agents);
    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe('test-agent');
  });
});
