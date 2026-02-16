import type { TaskResult, TaskEvent, AgentInfo } from '@nexus-agent/shared';

export function formatResultJson(result: TaskResult): string {
  return JSON.stringify(result, null, 2);
}

export function formatEventJson(event: TaskEvent): string {
  return JSON.stringify(event);
}

export function formatAgentListJson(agents: AgentInfo[]): string {
  return JSON.stringify(agents, null, 2);
}
