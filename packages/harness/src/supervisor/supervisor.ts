import type { LaunchSpec } from '@srgnt/contracts';
import type { AgentSpawner, SpawnedAgent } from '../acp/connection.js';
import { SupervisorGaveUp, UnknownHandle } from './errors.js';
import { HarnessProcess, type HarnessProcessOptions } from './harness-process.js';
import {
  DEFAULT_RESTART_POLICY,
  systemClock,
  type ExitInfo,
  type HealthSnapshot,
  type RestartPolicy,
  type RunningHandle,
  type SupervisorClock,
  type SupervisorEvent,
} from './types.js';

export interface SupervisorOptions {
  /** Restart policy for crashed processes. Defaults to {@link DEFAULT_RESTART_POLICY}. */
  readonly restart?: RestartPolicy;
  /**
   * Idle-reap timeout in ms. When set, a `ready` handle with no `markActivity()`
   * for this long is reaped; the next `ensureRunning()` respawns it transparently.
   * Off by default. STEP-24-05 wires the chat policy (see {@link setIdleHold} —
   * activity pokes alone cannot protect a turn that streams nothing).
   */
  readonly idleTimeoutMs?: number;
  /** Per-process spawn/kill knobs forwarded to each {@link HarnessProcess}. */
  readonly processOptions?: Pick<
    HarnessProcessOptions,
    'killGraceMs' | 'stderrRingBytes' | 'spawnChild' | 'killTree' | 'delay'
  >;
  /** Time + scheduling seam. Injected in tests for deterministic idle/backoff. */
  readonly clock?: SupervisorClock;
}

interface Entry {
  readonly launch: LaunchSpec;
  process: HarnessProcess | undefined;
  /** In-flight `ensureRunning` — coalesces concurrent callers onto one spawn. */
  starting: Promise<HarnessProcess> | undefined;
  cancelIdle: (() => void) | undefined;
  /** While true the idle clock is paused entirely (a turn is in flight). */
  idleHeld: boolean;
  /** Consecutive crash count since the last clean start/reap. */
  restarts: number;
  lastExit: ExitInfo | undefined;
  disposed: boolean;
  /** Set just before an intentional dispose so the single `reaped` emission (from
   *  the exit path) reports the right reason instead of guessing 'dispose'. */
  reapReason: 'idle' | 'dispose' | undefined;
}

/**
 * Supervises many agent processes so "UI-open ≠ process-running" and "no orphans
 * on quit" are supervisor invariants, not app logic (ARCH-0009).
 *
 * - **Lazy:** registering a handle spawns nothing; the first `ensureRunning()`
 *   spawns exactly once, and concurrent calls coalesce (no double-spawn race).
 * - **Idle-reap:** an inactive handle is reaped; the next `ensureRunning()`
 *   respawns transparently.
 * - **Crash + restart:** a crashed process is respawned lazily with capped
 *   exponential backoff, then the supervisor gives up cleanly with a typed error.
 * - **Kill-tree:** `dispose()`/`disposeAll()` terminate whole process trees.
 *
 * Composition with the STEP-22-01 connection: {@link spawnerFor} yields the
 * `AgentSpawner` that `AcpAgentConnection.connect` already accepts, so the
 * supervisor is the "real spawner" the connection was designed around.
 */
export class Supervisor {
  private readonly entries = new Map<string, Entry>();
  private readonly listeners = new Set<(event: SupervisorEvent) => void>();
  private readonly restart: RestartPolicy;
  private readonly idleTimeoutMs: number | undefined;
  private readonly processOptions: SupervisorOptions['processOptions'];
  private readonly clock: SupervisorClock;

  constructor(options: SupervisorOptions = {}) {
    this.restart = options.restart ?? DEFAULT_RESTART_POLICY;
    this.idleTimeoutMs = options.idleTimeoutMs;
    this.processOptions = options.processOptions;
    this.clock = options.clock ?? systemClock;
  }

  /** Registers a launchable handle. Spawns nothing (lazy). */
  register(id: string, launch: LaunchSpec): void {
    if (this.entries.has(id)) {
      throw new Error(`Supervisor handle '${id}' is already registered`);
    }
    this.entries.set(id, {
      launch,
      process: undefined,
      starting: undefined,
      cancelIdle: undefined,
      idleHeld: false,
      restarts: 0,
      lastExit: undefined,
      disposed: false,
      reapReason: undefined,
    });
  }

  /** True when a handle id is known. */
  has(id: string): boolean {
    return this.entries.has(id);
  }

  /**
   * Ensures the handle has a live `ready` process, spawning (or respawning after
   * a crash/idle-reap) on demand. Coalesces concurrent callers. Rejects with
   * {@link UnknownHandle} for an unregistered id, {@link SupervisorGaveUp} once
   * the restart cap is exhausted, or `SpawnFailed` if the binary cannot launch.
   */
  async ensureRunning(id: string): Promise<RunningHandle> {
    const entry = this.entries.get(id);
    if (entry === undefined) {
      throw new UnknownHandle({ message: `No supervised handle '${id}'`, id });
    }
    if (entry.disposed) {
      throw new UnknownHandle({ message: `Supervised handle '${id}' was disposed`, id });
    }

    const existing = entry.process;
    if (existing !== undefined && existing.state === 'ready') {
      this.armIdle(entry);
      return this.handleFor(id, entry, existing);
    }
    if (entry.starting !== undefined) {
      const process = await entry.starting;
      this.armIdle(entry);
      return this.handleFor(id, entry, process);
    }

    const startPromise = this.startEntry(id, entry);
    entry.starting = startPromise;
    try {
      const process = await startPromise;
      this.armIdle(entry);
      return this.handleFor(id, entry, process);
    } finally {
      if (entry.starting === startPromise) {
        entry.starting = undefined;
      }
    }
  }

  private async startEntry(id: string, entry: Entry): Promise<HarnessProcess> {
    // Give up cleanly once the crash cap is exhausted. entry.restarts is the
    // actual consecutive-crash count (incremented once per crash in
    // onProcessExit), so report it directly rather than an off-by-one.
    if (entry.restarts > this.restart.maxRestarts) {
      throw new SupervisorGaveUp({
        message: `Supervised handle '${id}' crashed ${entry.restarts} times; giving up`,
        id,
        restarts: entry.restarts,
        stderrTail: entry.lastExit?.stderrTail,
      });
    }
    // Backoff before a *respawn* (not the first start).
    if (entry.restarts > 0) {
      await this.clock.delay(this.backoffFor(entry.restarts));
      if (entry.disposed) {
        // disposeAll()/dispose() ran while we were waiting out backoff — do not
        // resurrect a process the supervisor already committed to tearing down.
        throw new UnknownHandle({ message: `Supervised handle '${id}' was disposed`, id });
      }
    }

    this.emit({ kind: 'spawning', id });
    const process = new HarnessProcess({ launch: entry.launch, ...this.processOptions });
    // Assign before awaiting start(): if the spawn itself fails, the exit
    // fires synchronously inside start() and onProcessExit needs entry.process
    // to already be this instance to record lastExit (see onProcessExit).
    entry.process = process;
    process.onExit((info) => this.onProcessExit(id, entry, process, info));
    await process.start();
    this.emit({ kind: 'ready', id, pid: process.pid });
    return process;
  }

  private onProcessExit(id: string, entry: Entry, process: HarnessProcess, info: ExitInfo): void {
    if (entry.process !== process) {
      return; // stale instance (already replaced) — ignore.
    }
    entry.process = undefined;
    entry.lastExit = info;
    entry.cancelIdle?.();
    entry.cancelIdle = undefined;

    if (info.reaped) {
      // Intentional teardown (idle reap or dispose): a clean slate, no backoff.
      // Emitted exactly once, here, after the process has actually exited —
      // armIdle/dispose only record *why* via entry.reapReason.
      entry.restarts = 0;
      const reason = entry.reapReason ?? 'dispose';
      entry.reapReason = undefined;
      this.emit({ kind: 'reaped', id, reason });
      return;
    }
    if (info.crashed) {
      entry.restarts += 1;
      this.emit({ kind: 'crashed', id, info });
      if (entry.restarts > this.restart.maxRestarts) {
        this.emit({ kind: 'gave-up', id, restarts: this.restart.maxRestarts });
      }
      return;
    }
    // Clean self-exit (code 0): not a crash; respawn fresh on next demand.
    entry.restarts = 0;
    this.emit({ kind: 'exited', id, info });
  }

  /**
   * Pauses (`held`) or resumes the idle clock for a handle.
   *
   * `markActivity()` alone CANNOT keep a long turn alive: an agent that thinks
   * silently for longer than `idleTimeoutMs` emits nothing to poke with, and
   * would be reaped mid-flight. Correctness therefore comes from this explicit
   * transition — held on turn start, released on turn end or failure — and the
   * activity pokes are only a supplemental heartbeat.
   *
   * Releasing re-arms from zero, so the idle clock only ever runs between turns.
   * Unknown ids are ignored: a caller racing `dispose` is normal.
   */
  setIdleHold(id: string, held: boolean): void {
    const entry = this.entries.get(id);
    if (entry === undefined) {
      return;
    }
    entry.idleHeld = held;
    if (held) {
      entry.cancelIdle?.();
      entry.cancelIdle = undefined;
      return;
    }
    this.armIdle(entry);
  }

  private armIdle(entry: Entry): void {
    entry.cancelIdle?.();
    entry.cancelIdle = undefined;
    if (this.idleTimeoutMs === undefined || entry.idleHeld) {
      return;
    }
    entry.cancelIdle = this.clock.schedule(this.idleTimeoutMs, () => {
      const process = entry.process;
      if (process === undefined || process.state !== 'ready') {
        return;
      }
      // Record the reason; onProcessExit emits 'reaped' once the kill-tree
      // teardown actually completes.
      entry.reapReason = 'idle';
      void process.dispose();
    });
  }

  private handleFor(id: string, entry: Entry, process: HarnessProcess): RunningHandle {
    return {
      id,
      pid: process.pid,
      transport: process.transport,
      markActivity: () => this.armIdle(entry),
    };
  }

  private backoffFor(restarts: number): number {
    const exponent = Math.max(0, restarts - 1);
    const raw = this.restart.baseDelayMs * 2 ** exponent;
    return Math.min(raw, this.restart.maxDelayMs);
  }

  /**
   * The `AgentSpawner` for a handle. Pass directly to the connection layer:
   * `AcpAgentConnection.connect({ spawn: supervisor.spawnerFor(id), launch, ports })`.
   * Each call ensures the process is running and returns its live transport.
   */
  spawnerFor(id: string): AgentSpawner {
    return async (): Promise<SpawnedAgent> => {
      const handle = await this.ensureRunning(id);
      return handle.transport;
    };
  }

  /** Point-in-time health for a handle (or `undefined` if unknown). */
  health(id: string): HealthSnapshot | undefined {
    const entry = this.entries.get(id);
    if (entry === undefined) {
      return undefined;
    }
    const process = entry.process;
    return {
      id,
      state: process?.state ?? (entry.lastExit !== undefined ? 'dead' : 'idle'),
      pid: process?.pid,
      running: process?.state === 'ready',
      restarts: entry.restarts,
      lastExit: entry.lastExit,
    };
  }

  /** Reaps one handle's process (kill-tree) without unregistering it. */
  async dispose(id: string): Promise<void> {
    const entry = this.entries.get(id);
    if (entry === undefined) {
      return;
    }
    entry.cancelIdle?.();
    entry.cancelIdle = undefined;
    const starting = entry.starting;
    const process = entry.process ?? (starting !== undefined ? await starting.catch(() => undefined) : undefined);
    if (process !== undefined) {
      entry.reapReason = 'dispose';
      await process.dispose();
    }
    entry.process = undefined;
    entry.starting = undefined;
  }

  /**
   * Reaps every handle (app quit). Idempotent and leak-free: cancels idle timers,
   * kill-trees all live processes concurrently, and marks handles disposed so a
   * late `ensureRunning()` fails fast instead of resurrecting a process.
   */
  async disposeAll(): Promise<void> {
    const pending: Array<Promise<void>> = [];
    for (const [id, entry] of this.entries) {
      entry.disposed = true;
      pending.push(this.dispose(id));
    }
    await Promise.all(pending);
  }

  /** Subscribes to lifecycle events; returns an unsubscribe function. */
  onEvent(listener: (event: SupervisorEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: SupervisorEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}
