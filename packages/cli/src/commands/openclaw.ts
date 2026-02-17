import { cp, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';

export interface OpenclawInstallOptions {
  path?: string;
}

export async function openclawInstallCommand(options: OpenclawInstallOptions): Promise<void> {
  // Resolve template source
  const cliPkgDir = join(dirname(fileURLToPath(import.meta.url)), '..');
  const templateSrc = join(cliPkgDir, 'templates', 'skills', 'nexus', 'SKILL.md');

  if (!existsSync(templateSrc)) {
    throw new Error(`Skill template not found at ${templateSrc}`);
  }

  // Resolve target directory
  const targetDir = resolveTargetDir(options.path);
  const targetPath = join(targetDir, 'skills', 'nexus', 'SKILL.md');

  // Create directories and copy
  await mkdir(join(targetDir, 'skills', 'nexus'), { recursive: true });
  await cp(templateSrc, targetPath);

  console.log(chalk.green(`Installed Nexus skill to ${targetPath}`));
}

function resolveTargetDir(explicitPath: string | undefined): string {
  const base = explicitPath ?? process.cwd();
  return join(base, '.claude');
}
