import type { ChatPermissionCloseReason, ChatPermissionRequestEvent } from '@srgnt/contracts';
import type { ClientPorts } from '@srgnt/harness';
import {
  createPermissionEngine,
  rememberedDecisionFor,
  type NormalizedPermissionRequest,
  type PermissionEngine,
} from '@srgnt/runtime';

/**
 * The chat surface's `PermissionPort` (PHASE-23, STEP-23-03) — the real
 * round-trip that replaces STEP-23-01's `autoApprovePermission` placeholder.
 *
 * Shape: ACP request → normalize → `engine.resolve` → if `ask`, push to the
 * renderer and *block the JSON-RPC response* until the user answers. The agent
 * is genuinely waiting on us, which is the whole point: default-ask is only real
 * if the agent cannot proceed while we ask.
 *
 * Liveness is the hard part, so the pending map is the single source of truth:
 * every entry has exactly one resolver and exactly one deadline timer, and every
 * exit path (user answer, turn cancel, session dispose, expiry, undeliverable
 * push) goes through {@link settle}. A late or duplicate response finds no entry
 * and is dropped. Nothing else may resolve a request.
 *
 * Measured reality (DEC-0018, spike probe 1): Pi never sends
 * `session/request_permission` — it self-approves in-process — so the mock agent
 * is the only thing that exercises this end to end. That is why the renderer
 * also shows a `permission-routing-gaps` trust badge: for Pi, none of this runs.
 */

/** Default time a prompt may stay unanswered before the agent gets `cancelled`. */
export const PERMISSION_DEADLINE_MS = 10 * 60 * 1000;

/** Audit records this host appends to the session event stream. */
export type PermissionAuditKind = 'client/permission_request' | 'client/permission_decision';

export interface ChatPermissionHostOptions {
  /** The chat-local handle. Every pushed frame and memory key is scoped to it. */
  readonly sessionId: string;
  /**
   * Pushes a prompt to the renderer. Returns `false` when there is no live
   * window: an undeliverable prompt must fail closed (cancelled), not hang.
   */
  readonly onRequest: (event: ChatPermissionRequestEvent) => boolean;
  /** Tells the renderer to dismiss a prompt main already resolved. */
  readonly onClose: (requestId: string, reason: ChatPermissionCloseReason) => void;
  /** Appends to the session's in-memory `SSessionEvent` stream. */
  readonly onAudit: (kind: PermissionAuditKind, payload: Record<string, unknown>) => void;
  /** Injected in tests. Defaults to a fresh default-ask engine. */
  readonly engine?: PermissionEngine;
  /** Injected in tests (fake timers work too). */
  readonly deadlineMs?: number;
}

export interface ChatPermissionHost {
  /** Hand this to `AcpAgentConnection.connect({ ports })`. */
  readonly port: ClientPorts['permission'];
  /** Routes a renderer answer. Unknown/late ids are ignored (warned, never thrown). */
  respond(requestId: string, optionId: string | undefined): void;
  /**
   * Resolves every pending request as `cancelled`. Used for turn cancel and
   * session dispose — the ACP behavior when a turn goes away underneath a prompt.
   */
  cancelAll(reason: ChatPermissionCloseReason): void;
  /**
   * Gate for `fs/write_text_file`. Its presence is what turns the write
   * capability on at all (STEP-23-02), so the engine — not the port's absence —
   * is now what keeps writes honest.
   */
  authorizeWrite(path: string): Promise<boolean>;
  /** Live pending requests. Asserted in tests to prove nothing leaks. */
  readonly pendingCount: number;
}

interface Pending {
  readonly resolve: (optionId: string | undefined) => void;
  readonly timer: ReturnType<typeof setTimeout>;
  readonly request: NormalizedPermissionRequest;
  /** Option kind by id, so an answer can be mapped back to a remembered decision. */
  readonly optionKinds: ReadonlyMap<string, string>;
}

/** ACP `ToolCallUpdate.locations` entries; only `path` is load-bearing here. */
function pathsOf(toolCall: { locations?: readonly { path?: string }[] | null }): string[] {
  return (toolCall.locations ?? [])
    .map((location) => location?.path)
    .filter((path): path is string => typeof path === 'string' && path !== '');
}

/**
 * `rawInput` is agent-defined and untyped, so this reads the two conventional
 * command carriers and gives up otherwise rather than guessing. A missing
 * command only costs scope precision — it never widens an `allow_always`,
 * because `deriveScope` falls back to the title.
 */
function commandOf(toolCall: { rawInput?: unknown }): string | undefined {
  const raw = toolCall.rawInput;
  if (raw === null || typeof raw !== 'object') return undefined;
  const record = raw as Record<string, unknown>;
  if (typeof record.command === 'string') return record.command;
  if (Array.isArray(record.command)) return record.command.filter((part) => typeof part === 'string').join(' ');
  return undefined;
}

export function createChatPermissionHost(options: ChatPermissionHostOptions): ChatPermissionHost {
  const engine = options.engine ?? createPermissionEngine();
  const deadlineMs = options.deadlineMs ?? PERMISSION_DEADLINE_MS;
  const pending = new Map<string, Pending>();
  let counter = 0;

  /** The one exit path. Removes the entry, clears its timer, resolves once. */
  const settle = (requestId: string, optionId: string | undefined): Pending | undefined => {
    const entry = pending.get(requestId);
    if (entry === undefined) return undefined;
    pending.delete(requestId);
    clearTimeout(entry.timer);
    entry.resolve(optionId);
    return entry;
  };

  /**
   * Blocks until an answer arrives. Every resolution — user, cancel, expiry,
   * undeliverable push — audits a decision, so the record has no gaps.
   */
  const ask = (
    request: NormalizedPermissionRequest,
    options_: readonly { optionId: string; name: string; kind: string }[],
    requestId: string,
  ): Promise<string | undefined> => {
    const optionKinds = new Map(options_.map((option) => [option.optionId, option.kind]));
    return new Promise<string | undefined>((resolve) => {
      const timer = setTimeout(() => {
        if (settle(requestId, undefined) === undefined) return;
        options.onClose(requestId, 'expired');
        options.onAudit('client/permission_decision', {
          requestId,
          outcome: 'cancelled',
          reason: 'expired',
        });
      }, deadlineMs);
      // Node keeps the process alive for a pending timer; a permission prompt
      // must not be the reason the app refuses to quit.
      timer.unref?.();
      pending.set(requestId, { resolve, timer, request, optionKinds });

      let delivered = false;
      try {
        delivered = options.onRequest({
          sessionId: options.sessionId,
          requestId,
          kind: request.kind,
          title: request.title,
          paths: [...(request.paths ?? [])],
          ...(request.command !== undefined ? { command: request.command } : {}),
          options: options_.map((option) => ({ ...option })),
        });
      } catch (cause) {
        // A throw here (window destroyed between the isDestroyed check and the
        // send) must be undelivered, not an escaping executor throw: that would
        // reject the promise while the map entry and its 10-minute timer lived
        // on, and `settle` would no longer be the single exit.
        console.warn('[chat] permission prompt could not be delivered:', cause);
      }
      // No window to ask through: fail closed immediately instead of leaving the
      // agent blocked for the full deadline on a prompt nobody will ever see.
      if (!delivered && settle(requestId, undefined) !== undefined) {
        options.onAudit('client/permission_decision', {
          requestId,
          outcome: 'cancelled',
          reason: 'no_renderer',
        });
      }
    });
  };

  /**
   * Resolve → auto-answer or prompt. Returns the chosen optionId, or `undefined`
   * for a cancel. Shared by the ACP port and the fs-write gate so both obey the
   * same memory and produce the same audit trail.
   */
  const decide = async (
    request: NormalizedPermissionRequest,
    options_: readonly { optionId: string; name: string; kind: string }[],
  ): Promise<string | undefined> => {
    // Allocated before the request audit so both records carry it: with several
    // prompts in flight the stream can interleave (request A, request B,
    // decision B, decision A), and without a shared id the trail cannot say
    // which decision answered which request.
    const requestId = `${options.sessionId}-perm-${++counter}`;
    options.onAudit('client/permission_request', {
      requestId,
      kind: request.kind,
      title: request.title,
      paths: [...(request.paths ?? [])],
      ...(request.command !== undefined ? { command: request.command } : {}),
      scope: engine.scopeOf(request),
      options: options_.map((option) => option.optionId),
    });

    const resolution = engine.resolve(request);
    if (resolution !== 'ask') {
      // An auto-answer must still pick a *real* option: the agent only
      // understands ids it offered. Prefer the `once` variant so replaying a
      // remembered decision never silently re-broadens it.
      const match =
        options_.find((option) => option.kind === `${resolution}_once`) ??
        options_.find((option) => option.kind.startsWith(resolution));
      options.onAudit('client/permission_decision', {
        requestId,
        outcome: match !== undefined ? 'selected' : 'cancelled',
        optionId: match?.optionId,
        decision: resolution,
        source: 'remembered',
        scope: engine.scopeOf(request),
      });
      return match?.optionId;
    }

    // Degenerate agent: nothing to choose from, so there is nothing to ask.
    if (options_.length === 0) {
      console.warn('[chat] permission request had no options; answering cancelled');
      options.onAudit('client/permission_decision', { requestId, outcome: 'cancelled', reason: 'no_options' });
      return undefined;
    }

    const optionId = await ask(request, options_, requestId);
    return optionId;
  };

  const port: ClientPorts['permission'] = {
    async requestPermission(params) {
      const toolCall = params.toolCall as {
        kind?: string | null;
        title?: string | null;
        locations?: readonly { path?: string }[] | null;
        rawInput?: unknown;
      };
      const paths = pathsOf(toolCall);
      const command = commandOf(toolCall);
      const request: NormalizedPermissionRequest = {
        sessionId: options.sessionId,
        kind: toolCall.kind ?? 'other',
        title: toolCall.title ?? 'Permission required',
        paths,
        ...(command !== undefined ? { command } : {}),
      };
      const optionId = await decide(
        request,
        params.options.map((option) => ({
          optionId: option.optionId,
          name: option.name,
          kind: String(option.kind),
        })),
      );
      return optionId === undefined
        ? { outcome: { outcome: 'cancelled' as const } }
        : { outcome: { outcome: 'selected' as const, optionId } };
    },
  };

  return {
    port,

    respond(requestId, optionId) {
      const entry = settle(requestId, optionId);
      if (entry === undefined) {
        // Late, duplicate, or fabricated: the pending map is authoritative.
        console.warn(`[chat] ignoring permission response for unknown request '${requestId}'`);
        return;
      }
      const chosenKind = optionId === undefined ? undefined : entry.optionKinds.get(optionId);
      const remembered = chosenKind === undefined ? undefined : rememberedDecisionFor(chosenKind);
      if (remembered !== undefined) {
        // Scoped, never kind-wide: the user answered about *this* path/command,
        // and a broader promise must be a separate, explicit choice.
        engine.remember(entry.request, remembered);
      }
      options.onAudit('client/permission_decision', {
        requestId,
        outcome: optionId === undefined ? 'cancelled' : 'selected',
        optionId,
        optionKind: chosenKind,
        source: 'user',
        ...(remembered !== undefined ? { remembered, scope: engine.scopeOf(entry.request) } : {}),
      });
    },

    cancelAll(reason) {
      for (const requestId of [...pending.keys()]) {
        if (settle(requestId, undefined) === undefined) continue;
        options.onClose(requestId, reason);
        options.onAudit('client/permission_decision', { requestId, outcome: 'cancelled', reason });
      }
      if (reason === 'disposed') engine.forgetSession(options.sessionId);
    },

    async authorizeWrite(path) {
      // Synthesized as an `edit` on the canonical path the guard already
      // resolved, so it shares scope keys with the agent's own edit tool calls:
      // one "always allow edits to answer.ts" covers both routes to that file.
      const optionId = await decide(
        {
          sessionId: options.sessionId,
          kind: 'edit',
          title: `Write ${path}`,
          paths: [path],
        },
        [
          { optionId: 'allow_once', name: 'Allow once', kind: 'allow_once' },
          { optionId: 'allow_always', name: 'Always allow this file', kind: 'allow_always' },
          { optionId: 'reject_once', name: 'Refuse', kind: 'reject_once' },
          { optionId: 'reject_always', name: 'Always refuse this file', kind: 'reject_always' },
        ],
      );
      return optionId !== undefined && optionId.startsWith('allow');
    },

    get pendingCount() {
      return pending.size;
    },
  };
}
