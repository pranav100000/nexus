import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);

export async function getGitDiff(repoPath: string): Promise<string> {
  try {
    // Get staged diff first, then unstaged
    const { stdout: staged } = await exec('git', ['diff', '--cached'], { cwd: repoPath });
    const { stdout: unstaged } = await exec('git', ['diff'], { cwd: repoPath });
    return [staged, unstaged].filter(Boolean).join('\n');
  } catch (error) {
    throw new Error(`Failed to get git diff: ${(error as Error).message}`);
  }
}

export async function getChangedFiles(repoPath: string): Promise<string[]> {
  try {
    const { stdout: staged } = await exec('git', ['diff', '--cached', '--name-only'], { cwd: repoPath });
    const { stdout: unstaged } = await exec('git', ['diff', '--name-only'], { cwd: repoPath });
    const files = [...staged.split('\n'), ...unstaged.split('\n')]
      .map((f) => f.trim())
      .filter(Boolean);
    return [...new Set(files)];
  } catch (error) {
    throw new Error(`Failed to get changed files: ${(error as Error).message}`);
  }
}

export async function getCurrentBranch(repoPath: string): Promise<string> {
  try {
    const { stdout } = await exec('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: repoPath });
    return stdout.trim();
  } catch (error) {
    throw new Error(`Failed to get current branch: ${(error as Error).message}`);
  }
}
