import { describe, it, expect } from 'vitest';
import { DAEMON_PORT, DAEMON_HOST, DAEMON_URL, NEXUS_DIR, CONFIG_FILE, PID_FILE, LOG_FILE, AGENTS_DIR, DEFAULTS } from '../constants.js';

describe('constants', () => {
  it('has correct daemon port', () => {
    expect(DAEMON_PORT).toBe(19200);
  });

  it('has correct daemon host', () => {
    expect(DAEMON_HOST).toBe('127.0.0.1');
  });

  it('has correct daemon URL', () => {
    expect(DAEMON_URL).toBe('http://127.0.0.1:19200');
  });

  it('has correct file/dir names', () => {
    expect(NEXUS_DIR).toBe('.nexus');
    expect(CONFIG_FILE).toBe('config.json');
    expect(PID_FILE).toBe('daemon.pid');
    expect(LOG_FILE).toBe('daemon.log');
    expect(AGENTS_DIR).toBe('agents');
  });

  it('has correct defaults', () => {
    expect(DEFAULTS.model).toBe('anthropic/claude-sonnet-4-5-20250929');
    expect(DEFAULTS.maxCost).toBe(1.0);
    expect(DEFAULTS.timeout).toBe(300);
    expect(DEFAULTS.maxAgents).toBe(10);
  });
});
