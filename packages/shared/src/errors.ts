export class NexusError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NexusError';
  }
}

export class DaemonNotRunningError extends NexusError {
  constructor() {
    super('Daemon is not running. Start it with `nexus init` or it will auto-start on `nexus run`.');
    this.name = 'DaemonNotRunningError';
  }
}

export class TaskNotFoundError extends NexusError {
  constructor(taskId: string) {
    super(`Task not found: ${taskId}`);
    this.name = 'TaskNotFoundError';
  }
}

export class NoAgentsError extends NexusError {
  constructor() {
    super('No agents available. Run `nexus init` to install default agents, or add agents to ~/.nexus/agents/.');
    this.name = 'NoAgentsError';
  }
}

export class LLMError extends NexusError {
  constructor(message: string, public readonly provider?: string, public readonly model?: string) {
    super(`LLM error: ${message}`);
    this.name = 'LLMError';
  }
}

export class ConfigError extends NexusError {
  constructor(message: string) {
    super(`Configuration error: ${message}`);
    this.name = 'ConfigError';
  }
}

export class DaemonStartError extends NexusError {
  constructor(message: string) {
    super(`Failed to start daemon: ${message}. Check ~/.nexus/daemon.log for details.`);
    this.name = 'DaemonStartError';
  }
}
