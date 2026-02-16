import type { SubtaskResult } from '@nexus-agent/shared';
import type { AgentRunner } from '../../agents/agent-runner.js';
import type { ExecutionStrategy, SubtaskAssignment } from './types.js';

export class SequentialStrategy implements ExecutionStrategy {
  async execute(
    assignments: SubtaskAssignment[],
    runner: AgentRunner,
    onProgress: (agentName: string, status: 'started' | 'completed' | 'failed', message: string) => void,
  ): Promise<SubtaskResult[]> {
    const results: SubtaskResult[] = [];

    for (const { subtask, agent, context } of assignments) {
      onProgress(agent.manifest.name, 'started', `Running ${agent.manifest.name}...`);

      try {
        const result = await runner.run(agent, subtask, context);
        onProgress(agent.manifest.name, 'completed', `${agent.manifest.name} completed with ${result.findings.length} findings`);
        results.push(result);
      } catch (error) {
        onProgress(agent.manifest.name, 'failed', `${agent.manifest.name} failed: ${(error as Error).message}`);
        throw error;
      }
    }

    return results;
  }
}
