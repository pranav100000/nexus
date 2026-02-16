import type { TaskInput, TaskResult, ProgressEvent } from '@nexus-agent/shared';
import { TaskStore } from '../task-store.js';
import { AgentRunner } from '../agents/agent-runner.js';
import { AgentManager } from '../agents/agent-manager.js';
import { ContextManager } from '../context/index.js';
import type { LLMService } from '../llm/index.js';
import { ManualDecomposer } from './decomposer.js';
import { ResultMerger } from './merger.js';
import { ParallelStrategy } from './strategies/parallel.js';
import type { SubtaskAssignment } from './strategies/types.js';

export class Orchestrator {
  private decomposer = new ManualDecomposer();
  private merger = new ResultMerger();
  private strategy = new ParallelStrategy();
  private runner: AgentRunner;

  constructor(
    private llm: LLMService,
    private taskStore: TaskStore,
    private agentManager: AgentManager,
    private contextManager: ContextManager,
    defaultModel: string,
  ) {
    this.runner = new AgentRunner(llm, defaultModel);
  }

  async execute(taskId: string): Promise<TaskResult> {
    const task = this.taskStore.get(taskId);
    this.taskStore.updateStatus(taskId, 'running');

    try {
      this.agentManager.requireAgents();

      // Build context
      const context = await this.contextManager.buildContext(task.input.context);

      // Decompose task into subtasks
      const subtasks = this.decomposer.decompose(task.input, this.agentManager);

      // Build assignments with per-agent filtered context
      const assignments: SubtaskAssignment[] = subtasks.map((subtask) => {
        const agent = this.agentManager.getByName(subtask.agentName)!;
        const filteredContext = this.contextManager.filterForAgent(context, agent.manifest);
        return { subtask, agent, context: filteredContext };
      });

      // Execute with progress events
      const subtaskResults = await this.strategy.execute(
        assignments,
        this.runner,
        (agentName, status, message) => {
          const event: ProgressEvent = {
            type: 'progress',
            taskId,
            agentName,
            status,
            message,
            timestamp: new Date(),
          };
          this.taskStore.emit(taskId, event);
        },
      );

      // Add subtask results to store
      for (const result of subtaskResults) {
        this.taskStore.addSubtaskResult(taskId, result);
      }

      // Merge results
      const finalResult = this.merger.merge(subtaskResults);
      this.taskStore.setResult(taskId, finalResult);

      // Emit result event
      this.taskStore.emit(taskId, {
        type: 'result',
        taskId,
        result: finalResult,
        timestamp: new Date(),
      });

      return finalResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.taskStore.setError(taskId, errorMessage);
      this.taskStore.emit(taskId, {
        type: 'error',
        taskId,
        error: errorMessage,
        timestamp: new Date(),
      });
      throw error;
    }
  }
}

export { ManualDecomposer } from './decomposer.js';
export { ResultMerger } from './merger.js';
export { ParallelStrategy } from './strategies/parallel.js';
export { SequentialStrategy } from './strategies/sequential.js';
