import { fileURLToPath } from 'node:url';
import type { AnyMessage } from '@agentclientprotocol/sdk';
import type { LaunchSpec } from '@srgnt/contracts';
import { describe, expect, it } from 'vitest';
import { HarnessProcess } from './harness-process.js';

const FAKE_AGENT = fileURLToPath(new URL('./__fixtures__/fake-agent.mjs', import.meta.url));

const launch = (mode: string): LaunchSpec => ({
  command: process.execPath,
  args: [FAKE_AGENT, mode],
  env: {},
});

/** True if the pid is still alive (ESRCH ⇒ gone; EPERM ⇒ alive but not ours). */
function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== 'ESRCH';
  }
}

async function waitUntilDead(pid: number, timeoutMs = 2_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!isAlive(pid)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

/** Read one parsed ndjson object from a process's live transport. */
async function readOne(process: HarnessProcess): Promise<Record<string, unknown>> {
  const reader = process.transport.stream.readable.getReader();
  try {
    const { value } = await reader.read();
    return value as unknown as Record<string, unknown>;
  } finally {
    reader.releaseLock();
  }
}

describe('HarnessProcess', () => {
  it('is idle until start(), then reaches ready with a pid', async () => {
    const process = new HarnessProcess({ launch: launch('sleep') });
    expect(process.state).toBe('idle');
    expect(process.pid).toBeUndefined();
    await process.start();
    expect(process.state).toBe('ready');
    expect(process.pid).toBeGreaterThan(0);
    await process.dispose();
    expect(process.state).toBe('dead');
  });

  it('coalesces concurrent start() calls onto a single spawn', async () => {
    const process = new HarnessProcess({ launch: launch('sleep') });
    await Promise.all([process.start(), process.start(), process.start()]);
    const pid = process.pid;
    // A second start() after ready is a no-op that keeps the same pid.
    await process.start();
    expect(process.pid).toBe(pid);
    await process.dispose();
  });

  it('exposes a working ndjson transport (round-trips a frame through the child)', async () => {
    const process = new HarnessProcess({ launch: launch('echo') });
    await process.start();
    const writer = process.transport.stream.writable.getWriter();
    await writer.write({ jsonrpc: '2.0', id: 7, method: 'ping' } as unknown as AnyMessage);
    writer.releaseLock();
    const echoed = await readOne(process);
    expect(echoed).toMatchObject({ id: 7, method: 'ping' });
    await process.dispose();
  });

  it('kill-tree leaves no orphaned grandchild', async () => {
    const process = new HarnessProcess({ launch: launch('spawn-grandchild'), killGraceMs: 1_000 });
    await process.start();
    const info = await readOne(process);
    const parentPid = info['pid'] as number;
    const grandchildPid = info['grandchild'] as number;
    expect(isAlive(parentPid)).toBe(true);
    expect(isAlive(grandchildPid)).toBe(true);

    await process.dispose();
    await waitUntilDead(parentPid);
    await waitUntilDead(grandchildPid);
    expect(isAlive(parentPid)).toBe(false);
    expect(isAlive(grandchildPid)).toBe(false);
  });

  it('propagates a crash as a typed exit with the stderr tail', async () => {
    const process = new HarnessProcess({ launch: launch('crash') });
    await process.start();
    const info = await process.exited;
    expect(info.crashed).toBe(true);
    expect(info.reaped).toBe(false);
    expect(info.code).toBe(1);
    expect(info.stderrTail).toContain('fatal boom');
  });

  it('rejects start() with SpawnFailed when the binary is missing (ENOENT)', async () => {
    const process = new HarnessProcess({
      launch: { command: 'srgnt-nonexistent-binary-xyz', args: [], env: {} },
    });
    await expect(process.start()).rejects.toMatchObject({ _tag: 'SpawnFailed' });
    expect(process.state).toBe('dead');
    // A dead process cannot be restarted in place.
    await expect(process.start()).rejects.toMatchObject({ _tag: 'SpawnFailed' });
  });

  it('escalates to SIGKILL for a process that ignores SIGTERM', async () => {
    const process = new HarnessProcess({ launch: launch('ignore-sigterm'), killGraceMs: 150 });
    await process.start();
    const { pid } = await readOne(process);
    const startedAt = Date.now();
    const info = await process.dispose();
    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(140);
    expect(info.reaped).toBe(true);
    expect(info.signal).toBe('SIGKILL');
    await waitUntilDead(pid as number);
    expect(isAlive(pid as number)).toBe(false);
  });

  it('double dispose() is idempotent and yields the same exit info', async () => {
    const process = new HarnessProcess({ launch: launch('sleep'), killGraceMs: 500 });
    await process.start();
    const [a, b] = await Promise.all([process.dispose(), process.dispose()]);
    expect(a).toBe(b);
    expect(process.state).toBe('dead');
  });

  it('dispose() from idle synthesizes a clean reaped exit', async () => {
    const process = new HarnessProcess({ launch: launch('sleep') });
    const info = await process.dispose();
    expect(info.reaped).toBe(true);
    expect(info.crashed).toBe(false);
    expect(process.state).toBe('dead');
  });
});
