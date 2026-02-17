import type { TaskResult, SubtaskResult } from '@nexus-agent/shared';

export class ResultMerger {
  merge(subtaskResults: SubtaskResult[]): TaskResult {
    const totalCost = subtaskResults.reduce((sum, r) => sum + r.cost, 0);
    const totalDurationMs = Math.max(...subtaskResults.map((r) => r.durationMs), 0);

    const agentOutputs: Record<string, Record<string, unknown>> = {};
    const summaryParts: string[] = [];

    for (const r of subtaskResults) {
      agentOutputs[r.agentName] = r.output;
      const summary = typeof r.output.summary === 'string' ? r.output.summary : '';
      if (summary) {
        summaryParts.push(`**${r.agentName}**: ${summary}`);
      }
    }

    return {
      summary: summaryParts.join('\n\n'),
      totalCost,
      totalDurationMs,
      agentResults: subtaskResults,
      agentOutputs,
    };
  }
}
