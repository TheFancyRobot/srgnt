import { homedir } from 'node:os';
import { readSessionEvent } from '@srgnt/contracts';
import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import { connectMockAgent, parseScenario } from '../mock-agent/index.js';
import { FrameRecorder, recordUpdates, redactHomePaths } from './recorder.js';

describe('redactHomePaths', () => {
  it('normalizes the real home dir and any /Users|/home path to the same /<HOME> token', () => {
    const home = homedir();
    const value = {
      cwd: `${home}/dev/demo`,
      other: '/Users/someone-else/secret',
      nested: ['/home/bob/thing', 'no path here'],
      keep: 42,
    };
    const redacted = redactHomePaths(value);
    expect(JSON.stringify(redacted)).not.toContain('someone-else');
    expect(JSON.stringify(redacted)).not.toContain('/home/bob');
    // Every user-home path — the current machine's and others' — uses one token.
    expect(redacted.other).toBe('/<HOME>/secret');
    expect(redacted.nested[0]).toBe('/<HOME>/thing');
    if (home.length > 0) {
      expect(redacted.cwd).toBe('/<HOME>/dev/demo');
    }
    expect(redacted.keep).toBe(42);
  });
});

describe('FrameRecorder', () => {
  it('numbers envelopes densely and serializes decodable JSONL', () => {
    const recorder = new FrameRecorder({ protocolVersion: 1, timestamp: '2026-07-14T00:00:00.000Z' });
    recorder.record('client/prompt', { text: 'hi' });
    recorder.recordUpdate({
      sessionId: 's1',
      update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: 'yo' } },
    });
    const frames = recorder.frames();
    expect(frames.map((f) => f.seq)).toEqual([0, 1]);
    for (const line of recorder.toJsonl().trim().split('\n')) {
      expect(readSessionEvent(JSON.parse(line)).success).toBe(true);
    }
  });
});

describe('recordUpdates tees a live wrapper connection', () => {
  it('captures a turn as redacted, decodable SessionEvent envelopes', async () => {
    const home = homedir();
    const scenario = parseScenario({
      name: 'record',
      directives: [
        { type: 'emit_chunks', chunks: ['working in '] },
        { type: 'tool_call', toolCallId: 'c1', title: `edit ${home}/dev/x.ts`, kind: 'edit' },
      ],
    });
    const { connection } = await connectMockAgent(scenario);
    const session = await Effect.runPromise(connection.newSession({ cwd: '/tmp', mcpServers: [] }));

    // End the update stream when the turn completes so recordUpdates resolves.
    const recording = recordUpdates(connection, session.sessionId, { protocolVersion: 1 });
    await Effect.runPromise(
      connection.prompt({ sessionId: session.sessionId, prompt: [{ type: 'text', text: 'go' }] }),
    );
    connection.close();

    const frames = await recording;
    expect(frames.length).toBe(2);
    expect(frames.every((f) => f.kind === 'acp/session_update')).toBe(true);
    for (const frame of frames) {
      expect(readSessionEvent(frame).success).toBe(true);
    }
    // The home path in the tool-call title was redacted before recording.
    if (home.length > 0) {
      expect(JSON.stringify(frames)).not.toContain(home);
      expect(JSON.stringify(frames)).toContain('<HOME>');
    }
  });
});
