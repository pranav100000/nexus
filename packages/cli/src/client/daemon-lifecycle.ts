import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, writeFile, open } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { createRequire } from 'node:module';
import { NEXUS_DIR, LOG_FILE, DaemonStartError } from '@nexus-agent/shared';
import { DaemonClient } from './daemon-client.js';

const HEALTH_POLL_INTERVAL = 300;
const HEALTH_POLL_MAX_WAIT = 5000;

export class DaemonLifecycle {
  private client: DaemonClient;

  constructor(client: DaemonClient) {
    this.client = client;
  }

  async ensureRunning(): Promise<void> {
    // Check if already running
    if (await this.client.health()) return;

    // Ensure ~/.nexus/ exists
    const nexusDir = join(homedir(), NEXUS_DIR);
    if (!existsSync(nexusDir)) {
      throw new DaemonStartError(
        `${nexusDir} does not exist. Run \`nexus init\` first.`,
      );
    }

    // Start daemon as detached process
    await this.startDaemon(nexusDir);

    // Poll for health
    await this.waitForHealth();
  }

  private async startDaemon(nexusDir: string): Promise<void> {
    const logPath = join(nexusDir, LOG_FILE);
    const logHandle = await open(logPath, 'a');

    // Resolve the daemon entry point via Node module resolution
    // Works in both monorepo (workspace:*) and global npm installs
    const require = createRequire(import.meta.url);
    const daemonEntry = require.resolve('@nexus-agent/daemon');

    const child = spawn('node', [daemonEntry], {
      detached: true,
      stdio: ['ignore', logHandle.fd, logHandle.fd],
      env: { ...process.env },
    });

    child.unref();
    await logHandle.close();
  }

  private async waitForHealth(): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < HEALTH_POLL_MAX_WAIT) {
      await new Promise((r) => setTimeout(r, HEALTH_POLL_INTERVAL));
      if (await this.client.health()) return;
    }
    throw new DaemonStartError(
      `Daemon did not respond within ${HEALTH_POLL_MAX_WAIT / 1000}s`,
    );
  }
}
