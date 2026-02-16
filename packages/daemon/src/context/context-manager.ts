import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import type { TaskContext, AgentManifest } from '@nexus-agent/shared';
import { getGitDiff, getChangedFiles, getCurrentBranch } from './git.js';

const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.py': 'python',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.rb': 'ruby',
  '.php': 'php',
  '.c': 'c',
  '.cpp': 'cpp',
  '.h': 'c',
  '.hpp': 'cpp',
  '.cs': 'csharp',
  '.swift': 'swift',
  '.kt': 'kotlin',
};

export interface RepoContext {
  repoPath: string;
  gitDiff: string;
  changedFiles: string[];
  fileContents: Map<string, string>;
  branch: string;
  languages: string[];
}

export class ContextManager {
  async buildContext(taskContext: TaskContext): Promise<RepoContext> {
    const repoPath = taskContext.repoPath;

    const [gitDiff, changedFiles, branch] = await Promise.all([
      taskContext.gitDiff ?? getGitDiff(repoPath),
      taskContext.changedFiles ?? getChangedFiles(repoPath),
      taskContext.branch ?? getCurrentBranch(repoPath),
    ]);

    const fileContents = new Map<string, string>();
    for (const file of changedFiles) {
      try {
        const content = await readFile(join(repoPath, file), 'utf-8');
        fileContents.set(file, content);
      } catch {
        // File might be deleted — skip it
      }
    }

    const languages = taskContext.languages ?? this.detectLanguages(changedFiles);

    return { repoPath, gitDiff, changedFiles, fileContents, branch, languages };
  }

  filterForAgent(context: RepoContext, agent: AgentManifest): RepoContext {
    if (agent.languages.length === 0) return context;

    const filteredFiles = context.changedFiles.filter((file) => {
      const lang = EXTENSION_LANGUAGE_MAP[extname(file)];
      return !lang || agent.languages.includes(lang);
    });

    const filteredContents = new Map<string, string>();
    for (const file of filteredFiles) {
      const content = context.fileContents.get(file);
      if (content) filteredContents.set(file, content);
    }

    return {
      ...context,
      changedFiles: filteredFiles,
      fileContents: filteredContents,
    };
  }

  private detectLanguages(files: string[]): string[] {
    const langs = new Set<string>();
    for (const file of files) {
      const lang = EXTENSION_LANGUAGE_MAP[extname(file)];
      if (lang) langs.add(lang);
    }
    return [...langs];
  }
}
