import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import type { ChildProcessLike, ChildSpawner, KillTree } from '../types.js';

let pidSeq = 40_000;

/**
 * In-memory stand-in for a spawned child, so the supervisor state machine can be
 * driven deterministically without real processes. Tests emit `spawnOk`/`exit`/
 * `fail` to move the machine; `signals` records what kill-tree sent.
 */
export class FakeChild extends EventEmitter implements ChildProcessLike {
  readonly pid = ++pidSeq;
  readonly stdin = new PassThrough();
  readonly stdout = new PassThrough();
  readonly stderr = new PassThrough();
  readonly signals: NodeJS.Signals[] = [];
  /** A real child reaches a terminal event ('error' or 'exit') exactly once. */
  private settled = false;

  constructor() {
    super();
    // Never let a stray 'error' emit throw (Node throws when unlistened).
    this.on('error', () => {});
  }

  kill(signal: NodeJS.Signals | number = 'SIGTERM'): boolean {
    this.signals.push(typeof signal === 'number' ? 'SIGKILL' : signal);
    return true;
  }

  /** Model a successful spawn (`spawning → ready`). Not terminal. */
  spawnOk(): void {
    this.emit('spawn');
  }

  /** Model a spawn failure like ENOENT (`spawning → dead`). Terminal. */
  fail(error: Error): void {
    if (this.settled) {
      return;
    }
    this.settled = true;
    this.emit('error', error);
  }

  /** Model a process exit. Terminal. */
  exit(code: number | null, signal: NodeJS.Signals | null = null): void {
    if (this.settled) {
      return;
    }
    this.settled = true;
    this.emit('exit', code, signal);
  }

  /** Convenience: write stderr then exit non-zero (a crash). */
  crash(stderr: string, code = 1): void {
    this.stderr.write(stderr);
    this.exit(code, null);
  }
}

export interface FakeFleet {
  readonly spawnChild: ChildSpawner;
  readonly killTree: KillTree;
  readonly children: FakeChild[];
  last(): FakeChild;
}

/**
 * A `ChildSpawner` + `KillTree` pair backed by {@link FakeChild}s. By default each
 * spawn auto-succeeds on the next microtask, and kill-tree makes the addressed
 * child exit (a well-behaved process). Tests reach into `children`/`last()` to
 * script crashes and other behaviors.
 */
export function fakeFleet(options: { autoSpawn?: boolean } = {}): FakeFleet {
  const children: FakeChild[] = [];
  const byPid = new Map<number, FakeChild>();
  const spawnChild: ChildSpawner = () => {
    const child = new FakeChild();
    children.push(child);
    byPid.set(child.pid, child);
    if (options.autoSpawn !== false) {
      queueMicrotask(() => child.spawnOk());
    }
    return child;
  };
  const killTree: KillTree = (pid, signal) => {
    const child = byPid.get(pid);
    if (child === undefined) {
      return;
    }
    queueMicrotask(() => child.exit(null, signal));
  };
  return {
    spawnChild,
    killTree,
    children,
    last: () => {
      const child = children[children.length - 1];
      if (child === undefined) {
        throw new Error('fakeFleet: no child spawned yet');
      }
      return child;
    },
  };
}
