import chalk from 'chalk';
import { DaemonClient } from '../client/daemon-client.js';
import { formatEvent } from '../format/terminal.js';
import { formatEventJson } from '../format/json.js';

export interface WatchOptions {
  format?: string;
}

export async function watchCommand(taskId: string, options: WatchOptions): Promise<void> {
  const client = new DaemonClient();
  const isJson = options.format === 'json';

  if (!isJson) {
    console.error(chalk.dim(`Watching task: ${taskId}\n`));
  }

  const stream = await client.streamTask(taskId);
  for await (const event of stream) {
    if (isJson) {
      console.log(formatEventJson(event));
    } else {
      console.error(formatEvent(event));
    }
  }
}
