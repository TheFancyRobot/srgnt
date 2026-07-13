import { spawn as nodeSpawn } from 'node:child_process';
import { Readable, Writable } from 'node:stream';
import { ndJsonStream } from '@agentclientprotocol/sdk';
import type { LaunchSpec } from '@srgnt/contracts';
import type { SpawnedAgent } from '../acp/connection.js';
import { SpawnFailed } from './errors.js';
import { platformKillTree } from './kill-tree.js';
import type { ChildProcessLike, ChildSpawner, ExitInfo, KillTree, ProcessState } from './types.js';

const IS_WINDOWS = process.platform === 'win32';

/** Default spawner: a detached, fully-piped child so kill-tree can signal its group. */
const defaultSpawnChild: ChildSpawner = (launch) =>
  nodeSpawn(launch.command, [...launch.args], {
    cwd: launch.cwd,
    env: { ...process.env, ...launch.env },
    stdio: ['pipe', 'pipe', 'pipe'],
    // Own process group on POSIX so `process.kill(-pid)` reaches the whole tree.
    detached: !IS_WINDOWS,
  });

export interface HarnessProcessOptions {
  /** How to launch the agent (contracts data, not protocol code). */
  readonly launch: LaunchSpec;
  /** Grace between SIGTERM and the escalated SIGKILL during `dispose()`. Default 5000ms. */
  readonly killGraceMs?: number;
  /** Max stderr bytes retained for crash diagnostics. Default 64 KiB. */
  readonly stderrRingBytes?: number;
  /** Injected OS spawn — override in tests. Defaults to a detached piped child. */
  readonly spawnChild?: ChildSpawner;
  /** Injected kill-tree — override in tests / per platform. */
  readonly killTree?: KillTree;
  /** Timer used for the SIGTERM→SIGKILL grace window. Injected for deterministic tests. */
  readonly delay?: (ms: number) => Promise<void>;
}

const DEFAULT_KILL_GRACE_MS = 5_000;
const DEFAULT_STDERR_RING_BYTES = 64 * 1024;

/**
 * One agent OS process with an explicit, single-use lifecycle
 * (`idle → spawning → ready → reaping → dead`; see {@link ProcessState}).
 *
 * Owns exactly one PID: lazy `start()`, stderr ring buffer for crash tails,
 * kill-tree `dispose()` that leaves no orphaned grandchildren, and typed
 * exit/crash propagation. It exposes a {@link SpawnedAgent} `transport` so it
 * composes directly with `AcpAgentConnection.connect({ spawn: () => hp.transport })`
 * — the supervisor is the "real spawner" the connection layer was designed to accept.
 *
 * Respawn is *not* a transition here: a dead process stays dead. The
 * {@link ../supervisor.js Supervisor} creates a fresh `HarnessProcess` to restart.
 */
export class HarnessProcess {
  private stateValue: ProcessState = 'idle';
  private child: ChildProcessLike | undefined;
  private startPromise: Promise<void> | undefined;
  private transportValue: SpawnedAgent | undefined;

  private readonly stderrChunks: Buffer[] = [];
  private stderrBytes = 0;

  private reapRequested = false;
  private startSettled = false;
  private rejectStart: ((error: unknown) => void) | undefined;
  private resolveExited!: (info: ExitInfo) => void;
  private readonly exitedPromise: Promise<ExitInfo>;

  private readonly stateListeners = new Set<(state: ProcessState) => void>();
  private readonly exitListeners = new Set<(info: ExitInfo) => void>();

  private readonly launch: LaunchSpec;
  private readonly killGraceMs: number;
  private readonly stderrRingBytes: number;
  private readonly spawnChild: ChildSpawner;
  private readonly killTree: KillTree;
  private readonly delay: (ms: number) => Promise<void>;

  constructor(options: HarnessProcessOptions) {
    this.launch = options.launch;
    this.killGraceMs = options.killGraceMs ?? DEFAULT_KILL_GRACE_MS;
    this.stderrRingBytes = options.stderrRingBytes ?? DEFAULT_STDERR_RING_BYTES;
    this.spawnChild = options.spawnChild ?? defaultSpawnChild;
    this.killTree = options.killTree ?? platformKillTree;
    this.delay = options.delay ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.exitedPromise = new Promise<ExitInfo>((resolve) => {
      this.resolveExited = resolve;
    });
  }

  get state(): ProcessState {
    return this.stateValue;
  }

  get pid(): number | undefined {
    return this.child?.pid;
  }

  /** Resolves once the process has reached `dead`, with how it ended. */
  get exited(): Promise<ExitInfo> {
    return this.exitedPromise;
  }

  /**
   * The live transport for `AcpAgentConnection`. Built lazily from the child's
   * stdio and memoized; throws until the process is `ready`.
   */
  get transport(): SpawnedAgent {
    if (this.stateValue !== 'ready' || this.child === undefined) {
      throw new Error(`HarnessProcess transport unavailable in state '${this.stateValue}'`);
    }
    if (this.transportValue === undefined) {
      const child = this.child;
      if (child.stdin === null || child.stdout === null) {
        throw new Error('HarnessProcess child is missing stdio pipes');
      }
      const stream = ndJsonStream(
        Writable.toWeb(child.stdin) as WritableStream<Uint8Array>,
        Readable.toWeb(child.stdout) as ReadableStream<Uint8Array>,
      );
      this.transportValue = { stream, kill: () => void this.dispose() };
    }
    return this.transportValue;
  }

  /**
   * Lazy spawn. Idempotent and race-safe: concurrent calls coalesce onto one
   * spawn. Resolves when the process is `ready`; rejects with {@link SpawnFailed}
   * if the binary cannot launch (the everyday "harness not installed" path).
   */
  start(): Promise<void> {
    if (this.stateValue === 'ready') {
      return Promise.resolve();
    }
    if (this.stateValue === 'dead') {
      return Promise.reject(
        new SpawnFailed({
          message: 'HarnessProcess is dead and cannot be restarted (create a new instance)',
          command: this.launch.command,
        }),
      );
    }
    if (this.startPromise !== undefined) {
      return this.startPromise;
    }
    this.startPromise = this.doStart();
    return this.startPromise;
  }

  private doStart(): Promise<void> {
    this.setState('spawning');
    let child: ChildProcessLike;
    try {
      child = this.spawnChild(this.launch);
    } catch (cause) {
      return Promise.reject(this.failSpawn(cause));
    }
    this.child = child;
    this.attachStderr(child);

    return new Promise<void>((resolve, reject) => {
      this.rejectStart = reject;
      child.once('spawn', () => {
        // A late 'spawn' after dispose() (disposed mid-spawn) must NOT resurrect
        // the process to 'ready' — leave it in reaping and let 'exit' finalize.
        if (this.startSettled || this.stateValue !== 'spawning') {
          return;
        }
        this.startSettled = true;
        this.setState('ready');
        resolve();
      });
      child.once('error', (error) => {
        if (this.startSettled) {
          return;
        }
        this.startSettled = true;
        // ENOENT/EACCES etc. — never reaches 'ready'. Finalize as dead.
        this.finalizeExit({ code: null, signal: null, spawnError: error });
        reject(this.failSpawn(error));
      });
      child.once('exit', (code, signal) => {
        // Only fires post-'spawn'; pre-'spawn' failures come through 'error'.
        this.finalizeExit({ code, signal });
      });
    });
  }

  /**
   * Kill-tree termination. Idempotent: `reaping → dead`, or immediate finalize
   * from `idle`/`spawning`. Sends SIGTERM to the tree, waits the grace window,
   * then escalates to SIGKILL for a process that ignores SIGTERM. Resolves once
   * the process is `dead`.
   */
  dispose(): Promise<ExitInfo> {
    if (this.stateValue === 'dead') {
      return this.exitedPromise;
    }
    if (this.stateValue === 'reaping') {
      return this.exitedPromise;
    }
    if (this.stateValue === 'idle') {
      // Never spawned — synthesize a clean, reaped exit.
      this.finalizeExit({ code: 0, signal: null, forcedReaped: true });
      return this.exitedPromise;
    }
    this.reapRequested = true;
    this.setState('reaping');
    void this.terminate();
    return this.exitedPromise;
  }

  private async terminate(): Promise<void> {
    const pid = this.child?.pid;
    if (pid === undefined) {
      // Spawning but no pid yet: best-effort direct kill, wait for exit/error.
      this.child?.kill('SIGKILL');
      return;
    }
    this.killTree(pid, 'SIGTERM');
    const exitedFirst = await Promise.race([
      this.exitedPromise.then(() => true),
      this.delay(this.killGraceMs).then(() => false),
    ]);
    if (!exitedFirst) {
      // Ignored SIGTERM — escalate. Harmless (ESRCH-swallowed) if it just exited.
      this.killTree(pid, 'SIGKILL');
    }
  }

  /** Most recent stderr output (default: whole ring), for crash diagnostics. */
  stderrTail(maxBytes?: number): string {
    const full = Buffer.concat(this.stderrChunks, this.stderrBytes).toString('utf8');
    if (maxBytes === undefined || full.length <= maxBytes) {
      return full;
    }
    return full.slice(full.length - maxBytes);
  }

  onStateChange(listener: (state: ProcessState) => void): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  onExit(listener: (info: ExitInfo) => void): () => void {
    this.exitListeners.add(listener);
    return () => this.exitListeners.delete(listener);
  }

  private attachStderr(child: ChildProcessLike): void {
    const stderr = child.stderr;
    if (stderr === null) {
      return;
    }
    stderr.on('data', (chunk: Buffer | string) => {
      const buf = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
      this.stderrChunks.push(buf);
      this.stderrBytes += buf.length;
      // Trim from the front once over budget — keep the *tail*.
      while (this.stderrBytes > this.stderrRingBytes && this.stderrChunks.length > 1) {
        const dropped = this.stderrChunks.shift();
        if (dropped !== undefined) {
          this.stderrBytes -= dropped.length;
        }
      }
    });
    stderr.on('error', () => {});
  }

  private finalizeExit(args: {
    code: number | null;
    signal: NodeJS.Signals | null;
    spawnError?: Error;
    forcedReaped?: boolean;
  }): void {
    if (this.stateValue === 'dead') {
      return;
    }
    const reaped = this.reapRequested || args.forcedReaped === true;
    const cleanCode = args.code === 0 && args.signal === null;
    const crashed = !reaped && args.spawnError === undefined && !cleanCode;
    const stderrTail =
      args.spawnError !== undefined
        ? `${this.stderrTail()}${args.spawnError.message}`.trim()
        : this.stderrTail();
    const info: ExitInfo = {
      code: args.code,
      signal: args.signal,
      reaped,
      crashed,
      stderrTail,
    };
    this.setState('dead');
    // If the process died before ever reaching 'ready' (disposed mid-spawn, or an
    // immediate exit), settle the still-pending start() rather than leaving it hung.
    if (!this.startSettled) {
      this.startSettled = true;
      this.rejectStart?.(
        new SpawnFailed({
          message: `Agent process exited before becoming ready (code=${info.code}, signal=${info.signal})`,
          command: this.launch.command,
        }),
      );
    }
    this.resolveExited(info);
    for (const listener of this.exitListeners) {
      listener(info);
    }
  }

  private failSpawn(cause: unknown): SpawnFailed {
    return new SpawnFailed({
      message: `Failed to spawn agent process: ${
        cause instanceof Error ? cause.message : String(cause)
      }`,
      command: this.launch.command,
      cause,
    });
  }

  private setState(next: ProcessState): void {
    if (this.stateValue === next) {
      return;
    }
    this.stateValue = next;
    for (const listener of this.stateListeners) {
      listener(next);
    }
  }
}
