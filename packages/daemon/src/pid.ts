import { writeFile, readFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { NEXUS_DIR, PID_FILE } from '@nexus-agent/shared';

function pidPath(): string {
  return join(homedir(), NEXUS_DIR, PID_FILE);
}

export async function writePidFile(): Promise<void> {
  await writeFile(pidPath(), String(process.pid), 'utf-8');
}

export async function readPidFile(): Promise<number | null> {
  try {
    const content = await readFile(pidPath(), 'utf-8');
    const pid = parseInt(content.trim(), 10);
    return isNaN(pid) ? null : pid;
  } catch {
    return null;
  }
}

export async function removePidFile(): Promise<void> {
  try {
    await unlink(pidPath());
  } catch {
    // File may not exist — that's fine
  }
}

export function isDaemonRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
