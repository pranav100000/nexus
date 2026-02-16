import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { NEXUS_DIR, AGENTS_DIR } from '@nexus-agent/shared';
import type { AgentManifest } from '@nexus-agent/shared';

export interface LoadedAgent {
  manifest: AgentManifest;
  systemPrompt: string;
}

export async function loadAgentManifests(): Promise<LoadedAgent[]> {
  const agentsDir = join(homedir(), NEXUS_DIR, AGENTS_DIR);

  let entries: string[];
  try {
    entries = await readdir(agentsDir);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw err;
  }

  const agents: LoadedAgent[] = [];

  for (const entry of entries) {
    const agentDir = join(agentsDir, entry);
    const manifestPath = join(agentDir, 'manifest.json');

    let manifestRaw: string;
    try {
      manifestRaw = await readFile(manifestPath, 'utf-8');
    } catch {
      continue; // Skip directories without manifest.json
    }

    const manifest: AgentManifest = JSON.parse(manifestRaw);

    let systemPrompt = '';
    try {
      systemPrompt = await readFile(join(agentDir, 'system-prompt.md'), 'utf-8');
    } catch {
      // system-prompt.md is optional
    }

    agents.push({ manifest, systemPrompt });
  }

  return agents;
}
