/**
 * Bounded app-quit cleanup (STEP-24-05).
 *
 * Quit must be both *polite* and *absolute*: an in-flight turn gets a
 * best-effort `session/cancel` and a final transcript checkpoint, but neither
 * may wedge the quit — and the kill-trees that guarantee "no orphan agent
 * processes" must run whatever happened before them.
 *
 * So the WHOLE sequence shares ONE deadline, not one per stage. Each stage runs
 * against whatever is left of it; when the budget is gone, the remaining
 * best-effort work is abandoned and quit proceeds. The last stage is always
 * *started*, because it is the backstop.
 */

/** One overall budget for cancel + final checkpoint + kill-trees. */
export const QUIT_CLEANUP_BUDGET_MS = 2000;

export interface BoundedCleanupStages {
  /** Best-effort `session/cancel` for every in-flight turn. */
  readonly cancelInFlight: () => Promise<void>;
  /** Final `transcript.md` render for every live session. */
  readonly checkpoint: () => Promise<void>;
  /** Kill-trees. The guaranteed backstop — always started. */
  readonly disposeAll: () => Promise<void>;
}

export interface BoundedCleanupOptions {
  /** Total wall-clock budget for all three stages. */
  readonly budgetMs?: number;
  /** Monotonic clock. Injected in tests. */
  readonly now?: () => number;
}

/**
 * Runs `promise` with at most `ms` left on the clock. Resolves either way: a
 * timed-out or rejected stage is abandoned, never propagated — every stage here
 * is best-effort by construction.
 *
 * `ms <= 0` means the budget is already spent: the work is still *started* (so
 * a kill-tree is issued even in the pathological case) but is not awaited.
 */
async function within(promise: Promise<unknown>, ms: number): Promise<void> {
  promise.catch(() => undefined);
  if (ms <= 0) return;
  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    timer.unref?.();
    void promise.then(
      () => {
        clearTimeout(timer);
        resolve();
      },
      () => {
        clearTimeout(timer);
        resolve();
      },
    );
  });
}

/**
 * Runs the three quit stages in order under one shared deadline.
 *
 * ponytail: a child that ignores SIGTERM escalates to SIGKILL on the harness's
 * own 5 s grace, which can outlive this 2 s budget — so in the pathological
 * "cancel hangs AND the agent ignores SIGTERM" case the kill is issued but may
 * not have landed by exit. Both shipped harnesses (the mock and Pi) exit on
 * SIGTERM immediately. Reserve an explicit kill budget if a real agent is ever
 * observed surviving quit.
 */
export async function runBoundedQuitCleanup(
  stages: BoundedCleanupStages,
  options: BoundedCleanupOptions = {},
): Promise<void> {
  const budgetMs = options.budgetMs ?? QUIT_CLEANUP_BUDGET_MS;
  const now = options.now ?? Date.now;
  const deadline = now() + budgetMs;
  const remaining = (): number => deadline - now();

  await within(stages.cancelInFlight(), remaining());
  await within(stages.checkpoint(), remaining());
  await within(stages.disposeAll(), remaining());
}
