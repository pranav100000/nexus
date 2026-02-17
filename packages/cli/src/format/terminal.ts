import chalk from 'chalk';
import { isReviewOutput } from '@nexus-agent/shared';
import type { TaskResult, TaskEvent, Finding, AgentInfo, ReviewOutput } from '@nexus-agent/shared';

const SEVERITY_COLORS = {
  critical: chalk.red.bold,
  warning: chalk.yellow,
  info: chalk.blue,
} as const;

const SEVERITY_ICONS = {
  critical: '\u2718',
  warning: '\u26A0',
  info: '\u2139',
} as const;

export function formatFinding(finding: Finding): string {
  const color = SEVERITY_COLORS[finding.severity];
  const icon = SEVERITY_ICONS[finding.severity];
  const location = finding.file
    ? `${finding.file}${finding.line ? `:${finding.line}` : ''}`
    : '';

  let output = color(`${icon} [${finding.severity.toUpperCase()}]`);
  if (location) output += ` ${chalk.dim(location)}`;
  output += `\n  ${finding.message}`;
  if (finding.suggestion) {
    output += `\n  ${chalk.green('Fix:')} ${finding.suggestion}`;
  }
  return output;
}

function formatReviewOutput(agentName: string, output: ReviewOutput): string[] {
  const lines: string[] = [];

  const statusIcon = output.approve ? chalk.green('\u2714') : chalk.red('\u2718');
  lines.push(`${statusIcon} ${chalk.bold(agentName)}: ${output.approve ? 'APPROVED' : 'CHANGES REQUESTED'}`);
  lines.push(`  ${output.summary}`);

  if (output.findings.length > 0) {
    lines.push(`  ${chalk.bold(`Findings (${output.findings.length}):`)}`);
    for (const finding of output.findings) {
      lines.push('  ' + formatFinding(finding).split('\n').join('\n  '));
    }
  }

  return lines;
}

function formatGenericOutput(agentName: string, output: Record<string, unknown>): string[] {
  const lines: string[] = [];

  lines.push(chalk.bold(agentName));
  if (typeof output.summary === 'string') {
    lines.push(`  ${output.summary}`);
  }
  lines.push(chalk.dim(JSON.stringify(output, null, 2).split('\n').map((l) => `  ${l}`).join('\n')));

  return lines;
}

export function formatResult(result: TaskResult): string {
  const lines: string[] = [];

  lines.push(chalk.bold('\nSummary:'));
  lines.push(result.summary);
  lines.push('');

  for (const agentResult of result.agentResults) {
    if (isReviewOutput(agentResult.output)) {
      lines.push(...formatReviewOutput(agentResult.agentName, agentResult.output as ReviewOutput));
    } else {
      lines.push(...formatGenericOutput(agentResult.agentName, agentResult.output));
    }
    lines.push('');
  }

  lines.push(chalk.dim(`Cost: $${result.totalCost.toFixed(4)} | Duration: ${(result.totalDurationMs / 1000).toFixed(1)}s | Agents: ${result.agentResults.length}`));

  return lines.join('\n');
}

export function formatEvent(event: TaskEvent): string {
  switch (event.type) {
    case 'progress':
      return `${chalk.cyan('\u25B6')} ${event.agentName}: ${event.message}`;
    case 'result':
      return formatResult(event.result);
    case 'error':
      return chalk.red(`Error: ${event.error}`);
  }
}

export function formatAgentList(agents: AgentInfo[]): string {
  if (agents.length === 0) return chalk.yellow('No agents installed. Run `nexus init` to install default agents.');

  const lines: string[] = [chalk.bold(`\nInstalled Agents (${agents.length}):\n`)];

  for (const agent of agents) {
    lines.push(`  ${chalk.cyan(agent.name)} ${chalk.dim(`(${agent.model})`)}`);
    lines.push(`    ${agent.description}`);
    lines.push(`    Capabilities: ${agent.capabilities.join(', ')}`);
    lines.push(`    Languages: ${agent.languages.join(', ')}`);
    lines.push('');
  }

  return lines.join('\n');
}
