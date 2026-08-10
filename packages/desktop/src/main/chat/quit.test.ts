/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from 'vitest';
import { QUIT_CLEANUP_BUDGET_MS, runBoundedQuitCleanup } from './quit.js';

const never = (): Promise<void> => new Promise<void>(() => {});

describe('runBoundedQuitCleanup', () => {
  it('runs the three stages in order when nothing hangs', async () => {
    const order: string[] = [];
    await runBoundedQuitCleanup({
      cancelInFlight: async () => void order.push('cancel'),
      checkpoint: async () => void order.push('checkpoint'),
      disposeAll: async () => void order.push('dispose'),
    });
    expect(order).toEqual(['cancel', 'checkpoint', 'dispose']);
  });

  it('stays inside ONE budget when session/cancel never answers, and still kill-trees', async () => {
    const disposeAll = vi.fn(async () => {});
    const checkpoint = vi.fn(async () => {});
    const started = Date.now();

    await runBoundedQuitCleanup(
      { cancelInFlight: never, checkpoint, disposeAll },
      { budgetMs: 120 },
    );

    const elapsed = Date.now() - started;
    // The budget is for the WHOLE sequence, not per stage: a hanging cancel
    // must not buy the checkpoint and the kill-tree another 120ms each.
    expect(elapsed).toBeLessThan(120 * 2);
    // The backstop still ran, which is the whole point of bounding the rest.
    expect(disposeAll).toHaveBeenCalledOnce();
    expect(checkpoint).toHaveBeenCalledOnce();
  });

  it('still STARTS the kill-tree when the budget is already exhausted', async () => {
    const disposeAll = vi.fn(async () => {});
    let clock = 0;
    await runBoundedQuitCleanup(
      {
        // Burns the entire budget without hanging in real time.
        cancelInFlight: async () => {
          clock += 5_000;
        },
        checkpoint: async () => {},
        disposeAll,
      },
      { budgetMs: 1_000, now: () => clock },
    );
    expect(disposeAll).toHaveBeenCalledOnce();
  });

  it('never rejects when a stage throws', async () => {
    const disposeAll = vi.fn(async () => {});
    await expect(
      runBoundedQuitCleanup(
        {
          cancelInFlight: async () => {
            throw new Error('agent is gone');
          },
          checkpoint: async () => {
            throw new Error('disk full');
          },
          disposeAll,
        },
        { budgetMs: 500 },
      ),
    ).resolves.toBeUndefined();
    // A failed cancel and a failed checkpoint must not skip the kill-tree.
    expect(disposeAll).toHaveBeenCalledOnce();
  });

  it('bounds a hanging kill-tree too, so quit can never wedge', async () => {
    const started = Date.now();
    await runBoundedQuitCleanup(
      { cancelInFlight: async () => {}, checkpoint: async () => {}, disposeAll: never },
      { budgetMs: 80 },
    );
    expect(Date.now() - started).toBeLessThan(80 * 3);
  });

  it('ships a budget short enough to be invisible at quit', () => {
    expect(QUIT_CLEANUP_BUDGET_MS).toBe(2000);
  });
});
