import type { Readable, Writable } from 'node:stream';
import type { SpawnedAgent } from '../acp/connection.js';

/**
 * Explicit lifecycle state for a single agent OS process (ARCH-0009).
 *
 * The machine is *linear and single-use* — one `HarnessProcess` maps to exactly
 * one PID and never cycles back from `dead`. Respawn is a *new* `HarnessProcess`
 * created by the {@link ../supervisor.js Supervisor}. Keeping it linear removes a
 * whole class of "is this the old process or the new one?" bugs.
 *
 * ```
 * idle ─start()─▶ spawning ─'spawn'─▶ ready ─dispose()─▶ reaping ─exit─▶ dead
 *                    │                   │                                 ▲
 *                    └── 'error'/exit ───┴──────────── exit (crash) ───────┘
 * ```
 */
export type ProcessState = 'idle' | 'spawning' | 'ready' | 'reaping' | 'dead';

/** Terminal information about why (and how) a process left the running set. */
export interface ExitInfo {
  /** Exit code, or `null` when the process was terminated by a signal. */
  readonly code: number | null;
  /** Terminating signal, or `null` for a normal code exit. */
  readonly signal: NodeJS.Signals | null;
  /** True when *we* ended it via `dispose()` (kill-tree), not the process itself. */
  readonly reaped: boolean;
  /**
   * True when the process died on its own with a non-clean status (non-zero code
   * or a signal) and we did not reap it. This is the "harness crashed" path the
   * UI renders; carries the {@link stderrTail}.
   */
  readonly crashed: boolean;
  /** Last captured stderr lines, for crash diagnostics. */
  readonly stderrTail: string;
}

/**
 * Minimal child-process surface `HarnessProcess` depends on. Node's
 * `ChildProcess` satisfies it structurally; tests inject a fake so the state
 * machine can be exercised without real processes.
 */
export interface ChildProcessLike {
  readonly pid?: number;
  readonly stdin: Writable | null;
  readonly stdout: Readable | null;
  readonly stderr: Readable | null;
  kill(signal?: NodeJS.Signals | number): boolean;
  once(event: 'spawn', listener: () => void): void;
  once(event: 'error', listener: (err: Error) => void): void;
  once(event: 'exit', listener: (code: number | null, signal: NodeJS.Signals | null) => void): void;
}

/** Launches the OS process. Injected so tests own process lifecycle. */
export type ChildSpawner = (launch: import('@srgnt/contracts').LaunchSpec) => ChildProcessLike;

/**
 * Sends one signal to a whole process *tree*. POSIX signals the process group;
 * Windows uses `taskkill /T`. Injected so tests can assert the signals sent and
 * so a platform can be swapped without touching the state machine.
 */
export type KillTree = (pid: number, signal: NodeJS.Signals) => void;

/** A running process exposed to callers (composes with `AcpAgentConnection`). */
export interface RunningHandle {
  /** Supervisor-scoped identifier for this handle. */
  readonly id: string;
  /** OS pid of the live process. */
  readonly pid: number | undefined;
  /** The live transport: pass to `AcpAgentConnection.connect({ spawn: () => handle.transport })`. */
  readonly transport: SpawnedAgent;
  /** Resets the idle-reap timer — call on real agent activity (e.g. a prompt turn). */
  markActivity(): void;
}

/** Point-in-time health of one supervised handle, for UI / diagnostics. */
export interface HealthSnapshot {
  readonly id: string;
  readonly state: ProcessState;
  readonly pid: number | undefined;
  /** True when a `ready` process currently backs this handle. */
  readonly running: boolean;
  /** Consecutive crash count since the last clean start/reap (drives backoff). */
  readonly restarts: number;
  /** How the previous process instance ended, if any. */
  readonly lastExit: ExitInfo | undefined;
}

/** Supervisor lifecycle events, for logging and UI. */
export type SupervisorEvent =
  | { readonly kind: 'spawning'; readonly id: string }
  | { readonly kind: 'ready'; readonly id: string; readonly pid: number | undefined }
  | { readonly kind: 'exited'; readonly id: string; readonly info: ExitInfo }
  | { readonly kind: 'crashed'; readonly id: string; readonly info: ExitInfo }
  | { readonly kind: 'reaped'; readonly id: string; readonly reason: 'idle' | 'dispose' }
  | { readonly kind: 'gave-up'; readonly id: string; readonly restarts: number };

/**
 * Restart policy for crashed processes. Restarts are *lazy* — a crashed handle
 * is respawned on the next `ensureRunning()`, never eagerly, so "UI-open ≠
 * process-running" holds. The cap bounds crash-loops.
 */
export interface RestartPolicy {
  /** Max consecutive crash-respawns before `ensureRunning()` gives up. `0` disables restart. */
  readonly maxRestarts: number;
  /** Base backoff before a respawn attempt. */
  readonly baseDelayMs: number;
  /** Upper bound on the exponential backoff. */
  readonly maxDelayMs: number;
}

export const DEFAULT_RESTART_POLICY: RestartPolicy = {
  maxRestarts: 3,
  baseDelayMs: 250,
  maxDelayMs: 5_000,
};

/**
 * Time + scheduling seam. Real by default; tests inject a manual clock so idle
 * reaping and restart backoff are deterministic without wall-clock waits.
 */
export interface SupervisorClock {
  now(): number;
  /** Resolves after `ms`. Used for restart backoff. */
  delay(ms: number): Promise<void>;
  /** One-shot timer; returns a cancel function. Used for the idle-reap timer. */
  schedule(ms: number, fn: () => void): () => void;
}

export const systemClock: SupervisorClock = {
  now: () => Date.now(),
  delay: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  schedule: (ms, fn) => {
    const timer = setTimeout(fn, ms);
    // Never keep the event loop alive just for an idle-reap timer.
    (timer as { unref?: () => void }).unref?.();
    return () => clearTimeout(timer);
  },
};
