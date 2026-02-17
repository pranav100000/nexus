import { describe, it, expect } from 'vitest';
import { ManualDecomposer } from '../../orchestrator/decomposer.js';
import { AgentManager } from '../../agents/agent-manager.js';
import type { TaskInput } from '@nexus-agent/shared';

// We need to mock the agent manager with some agents
function createMockAgentManager(agentNames: string[]): AgentManager {
  const manager = new AgentManager();
  // Access private field to inject mock data
  (manager as any).agents = agentNames.map((name) => ({
    manifest: {
      name,
      version: '0.1.0',
      description: `Mock ${name}`,
      capabilities: ['review'],
      languages: ['typescript'],
      tools: [],
      model: 'anthropic/claude-sonnet-4-5-20250929',
      maxContextTokens: 100000,
    },
    systemPrompt: '',
  }));
  return manager;
}

describe('ManualDecomposer', () => {
  const decomposer = new ManualDecomposer();

  it('creates subtasks for all agents when none specified', () => {
    const manager = createMockAgentManager(['agent-a', 'agent-b', 'agent-c']);
    const input: TaskInput = {
      action: 'review',
      context: { repoPath: '/tmp/test' },
    };

    const subtasks = decomposer.decompose(input, manager);
    expect(subtasks).toHaveLength(3);
    expect(subtasks.map((s) => s.agentName)).toEqual(['agent-a', 'agent-b', 'agent-c']);
  });

  it('creates subtasks only for specified agents', () => {
    const manager = createMockAgentManager(['agent-a', 'agent-b', 'agent-c']);
    const input: TaskInput = {
      action: 'review',
      agents: ['agent-a', 'agent-c'],
      context: { repoPath: '/tmp/test' },
    };

    const subtasks = decomposer.decompose(input, manager);
    expect(subtasks).toHaveLength(2);
    expect(subtasks.map((s) => s.agentName)).toEqual(['agent-a', 'agent-c']);
  });

  it('throws when specified agent not found', () => {
    const manager = createMockAgentManager(['agent-a']);
    const input: TaskInput = {
      action: 'review',
      agents: ['nonexistent'],
      context: { repoPath: '/tmp/test' },
    };

    expect(() => decomposer.decompose(input, manager)).toThrow('Agent not found');
  });

  it('uses description when provided', () => {
    const manager = createMockAgentManager(['agent-a']);
    const input: TaskInput = {
      action: 'review',
      description: 'Check for security issues',
      context: { repoPath: '/tmp/test' },
    };

    const subtasks = decomposer.decompose(input, manager);
    expect(subtasks[0].description).toBe('Check for security issues');
  });

  it('generates description from action when not provided', () => {
    const manager = createMockAgentManager(['agent-a']);
    const input: TaskInput = {
      action: 'review',
      context: { repoPath: '/tmp/test' },
    };

    const subtasks = decomposer.decompose(input, manager);
    expect(subtasks[0].description).toContain('review');
    expect(subtasks[0].description).toContain('agent-a');
  });

  it('each subtask has a unique id', () => {
    const manager = createMockAgentManager(['agent-a', 'agent-b']);
    const input: TaskInput = {
      action: 'review',
      context: { repoPath: '/tmp/test' },
    };

    const subtasks = decomposer.decompose(input, manager);
    expect(subtasks[0].id).not.toBe(subtasks[1].id);
  });

  it('includes commit context in generated description', () => {
    const manager = createMockAgentManager(['agent-a']);
    const input: TaskInput = {
      action: 'review',
      context: { repoPath: '/tmp/test', commit: 'HEAD' },
    };

    const subtasks = decomposer.decompose(input, manager);
    expect(subtasks[0].description).toContain('review');
    expect(subtasks[0].description).toContain('agent-a');
    expect(subtasks[0].description).toContain('HEAD');
    expect(subtasks[0].description).toContain('Focus ONLY');
  });

  it('includes base context in generated description', () => {
    const manager = createMockAgentManager(['agent-a']);
    const input: TaskInput = {
      action: 'review',
      context: { repoPath: '/tmp/test', base: 'main' },
    };

    const subtasks = decomposer.decompose(input, manager);
    expect(subtasks[0].description).toContain('review');
    expect(subtasks[0].description).toContain('agent-a');
    expect(subtasks[0].description).toContain('main');
    expect(subtasks[0].description).toContain('Focus ONLY');
  });
});
