import { DaemonClient } from '../client/daemon-client.js';
import { DaemonLifecycle } from '../client/daemon-lifecycle.js';
import { formatAgentList } from '../format/terminal.js';
import { formatAgentListJson } from '../format/json.js';

export interface AgentsOptions {
  format?: string;
}

export async function agentsListCommand(options: AgentsOptions): Promise<void> {
  const client = new DaemonClient();
  const lifecycle = new DaemonLifecycle(client);

  await lifecycle.ensureRunning();

  const agents = await client.listAgents();

  if (options.format === 'json') {
    console.log(formatAgentListJson(agents));
  } else {
    console.log(formatAgentList(agents));
  }
}
