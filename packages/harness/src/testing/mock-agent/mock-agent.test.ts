import type { SessionNotification } from '@agentclientprotocol/sdk';
import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import { TurnFailed, type ClientPorts, type PermissionPort } from '../../acp/index.js';
import { connectMockAgent } from './connect.js';
import { DIRECTIVE_TYPES, parseScenario, readScenario, type Scenario } from './scenario.js';

// ─── Helpers ───

/**
 * Builds a scenario from the ENCODED (on-disk) shape, so a test can set only
 * the capability knobs it cares about — `parseScenario` fills the rest, exactly
 * as it does for a scenario file.
 */
const scenario = (partial: Record<string, unknown> & { directives: unknown[] }): Scenario =>
  parseScenario({ name: 'test', ...partial });

const textOf = (n: SessionNotification): string =>
  n.update.sessionUpdate === 'agent_message_chunk' ||
  n.update.sessionUpdate === 'agent_thought_chunk' ||
  n.update.sessionUpdate === 'user_message_chunk'
    ? n.update.content.type === 'text'
      ? n.update.content.text
      : ''
    : '';

async function newSession(connection: Awaited<ReturnType<typeof connectMockAgent>>['connection']) {
  return Effect.runPromise(connection.newSession({ cwd: '/tmp', mcpServers: [] }));
}

/** Runs a turn whose ports all auto-respond, then drains `count` buffered updates. */
async function runTurn(
  s: Scenario,
  count: number,
  options?: Parameters<typeof connectMockAgent>[1],
): Promise<{ updates: SessionNotification[]; agent: Awaited<ReturnType<typeof connectMockAgent>>['agent'] }> {
  const { connection, agent } = await connectMockAgent(s, options);
  const session = await newSession(connection);
  const response = await Effect.runPromise(
    connection.prompt({ sessionId: session.sessionId, prompt: [{ type: 'text', text: 'go' }] }),
  );
  expect(response.stopReason).toBe(s.stopReason);
  const iterator = connection.updates(session.sessionId);
  const updates: SessionNotification[] = [];
  for (let i = 0; i < count; i++) {
    updates.push((await iterator.next()).value as SessionNotification);
  }
  return { updates, agent };
}

// ─── Scenario schema ───

describe('scenario schema', () => {
  it('rejects an unknown directive type', () => {
    const result = readScenario({ name: 'x', directives: [{ type: 'nope' }] });
    expect(result.success).toBe(false);
  });

  it('applies defaults (sessionId, stopReason, chunk channel)', () => {
    const s = parseScenario({ name: 'x', directives: [{ type: 'emit_chunks', chunks: ['a'] }] });
    expect(s.sessionId).toBe('mock-session-1');
    expect(s.stopReason).toBe('end_turn');
    expect(s.directives[0]).toMatchObject({ type: 'emit_chunks', channel: 'agent', delayMs: 0 });
  });
});

// ─── Streaming ───

describe('emit_chunks', () => {
  it('streams agent, thought, and user chunks on their own update kinds', async () => {
    const { updates } = await runTurn(
      scenario({
        directives: [
          { type: 'emit_chunks', channel: 'agent', chunks: ['Hello', ' world'] },
          { type: 'emit_chunks', channel: 'thought', chunks: ['thinking'] },
          { type: 'emit_chunks', channel: 'user', chunks: ['echoed'] },
        ],
      }),
      4,
    );
    expect(updates.map((u) => u.update.sessionUpdate)).toEqual([
      'agent_message_chunk',
      'agent_message_chunk',
      'agent_thought_chunk',
      'user_message_chunk',
    ]);
    expect(updates.map(textOf)).toEqual(['Hello', ' world', 'thinking', 'echoed']);
  });

  it('carries a very large single chunk (>=1MB) without frame-size explosion', async () => {
    const big = 'x'.repeat(1_100_000);
    const { updates } = await runTurn(
      scenario({ directives: [{ type: 'emit_chunks', chunks: [big] }] }),
      1,
    );
    expect(textOf(updates[0])).toHaveLength(1_100_000);
  });
});

// ─── Tool calls ───

describe('tool_call / tool_call_update', () => {
  it('emits a tool_call then its completion update', async () => {
    const { updates } = await runTurn(
      scenario({
        directives: [
          { type: 'tool_call', toolCallId: 'c1', title: 'Run ls', kind: 'execute', status: 'in_progress' },
          { type: 'tool_call_update', toolCallId: 'c1', status: 'completed', rawOutput: { exitCode: 0 } },
        ],
      }),
      2,
    );
    expect(updates[0].update).toMatchObject({ sessionUpdate: 'tool_call', toolCallId: 'c1', kind: 'execute' });
    expect(updates[1].update).toMatchObject({
      sessionUpdate: 'tool_call_update',
      toolCallId: 'c1',
      status: 'completed',
    });
  });

  it('can emit an update for an unknown (out-of-order) tool call id', async () => {
    const { updates } = await runTurn(
      scenario({ directives: [{ type: 'tool_call_update', toolCallId: 'never-opened', status: 'failed' }] }),
      1,
    );
    // The mock happily emits it; the wrapper delivers it verbatim (reader is tolerant).
    expect(updates[0].update).toMatchObject({ toolCallId: 'never-opened', status: 'failed' });
  });
});

// ─── Plan / commands / mode ───

describe('plan, advertise_commands, set_mode', () => {
  it('emits a full plan entry list', async () => {
    const { updates } = await runTurn(
      scenario({
        directives: [
          {
            type: 'plan',
            entries: [
              { content: 'Step one', priority: 'high', status: 'in_progress' },
              { content: 'Step two' },
            ],
          },
        ],
      }),
      1,
    );
    expect(updates[0].update.sessionUpdate).toBe('plan');
    if (updates[0].update.sessionUpdate === 'plan') {
      expect(updates[0].update.entries).toHaveLength(2);
      expect(updates[0].update.entries[1]).toMatchObject({ priority: 'medium', status: 'pending' });
    }
  });

  it('advertises available commands', async () => {
    const { updates } = await runTurn(
      scenario({
        directives: [
          {
            type: 'advertise_commands',
            commands: [{ name: 'create_plan', description: 'Draft a plan' }, { name: 'search' }],
          },
        ],
      }),
      1,
    );
    expect(updates[0].update.sessionUpdate).toBe('available_commands_update');
    if (updates[0].update.sessionUpdate === 'available_commands_update') {
      expect(updates[0].update.availableCommands.map((c) => c.name)).toEqual(['create_plan', 'search']);
    }
  });

  it('emits a current_mode_update for set_mode', async () => {
    const { updates } = await runTurn(
      scenario({ directives: [{ type: 'set_mode', modeId: 'architect' }] }),
      1,
    );
    expect(updates[0].update).toMatchObject({ sessionUpdate: 'current_mode_update', currentModeId: 'architect' });
  });
});

// ─── Permission round-trips (allow vs reject) ───

describe('request_permission branches on the client decision', () => {
  const options = [
    { optionId: 'allow', name: 'Allow', kind: 'allow_once' as const },
    { optionId: 'reject', name: 'Reject', kind: 'reject_once' as const },
  ];

  it('asserts a selected outcome when the client allows', async () => {
    const allowPort: PermissionPort = {
      requestPermission: () => Promise.resolve({ outcome: { outcome: 'selected', optionId: 'allow' } }),
    };
    const { agent } = await runTurn(
      scenario({
        directives: [
          { type: 'request_permission', toolCallId: 'c1', options, expectOutcome: 'selected', expectOptionId: 'allow' },
        ],
      }),
      0,
      { ports: { permission: allowPort } },
    );
    expect(agent.assertionErrors).toEqual([]);
  });

  it('asserts a cancelled outcome when the client rejects/cancels', async () => {
    const { agent } = await runTurn(
      scenario({
        directives: [{ type: 'request_permission', toolCallId: 'c1', options, expectOutcome: 'cancelled' }],
      }),
      0,
    );
    expect(agent.assertionErrors).toEqual([]);
  });

  it('records an assertion error when the outcome does not match the expectation', async () => {
    const { agent } = await runTurn(
      scenario({
        directives: [{ type: 'request_permission', toolCallId: 'c1', options, expectOutcome: 'selected' }],
      }),
      0,
    );
    expect(agent.assertionErrors).toHaveLength(1);
    expect(agent.assertionErrors[0]).toContain('expected outcome selected');
  });
});

// ─── Terminal + filesystem round-trips ───

describe('use_terminal and read_file exercise client-service ports', () => {
  const terminalPort: ClientPorts['terminal'] = {
    createTerminal: () => Promise.resolve({ terminalId: 't1' }),
    terminalOutput: () => Promise.resolve({ output: 'build ok', truncated: false }),
    releaseTerminal: () => Promise.resolve(),
    waitForTerminalExit: () => Promise.resolve({}),
    killTerminal: () => Promise.resolve(),
  };
  const fsPort: ClientPorts['fs'] = {
    readTextFile: () => Promise.resolve({ content: 'file body here' }),
    writeTextFile: () => Promise.resolve(),
  };
  const permission: PermissionPort = {
    requestPermission: () => Promise.resolve({ outcome: { outcome: 'cancelled' } }),
  };

  it('drives createTerminal → wait → output → release', async () => {
    const { agent } = await runTurn(
      scenario({
        directives: [{ type: 'use_terminal', command: 'make', args: ['build'], expectOutputContains: 'ok' }],
      }),
      0,
      { ports: { permission, terminal: terminalPort } },
    );
    expect(agent.assertionErrors).toEqual([]);
    expect(agent.executed).toContain('use_terminal');
  });

  it('reads a file via the fs port', async () => {
    const { agent } = await runTurn(
      scenario({
        directives: [{ type: 'read_file', path: '/tmp/x.txt', expectContentContains: 'body' }],
      }),
      0,
      { ports: { permission, fs: fsPort } },
    );
    expect(agent.assertionErrors).toEqual([]);
  });
});

// ─── Assertion directives ───

describe('expect_prompt / expect_cancel', () => {
  it('expect_prompt passes when the prompt matches and fails otherwise', async () => {
    const okScenario = scenario({ directives: [{ type: 'expect_prompt', contains: 'go' }] });
    const { agent: ok } = await runTurn(okScenario, 0);
    expect(ok.assertionErrors).toEqual([]);

    const badScenario = scenario({ directives: [{ type: 'expect_prompt', contains: 'nope' }] });
    const { agent: bad } = await runTurn(badScenario, 0);
    expect(bad.assertionErrors[0]).toContain('did not contain');
  });

  it('expect_cancel blocks the turn until session/cancel arrives', async () => {
    const { connection, agent } = await connectMockAgent(
      scenario({
        stopReason: 'end_turn',
        directives: [{ type: 'emit_chunks', chunks: ['working'] }, { type: 'expect_cancel', timeoutMs: 2000 }],
      }),
    );
    const session = await newSession(connection);
    const iterator = connection.updates(session.sessionId);
    const turn = Effect.runPromise(
      connection.prompt({ sessionId: session.sessionId, prompt: [{ type: 'text', text: 'long' }] }),
    );
    // The first chunk proves the turn is in flight and blocked on expect_cancel.
    expect(textOf((await iterator.next()).value as SessionNotification)).toBe('working');
    await Effect.runPromise(connection.cancel({ sessionId: session.sessionId }));
    const response = await turn;
    expect(response.stopReason).toBe('cancelled');
    expect(agent.assertionErrors).toEqual([]);
  });

  it('cancel resolves only its own session\'s expect_cancel waiter', async () => {
    // Drive the agent directly so we can run two concurrent sessions (the
    // connection helper hands out one fixed sessionId).
    const { agent } = await connectMockAgent(
      scenario({ directives: [{ type: 'expect_cancel', timeoutMs: 2000 }] }),
    );
    const turnA = agent.prompt({ sessionId: 'A', prompt: [{ type: 'text', text: 'a' }] });
    const turnB = agent.prompt({ sessionId: 'B', prompt: [{ type: 'text', text: 'b' }] });
    let bResolved = false;
    void turnB.then(() => {
      bResolved = true;
    });

    await agent.cancel({ sessionId: 'A' });
    expect((await turnA).stopReason).toBe('cancelled');
    // Flush microtasks: a leaked shared waiter would have resolved B by now.
    await new Promise((resolve) => setImmediate(resolve));
    expect(bResolved).toBe(false); // B stayed blocked; only A was cancelled

    await agent.cancel({ sessionId: 'B' }); // clean up
    await turnB;
    expect(agent.assertionErrors).toEqual([]);
  });

  it('does not carry a cancel into the next prompt turn on the same session', async () => {
    const { connection } = await connectMockAgent(
      scenario({ stopReason: 'end_turn', directives: [{ type: 'emit_chunks', chunks: ['x'] }] }),
    );
    const session = await newSession(connection);
    const first = await Effect.runPromise(
      connection.prompt({ sessionId: session.sessionId, prompt: [{ type: 'text', text: '1' }] }),
    );
    expect(first.stopReason).toBe('end_turn');
    // A stray cancel lands against the just-finished turn.
    await Effect.runPromise(connection.cancel({ sessionId: session.sessionId }));
    // The next turn must start fresh, not inherit the prior cancel.
    const second = await Effect.runPromise(
      connection.prompt({ sessionId: session.sessionId, prompt: [{ type: 'text', text: '2' }] }),
    );
    expect(second.stopReason).toBe('end_turn');
  });
});

// ─── Failure modelling ───

describe('crash and non-default stop reasons', () => {
  it('crash mid-turn surfaces as a wrapper TurnFailed (in-process closure model)', async () => {
    const { connection } = await connectMockAgent(
      scenario({ directives: [{ type: 'emit_chunks', chunks: ['half'] }, { type: 'crash', exitCode: 7 }] }),
    );
    const session = await newSession(connection);
    const error = await Effect.runPromise(
      Effect.flip(
        connection.prompt({ sessionId: session.sessionId, prompt: [{ type: 'text', text: 'go' }] }),
      ),
    );
    expect(error).toBeInstanceOf(TurnFailed);
  });

  it('honors a non-default stop reason', async () => {
    const { updates } = await runTurn(
      scenario({ stopReason: 'refusal', directives: [{ type: 'emit_chunks', chunks: ['no'] }] }),
      1,
    );
    expect(textOf(updates[0])).toBe('no');
  });
});

// ─── Resume substrate (STEP-24-04) ───

describe('session/load replay', () => {
  const loadable = scenario({
    initialize: { loadSession: true, modes: ['off', 'high'] },
    directives: [],
    loadReplay: [
      { type: 'emit_chunks', channel: 'user', chunks: ['what changed?'] },
      { type: 'emit_chunks', channel: 'agent', chunks: ['Everything. ', 'Twice.'] },
    ],
  });

  it('emits the replay before `load` resolves, so it is already queued', async () => {
    const { connection } = await connectMockAgent(loadable);
    expect(connection.capabilities.loadSession).toBe(true);

    const response = await Effect.runPromise(
      connection.load({ sessionId: 'mock-session-1', cwd: '/tmp', mcpServers: [] }),
    );
    // The whole point: a resuming client can take the replay off the channel
    // the instant `load` returns, with no waiting and no racing live traffic.
    const replayed = connection.takeBufferedUpdates('mock-session-1');
    expect(replayed.map(textOf)).toEqual(['what changed?', 'Everything. ', 'Twice.']);
    expect(connection.takeBufferedUpdates('mock-session-1')).toEqual([]);
    // Modes come back on the load response too, so a resumed session regains
    // its mode selector (Pi: thinking levels).
    expect(response.modes?.availableModes.map((mode) => mode.id)).toEqual(['off', 'high']);
  });

  it('leaves loadSession a no-op when the scenario scripts no replay', async () => {
    const { connection } = await connectMockAgent(
      scenario({ initialize: { loadSession: true }, directives: [] } as never),
    );
    await Effect.runPromise(connection.load({ sessionId: 'mock-session-1', cwd: '/tmp', mcpServers: [] }));
    expect(connection.takeBufferedUpdates('mock-session-1')).toEqual([]);
  });
});

describe('advertise-but-unimplemented methods', () => {
  it('answers -32601 for a method the scenario advertised but does not implement', async () => {
    // The mismatch a client's fallback cascade exists for: the capability stays
    // TRUE at initialize, and the call still fails.
    const { connection } = await connectMockAgent(
      scenario({
        initialize: { loadSession: true, resumeSession: true },
        directives: [],
        unimplementedMethods: ['session/resume'],
      }),
    );
    expect(connection.capabilities.resumeSession).toBe(true);
    expect(connection.capabilities.loadSession).toBe(true);

    const failure = await Effect.runPromise(
      Effect.either(connection.resume({ sessionId: 'mock-session-1', cwd: '/tmp', mcpServers: [] })),
    );
    expect(failure._tag).toBe('Left');
    expect((failure as { left: { _tag: string; code?: number } }).left._tag).toBe('ProtocolError');
    expect((failure as { left: { code?: number } }).left.code).toBe(-32601);

    // …while the other advertised path still works, which is what makes the
    // cascade observable rather than theoretical.
    await Effect.runPromise(connection.load({ sessionId: 'mock-session-1', cwd: '/tmp', mcpServers: [] }));
  });

  it('can refuse session/load the same way', async () => {
    const { connection } = await connectMockAgent(
      scenario({
        initialize: { loadSession: true },
        directives: [],
        unimplementedMethods: ['session/load'],
      }),
    );
    const failure = await Effect.runPromise(
      Effect.either(connection.load({ sessionId: 'mock-session-1', cwd: '/tmp', mcpServers: [] })),
    );
    expect((failure as { left: { code?: number } }).left.code).toBe(-32601);
  });
});

// ─── Coverage guard ───

describe('directive coverage', () => {
  it('the in-process matrix + subprocess suite cover every directive type', () => {
    // emit_malformed and crash-as-process-exit are covered by the subprocess
    // suite; everything else is exercised in-process above. This guard fails if
    // a new directive type is added without a home.
    expect([...DIRECTIVE_TYPES].sort()).toEqual(
      [
        'advertise_commands',
        'crash',
        'emit_chunks',
        'emit_malformed',
        'expect_cancel',
        'expect_prompt',
        'plan',
        'read_file',
        'request_permission',
        'set_mode',
        'sleep',
        'tool_call',
        'tool_call_update',
        'use_terminal',
      ].sort(),
    );
  });
});
