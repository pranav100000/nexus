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

const EMPTY_TREE = '4b825dc642cb6eb9a060e54bf899d15363d7aa82';

export function validateGitRef(ref: string): void {
  if (ref.startsWith('-')) {
    throw new Error(`Invalid git ref: '${ref}' — refs must not start with '-'`);
  }
  if (/[\s\0]/.test(ref)) {
    throw new Error(`Invalid git ref: '${ref}' — refs must not contain whitespace or null bytes`);
  }
}

export async function getGitDiffRange(repoPath: string, base: string, head = 'HEAD'): Promise<string> {
  validateGitRef(base);
  validateGitRef(head);
  try {
    const { stdout } = await exec('git', ['diff', `${base}...${head}`], { cwd: repoPath });
    return stdout;
  } catch {
    // If three-dot fails (e.g. unrelated histories), try two-dot
    const { stdout } = await exec('git', ['diff', `${base}..${head}`], { cwd: repoPath });
    return stdout;
  }
}

export async function getChangedFilesRange(repoPath: string, base: string, head = 'HEAD'): Promise<string[]> {
  validateGitRef(base);
  validateGitRef(head);
  try {
    const { stdout } = await exec('git', ['diff', '--name-only', `${base}...${head}`], { cwd: repoPath });
    return stdout.split('\n').map((f) => f.trim()).filter(Boolean);
  } catch {
    const { stdout } = await exec('git', ['diff', '--name-only', `${base}..${head}`], { cwd: repoPath });
    return stdout.split('\n').map((f) => f.trim()).filter(Boolean);
  }
}

export async function getCommitDiff(repoPath: string, commit: string): Promise<string> {
  validateGitRef(commit);
  try {
    const { stdout } = await exec('git', ['diff', `${commit}~1..${commit}`], { cwd: repoPath });
    return stdout;
  } catch {
    // No parent (initial commit) — diff against empty tree
    const { stdout } = await exec('git', ['diff', `${EMPTY_TREE}..${commit}`], { cwd: repoPath });
    return stdout;
  }
}

export async function getCommitChangedFiles(repoPath: string, commit: string): Promise<string[]> {
  validateGitRef(commit);
  try {
    const { stdout } = await exec('git', ['diff', '--name-only', `${commit}~1..${commit}`], { cwd: repoPath });
    return stdout.split('\n').map((f) => f.trim()).filter(Boolean);
  } catch {
    // No parent (initial commit) — diff against empty tree
    const { stdout } = await exec('git', ['diff', '--name-only', `${EMPTY_TREE}..${commit}`], { cwd: repoPath });
    return stdout.split('\n').map((f) => f.trim()).filter(Boolean);
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
