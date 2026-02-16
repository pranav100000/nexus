import { mkdir, writeFile, cp, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';
import { NEXUS_DIR, AGENTS_DIR, CONFIG_FILE, DEFAULTS } from '@nexus-agent/shared';
import type { NexusConfig } from '@nexus-agent/shared';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function initCommand(): Promise<void> {
  const nexusDir = join(homedir(), NEXUS_DIR);
  const agentsDir = join(nexusDir, AGENTS_DIR);

  // Create directory structure
  await mkdir(agentsDir, { recursive: true });
  console.log(chalk.green(`Created ${nexusDir}`));

  // Copy bundled agents
  const templatesDir = join(__dirname, '..', '..', 'templates', 'agents');
  if (existsSync(templatesDir)) {
    const agents = await readdir(templatesDir);
    for (const agent of agents) {
      const src = join(templatesDir, agent);
      const dest = join(agentsDir, agent);
      if (!existsSync(dest)) {
        await cp(src, dest, { recursive: true });
        console.log(chalk.green(`  Installed agent: ${agent}`));
      } else {
        console.log(chalk.dim(`  Agent already exists: ${agent}`));
      }
    }
  }

  // Write default config
  const configPath = join(nexusDir, CONFIG_FILE);
  if (!existsSync(configPath)) {
    const defaultConfig: NexusConfig = {
      defaultModel: DEFAULTS.model,
      providers: {},
    };
    await writeFile(configPath, JSON.stringify(defaultConfig, null, 2) + '\n', 'utf-8');
    console.log(chalk.green(`  Created ${configPath}`));
  } else {
    console.log(chalk.dim(`  Config already exists: ${configPath}`));
  }

  // Print next steps
  console.log('');
  console.log(chalk.bold('Setup complete!'));
  console.log('');
  console.log('Next steps:');
  console.log(`  1. Set your API key: ${chalk.cyan('export ANTHROPIC_API_KEY=sk-ant-...')}`);
  console.log(`     Or add it to ${chalk.dim(configPath)}`);
  console.log(`  2. List agents: ${chalk.cyan('nexus agents list')}`);
  console.log(`  3. Run a review: ${chalk.cyan('nexus run review')} in a git repo`);
}
