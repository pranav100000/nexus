import { describe, it, expect } from 'vitest';
import { AgentManager } from '../../agents/agent-manager.js';
import type { LoadedAgent } from '../../agents/manifest-loader.js';

function makeAgent(name: string, capabilities: string[] = [], languages: string[] = []): LoadedAgent {
  return {
    manifest: {
      name,
      version: '0.1.0',
      description: `Agent ${name}`,
      capabilities,
      languages,
      tools: [],
      model: 'anthropic/claude-sonnet-4-5-20250929',
      maxContextTokens: 100000,
    },
    systemPrompt: `You are ${name}`,
  };
}

describe('AgentManager', () => {
  function createManager(agents: LoadedAgent[]): AgentManager {
    const manager = new AgentManager();
    (manager as any).agents = agents;
    return manager;
  }

  it('getAll returns all agents', () => {
    const manager = createManager([makeAgent('a'), makeAgent('b')]);
    expect(manager.getAll()).toHaveLength(2);
  });

  it('getByName finds agent', () => {
    const manager = createManager([makeAgent('sec'), makeAgent('perf')]);
    const agent = manager.getByName('sec');
    expect(agent).toBeDefined();
    expect(agent!.manifest.name).toBe('sec');
  });

  it('getByName returns undefined for unknown', () => {
    const manager = createManager([makeAgent('sec')]);
    expect(manager.getByName('unknown')).toBeUndefined();
  });

  it('getByCapability filters correctly', () => {
    const manager = createManager([
      makeAgent('sec', ['security-review']),
      makeAgent('perf', ['performance-review']),
      makeAgent('both', ['security-review', 'performance-review']),
    ]);

    const secAgents = manager.getByCapability('security-review');
    expect(secAgents).toHaveLength(2);
    expect(secAgents.map((a) => a.manifest.name)).toContain('sec');
    expect(secAgents.map((a) => a.manifest.name)).toContain('both');
  });

  it('getAgentInfos returns simplified info', () => {
    const manager = createManager([makeAgent('test', ['cap1'], ['typescript'])]);
    const infos = manager.getAgentInfos();
    expect(infos).toHaveLength(1);
    expect(infos[0]).toEqual({
      name: 'test',
      description: 'Agent test',
      capabilities: ['cap1'],
      languages: ['typescript'],
      model: 'anthropic/claude-sonnet-4-5-20250929',
    });
  });

  it('requireAgents throws NoAgentsError when empty', () => {
    const manager = createManager([]);
    expect(() => manager.requireAgents()).toThrow('No agents');
  });

  it('requireAgents succeeds when agents exist', () => {
    const manager = createManager([makeAgent('a')]);
    expect(() => manager.requireAgents()).not.toThrow();
  });
});
