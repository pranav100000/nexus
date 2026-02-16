import type { SubtaskResult, Subtask } from '@nexus-agent/shared';
import type { RepoContext } from '../../context/index.js';
import type { AgentRunner } from '../../agents/agent-runner.js';
import type { LoadedAgent } from '../../agents/manifest-loader.js';

export interface SubtaskAssignment {
  subtask: Subtask;
  agent: LoadedAgent;
  context: RepoContext;
}

export interface ExecutionStrategy {
  execute(
    assignments: SubtaskAssignment[],
    runner: AgentRunner,
    onProgress: (agentName: string, status: 'started' | 'completed' | 'failed', message: string) => void,
  ): Promise<SubtaskResult[]>;
}
