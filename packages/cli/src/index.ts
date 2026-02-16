import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { runCommand } from './commands/run.js';
import { statusCommand } from './commands/status.js';
import { resultCommand } from './commands/result.js';
import { watchCommand } from './commands/watch.js';
import { agentsListCommand } from './commands/agents.js';

export function createProgram(): Command {
  const program = new Command();

  program
    .name('nexus')
    .description('Nexus — AI agent orchestrator for code review')
    .version('0.1.0');

  program
    .command('init')
    .description('Initialize Nexus configuration and install default agents')
    .action(initCommand);

  program
    .command('run')
    .description('Submit a task to the Nexus daemon')
    .argument('<action>', 'Action to perform (e.g., review)')
    .argument('[description]', 'Optional description of what to review')
    .option('-p, --path <path>', 'Path to repository (default: cwd)')
    .option('-a, --agents <agents>', 'Comma-separated list of agents to use')
    .option('-f, --format <format>', 'Output format: terminal or json', 'terminal')
    .option('--pr <url>', 'Pull request URL')
    .option('--base <ref>', 'Compare HEAD against a base ref (e.g. main, HEAD~5)')
    .option('--commit <ref>', 'Review a specific commit (e.g. HEAD, abc1234)')
    .option('--max-cost <amount>', 'Maximum cost in dollars')
    .option('--timeout <seconds>', 'Timeout in seconds')
    .action(runCommand);

  program
    .command('status')
    .description('Show daemon status and active tasks')
    .action(statusCommand);

  program
    .command('result')
    .description('Get the result of a completed task')
    .argument('<taskId>', 'Task ID')
    .option('-f, --format <format>', 'Output format: terminal or json', 'terminal')
    .action(resultCommand);

  program
    .command('watch')
    .description('Stream live progress of a running task')
    .argument('<taskId>', 'Task ID')
    .option('-f, --format <format>', 'Output format: terminal or json', 'terminal')
    .action(watchCommand);

  const agentsCmd = program
    .command('agents')
    .description('Manage agents');

  agentsCmd
    .command('list')
    .description('List installed agents')
    .option('-f, --format <format>', 'Output format: terminal or json', 'terminal')
    .action(agentsListCommand);

  return program;
}
