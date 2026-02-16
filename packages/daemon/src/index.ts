import { DAEMON_PORT, DAEMON_HOST } from '@nexus-agent/shared';
import { loadConfig } from './config.js';
import { LLMServiceImpl } from './llm/index.js';
import { TaskStore } from './task-store.js';
import { ContextManager } from './context/index.js';
import { AgentManager } from './agents/index.js';
import { Orchestrator } from './orchestrator/index.js';
import { createServer } from './server.js';
import { writePidFile, removePidFile } from './pid.js';

async function main(): Promise<void> {
  console.log('Starting Nexus daemon...');

  // Load config
  const config = await loadConfig();
  console.log(`Config loaded. Default model: ${config.defaultModel}`);

  // Create services
  const llm = new LLMServiceImpl(config);
  const taskStore = new TaskStore();
  const contextManager = new ContextManager();
  const agentManager = new AgentManager();

  // Load agents
  await agentManager.loadAgents();
  const agents = agentManager.getAll();
  console.log(`Loaded ${agents.length} agents: ${agents.map((a) => a.manifest.name).join(', ')}`);

  // Create orchestrator
  const orchestrator = new Orchestrator(
    llm,
    taskStore,
    agentManager,
    contextManager,
    config.defaultModel,
  );

  // Create and start server
  const server = createServer({ taskStore, orchestrator, agentManager });

  await writePidFile();

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\nShutting down Nexus daemon...');
    await removePidFile();
    await server.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await server.listen({ port: DAEMON_PORT, host: DAEMON_HOST });
  console.log(`Nexus daemon listening on ${DAEMON_HOST}:${DAEMON_PORT}`);
}

main().catch((err) => {
  console.error('Fatal error starting daemon:', err);
  process.exit(1);
});
