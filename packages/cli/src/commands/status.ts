import chalk from 'chalk';
import { DaemonClient } from '../client/daemon-client.js';

export async function statusCommand(): Promise<void> {
  const client = new DaemonClient();

  const healthy = await client.health();
  if (!healthy) {
    console.log(chalk.red('Daemon is not running.'));
    console.log(chalk.dim('Start it with `nexus run` (auto-starts) or manually.'));
    return;
  }

  console.log(chalk.green('Daemon is running.\n'));

  const tasks = await client.getAllTasks();
  if (tasks.length === 0) {
    console.log(chalk.dim('No tasks.'));
    return;
  }

  const STATUS_COLORS: Record<string, (s: string) => string> = {
    pending: chalk.yellow,
    running: chalk.cyan,
    completed: chalk.green,
    failed: chalk.red,
  };

  console.log(chalk.bold(`Tasks (${tasks.length}):\n`));
  for (const task of tasks) {
    const color = STATUS_COLORS[task.status] ?? chalk.white;
    console.log(`  ${color(task.status.padEnd(10))} ${chalk.dim(task.id)} ${task.input.action}`);
  }
}
