import { randomUUID } from 'node:crypto';
import type { TaskInput, Subtask } from '@nexus-agent/shared';
import type { AgentManager } from '../agents/agent-manager.js';

export interface TaskDecomposer {
  decompose(input: TaskInput, agentManager: AgentManager): Subtask[];
}

export class ManualDecomposer implements TaskDecomposer {
  decompose(input: TaskInput, agentManager: AgentManager): Subtask[] {
    const agents = input.agents
      ? input.agents.map((name) => {
          const agent = agentManager.getByName(name);
          if (!agent) throw new Error(`Agent not found: ${name}`);
          return agent;
        })
      : agentManager.getAll();

    return agents.map((agent) => ({
      id: randomUUID(),
      agentName: agent.manifest.name,
      description: input.description ?? `${input.action} — analyzed by ${agent.manifest.name}`,
      context: input.context,
    }));
  }
}
