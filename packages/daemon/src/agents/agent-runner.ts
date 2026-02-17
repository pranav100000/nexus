import { AgentOutputSchema, DEFAULTS } from '@nexus-agent/shared';
import type { AgentOutput, SubtaskResult, Subtask } from '@nexus-agent/shared';
import type { LLMService } from '../llm/index.js';
import type { RepoContext } from '../context/index.js';
import type { LoadedAgent } from './manifest-loader.js';

export class AgentRunner {
  constructor(
    private llm: LLMService,
    private defaultModel: string,
  ) {}

  async run(agent: LoadedAgent, subtask: Subtask, context: RepoContext): Promise<SubtaskResult> {
    const model = agent.manifest.model || this.defaultModel;
    const startTime = Date.now();

    const systemPrompt = this.buildSystemPrompt(agent, context);
    const userPrompt = this.buildUserPrompt(subtask, context);

    const output: AgentOutput = await this.llm.structured({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      schema: AgentOutputSchema,
    });

    const durationMs = Date.now() - startTime;

    return {
      agentName: agent.manifest.name,
      summary: output.summary,
      findings: output.findings.slice(0, DEFAULTS.maxFindingsPerAgent),
      confidence: output.confidence,
      approve: output.approve,
      tokenUsage: { input: 0, output: 0 }, // AI SDK doesn't expose this via generateObject easily
      cost: 0,
      durationMs,
    };
  }

  private buildSystemPrompt(agent: LoadedAgent, context: RepoContext): string {
    const parts: string[] = [];

    if (agent.systemPrompt) {
      parts.push(agent.systemPrompt);
    } else {
      parts.push(`You are ${agent.manifest.name}: ${agent.manifest.description}`);
    }

    parts.push(`\n\n## Repository Context`);
    parts.push(`Branch: ${context.branch}`);
    parts.push(`Languages: ${context.languages.join(', ')}`);
    parts.push(`Changed files: ${context.changedFiles.join(', ')}`);

    parts.push(`\n\n## Important Constraints`);
    parts.push(`- Return at most ${DEFAULTS.maxFindingsPerAgent} findings. Prioritize by severity.`);
    parts.push(`- Only analyze the diff and changed files provided. Do NOT audit the entire codebase.`);
    parts.push(`- If the changes look good and have no issues, set approve to true and return an empty findings array.`);

    return parts.join('\n');
  }

  private buildUserPrompt(subtask: Subtask, context: RepoContext): string {
    const parts: string[] = [];

    parts.push(`## Task`);
    parts.push(subtask.description);

    if (context.gitDiff) {
      parts.push(`\n## Git Diff`);
      parts.push('```diff');
      parts.push(context.gitDiff);
      parts.push('```');
    }

    if (context.fileContents.size > 0) {
      parts.push(`\n## Changed File Contents`);
      for (const [file, content] of context.fileContents) {
        parts.push(`\n### ${file}`);
        parts.push('```');
        parts.push(content);
        parts.push('```');
      }
    }

    return parts.join('\n');
  }
}
