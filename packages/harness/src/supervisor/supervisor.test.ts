import type { LaunchSpec } from '@srgnt/contracts';
import { describe, expect, it } from 'vitest';
import { fakeFleet } from './__fixtures__/fake-child.js';
import { ManualClock } from './__fixtures__/manual-clock.js';
import { Supervisor } from './supervisor.js';
import type { SupervisorEvent } from './types.js';

const LAUNCH: LaunchSpec = { command: 'fake', args: [], env: {} };

const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

describe('Supervisor', () => {
  it('is lazy: registering spawns nothing', () => {
    const fleet = fakeFleet();
    const supervisor = new Supervisor({
      processOptions: { spawnChild: fleet.spawnChild, killTree: fleet.killTree },
    });
    supervisor.register('a', LAUNCH);
    expect(fleet.children).toHaveLength(0);
    expect(supervisor.health('a')?.running).toBe(false);
  });

  it('spawns exactly once and coalesces concurrent ensureRunning() calls', async () => {
    const fleet = fakeFleet();
    const supervisor = new Supervisor({
      processOptions: { spawnChild: fleet.spawnChild, killTree: fleet.killTree },
    });
    supervisor.register('a', LAUNCH);
    const [h1, h2, h3] = await Promise.all([
      supervisor.ensureRunning('a'),
      supervisor.ensureRunning('a'),
      supervisor.ensureRunning('a'),
    ]);
    expect(fleet.children).toHaveLength(1);
    expect(h1.pid).toBe(h2.pid);
    expect(h2.pid).toBe(h3.pid);
  });

  it('rejects ensureRunning() for an unknown handle', async () => {
    const supervisor = new Supervisor();
    await expect(supervisor.ensureRunning('nope')).rejects.toMatchObject({ _tag: 'UnknownHandle' });
  });

  it('idle-reaps an inactive handle and respawns transparently on next demand', async () => {
    const fleet = fakeFleet();
    const clock = new ManualClock();
    const supervisor = new Supervisor({
      idleTimeoutMs: 1_000,
      clock,
      processOptions: { spawnChild: fleet.spawnChild, killTree: fleet.killTree },
    });
    supervisor.register('a', LAUNCH);

    await supervisor.ensureRunning('a');
    expect(fleet.children).toHaveLength(1);

    clock.fireIdle(); // idle timer → reap
    await flush();
    expect(supervisor.health('a')?.running).toBe(false);
    expect(clock.pendingIdle()).toBe(0); // no dangling timer

    await supervisor.ensureRunning('a'); // respawn
    expect(fleet.children).toHaveLength(2);
    expect(supervisor.health('a')?.running).toBe(true);

    await supervisor.disposeAll();
  });

  it('markActivity() re-arms the idle timer', async () => {
    const fleet = fakeFleet();
    const clock = new ManualClock();
    const supervisor = new Supervisor({
      idleTimeoutMs: 1_000,
      clock,
      processOptions: { spawnChild: fleet.spawnChild, killTree: fleet.killTree },
    });
    supervisor.register('a', LAUNCH);
    const handle = await supervisor.ensureRunning('a');
    expect(clock.pendingIdle()).toBe(1);
    handle.markActivity();
    expect(clock.pendingIdle()).toBe(1); // old cancelled, new armed
    await supervisor.disposeAll();
  });

  it('restarts a crashed process with capped backoff, then gives up cleanly', async () => {
    const fleet = fakeFleet();
    const clock = new ManualClock();
    const events: SupervisorEvent[] = [];
    const supervisor = new Supervisor({
      restart: { maxRestarts: 2, baseDelayMs: 100, maxDelayMs: 1_000 },
      clock,
      processOptions: { spawnChild: fleet.spawnChild, killTree: fleet.killTree },
    });
    supervisor.onEvent((event) => events.push(event));
    supervisor.register('a', LAUNCH);

    await supervisor.ensureRunning('a'); // start #1
    fleet.last().crash('boom-1\n');
    await flush();

    await supervisor.ensureRunning('a'); // restart #1 (backoff 100)
    fleet.last().crash('boom-2\n');
    await flush();

    await supervisor.ensureRunning('a'); // restart #2 (backoff 200)
    fleet.last().crash('boom-3\n');
    await flush();

    // Restart cap exhausted → clean typed give-up.
    await expect(supervisor.ensureRunning('a')).rejects.toMatchObject({
      _tag: 'SupervisorGaveUp',
      restarts: 2,
    });

    expect(clock.delays).toEqual([100, 200]); // exponential backoff, respawns only
    expect(events.filter((e) => e.kind === 'crashed')).toHaveLength(3);
    expect(events.some((e) => e.kind === 'gave-up')).toBe(true);
    expect(supervisor.health('a')?.restarts).toBe(3);
    expect(supervisor.health('a')?.lastExit?.stderrTail).toContain('boom-3');
  });

  it('maxRestarts: 0 disables restart (gives up after the first crash)', async () => {
    const fleet = fakeFleet();
    const clock = new ManualClock();
    const supervisor = new Supervisor({
      restart: { maxRestarts: 0, baseDelayMs: 100, maxDelayMs: 1_000 },
      clock,
      processOptions: { spawnChild: fleet.spawnChild, killTree: fleet.killTree },
    });
    supervisor.register('a', LAUNCH);
    await supervisor.ensureRunning('a');
    fleet.last().crash('one-and-done\n');
    await flush();
    await expect(supervisor.ensureRunning('a')).rejects.toMatchObject({ _tag: 'SupervisorGaveUp' });
    expect(clock.delays).toEqual([]); // never even attempted a respawn
  });

  it('spawnerFor() yields the connection-layer AgentSpawner surface', async () => {
    const fleet = fakeFleet();
    const supervisor = new Supervisor({
      processOptions: { spawnChild: fleet.spawnChild, killTree: fleet.killTree },
    });
    supervisor.register('a', LAUNCH);
    const spawner = supervisor.spawnerFor('a');
    const agent = await spawner();
    expect(agent.stream).toBeDefined();
    expect(agent.stream.readable).toBeDefined();
    expect(agent.stream.writable).toBeDefined();
    expect(typeof agent.kill).toBe('function');
    expect(fleet.children).toHaveLength(1);
    await supervisor.disposeAll();
  });

  it('disposeAll() reaps every handle and blocks resurrection', async () => {
    const fleet = fakeFleet();
    const clock = new ManualClock();
    const supervisor = new Supervisor({
      idleTimeoutMs: 1_000,
      clock,
      processOptions: { spawnChild: fleet.spawnChild, killTree: fleet.killTree },
    });
    for (let i = 0; i < 10; i += 1) {
      supervisor.register(`h${i}`, LAUNCH);
      await supervisor.ensureRunning(`h${i}`);
    }
    expect(fleet.children).toHaveLength(10);

    await supervisor.disposeAll();

    expect(clock.pendingIdle()).toBe(0); // no dangling idle timers
    for (let i = 0; i < 10; i += 1) {
      expect(supervisor.health(`h${i}`)?.running).toBe(false);
      await expect(supervisor.ensureRunning(`h${i}`)).rejects.toMatchObject({
        _tag: 'UnknownHandle',
      });
    }
  });
});
