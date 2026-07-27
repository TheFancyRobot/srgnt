import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  SessionEventLog,
  SessionEventLogCorruptionError,
  SessionEventLogWriteError,
  readEventLog,
} from './event-log.js';

/**
 * Real `pi-acp` traffic, copied verbatim from
 * `packages/harness/src/testing/fixtures/pi/{simple-prompt,tool-use,cancelled-turn}.jsonl`
 * (STEP-22-04 recorded corpus). Copied rather than imported: `@srgnt/harness`
 * is ESM-only and these tests are CJS.
 */
const piFixtureLines = [
  '{"seq":0,"ts":"2026-07-14T12:00:00.000Z","protocolVersion":1,"kind":"client/session_created","payload":{"sessionId":"sess-pi-01","cwd":"/<HOME>/dev/demo"}}',
  '{"seq":1,"ts":"2026-07-14T12:00:00.100Z","protocolVersion":1,"kind":"client/prompt","payload":{"sessionId":"sess-pi-01","prompt":[{"type":"text","text":"say hello"}]}}',
  '{"seq":2,"ts":"2026-07-14T12:05:00.400Z","protocolVersion":1,"kind":"acp/session_update","payload":{"sessionId":"sess-pi-02","update":{"sessionUpdate":"tool_call","toolCallId":"call-1","title":"Run `ls -la`","kind":"execute","status":"in_progress","rawInput":{"command":"ls","args":["-la"],"cwd":"/<HOME>/dev/demo"}}}}',
  '{"seq":3,"ts":"2026-07-14T12:10:00.600Z","protocolVersion":1,"kind":"acp/session_update","payload":{"sessionId":"sess-pi-03","update":{"sessionUpdate":"tool_call","toolCallId":"call-9","title":"Edit src/index.ts","kind":"edit","status":"in_progress"}}}',
];

let dir: string;
let logPath: string;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'srgnt-eventlog-'));
  logPath = path.join(dir, 'events.jsonl');
});

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

async function appendAll(count: number, kind = 'acp/session_update'): Promise<SessionEventLog> {
  const log = await SessionEventLog.open(logPath);
  for (let i = 0; i < count; i += 1) {
    await log.append({ kind, payload: { i }, protocolVersion: 1 });
  }
  return log;
}

describe('readEventLog', () => {
  it('treats a missing file as an empty log', async () => {
    const result = await readEventLog(path.join(dir, 'nope.jsonl'));
    expect(result).toEqual({
      events: [],
      truncatedTail: false,
      lastValidByteOffset: 0,
      tailMissingNewline: false,
    });
  });

  it('treats an empty file as an empty log', async () => {
    await fs.writeFile(logPath, '');
    const result = await readEventLog(logPath);
    expect(result.events).toEqual([]);
    expect(result.truncatedTail).toBe(false);
  });

  it('decodes real pi-acp fixture lines', async () => {
    await fs.writeFile(logPath, `${piFixtureLines.join('\n')}\n`);
    const result = await readEventLog(logPath);
    expect(result.events).toHaveLength(4);
    expect(result.events.map((event) => event.kind)).toEqual([
      'client/session_created',
      'client/prompt',
      'acp/session_update',
      'acp/session_update',
    ]);
    expect(result.events[2]?.payload).toMatchObject({
      update: { rawInput: { command: 'ls', args: ['-la'] } },
    });
    expect(result.truncatedTail).toBe(false);
  });

  it('tolerates unknown kinds and unknown extra envelope fields', async () => {
    const line = JSON.stringify({
      seq: 0,
      ts: '2026-07-27T00:00:00.000Z',
      protocolVersion: 99,
      kind: 'agent/kind_from_the_future',
      payload: { anything: true },
      writtenBy: 'a newer srgnt',
      envelopeVersion: 7,
    });
    await fs.writeFile(logPath, `${line}\n`);
    const result = await readEventLog(logPath);
    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.kind).toBe('agent/kind_from_the_future');
    // Unknown extra fields are tolerated on read and dropped on decode.
    expect(result.events[0]).not.toHaveProperty('writtenBy');
  });

  it.each([
    ['missing seq', { ts: '2026-07-27T00:00:00.000Z', protocolVersion: 1, kind: 'x' }],
    ['missing ts', { seq: 0, protocolVersion: 1, kind: 'x' }],
    ['missing kind', { seq: 0, ts: '2026-07-27T00:00:00.000Z', protocolVersion: 1 }],
    ['wrong seq type', { seq: 'one', ts: '2026-07-27T00:00:00.000Z', protocolVersion: 1, kind: 'x' }],
  ])('rejects structural damage in an interior line (%s)', async (_label, broken) => {
    const good = piFixtureLines[0];
    await fs.writeFile(logPath, `${good}\n${JSON.stringify(broken)}\n${good}\n`);
    await expect(readEventLog(logPath)).rejects.toBeInstanceOf(SessionEventLogCorruptionError);
  });

  it('drops an unterminated garbage tail instead of throwing', async () => {
    await fs.writeFile(logPath, `${piFixtureLines[0]}\n{"seq":1,"ts":"2026-`);
    const result = await readEventLog(logPath);
    expect(result.events).toHaveLength(1);
    expect(result.truncatedTail).toBe(true);
    expect(result.lastValidByteOffset).toBe(Buffer.byteLength(piFixtureLines[0]!) + 1);
  });

  it('keeps a valid record whose newline never landed, and flags it for repair', async () => {
    await fs.writeFile(logPath, `${piFixtureLines[0]}\n${piFixtureLines[1]}`);
    const result = await readEventLog(logPath);
    expect(result.events).toHaveLength(2);
    expect(result.truncatedTail).toBe(true);
    expect(result.tailMissingNewline).toBe(true);
  });

  it('filters by fromSeq', async () => {
    const log = await appendAll(5);
    await log.close();
    expect((await readEventLog(logPath, { fromSeq: 3 })).events.map((e) => e.seq)).toEqual([3, 4]);
    expect((await readEventLog(logPath, { fromSeq: 0 })).events).toHaveLength(5);
    expect((await readEventLog(logPath, { fromSeq: 99 })).events).toEqual([]);
  });
});

describe('SessionEventLog append', () => {
  it('assigns dense monotonic seq starting at 0', async () => {
    const log = await appendAll(3);
    await log.close();
    const result = await readEventLog(logPath);
    expect(result.events.map((event) => event.seq)).toEqual([0, 1, 2]);
  });

  it('continues seq from the last valid line after a reopen', async () => {
    const first = await appendAll(5);
    await first.close();

    const second = await SessionEventLog.open(logPath);
    expect(second.nextSequence).toBe(5);
    await second.append({ kind: 'client/stop' });
    await second.close();

    const result = await readEventLog(logPath);
    expect(result.events.map((event) => event.seq)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('serializes concurrent appends into whole lines', async () => {
    const log = await SessionEventLog.open(logPath);
    const noisy = `${'x'.repeat(4096)}\n embedded newline`;
    await Promise.all(
      Array.from({ length: 50 }, (_unused, i) =>
        log.append({ kind: 'acp/session_update', payload: { i, noisy } })
      )
    );
    await log.close();

    const raw = await fs.readFile(logPath, 'utf8');
    const lines = raw.split('\n').filter((line) => line.length > 0);
    expect(lines).toHaveLength(50);
    // Every line must parse on its own: proof that no write tore or interleaved.
    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
    const result = await readEventLog(logPath);
    expect(result.events.map((event) => event.seq)).toEqual(
      Array.from({ length: 50 }, (_unused, i) => i)
    );
  });

  it('round-trips a 1 MB payload', async () => {
    const log = await SessionEventLog.open(logPath);
    const big = 'z'.repeat(1024 * 1024);
    await log.append({ kind: 'acp/session_update', payload: { big } });
    await log.close();
    const result = await readEventLog(logPath);
    expect((result.events[0]?.payload as { big: string }).big).toBe(big);
  });

  it('repairs a corrupt tail before appending, with continuous seq', async () => {
    const first = await appendAll(3);
    await first.close();
    // Simulate a crash mid-append: a partial 4th line with no newline.
    await fs.appendFile(logPath, '{"seq":3,"ts":"2026-07-27T00:00:0');

    const reopened = await SessionEventLog.open(logPath);
    expect(reopened.repairedTail).toBe(true);
    expect(reopened.nextSequence).toBe(3);
    await reopened.append({ kind: 'client/prompt', payload: { after: 'repair' } });
    await reopened.close();

    const result = await readEventLog(logPath);
    expect(result.truncatedTail).toBe(false);
    expect(result.events.map((event) => event.seq)).toEqual([0, 1, 2, 3]);
    expect(result.events[3]?.payload).toEqual({ after: 'repair' });

    // A further reopen must read cleanly, never hitting middle-corruption.
    const third = await SessionEventLog.open(logPath);
    expect(third.repairedTail).toBe(false);
    expect(third.nextSequence).toBe(4);
    await third.close();
    await expect(readEventLog(logPath)).resolves.toMatchObject({ truncatedTail: false });
  });

  it('repairs a record that lost only its newline without losing the record', async () => {
    const first = await appendAll(2);
    await first.close();
    const raw = await fs.readFile(logPath, 'utf8');
    await fs.writeFile(logPath, raw.slice(0, -1)); // drop the final newline

    const reopened = await SessionEventLog.open(logPath);
    expect(reopened.repairedTail).toBe(true);
    expect(reopened.nextSequence).toBe(2);
    await reopened.append({ kind: 'client/stop' });
    await reopened.close();

    const result = await readEventLog(logPath);
    expect(result.events.map((event) => event.seq)).toEqual([0, 1, 2]);
    expect(result.truncatedTail).toBe(false);
  });

  it('refuses an invalid envelope instead of writing a line no reader can accept', async () => {
    const log = await appendAll(1);
    // `protocolVersion` is a plain `number` in the input type, so this
    // type-checks. Written, it would be a newline-terminated line the schema
    // rejects — i.e. interior corruption that `open` deliberately never repairs.
    await expect(log.append({ kind: 'client/stop', protocolVersion: -1 })).rejects.toBeInstanceOf(
      SessionEventLogWriteError
    );
    // The bad append spent no sequence number and wrote nothing.
    expect(log.nextSequence).toBe(1);
    const after = await log.append({ kind: 'client/stop' });
    expect(after.seq).toBe(1);
    await log.close();
    const result = await readEventLog(logPath);
    expect(result.events.map((event) => event.seq)).toEqual([0, 1]);
  });

  it('stops writing after a failed append rather than leaving a hole in seq', async () => {
    const log = await appendAll(2);
    // Close the descriptor underneath the handle: the next write fails the way
    // a full or disconnected disk would.
    await (log as unknown as { handle: { close: () => Promise<void> } }).handle.close();

    await expect(log.append({ kind: 'client/stop' })).rejects.toBeTruthy();
    // seq 2 is spent. Appending seq 3 after it would leave a gap; appending
    // after a possibly half-written line would be interior corruption.
    await expect(log.append({ kind: 'client/stop' })).rejects.toBeInstanceOf(
      SessionEventLogWriteError
    );

    // Reopening is the documented repair path, and it still works.
    const reopened = await SessionEventLog.open(logPath);
    const recovered = await reopened.append({ kind: 'client/stop' });
    expect(recovered.seq).toBe(2);
    await reopened.close();
    const result = await readEventLog(logPath);
    expect(result.events.map((event) => event.seq)).toEqual([0, 1, 2]);
  });

  it('treats a line with malformed UTF-8 as corrupt, not as an altered payload', async () => {
    // A flipped byte inside a JSON string. `toString('utf8')` would substitute
    // U+FFFD and hand back structurally valid JSON, silently changing the
    // payload of an event in the file that is meant to be the source of truth.
    const good = await appendAll(1);
    await good.close();
    const valid = (await fs.readFile(logPath, 'utf8')).trimEnd();
    const line = Buffer.from(
      JSON.stringify({ seq: 1, ts: new Date().toISOString(), protocolVersion: 0, kind: 'x', payload: 'AA' }),
      'utf8'
    );
    // 0xff never appears in valid UTF-8; drop it inside the payload string.
    line[line.length - 3] = 0xff;
    await fs.writeFile(logPath, `${valid}\n${line.toString('binary')}\n`, 'binary');

    await expect(readEventLog(logPath)).rejects.toBeInstanceOf(SessionEventLogCorruptionError);
  });

  it('refuses to open a log with interior corruption rather than destroying it', async () => {
    await fs.writeFile(logPath, `${piFixtureLines[0]}\nnot json at all\n${piFixtureLines[1]}\n`);
    await expect(SessionEventLog.open(logPath)).rejects.toBeInstanceOf(
      SessionEventLogCorruptionError
    );
    // The file is untouched: nothing was truncated behind the caller's back.
    const raw = await fs.readFile(logPath, 'utf8');
    expect(raw.split('\n').filter((line) => line.length > 0)).toHaveLength(3);
  });
});
