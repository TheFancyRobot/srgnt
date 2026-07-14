import { spawn } from 'node:child_process';
import type { KillTree } from './types.js';

const isNoSuchProcess = (error: unknown): boolean =>
  (error as NodeJS.ErrnoException | undefined)?.code === 'ESRCH';

/**
 * POSIX kill-tree: signal the process *group*, not just the leader.
 *
 * `HarnessProcess` spawns children with `detached: true`, which makes the child
 * a group leader whose pgid equals its pid. Signalling `-pid` reaches the leader
 * and every descendant it spawned in that group — the whole tree dies, no
 * orphaned grandchildren (the ARCH-0009 "no orphans on quit" invariant).
 *
 * `ESRCH` (already gone) is swallowed so a double-kill or a race with a natural
 * exit never throws. `EPERM` (rare: child re-parented itself out of the group)
 * falls back to signalling the single pid.
 */
export const posixKillTree: KillTree = (pid, signal) => {
  try {
    process.kill(-pid, signal);
  } catch (error) {
    if (isNoSuchProcess(error)) {
      return;
    }
    // Group signal denied — best-effort fall back to the single process.
    try {
      process.kill(pid, signal);
    } catch (fallbackError) {
      if (!isNoSuchProcess(fallbackError)) {
        throw fallbackError;
      }
    }
  }
};

/**
 * Windows kill-tree (best-effort; Windows is not first-class until Phase 29 but
 * is not designed out). `taskkill /T` terminates the process and its children.
 * `SIGKILL` maps to a forced `/F` kill; a graceful `SIGTERM` omits `/F`. Fire and
 * forget — the process's `exit` event is what the state machine actually waits on.
 */
export const windowsKillTree: KillTree = (pid, signal) => {
  const args = ['/pid', String(pid), '/T'];
  if (signal === 'SIGKILL') {
    args.push('/F');
  }
  const killer = spawn('taskkill', args, { stdio: 'ignore', windowsHide: true });
  // Don't let a stuck taskkill hold the event loop or reject unhandled.
  killer.on('error', () => {});
  (killer as { unref?: () => void }).unref?.();
};

/** The kill-tree strategy for the current platform. */
export const platformKillTree: KillTree =
  process.platform === 'win32' ? windowsKillTree : posixKillTree;
