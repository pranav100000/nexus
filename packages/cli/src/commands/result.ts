import chalk from 'chalk';
import { DaemonClient } from '../client/daemon-client.js';
import { formatResult } from '../format/terminal.js';
import { formatResultJson } from '../format/json.js';

export interface ResultOptions {
  format?: string;
}

export async function resultCommand(taskId: string, options: ResultOptions): Promise<void> {
  const client = new DaemonClient();

  const task = await client.getTask(taskId);

  if (!task.result) {
    if (task.status === 'failed') {
      console.error(chalk.red(`Task failed: ${task.error}`));
    } else {
      console.error(chalk.yellow(`Task is still ${task.status}. Use \`nexus watch ${taskId}\` to stream progress.`));
    }
    process.exit(1);
  }

  if (options.format === 'json') {
    console.log(formatResultJson(task.result));
  } else {
    console.log(formatResult(task.result));
  }
}
