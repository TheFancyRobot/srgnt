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

/**
 * Floor reserved for the kill stage, whatever the earlier stages consumed
 * (capped by the total budget, so a small budget still bounds the whole quit).
 *
 * Without it, a slow cancel or checkpoint could leave `remaining() <= 0`, and
 * the kill-tree would be *issued but not awaited at all* — Electron exits, the
 * detached child never receives the escalation, and the orphan this whole
 * design exists to prevent is exactly what ships.
 */
export const QUIT_KILL_FLOOR_MS = 750;

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
  /**
   * Clock, injected in tests. Defaults to `performance.now`, which is monotonic
   * — a wall clock could jump backwards mid-quit and hand a stage a budget it
   * was never given.
   */
  readonly now?: () => number;
  /** Minimum window the kill stage is awaited for. */
  readonly killFloorMs?: number;
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
 * Runs the three quit stages in order under one shared deadline, with a floor
 * reserved for the kill stage so the backstop is always genuinely awaited.
 *
 * ponytail: a child that ignores SIGTERM escalates to SIGKILL on the harness's
 * own 5 s grace, which still outlives this budget — the floor guarantees the
 * signal is delivered and awaited, not that a SIGTERM-ignoring child is dead by
 * exit. Both shipped harnesses (the mock and Pi) exit on SIGTERM immediately.
 * Awaiting confirmed termination would make quit hang for up to 5 s on a wedged
 * agent, which is the worse trade; revisit if one is ever seen surviving quit.
 */
export async function runBoundedQuitCleanup(
  stages: BoundedCleanupStages,
  options: BoundedCleanupOptions = {},
): Promise<void> {
  const budgetMs = options.budgetMs ?? QUIT_CLEANUP_BUDGET_MS;
  const now = options.now ?? (() => performance.now());
  const deadline = now() + budgetMs;
  const remaining = (): number => deadline - now();

  await within(stages.cancelInFlight(), remaining());
  await within(stages.checkpoint(), remaining());
  // The floor, not what happens to be left: the earlier stages are best-effort
  // and this one is the guarantee. Capped by the caller's own budget, so a
  // deliberately tiny budget still bounds the whole quit rather than being
  // overridden by a constant sized for the default.
  const floor = Math.min(options.killFloorMs ?? QUIT_KILL_FLOOR_MS, budgetMs);
  await within(stages.disposeAll(), Math.max(remaining(), floor));
}
