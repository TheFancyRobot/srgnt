import { createSessionStore, type SessionStore } from '@srgnt/runtime';

/**
 * Main-process owner of the session store (PHASE-24, STEP-24-03).
 *
 * The sibling of `./projects.ts`, and re-rooted through the same workspace hook:
 * a store still pointing at the previous root would append events into a
 * workspace the user has left. Sessions live under
 * `projects/<projectId>/sessions/<sessionId>/`, so the store is meaningless
 * without a project — the chat layer only persists sessions that resolved one.
 *
 * `@srgnt/runtime` is CommonJS, so this is a plain static import; only
 * `@srgnt/harness` needs the lazy-ESM dance.
 */
export interface SessionsService {
  /** Re-roots the store, closing the previous root's open append handles. */
  setWorkspaceRoot(root: string): Promise<void>;
  /** `undefined` before a workspace root exists — sessions cannot persist yet. */
  store(): SessionStore | undefined;
  /** Flushes and closes every open event log (app quit). */
  close(): Promise<void>;
}

export function createSessionsService(deps: { getWorkspaceRoot(): string }): SessionsService {
  let cachedRoot = '';
  let cachedStore: SessionStore | undefined;

  function store(): SessionStore | undefined {
    const root = deps.getWorkspaceRoot();
    if (root === '') return undefined;
    if (cachedStore === undefined || cachedRoot !== root) {
      // Defensive: `setWorkspaceRoot` is the intended path and awaits the close.
      // Reaching here with a changed root means something re-rooted without it,
      // and silently replacing the store would strand the old one's descriptors
      // and advisory locks with no handle left to close them by.
      const stale = cachedStore;
      cachedRoot = root;
      cachedStore = createSessionStore(root);
      void stale?.close().catch(() => {});
    }
    return cachedStore;
  }

  return {
    async setWorkspaceRoot(root: string): Promise<void> {
      const previous = cachedStore;
      cachedRoot = root;
      cachedStore = root === '' ? undefined : createSessionStore(root);
      // Every open log holds a file descriptor AND the advisory lock on its
      // events.jsonl. Leaving the old store open would keep both against a
      // workspace nobody is writing to any more.
      await previous?.close().catch(() => {});
    },
    store,
    close: async () => {
      const open = cachedStore;
      cachedStore = undefined;
      await open?.close();
    },
  };
}
