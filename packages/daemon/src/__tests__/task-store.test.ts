import { describe, it, expect } from 'vitest';
import { TaskStore } from '../task-store.js';
import type { TaskInput, TaskEvent } from '@nexus-agent/shared';

const mockInput: TaskInput = {
  action: 'review',
  context: { repoPath: '/tmp/test-repo' },
};

describe('TaskStore', () => {
  it('creates a task with pending status', () => {
    const store = new TaskStore();
    const task = store.create(mockInput);
    expect(task.id).toBeTruthy();
    expect(task.status).toBe('pending');
    expect(task.input).toEqual(mockInput);
    expect(task.subtaskResults).toEqual([]);
    expect(task.createdAt).toBeInstanceOf(Date);
  });

  it('gets a task by id', () => {
    const store = new TaskStore();
    const task = store.create(mockInput);
    const retrieved = store.get(task.id);
    expect(retrieved.id).toBe(task.id);
  });

  it('throws TaskNotFoundError for unknown id', () => {
    const store = new TaskStore();
    expect(() => store.get('nonexistent')).toThrow('Task not found');
  });

  it('lists all tasks', () => {
    const store = new TaskStore();
    store.create(mockInput);
    store.create(mockInput);
    expect(store.getAll()).toHaveLength(2);
  });

  it('updates task status', () => {
    const store = new TaskStore();
    const task = store.create(mockInput);
    store.updateStatus(task.id, 'running');
    expect(store.get(task.id).status).toBe('running');
  });

  it('adds subtask results', () => {
    const store = new TaskStore();
    const task = store.create(mockInput);
    store.addSubtaskResult(task.id, {
      agentName: 'test-agent',
      output: { summary: 'looks good', findings: [], confidence: 0.9, approve: true },
      tokenUsage: { input: 100, output: 50 },
      cost: 0.001,
      durationMs: 500,
    });
    expect(store.get(task.id).subtaskResults).toHaveLength(1);
  });

  it('sets final result and marks completed', () => {
    const store = new TaskStore();
    const task = store.create(mockInput);
    store.setResult(task.id, {
      summary: 'All good',
      totalCost: 0.01,
      totalDurationMs: 1000,
      agentResults: [],
      agentOutputs: {},
    });
    const updated = store.get(task.id);
    expect(updated.status).toBe('completed');
    expect(updated.result!.summary).toBe('All good');
  });

  it('sets error and marks failed', () => {
    const store = new TaskStore();
    const task = store.create(mockInput);
    store.setError(task.id, 'something broke');
    const updated = store.get(task.id);
    expect(updated.status).toBe('failed');
    expect(updated.error).toBe('something broke');
  });

  it('emits and subscribes to events', async () => {
    const store = new TaskStore();
    const task = store.create(mockInput);
    const events: TaskEvent[] = [];

    // Start collecting events
    const collecting = (async () => {
      for await (const event of store.subscribe(task.id)) {
        events.push(event);
      }
    })();

    // Emit events
    store.emit(task.id, {
      type: 'progress',
      taskId: task.id,
      agentName: 'test',
      status: 'started',
      message: 'Starting...',
      timestamp: new Date(),
    });

    store.emit(task.id, {
      type: 'result',
      taskId: task.id,
      result: {
        summary: 'done',
        totalCost: 0,
        totalDurationMs: 0,
        agentResults: [],
        agentOutputs: {},
      },
      timestamp: new Date(),
    });

    await collecting;

    expect(events).toHaveLength(2);
    expect(events[0].type).toBe('progress');
    expect(events[1].type).toBe('result');
  });

  it('error event terminates subscription', async () => {
    const store = new TaskStore();
    const task = store.create(mockInput);
    const events: TaskEvent[] = [];

    const collecting = (async () => {
      for await (const event of store.subscribe(task.id)) {
        events.push(event);
      }
    })();

    store.emit(task.id, {
      type: 'error',
      taskId: task.id,
      error: 'boom',
      timestamp: new Date(),
    });

    await collecting;

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('error');
  });
});
