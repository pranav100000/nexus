import { resolve } from 'node:path';
import chalk from 'chalk';
import type { TaskInput } from '@nexus-agent/shared';
import { DaemonClient } from '../client/daemon-client.js';
import { DaemonLifecycle } from '../client/daemon-lifecycle.js';
import { formatEvent, formatResult } from '../format/terminal.js';
import { formatEventJson, formatResultJson } from '../format/json.js';

export interface RunOptions {
  path?: string;
  agents?: string;
  format?: string;
  pr?: string;
  maxCost?: string;
  timeout?: string;
}

export async function runCommand(action: string, description: string | undefined, options: RunOptions): Promise<void> {
  const client = new DaemonClient();
  const lifecycle = new DaemonLifecycle(client);

  // Ensure daemon is running
  await lifecycle.ensureRunning();

  const repoPath = resolve(options.path ?? process.cwd());
  const isJson = options.format === 'json';

  const input: TaskInput = {
    action,
    description,
    context: {
      repoPath,
    },
    agents: options.agents ? options.agents.split(',').map((a) => a.trim()) : undefined,
    constraints: {
      maxCost: options.maxCost ? parseFloat(options.maxCost) : undefined,
      timeout: options.timeout ? parseInt(options.timeout, 10) : undefined,
    },
    pr: options.pr,
  };

  // Submit task
  const { taskId } = await client.submitTask(input);

  if (!isJson) {
    console.error(chalk.dim(`Task submitted: ${taskId}`));
    console.error('');
  }

  // Stream events
  const stream = await client.streamTask(taskId);
  for await (const event of stream) {
    if (isJson) {
      if (event.type === 'result') {
        console.log(formatResultJson(event.result));
      } else {
        console.error(formatEventJson(event));
      }
    } else {
      if (event.type === 'result') {
        console.log(formatResult(event.result));
      } else {
        console.error(formatEvent(event));
      }
    }
  }
}
