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
      description: input.description ?? this.buildDescription(input, agent.manifest.name),
      context: input.context,
    }));
  }

  private buildDescription(input: TaskInput, agentName: string): string {
    const parts: string[] = [
      `Perform "${input.action}" analysis as ${agentName}.`,
    ];

    if (input.context.commit) {
      parts.push(`Reviewing commit: ${input.context.commit}.`);
    } else if (input.context.base) {
      parts.push(`Comparing HEAD against base: ${input.context.base}.`);
    }

    parts.push('Analyze the provided context and respond according to your output schema.');

    return parts.join(' ');
  }
}
