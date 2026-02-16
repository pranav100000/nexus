import { describe, it, expect } from 'vitest';
import { ContextManager } from '../../context/context-manager.js';
import type { AgentManifest } from '@nexus-agent/shared';

describe('ContextManager', () => {
  const manager = new ContextManager();

  describe('filterForAgent', () => {
    const baseContext = {
      repoPath: '/tmp/test',
      gitDiff: 'diff content',
      changedFiles: ['app.ts', 'style.css', 'main.py', 'README.md'],
      fileContents: new Map([
        ['app.ts', 'console.log("hello")'],
        ['style.css', 'body { color: red }'],
        ['main.py', 'print("hello")'],
        ['README.md', '# README'],
      ]),
      branch: 'main',
      languages: ['typescript', 'python'],
    };

    it('returns all files when agent has no language restrictions', () => {
      const agent: AgentManifest = {
        name: 'test',
        version: '0.1.0',
        description: 'test',
        capabilities: [],
        languages: [],
        tools: [],
        model: 'test/model',
        maxContextTokens: 100000,
      };

      const filtered = manager.filterForAgent(baseContext, agent);
      expect(filtered.changedFiles).toEqual(baseContext.changedFiles);
    });

    it('filters files by agent languages', () => {
      const agent: AgentManifest = {
        name: 'ts-only',
        version: '0.1.0',
        description: 'test',
        capabilities: [],
        languages: ['typescript'],
        tools: [],
        model: 'test/model',
        maxContextTokens: 100000,
      };

      const filtered = manager.filterForAgent(baseContext, agent);
      // app.ts matches typescript, README.md has no recognized lang so it passes, style.css has no recognized lang so passes
      expect(filtered.changedFiles).toContain('app.ts');
      expect(filtered.changedFiles).not.toContain('main.py');
    });

    it('filters fileContents to match filtered files', () => {
      const agent: AgentManifest = {
        name: 'py-only',
        version: '0.1.0',
        description: 'test',
        capabilities: [],
        languages: ['python'],
        tools: [],
        model: 'test/model',
        maxContextTokens: 100000,
      };

      const filtered = manager.filterForAgent(baseContext, agent);
      expect(filtered.fileContents.has('main.py')).toBe(true);
      expect(filtered.fileContents.has('app.ts')).toBe(false);
    });

    it('preserves non-file properties', () => {
      const agent: AgentManifest = {
        name: 'test',
        version: '0.1.0',
        description: 'test',
        capabilities: [],
        languages: ['typescript'],
        tools: [],
        model: 'test/model',
        maxContextTokens: 100000,
      };

      const filtered = manager.filterForAgent(baseContext, agent);
      expect(filtered.repoPath).toBe(baseContext.repoPath);
      expect(filtered.gitDiff).toBe(baseContext.gitDiff);
      expect(filtered.branch).toBe(baseContext.branch);
    });
  });
});
