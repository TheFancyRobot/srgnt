/**
 * ACP permission engine (PHASE-23, STEP-23-03).
 *
 * Pure and Electron-free by design: `runtime` never speaks ACP, so the engine
 * takes a *normalized* request (kind, title, affected paths, command) and the
 * chat controller in desktop-main does the ACP↔engine mapping. That boundary is
 * what lets Phase 24's project policy and Phase 25's opencode permissions reuse
 * this without importing a protocol SDK.
 *
 * The concepts carry forward from the aggregator-era `runtime/src/policy`
 * (allow/deny/prompt resolution, default `prompt`) and `runtime/src/approvals`
 * (pending → resolved lifecycle); none of that code does, because both are keyed
 * on `LaunchContext` and capability strings, not ACP tool calls.
 *
 * Default-ask is absolute this phase: the ONLY automatic answers are decisions
 * the user explicitly asked to be remembered via an `*_always` option.
 */

/** What the client should do with a request. `ask` means: show the prompt. */
export type PermissionResolution = 'allow' | 'reject' | 'ask';

/** A remembered answer. Deliberately not an optionId — later requests carry different options. */
export type PermissionDecision = 'allow' | 'reject';

/** ACP's option kinds. Anything else is an unknown kind and is never remembered. */
export type PermissionOptionKind = 'allow_once' | 'allow_always' | 'reject_once' | 'reject_always';

/**
 * One permission request, stripped of ACP. `paths` and `command` exist only to
 * derive the memory scope — an `allow_always` must not be broader than what the
 * user actually saw.
 */
export interface NormalizedPermissionRequest {
  readonly sessionId: string;
  /** ACP `ToolKind`, or any string an agent invented. Unknown kinds still work. */
  readonly kind: string;
  readonly title: string;
  /** Affected paths, canonical where the client could canonicalize them. */
  readonly paths?: readonly string[];
  /** The command line, for `execute` calls. */
  readonly command?: string;
}

/**
 * How widely a remembered decision applies.
 *
 * - `scope` — only this path / this program / this exact title. The default.
 * - `kind`  — every later call of the same tool kind. Reachable ONLY when the
 *   user explicitly picked a kind-wide option, never inferred.
 */
export type PermissionBreadth = 'scope' | 'kind';

/** Phase 24 plugs project policy in here. This phase it always returns `undefined`. */
export type ProjectPolicyHook = (request: NormalizedPermissionRequest) => PermissionDecision | undefined;

export interface PermissionEngineOptions {
  /** Falls through (returns `undefined`) for every request this phase. */
  readonly projectPolicy?: ProjectPolicyHook;
}

export interface PermissionEngine {
  /** Resolution order: session-remembered → project policy → default ask. */
  resolve(request: NormalizedPermissionRequest): PermissionResolution;
  /** Records an `*_always` answer for later requests in the same session. */
  remember(request: NormalizedPermissionRequest, decision: PermissionDecision, breadth?: PermissionBreadth): void;
  /** Drops every remembered answer for a session (session end). */
  forgetSession(sessionId: string): void;
  /** The scope a remembered `scope`-breadth answer would cover. Exposed for audit payloads. */
  scopeOf(request: NormalizedPermissionRequest): string;
}

/** Tool kinds whose scope is the file they touch. */
const PATH_KINDS = new Set(['read', 'edit', 'delete', 'move']);

/**
 * What one `allow_always` is allowed to cover.
 *
 * A bare tool kind is not acceptable: one "always allow" on a single `edit`
 * would silently authorize every later edit to every other file in the session.
 * So the scope is the concrete thing the user saw — the path, or the program
 * being run — and when nothing concrete is derivable we fall back to the title
 * rather than widening. An underivable scope must never become a kind-wide one.
 */
export function deriveScope(request: NormalizedPermissionRequest): string {
  if (PATH_KINDS.has(request.kind)) {
    const path = request.paths?.[0];
    if (path !== undefined && path !== '') return `path:${path}`;
  }
  if (request.kind === 'execute') {
    // The program token only. `git status` and `git push` share a scope, which
    // is the coarsest this may get — argument-level scoping is Phase 24's job
    // once there is a policy UI to express it.
    // ponytail: first-argv-token scope; per-argument rules when project policy lands.
    const program = (request.command ?? '').trim().split(/\s+/)[0];
    if (program !== undefined && program !== '') return `cmd:${program}`;
  }
  return `title:${request.title}`;
}

/**
 * `|` separates the two halves. `kind` is a closed enum of plain words, so it
 * can never contain the separator and the key stays unambiguous — and unlike a
 * control character it leaves this file readable to git, grep, and diffs.
 */
function scopeKey(request: NormalizedPermissionRequest): string {
  return `${request.kind}|${deriveScope(request)}`;
}

function kindKey(request: NormalizedPermissionRequest): string {
  return `${request.kind}|*`;
}

/**
 * Maps a chosen option kind to the answer to remember, or `undefined` when the
 * choice is a one-off. `*_once` and every unknown kind are one-offs, so an agent
 * inventing an option kind can never make the client stop asking.
 */
export function rememberedDecisionFor(optionKind: string): PermissionDecision | undefined {
  if (optionKind === 'allow_always') return 'allow';
  if (optionKind === 'reject_always') return 'reject';
  return undefined;
}

export function createPermissionEngine(options: PermissionEngineOptions = {}): PermissionEngine {
  /** sessionId → memory key → decision. Per-session and dies with the session. */
  const memory = new Map<string, Map<string, PermissionDecision>>();

  return {
    resolve(request) {
      const session = memory.get(request.sessionId);
      if (session !== undefined) {
        // Kind-wide first: it only exists because the user explicitly chose it,
        // so it is the broader promise and must win over a narrower stale one.
        const remembered = session.get(kindKey(request)) ?? session.get(scopeKey(request));
        if (remembered !== undefined) return remembered;
      }
      return options.projectPolicy?.(request) ?? 'ask';
    },

    remember(request, decision, breadth = 'scope') {
      let session = memory.get(request.sessionId);
      if (session === undefined) {
        session = new Map();
        memory.set(request.sessionId, session);
      }
      session.set(breadth === 'kind' ? kindKey(request) : scopeKey(request), decision);
    },

    forgetSession(sessionId) {
      memory.delete(sessionId);
    },

    scopeOf: deriveScope,
  };
}
