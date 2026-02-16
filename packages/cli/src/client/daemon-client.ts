import { DAEMON_URL } from '@nexus-agent/shared';
import type { TaskInput, TaskState, TaskEvent, AgentInfo } from '@nexus-agent/shared';
import { parseSSEStream } from './sse-client.js';

export class DaemonClient {
  private baseUrl: string;

  constructor(baseUrl: string = DAEMON_URL) {
    this.baseUrl = baseUrl;
  }

  async health(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/health`);
      return res.ok;
    } catch {
      return false;
    }
  }

  async submitTask(input: TaskInput): Promise<{ taskId: string; status: string }> {
    const res = await fetch(`${this.baseUrl}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
    }
    return res.json() as Promise<{ taskId: string; status: string }>;
  }

  async getTask(taskId: string): Promise<TaskState> {
    const res = await fetch(`${this.baseUrl}/tasks/${taskId}`);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
    }
    return res.json() as Promise<TaskState>;
  }

  async getAllTasks(): Promise<TaskState[]> {
    const res = await fetch(`${this.baseUrl}/tasks`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<TaskState[]>;
  }

  async streamTask(taskId: string): Promise<AsyncGenerator<TaskEvent>> {
    const res = await fetch(`${this.baseUrl}/tasks/${taskId}/stream`);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
    }
    return parseSSEStream(res);
  }

  async listAgents(): Promise<AgentInfo[]> {
    const res = await fetch(`${this.baseUrl}/agents`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<AgentInfo[]>;
  }
}
