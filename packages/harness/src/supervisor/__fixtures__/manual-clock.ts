import type { SupervisorClock } from '../types.js';

/**
 * Deterministic {@link SupervisorClock} for tests: `delay` records requested
 * backoff durations and resolves immediately; `schedule` (the idle-reap timer)
 * captures callbacks so a test can fire them by hand instead of waiting.
 */
export class ManualClock implements SupervisorClock {
  time = 0;
  readonly delays: number[] = [];
  private readonly timers: Array<{ readonly fn: () => void; live: boolean }> = [];

  now(): number {
    return this.time;
  }

  delay(ms: number): Promise<void> {
    this.delays.push(ms);
    return Promise.resolve();
  }

  schedule(_ms: number, fn: () => void): () => void {
    const timer = { fn, live: true };
    this.timers.push(timer);
    return () => {
      timer.live = false;
    };
  }

  /** Fires every still-armed idle timer once. */
  fireIdle(): void {
    for (const timer of this.timers) {
      if (timer.live) {
        timer.live = false;
        timer.fn();
      }
    }
  }

  /** How many idle timers are currently armed (for leak assertions). */
  pendingIdle(): number {
    return this.timers.filter((timer) => timer.live).length;
  }
}
