export const DAEMON_PORT = 19200;
export const DAEMON_HOST = '127.0.0.1';
export const DAEMON_URL = `http://${DAEMON_HOST}:${DAEMON_PORT}`;

export const NEXUS_DIR = '.nexus';
export const CONFIG_FILE = 'config.json';
export const PID_FILE = 'daemon.pid';
export const LOG_FILE = 'daemon.log';
export const AGENTS_DIR = 'agents';

export const DEFAULTS = {
  model: 'anthropic/claude-sonnet-4-5-20250929',
  maxCost: 1.0,
  timeout: 300,
  maxAgents: 10,
} as const;
