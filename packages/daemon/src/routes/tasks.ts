import type { FastifyInstance } from 'fastify';
import type { TaskInput } from '@nexus-agent/shared';
import type { TaskStore } from '../task-store.js';
import type { Orchestrator } from '../orchestrator/index.js';

export function registerTaskRoutes(
  app: FastifyInstance,
  taskStore: TaskStore,
  orchestrator: Orchestrator,
): void {
  // Submit a new task
  app.post<{ Body: TaskInput }>('/tasks', async (request, reply) => {
    const input = request.body;
    const task = taskStore.create(input);

    // Execute asynchronously — don't await
    orchestrator.execute(task.id).catch((err) => {
      console.error(`Task ${task.id} failed:`, err);
    });

    reply.status(201);
    return { taskId: task.id, status: task.status };
  });

  // Get task status
  app.get<{ Params: { id: string } }>('/tasks/:id', async (request) => {
    const task = taskStore.get(request.params.id);
    return task;
  });

  // Stream task events via SSE
  app.get<{ Params: { id: string } }>('/tasks/:id/stream', async (request, reply) => {
    const taskId = request.params.id;
    // Verify task exists (throws TaskNotFoundError if not)
    taskStore.get(taskId);

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    for await (const event of taskStore.subscribe(taskId)) {
      reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
    }

    reply.raw.end();
  });

  // List all tasks
  app.get('/tasks', async () => {
    return taskStore.getAll();
  });
}
