import type { TaskResult, SubtaskResult, Finding } from '@nexus-agent/shared';

export class ResultMerger {
  merge(subtaskResults: SubtaskResult[]): TaskResult {
    const allFindings = this.deduplicateFindings(
      subtaskResults.flatMap((r) => r.findings),
    );

    const approve = subtaskResults.every((r) => r.approve);
    const totalCost = subtaskResults.reduce((sum, r) => sum + r.cost, 0);
    const totalDurationMs = Math.max(...subtaskResults.map((r) => r.durationMs), 0);

    const summaryParts = subtaskResults.map(
      (r) => `**${r.agentName}** (confidence: ${(r.confidence * 100).toFixed(0)}%): ${r.summary}`,
    );

    return {
      summary: summaryParts.join('\n\n'),
      findings: allFindings,
      approve,
      totalCost,
      totalDurationMs,
      agentResults: subtaskResults,
    };
  }

  private deduplicateFindings(findings: Finding[]): Finding[] {
    const seen = new Set<string>();
    const unique: Finding[] = [];

    for (const finding of findings) {
      const key = `${finding.file ?? ''}:${finding.line ?? ''}:${finding.message}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(finding);
      }
    }

    // Sort by severity: critical > warning > info
    const order = { critical: 0, warning: 1, info: 2 };
    unique.sort((a, b) => order[a.severity] - order[b.severity]);

    return unique;
  }
}
