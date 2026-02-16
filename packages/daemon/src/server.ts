import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { NexusError } from '@nexus-agent/shared';
import type { TaskStore } from './task-store.js';
import type { Orchestrator } from './orchestrator/index.js';
import type { AgentManager } from './agents/agent-manager.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerTaskRoutes } from './routes/tasks.js';
import { registerAgentRoutes } from './routes/agents.js';

export interface ServerDeps {
  taskStore: TaskStore;
  orchestrator: Orchestrator;
  agentManager: AgentManager;
}

export function createServer(deps: ServerDeps): FastifyInstance {
  const app = Fastify({
    logger: true,
  });

  // Error handler for known errors
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof NexusError) {
      const statusCode = error.name === 'TaskNotFoundError' ? 404
        : error.name === 'NoAgentsError' ? 503
        : error.name === 'ConfigError' ? 500
        : 400;
      reply.status(statusCode).send({ error: error.message });
    } else {
      reply.status(500).send({ error: error.message });
    }
  });

  registerHealthRoutes(app);
  registerTaskRoutes(app, deps.taskStore, deps.orchestrator);
  registerAgentRoutes(app, deps.agentManager);

  return app;
}
