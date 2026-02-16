import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { ConfigError, NEXUS_DIR, CONFIG_FILE, DEFAULTS } from '@nexus-agent/shared';
import type { NexusConfig } from '@nexus-agent/shared';

export async function loadConfig(): Promise<NexusConfig> {
  const configPath = join(homedir(), NEXUS_DIR, CONFIG_FILE);

  let raw: string;
  try {
    raw = await readFile(configPath, 'utf-8');
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new ConfigError(
        `Config file not found at ${configPath}. Run \`nexus init\` to create it.`,
      );
    }
    throw new ConfigError(`Failed to read config: ${(err as Error).message}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ConfigError(`Invalid JSON in ${configPath}`);
  }

  const config = parsed as Record<string, unknown>;

  return {
    defaultModel: (config.defaultModel as string) ?? DEFAULTS.model,
    providers: (config.providers as Record<string, { apiKey?: string; baseUrl?: string }>) ?? {},
    maxCost: (config.maxCost as number) ?? DEFAULTS.maxCost,
    timeout: (config.timeout as number) ?? DEFAULTS.timeout,
  };
}
