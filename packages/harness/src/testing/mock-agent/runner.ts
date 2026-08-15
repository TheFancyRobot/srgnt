import { RequestError } from '@agentclientprotocol/sdk';
import type {
  Agent,
  AgentSideConnection,
  AuthenticateRequest,
  AuthenticateResponse,
  CancelNotification,
  ContentBlock,
  InitializeRequest,
  InitializeResponse,
  LoadSessionRequest,
  LoadSessionResponse,
  NewSessionRequest,
  NewSessionResponse,
  PromptRequest,
  PromptResponse,
  ResumeSessionRequest,
  ResumeSessionResponse,
  SetSessionModeRequest,
  SetSessionModeResponse,
} from '@agentclientprotocol/sdk';
import type { Directive, InitCapabilities, Scenario, UnimplementedMethod } from './scenario.js';

/**
 * Side effects the runner cannot perform itself, injected so the *same* scenario
 * runs identically in-process (message-level pipe) and as a real stdio process.
 */
export interface RunnerHooks {
  /**
   * Abrupt process death for a `crash` directive. The stdio bin passes
   * `process.exit`; the in-process path closes the agent's writable so the
   * client wrapper observes a `ConnectionLost` exactly as it would for a dead
   * subprocess.
   */
  onCrash: (exitCode: number) => void | Promise<void>;
  /**
   * Writes raw, un-framed bytes onto the wire for an `emit_malformed`
   * directive. Only the stdio bin (real ndjson transport) can do this
   * faithfully; the in-process message-level pipe leaves it undefined and the
   * directive is skipped (malformed-frame tolerance is proven via the bin).
   */
  rawWrite?: (raw: string) => void | Promise<void>;
  /** Deterministic delay seam; defaults to real `setTimeout`. */
  delay?: (ms: number) => Promise<void>;
  /**
   * Reports the accumulated `expect_*` failures once a turn's directives have
   * run, before the `PromptResponse` goes back on the wire. In-process tests
   * read {@link MockAgent.assertionErrors} directly; a driver on the far side of
   * a spawned process (the E2E suite) has no such handle, so the stdio bin uses
   * this to persist them somewhere the driver can read.
   */
  onTurnEnd?: (assertionErrors: readonly string[]) => void | Promise<void>;
}

const realDelay = (ms: number): Promise<void> =>
  ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();

const CHANNEL_UPDATE = {
  agent: 'agent_message_chunk',
  thought: 'agent_thought_chunk',
  user: 'user_message_chunk',
} as const;

/** Concatenates the text of an incoming prompt's content blocks. */
function promptText(prompt: readonly ContentBlock[]): string {
  return prompt
    .map((block) => (block.type === 'text' ? block.text : ''))
    .join('');
}

function buildInitializeResponse(
  requestedProtocolVersion: number,
  caps: InitCapabilities,
  authMethods: InitializeResponse['authMethods'],
): InitializeResponse {
  return {
    protocolVersion: requestedProtocolVersion,
    agentInfo: { name: caps.agentName, version: caps.agentVersion },
    // Advertised verbatim, extension fields included: the client's normalizer is
    // what decides whether a method is machine-actionable, and trimming the
    // payload here would decide it for them.
    ...(authMethods !== undefined && authMethods.length > 0 ? { authMethods } : {}),
    agentCapabilities: {
      loadSession: caps.loadSession,
      ...(caps.resumeSession ? { sessionCapabilities: { resume: {} } } : {}),
      promptCapabilities: { image: caps.images },
    },
  };
}

/**
 * The scriptable mock ACP agent (the fuller, standalone superset of the small
 * inline `MockAgent` in `acp/connection.test.ts`). It implements the SDK's
 * {@link Agent} interface and, on each prompt turn, replays a {@link Scenario}'s
 * directives against the live {@link AgentSideConnection} — emitting update
 * notifications, driving client-service round-trips (permission / terminal /
 * fs), and modelling failure paths (crash, malformed frames).
 *
 * It is deterministic: no randomness, no wall-clock reliance beyond the optional
 * scripted `sleep`/`delayMs` (which use the injected {@link RunnerHooks.delay}).
 */
export class MockAgent implements Agent {
  /** The last prompt the agent received (for assertions / recording). */
  lastPrompt: string | undefined;
  /** Assertion failures collected from `expect_*` directives (empty = all held). */
  readonly assertionErrors: string[] = [];
  /** Directive `type`s actually executed — coverage evidence for tests. */
  readonly executed: Directive['type'][] = [];
  /**
   * The method id `authenticate` was last called with, or `undefined` while the
   * agent is unauthenticated. Per PROCESS, which is the honest model: a real
   * agent's login outlives one session but not one launch, and srgnt's retry
   * after an external login is a fresh spawn either way.
   */
  authenticatedWith: string | undefined;

  private readonly delay: (ms: number) => Promise<void>;
  /** Pending `expect_cancel` resolvers, keyed by sessionId so cancelling one
   *  session never unblocks another's waiter. */
  private readonly cancelWaiters = new Map<string, Set<() => void>>();
  /** Sessions cancelled *during the current prompt turn* — cleared at each
   *  prompt() start so a later turn on the same session isn't spuriously cancelled. */
  private readonly cancelledTurns = new Set<string>();

  constructor(
    private readonly conn: AgentSideConnection,
    private readonly scenario: Scenario,
    private readonly hooks: RunnerHooks,
  ) {
    this.delay = hooks.delay ?? realDelay;
  }

  async initialize(params: InitializeRequest): Promise<InitializeResponse> {
    return buildInitializeResponse(
      params.protocolVersion,
      this.scenario.initialize,
      this.scenario.authRequired?.methods as InitializeResponse['authMethods'],
    );
  }

  async authenticate(params: AuthenticateRequest): Promise<AuthenticateResponse> {
    // Unconditionally `{}` without an `authRequired` block — the substrate's
    // long-standing behaviour, which every capability-path scenario relies on.
    if (this.scenario.authRequired === undefined) return {};
    const known = this.scenario.authRequired.methods;
    // An id nobody advertised is a client bug, and answering `{}` to it would
    // let a wrong method id look like a successful login.
    if (known.length > 0 && !known.some((method) => method.id === params.methodId)) {
      throw RequestError.invalidParams({ methodId: params.methodId }, 'unknown auth method');
    }
    this.authenticatedWith = params.methodId;
    return {};
  }

  async newSession(_params: NewSessionRequest): Promise<NewSessionResponse> {
    // The real shape: JSON-RPC -32000, which is what `RequestError.authRequired`
    // puts on the wire in @agentclientprotocol/sdk 1.2.1.
    if (this.scenario.authRequired?.gateSessionNew === true && this.authenticatedWith === undefined) {
      throw RequestError.authRequired(
        { methods: this.scenario.authRequired.methods.map((method) => method.id) },
        'log in first',
      );
    }
    return { sessionId: this.scenario.sessionId, ...this.modeState() };
  }

  /**
   * `session/load` — replays `loadReplay` as `session/update` notifications
   * BEFORE responding, which is what makes a client's resume-by-replay path
   * reachable at all (the SDK's own `MockAgent` no-op could only prove the call
   * was made). The response carries the same mode block `session/new` does, so
   * a resumed Pi-shaped session gets its thinking-level selector back.
   */
  async loadSession(params: LoadSessionRequest): Promise<LoadSessionResponse> {
    this.refuseIfUnimplemented('session/load');
    for (const directive of this.scenario.loadReplay) {
      await this.execute(params.sessionId, directive);
    }
    return this.modeState();
  }

  async resumeSession(_params: ResumeSessionRequest): Promise<ResumeSessionResponse> {
    this.refuseIfUnimplemented('session/resume');
    return {};
  }

  /** The advertised mode block, or `{}` when the scenario advertises none. */
  private modeState(): { modes?: { currentModeId: string; availableModes: { id: string; name: string }[] } } {
    const modes = this.scenario.initialize.modes;
    if (modes.length === 0) return {};
    return {
      modes: {
        currentModeId: modes[0]!,
        availableModes: modes.map((id) => ({ id, name: id })),
      },
    };
  }

  /**
   * Answers `-32601` for a method the scenario advertised but declared
   * unimplemented. Thrown, not returned: the SDK turns a `RequestError` into
   * the JSON-RPC error response, which is exactly what a real mismatched
   * harness puts on the wire.
   */
  private refuseIfUnimplemented(method: UnimplementedMethod): void {
    if (this.scenario.unimplementedMethods.includes(method)) {
      throw RequestError.methodNotFound(method);
    }
  }

  async setSessionMode(params: SetSessionModeRequest): Promise<SetSessionModeResponse> {
    await this.conn.sessionUpdate({
      sessionId: params.sessionId,
      update: { sessionUpdate: 'current_mode_update', currentModeId: params.modeId },
    });
    return {};
  }

  async prompt(params: PromptRequest): Promise<PromptResponse> {
    // Each prompt is a fresh turn: a cancel from a previous turn must not carry
    // over and mark this one cancelled.
    this.cancelledTurns.delete(params.sessionId);
    this.lastPrompt = promptText(params.prompt);
    for (const directive of this.scenario.directives) {
      await this.execute(params.sessionId, directive);
    }
    await this.hooks.onTurnEnd?.(this.assertionErrors);
    if (this.cancelledTurns.has(params.sessionId)) {
      return { stopReason: 'cancelled' };
    }
    return { stopReason: this.scenario.stopReason };
  }

  async cancel(params: CancelNotification): Promise<void> {
    this.cancelledTurns.add(params.sessionId);
    // Resolve only this session's pending expect_cancel waiters, then drop them.
    const waiters = this.cancelWaiters.get(params.sessionId);
    if (waiters !== undefined) {
      this.cancelWaiters.delete(params.sessionId);
      for (const waiter of waiters) {
        waiter();
      }
    }
  }

  private async execute(sessionId: string, directive: Directive): Promise<void> {
    this.executed.push(directive.type);
    switch (directive.type) {
      case 'emit_chunks': {
        const sessionUpdate = CHANNEL_UPDATE[directive.channel];
        for (const text of directive.chunks) {
          await this.conn.sessionUpdate({
            sessionId,
            update: { sessionUpdate, content: { type: 'text', text } },
          });
          if (directive.delayMs > 0) {
            await this.delay(directive.delayMs);
          }
        }
        return;
      }
      case 'tool_call': {
        await this.conn.sessionUpdate({
          sessionId,
          update: {
            sessionUpdate: 'tool_call',
            toolCallId: directive.toolCallId,
            title: directive.title,
            kind: directive.kind,
            status: directive.status,
            ...(directive.content ? { content: directive.content as never } : {}),
            ...(directive.rawInput !== undefined ? { rawInput: directive.rawInput } : {}),
          },
        });
        return;
      }
      case 'tool_call_update': {
        await this.conn.sessionUpdate({
          sessionId,
          update: {
            sessionUpdate: 'tool_call_update',
            toolCallId: directive.toolCallId,
            ...(directive.status ? { status: directive.status } : {}),
            ...(directive.title ? { title: directive.title } : {}),
            ...(directive.content ? { content: directive.content as never } : {}),
            ...(directive.rawOutput !== undefined ? { rawOutput: directive.rawOutput } : {}),
          },
        });
        return;
      }
      case 'plan': {
        await this.conn.sessionUpdate({
          sessionId,
          update: { sessionUpdate: 'plan', entries: directive.entries.map((e) => ({ ...e })) },
        });
        return;
      }
      case 'advertise_commands': {
        await this.conn.sessionUpdate({
          sessionId,
          update: {
            sessionUpdate: 'available_commands_update',
            availableCommands: directive.commands.map((c) => ({
              name: c.name,
              description: c.description,
            })),
          },
        });
        return;
      }
      case 'set_mode': {
        await this.conn.sessionUpdate({
          sessionId,
          update: { sessionUpdate: 'current_mode_update', currentModeId: directive.modeId },
        });
        return;
      }
      case 'request_permission': {
        const response = await this.conn.requestPermission({
          sessionId,
          toolCall: {
            toolCallId: directive.toolCallId,
            title: directive.title,
            ...(directive.kind !== undefined ? { kind: directive.kind } : {}),
            ...(directive.locations !== undefined
              ? { locations: directive.locations.map((location) => ({ ...location })) }
              : {}),
            ...(directive.rawInput !== undefined ? { rawInput: directive.rawInput } : {}),
          },
          options: directive.options.map((o) => ({
            optionId: o.optionId,
            name: o.name,
            kind: o.kind,
          })),
        });
        this.assertPermission(directive, response.outcome);
        return;
      }
      case 'use_terminal': {
        const terminal = await this.conn.createTerminal({
          sessionId,
          command: directive.command,
          args: [...directive.args],
        });
        try {
          await terminal.waitForExit();
          const out = await terminal.currentOutput();
          if (
            directive.expectOutputContains !== undefined &&
            !out.output.includes(directive.expectOutputContains)
          ) {
            this.assertionErrors.push(
              `use_terminal: expected output to contain ${JSON.stringify(
                directive.expectOutputContains,
              )} but got ${JSON.stringify(out.output)}`,
            );
          }
        } finally {
          await terminal.release();
        }
        return;
      }
      case 'read_file': {
        const result = await this.conn.readTextFile({ sessionId, path: directive.path });
        if (
          directive.expectContentContains !== undefined &&
          !result.content.includes(directive.expectContentContains)
        ) {
          this.assertionErrors.push(
            `read_file: expected content to contain ${JSON.stringify(
              directive.expectContentContains,
            )} but got ${JSON.stringify(result.content)}`,
          );
        }
        return;
      }
      case 'sleep': {
        await this.delay(directive.ms);
        return;
      }
      case 'expect_prompt': {
        if (this.lastPrompt === undefined || !this.lastPrompt.includes(directive.contains)) {
          this.assertionErrors.push(
            `expect_prompt: prompt ${JSON.stringify(this.lastPrompt)} did not contain ${JSON.stringify(
              directive.contains,
            )}`,
          );
        }
        return;
      }
      case 'expect_cancel': {
        await this.waitForCancel(sessionId, directive.timeoutMs);
        return;
      }
      case 'emit_malformed': {
        if (this.hooks.rawWrite !== undefined) {
          await this.hooks.rawWrite(directive.raw);
        }
        return;
      }
      case 'crash': {
        await this.hooks.onCrash(directive.exitCode);
        return;
      }
    }
  }

  private assertPermission(
    directive: Extract<Directive, { type: 'request_permission' }>,
    outcome: { outcome: 'selected'; optionId: string } | { outcome: 'cancelled' },
  ): void {
    if (directive.expectOutcome !== undefined && outcome.outcome !== directive.expectOutcome) {
      this.assertionErrors.push(
        `request_permission: expected outcome ${directive.expectOutcome} but got ${outcome.outcome}`,
      );
    }
    if (
      directive.expectOptionId !== undefined &&
      (outcome.outcome !== 'selected' || outcome.optionId !== directive.expectOptionId)
    ) {
      this.assertionErrors.push(
        `request_permission: expected optionId ${directive.expectOptionId} but got ${JSON.stringify(
          outcome,
        )}`,
      );
    }
  }

  private async waitForCancel(sessionId: string, timeoutMs: number): Promise<void> {
    if (this.cancelledTurns.has(sessionId)) {
      return;
    }
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        // Drop our waiter on timeout so it can't leak or be invoked by a later
        // cancel(). Directives run sequentially, so there is at most one pending
        // waiter per session.
        this.cancelWaiters.delete(sessionId);
        this.assertionErrors.push(`expect_cancel: no session/cancel arrived within ${timeoutMs}ms`);
        resolve();
      }, timeoutMs);
      (timer as { unref?: () => void }).unref?.();
      const waiter = (): void => {
        clearTimeout(timer);
        resolve();
      };
      const existing = this.cancelWaiters.get(sessionId);
      if (existing !== undefined) {
        existing.add(waiter);
      } else {
        this.cancelWaiters.set(sessionId, new Set([waiter]));
      }
    });
  }
}

/**
 * Convenience factory for `new AgentSideConnection((conn) => createMockAgent(...))`.
 */
export function createMockAgent(
  conn: AgentSideConnection,
  scenario: Scenario,
  hooks: RunnerHooks,
): MockAgent {
  return new MockAgent(conn, scenario, hooks);
}
