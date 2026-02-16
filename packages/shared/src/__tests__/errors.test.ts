import { describe, it, expect } from 'vitest';
import {
  NexusError,
  DaemonNotRunningError,
  TaskNotFoundError,
  NoAgentsError,
  LLMError,
  ConfigError,
  DaemonStartError,
} from '../errors.js';

describe('errors', () => {
  it('NexusError is an Error', () => {
    const err = new NexusError('test');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('NexusError');
    expect(err.message).toBe('test');
  });

  it('DaemonNotRunningError has correct message', () => {
    const err = new DaemonNotRunningError();
    expect(err).toBeInstanceOf(NexusError);
    expect(err.name).toBe('DaemonNotRunningError');
    expect(err.message).toContain('not running');
  });

  it('TaskNotFoundError includes task ID', () => {
    const err = new TaskNotFoundError('abc-123');
    expect(err).toBeInstanceOf(NexusError);
    expect(err.name).toBe('TaskNotFoundError');
    expect(err.message).toContain('abc-123');
  });

  it('NoAgentsError has helpful message', () => {
    const err = new NoAgentsError();
    expect(err).toBeInstanceOf(NexusError);
    expect(err.message).toContain('No agents');
  });

  it('LLMError includes provider and model info', () => {
    const err = new LLMError('timeout', 'anthropic', 'claude-sonnet');
    expect(err).toBeInstanceOf(NexusError);
    expect(err.name).toBe('LLMError');
    expect(err.message).toContain('timeout');
    expect(err.provider).toBe('anthropic');
    expect(err.model).toBe('claude-sonnet');
  });

  it('ConfigError wraps message', () => {
    const err = new ConfigError('bad key');
    expect(err).toBeInstanceOf(NexusError);
    expect(err.message).toContain('bad key');
  });

  it('DaemonStartError points to log file', () => {
    const err = new DaemonStartError('port in use');
    expect(err).toBeInstanceOf(NexusError);
    expect(err.message).toContain('port in use');
    expect(err.message).toContain('daemon.log');
  });
});
