import { fileURLToPath } from 'node:url';
import type { LaunchSpec } from '@srgnt/contracts';
import { describe, expect, it } from 'vitest';
import { Supervisor } from './supervisor.js';

const FAKE_AGENT = fileURLToPath(new URL('./__fixtures__/fake-agent.mjs', import.meta.url));

const launch = (mode: string): LaunchSpec => ({
  command: process.execPath,
  args: [FAKE_AGENT, mode],
  env: {},
});

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

describe('Supervisor (real processes)', () => {
  it('disposeAll() under 10 concurrent handles leaves no live processes', async () => {
    const supervisor = new Supervisor({ processOptions: { killGraceMs: 1_000 } });
    const pids: number[] = [];
    for (let i = 0; i < 10; i += 1) {
      supervisor.register(`h${i}`, launch('sleep'));
      const handle = await supervisor.ensureRunning(`h${i}`);
      expect(handle.pid).toBeGreaterThan(0);
      pids.push(handle.pid as number);
    }
    expect(pids.every((pid) => isAlive(pid))).toBe(true);

    await supervisor.disposeAll();
    await Promise.all(pids.map((pid) => waitUntilDead(pid)));
    expect(pids.some((pid) => isAlive(pid))).toBe(false);
  });

  it('composes with spawnerFor(): real spawn on demand, kill-tree on dispose', async () => {
    const supervisor = new Supervisor({ processOptions: { killGraceMs: 1_000 } });
    supervisor.register('agent', launch('sleep'));
    const spawner = supervisor.spawnerFor('agent');

    const agent = await spawner();
    expect(agent.stream.readable).toBeDefined();
    const pid = supervisor.health('agent')?.pid as number;
    expect(isAlive(pid)).toBe(true);

    await supervisor.dispose('agent');
    await waitUntilDead(pid);
    expect(isAlive(pid)).toBe(false);
  });
});
