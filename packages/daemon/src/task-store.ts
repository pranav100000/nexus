import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { TaskNotFoundError } from '@nexus-agent/shared';
import type { TaskState, TaskInput, TaskResult, SubtaskResult, TaskStatus, TaskEvent } from '@nexus-agent/shared';

export class TaskStore {
  private tasks = new Map<string, TaskState>();
  private emitters = new Map<string, EventEmitter>();

  create(input: TaskInput): TaskState {
    const id = randomUUID();
    const now = new Date();
    const state: TaskState = {
      id,
      input,
      status: 'pending',
      subtaskResults: [],
      createdAt: now,
      updatedAt: now,
    };
    this.tasks.set(id, state);
    this.emitters.set(id, new EventEmitter());
    return state;
  }

  get(id: string): TaskState {
    const task = this.tasks.get(id);
    if (!task) throw new TaskNotFoundError(id);
    return task;
  }

  getAll(): TaskState[] {
    return Array.from(this.tasks.values());
  }

  updateStatus(id: string, status: TaskStatus): void {
    const task = this.get(id);
    task.status = status;
    task.updatedAt = new Date();
  }

  addSubtaskResult(id: string, result: SubtaskResult): void {
    const task = this.get(id);
    task.subtaskResults.push(result);
    task.updatedAt = new Date();
  }

  setResult(id: string, result: TaskResult): void {
    const task = this.get(id);
    task.result = result;
    task.status = 'completed';
    task.updatedAt = new Date();
  }

  setError(id: string, error: string): void {
    const task = this.get(id);
    task.error = error;
    task.status = 'failed';
    task.updatedAt = new Date();
  }

  emit(id: string, event: TaskEvent): void {
    const emitter = this.emitters.get(id);
    if (!emitter) throw new TaskNotFoundError(id);
    emitter.emit('event', event);
  }

  async *subscribe(id: string): AsyncIterable<TaskEvent> {
    const emitter = this.emitters.get(id);
    if (!emitter) throw new TaskNotFoundError(id);

    const queue: TaskEvent[] = [];
    let resolve: (() => void) | null = null;
    let done = false;

    const onEvent = (event: TaskEvent) => {
      queue.push(event);
      if (event.type === 'result' || event.type === 'error') {
        done = true;
      }
      if (resolve) {
        resolve();
        resolve = null;
      }
    };

    emitter.on('event', onEvent);

    try {
      while (true) {
        while (queue.length > 0) {
          yield queue.shift()!;
        }
        if (done) break;
        await new Promise<void>((r) => {
          resolve = r;
        });
      }
    } finally {
      emitter.off('event', onEvent);
    }
  }
}
