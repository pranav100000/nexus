import type { FastifyInstance } from 'fastify';
import type { AgentManager } from '../agents/agent-manager.js';

export function registerAgentRoutes(app: FastifyInstance, agentManager: AgentManager): void {
  app.get('/agents', async () => {
    return agentManager.getAgentInfos();
  });
}
