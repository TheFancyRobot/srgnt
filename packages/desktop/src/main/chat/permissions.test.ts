/**
 * @vitest-environment node
 */
import { existsSync, mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ChatPermissionRequestEvent, ChatSessionUpdateEvent } from '@srgnt/contracts';
import { isKnownSessionEventKind, readSessionEvent } from '@srgnt/contracts';
import { connectMockAgent, type Scenario } from '@srgnt/harness/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createChatPermissionHost, PERMISSION_DEADLINE_MS, type PermissionAuditKind } from './permissions.js';
import { ChatSessionController, type ChatConnectFn } from './session-controller.js';

/**
 * Two layers here, both required by the Validation Plan:
 *
 * 1. The host in isolation — pending-map liveness (cancel, deadline, late
 *    responses, concurrency) with fake timers.
 * 2. The host driven by the real mock agent through the real controller, where
 *    `expectOutcome`/`expectOptionId` assert *agent-side* that the user's
 *    decision actually crossed ACP. That is the only claim that matters.
 */

const OPTIONS = [
  { optionId: 'yes', name: 'Allow once', kind: 'allow_once' },
  { optionId: 'yes-always', name: 'Always allow', kind: 'allow_always' },
  { optionId: 'no', name: 'Reject', kind: 'reject_once' },
] as const;

interface Harness {
  readonly host: ReturnType<typeof createChatPermissionHost>;
  readonly pushed: ChatPermissionRequestEvent[];
  readonly closed: { requestId: string; reason: string }[];
  readonly audit: { kind: PermissionAuditKind; payload: Record<string, unknown> }[];
}

function makeHost(overrides: { deliver?: boolean; deadlineMs?: number } = {}): Harness {
  const pushed: ChatPermissionRequestEvent[] = [];
  const closed: { requestId: string; reason: string }[] = [];
  const audit: { kind: PermissionAuditKind; payload: Record<string, unknown> }[] = [];
  const host = createChatPermissionHost({
    sessionId: 'chat-mock-1',
    onRequest: (event) => {
      pushed.push(event);
      return overrides.deliver ?? true;
    },
    onClose: (requestId, reason) => closed.push({ requestId, reason }),
    onAudit: (kind, payload) => audit.push({ kind, payload }),
    ...(overrides.deadlineMs !== undefined ? { deadlineMs: overrides.deadlineMs } : {}),
  });
  return { host, pushed, closed, audit };
}

const ask = (host: Harness['host'], toolCall: Record<string, unknown> = {}) =>
  host.port.requestPermission({
    sessionId: 'acp-1',
    toolCall: { toolCallId: 't1', kind: 'edit', title: 'Edit answer.ts', ...toolCall },
    options: [...OPTIONS],
  } as never);

describe('chat permission host (pending map)', () => {
  it('blocks the agent until the renderer answers, then returns the chosen option', async () => {
    const { host, pushed } = makeHost();
    const pending = ask(host);

    // Nothing resolves on its own — default-ask is only real if the agent waits.
    let settled = false;
    void pending.then(() => (settled = true));
    await Promise.resolve();
    expect(settled).toBe(false);
    expect(host.pendingCount).toBe(1);

    host.respond(pushed[0]!.requestId, 'yes');
    await expect(pending).resolves.toEqual({ outcome: { outcome: 'selected', optionId: 'yes' } });
    expect(host.pendingCount).toBe(0);
  });

  it('a rejection maps to the reject option, never to a silent cancelled', async () => {
    const { host, pushed } = makeHost();
    const pending = ask(host);
    host.respond(pushed[0]!.requestId, 'no');
    await expect(pending).resolves.toEqual({ outcome: { outcome: 'selected', optionId: 'no' } });
  });

  it('an explicit cancel maps to the ACP cancelled outcome', async () => {
    const { host, pushed } = makeHost();
    const pending = ask(host);
    host.respond(pushed[0]!.requestId, undefined);
    await expect(pending).resolves.toEqual({ outcome: { outcome: 'cancelled' } });
  });

  it('remembers allow_always for the same scope and stops asking', async () => {
    const { host, pushed } = makeHost();
    const first = ask(host, { locations: [{ path: '/w/a.ts' }] });
    host.respond(pushed[0]!.requestId, 'yes-always');
    await first;

    // Same path: answered from memory, no second prompt.
    await expect(ask(host, { locations: [{ path: '/w/a.ts' }] })).resolves.toEqual({
      outcome: { outcome: 'selected', optionId: 'yes' },
    });
    expect(pushed).toHaveLength(1);

    // Different path, same kind: the promise was about a.ts, so ask again.
    void ask(host, { locations: [{ path: '/w/b.ts' }] });
    await Promise.resolve();
    expect(pushed).toHaveLength(2);
    host.cancelAll('disposed');
  });

  it('answers concurrent requests independently, routed by requestId', async () => {
    const { host, pushed } = makeHost();
    const first = ask(host, { locations: [{ path: '/w/a.ts' }] });
    const second = ask(host, { locations: [{ path: '/w/b.ts' }] });
    await Promise.resolve();
    expect(host.pendingCount).toBe(2);

    // Out of order on purpose.
    host.respond(pushed[1]!.requestId, 'no');
    host.respond(pushed[0]!.requestId, 'yes');
    await expect(first).resolves.toEqual({ outcome: { outcome: 'selected', optionId: 'yes' } });
    await expect(second).resolves.toEqual({ outcome: { outcome: 'selected', optionId: 'no' } });
    expect(host.pendingCount).toBe(0);
  });

  it('cancelAll resolves pending prompts as cancelled and leaks nothing', async () => {
    const { host, pushed, closed } = makeHost();
    const pending = ask(host);
    host.cancelAll('cancelled');
    await expect(pending).resolves.toEqual({ outcome: { outcome: 'cancelled' } });
    expect(host.pendingCount).toBe(0);
    expect(closed).toEqual([{ requestId: pushed[0]!.requestId, reason: 'cancelled' }]);
  });

  it('answers cancelled immediately when there is no renderer to ask', async () => {
    const { host, audit } = makeHost({ deliver: false });
    await expect(ask(host)).resolves.toEqual({ outcome: { outcome: 'cancelled' } });
    expect(host.pendingCount).toBe(0);
    expect(audit.at(-1)?.payload.reason).toBe('no_renderer');
  });

  it('answers cancelled when the agent offers no options at all', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { host, pushed } = makeHost();
    await expect(
      host.port.requestPermission({
        sessionId: 'acp-1',
        toolCall: { toolCallId: 't1', kind: 'other', title: 'Mystery' },
        options: [],
      } as never),
    ).resolves.toEqual({ outcome: { outcome: 'cancelled' } });
    expect(pushed).toHaveLength(0);
    warn.mockRestore();
  });

  it('never remembers an unknown option kind', async () => {
    const { host, pushed } = makeHost();
    const pending = host.port.requestPermission({
      sessionId: 'acp-1',
      toolCall: { toolCallId: 't1', kind: 'edit', title: 'Edit', locations: [{ path: '/w/a.ts' }] },
      options: [{ optionId: 'weird', name: 'Trust me forever', kind: 'always_trust_me' }],
    } as never);
    host.respond(pushed[0]!.requestId, 'weird');
    await expect(pending).resolves.toEqual({ outcome: { outcome: 'selected', optionId: 'weird' } });

    void ask(host, { locations: [{ path: '/w/a.ts' }] });
    await Promise.resolve();
    expect(pushed).toHaveLength(2);
    host.cancelAll('disposed');
  });

  it('ignores a response for an unknown requestId instead of crashing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { host } = makeHost();
    expect(() => host.respond('not-a-request', 'yes')).not.toThrow();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('derives the execute scope from the command, not the whole tool call', async () => {
    const { host, pushed } = makeHost();
    const pending = ask(host, { kind: 'execute', title: 'Run', rawInput: { command: 'pnpm test --watch' } });
    expect(pushed[0]!.command).toBe('pnpm test --watch');
    host.respond(pushed[0]!.requestId, undefined);
    await pending;
  });
});

describe('chat permission host (deadline)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('expires an unanswered prompt: cancelled, no leak, prompt dismissed, audited', async () => {
    const { host, pushed, closed, audit } = makeHost({ deadlineMs: 1000 });
    const pending = ask(host);
    await vi.advanceTimersByTimeAsync(1001);

    await expect(pending).resolves.toEqual({ outcome: { outcome: 'cancelled' } });
    expect(host.pendingCount).toBe(0);
    expect(closed).toEqual([{ requestId: pushed[0]!.requestId, reason: 'expired' }]);
    expect(audit.at(-1)).toMatchObject({
      kind: 'client/permission_decision',
      payload: { outcome: 'cancelled', reason: 'expired' },
    });
  });

  it('ignores a response that arrives after expiry (no double-resolve)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { host, pushed, audit } = makeHost({ deadlineMs: 1000 });
    const pending = ask(host);
    await vi.advanceTimersByTimeAsync(1001);
    const auditCount = audit.length;

    host.respond(pushed[0]!.requestId, 'yes');
    await expect(pending).resolves.toEqual({ outcome: { outcome: 'cancelled' } });
    expect(audit).toHaveLength(auditCount);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('ships a deadline generous enough for a human but short of forever', () => {
    expect(PERMISSION_DEADLINE_MS).toBe(600_000);
  });
});

// ─── End to end through the real controller + real mock agent ───

const baseScenario: Scenario = {
  name: 'permission-round-trip',
  sessionId: 'mock-session-1',
  stopReason: 'end_turn',
  initialize: {
    loadSession: false,
    resumeSession: false,
    images: false,
    modes: [],
    agentName: 'mock',
    agentVersion: '0.0.0',
  },
  directives: [],
};

const scenarioWith = (directives: Scenario['directives']): Scenario => ({ ...baseScenario, directives });

const portsAwareConnect =
  (scenario: Scenario): ChatConnectFn =>
  async (_target, ports) => {
    const { connection } = await connectMockAgent(scenario, { ports });
    return {
      connection,
      harness: { id: 'mock', name: 'Mock Agent', quirks: [] },
      cleanup: async () => connection.close(),
    };
  };

/** Answers the first prompt the controller pushes with `pick(event)`. */
function autoAnswer(pick: (event: ChatPermissionRequestEvent) => string | undefined) {
  const seen: ChatPermissionRequestEvent[] = [];
  let controller: ChatSessionController | undefined;
  return {
    seen,
    bind: (instance: ChatSessionController) => (controller = instance),
    onPermissionRequest: (event: ChatPermissionRequestEvent): boolean => {
      seen.push(event);
      // The renderer round-trip is async; mimic that rather than answering
      // inside the push, so the pending map is genuinely exercised.
      setTimeout(() => controller?.respondToPermission(event.sessionId, event.requestId, pick(event)), 0);
      return true;
    },
  };
}

describe('permission round-trips through the controller and the mock agent', () => {
  const updates: ChatSessionUpdateEvent[] = [];

  beforeEach(() => {
    updates.length = 0;
  });

  it('an allow decision reaches the agent over ACP', async () => {
    const answer = autoAnswer(() => 'allow-1');
    const controller = new ChatSessionController({
      connect: portsAwareConnect(
        scenarioWith([
          {
            type: 'request_permission',
            toolCallId: 'p1',
            title: 'Edit answer.ts',
            options: [
              { optionId: 'allow-1', name: 'Allow', kind: 'allow_once' },
              { optionId: 'reject-1', name: 'Reject', kind: 'reject_once' },
            ],
            // Agent-side assertion: this is the claim that matters.
            expectOutcome: 'selected',
            expectOptionId: 'allow-1',
          },
        ]),
      ),
      onUpdate: (event) => updates.push(event),
      onPermissionRequest: answer.onPermissionRequest,
    });
    answer.bind(controller);

    const session = await controller.newSession('mock');
    // The mock records assertion failures instead of throwing, so a clean
    // `end_turn` is the proof the expected option actually arrived.
    await expect(controller.prompt(session.sessionId, 'go')).resolves.toEqual({ stopReason: 'end_turn' });
    expect(answer.seen).toHaveLength(1);
    expect(answer.seen[0]!.title).toBe('Edit answer.ts');

    const events = controller.sessionEvents(session.sessionId);
    const kinds = events.map((event) => event.kind);
    expect(kinds).toContain('client/permission_request');
    expect(kinds).toContain('client/permission_decision');
    // The in-memory stream uses the real envelope, so Phase 24 persistence is a
    // sink swap rather than a reshape.
    for (const event of events) {
      expect(readSessionEvent(event).success).toBe(true);
      expect(isKnownSessionEventKind(event.kind)).toBe(true);
    }
    expect(events.map((event) => event.seq)).toEqual(events.map((_, index) => index));

    await controller.dispose(session.sessionId);
  });

  it('a reject decision reaches the agent over ACP', async () => {
    const answer = autoAnswer(() => 'reject-1');
    const controller = new ChatSessionController({
      connect: portsAwareConnect(
        scenarioWith([
          {
            type: 'request_permission',
            toolCallId: 'p1',
            title: 'Delete everything',
            options: [
              { optionId: 'allow-1', name: 'Allow', kind: 'allow_once' },
              { optionId: 'reject-1', name: 'Reject', kind: 'reject_once' },
            ],
            expectOutcome: 'selected',
            expectOptionId: 'reject-1',
          },
        ]),
      ),
      onUpdate: (event) => updates.push(event),
      onPermissionRequest: answer.onPermissionRequest,
    });
    answer.bind(controller);
    const session = await controller.newSession('mock');
    await expect(controller.prompt(session.sessionId, 'go')).resolves.toEqual({ stopReason: 'end_turn' });
    await controller.dispose(session.sessionId);
  });

  it('allow_always is not asked twice in the same session', async () => {
    const answer = autoAnswer((event) => (event.title === 'Edit answer.ts' ? 'allow-always' : 'allow-1'));
    const permissionDirective = {
      type: 'request_permission' as const,
      toolCallId: 'p1',
      title: 'Edit answer.ts',
      options: [
        { optionId: 'allow-1', name: 'Allow', kind: 'allow_once' as const },
        { optionId: 'allow-always', name: 'Always allow', kind: 'allow_always' as const },
      ],
      expectOutcome: 'selected' as const,
    };
    const controller = new ChatSessionController({
      connect: portsAwareConnect(scenarioWith([permissionDirective, { ...permissionDirective }])),
      onUpdate: (event) => updates.push(event),
      onPermissionRequest: answer.onPermissionRequest,
    });
    answer.bind(controller);
    const session = await controller.newSession('mock');
    await expect(controller.prompt(session.sessionId, 'go')).resolves.toEqual({ stopReason: 'end_turn' });
    // Two agent requests, one prompt: the second was answered from memory.
    expect(answer.seen).toHaveLength(1);

    const decisions = controller
      .sessionEvents(session.sessionId)
      .filter((event) => event.kind === 'client/permission_decision');
    expect(decisions).toHaveLength(2);
    expect((decisions[1]!.payload as { source?: string }).source).toBe('remembered');

    await controller.dispose(session.sessionId);
  });

  it('fs/write_text_file now exists and is gated by the same prompt', async () => {
    const cwd = realpathSync(mkdtempSync(join(tmpdir(), 'srgnt-chat-write-')));
    const answer = autoAnswer(() => 'reject_once');
    let ports: { fs?: { writeTextFile?: (params: { path: string; content: string }) => Promise<void> } } = {};
    const controller = new ChatSessionController({
      connect: async (target, given) => {
        ports = given;
        return portsAwareConnect(scenarioWith([]))(target, given);
      },
      onUpdate: () => {},
      getCwd: () => cwd,
      onPermissionRequest: answer.onPermissionRequest,
    });
    answer.bind(controller);
    const session = await controller.newSession('mock');

    // STEP-23-02 shipped this method absent on purpose — the harness advertises
    // the write capability from its presence — and the authorizer is what turns
    // it on. That authorizer is the permission engine, so a refused write is a
    // typed refusal, not a silent no-op.
    expect(ports.fs?.writeTextFile).toBeTypeOf('function');
    await expect(
      ports.fs!.writeTextFile!({ path: join(cwd, 'out.txt'), content: 'nope' }),
    ).rejects.toThrow(/not authorized/i);
    expect(existsSync(join(cwd, 'out.txt'))).toBe(false);
    expect(answer.seen.at(-1)?.kind).toBe('edit');

    await controller.dispose(session.sessionId);
    rmSync(cwd, { recursive: true, force: true });
  });
});
