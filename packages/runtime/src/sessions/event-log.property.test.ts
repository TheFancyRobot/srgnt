import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import fc from 'fast-check';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SessionEventLog, readEventLog } from './event-log.js';

let root: string;
let counter = 0;

beforeAll(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'srgnt-eventlog-prop-'));
});

afterAll(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

function freshLogPath(): string {
  counter += 1;
  return path.join(root, `events-${counter}.jsonl`);
}

/**
 * Payloads that stress JSON escaping: newlines, unicode, nesting, nulls.
 *
 * Generated values are pre-normalized through one JSON round-trip so the
 * round-trip assertion below can stay strict. Without it the property fails on
 * `-0`, which JSON cannot represent (it serializes as `0`) -- a limitation of
 * the storage format, not of this store. The store's contract is "whatever
 * JSON can carry, carried verbatim".
 */
function jsonSafe<T>(value: T): T {
  return value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T);
}

const payloadArb = fc
  .oneof(
    fc.jsonValue(),
    fc.record({
      text: fc.string().map((value) => `${value}\nline two \u{1F388}`),
      nested: fc.record({ deep: fc.array(fc.jsonValue(), { maxLength: 4 }) }),
    }),
    fc.constant(undefined)
  )
  .map(jsonSafe);

const eventArb = fc.record({
  // Unknown kinds must survive: the reader is tolerant by contract.
  kind: fc.oneof(
    fc.constantFrom('acp/session_update', 'client/prompt', 'client/stop'),
    fc.string({ minLength: 1 }).map((value) => `agent/${value}`)
  ),
  payload: payloadArb,
  protocolVersion: fc.integer({ min: 0, max: 99 }),
});

type EventInput = { kind: string; payload?: unknown; protocolVersion: number };

async function writeLog(logPath: string, inputs: EventInput[]): Promise<void> {
  const log = await SessionEventLog.open(logPath);
  for (const input of inputs) {
    await log.append(input);
  }
  await log.close();
}

describe('SessionEventLog properties', () => {
  it('round-trips arbitrary event sequences exactly and in order', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(eventArb, { minLength: 1, maxLength: 25 }), async (inputs) => {
        const logPath = freshLogPath();
        await writeLog(logPath, inputs);

        const result = await readEventLog(logPath);
        expect(result.truncatedTail).toBe(false);
        expect(result.events).toHaveLength(inputs.length);
        result.events.forEach((event, index) => {
          const input = inputs[index]!;
          expect(event.seq).toBe(index);
          expect(event.kind).toBe(input.kind);
          expect(event.protocolVersion).toBe(input.protocolVersion);
          // `undefined` payloads are omitted from the envelope entirely.
          expect(event.payload).toEqual(input.payload);
        });
      }),
      { numRuns: 60 }
    );
  });

  it('never emits more than one line per event, whatever the payload contains', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(eventArb, { minLength: 1, maxLength: 15 }), async (inputs) => {
        const logPath = freshLogPath();
        await writeLog(logPath, inputs);
        const raw = await fs.readFile(logPath, 'utf8');
        expect(raw.endsWith('\n')).toBe(true);
        expect(raw.split('\n').filter((line) => line.length > 0)).toHaveLength(inputs.length);
      }),
      { numRuns: 40 }
    );
  });

  it('drops a tail truncated at any byte offset without losing earlier events', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(eventArb, { minLength: 2, maxLength: 12 }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        async (inputs, cutRatio) => {
          const logPath = freshLogPath();
          await writeLog(logPath, inputs);

          const buffer = await fs.readFile(logPath);
          const lastNewline = buffer.lastIndexOf(0x0a, buffer.length - 2);
          const lower = lastNewline + 1;
          // Strictly inside the final line: a non-empty prefix of `{"seq":...`
          // is never itself valid JSON, so it must be dropped as a torn write.
          //
          // The upper bound stops one byte short of the complete JSON. Cutting
          // at exactly `span` would leave the whole record and remove only its
          // newline — a *complete* event the log deliberately keeps rather than
          // destroys, so it is not this property's case.
          const span = buffer.length - 1 - lower;
          const cut = lower + 1 + Math.floor(cutRatio * (span - 2));
          await fs.truncate(logPath, cut);

          const result = await readEventLog(logPath);
          expect(result.truncatedTail).toBe(true);
          expect(result.events).toHaveLength(inputs.length - 1);
          expect(result.events.map((event) => event.seq)).toEqual(
            Array.from({ length: inputs.length - 1 }, (_unused, i) => i)
          );
          expect(result.lastValidByteOffset).toBe(lower);
        }
      ),
      { numRuns: 60 }
    );
  });

  it('repairs any truncated tail on reopen, then appends with continuous seq', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(eventArb, { minLength: 2, maxLength: 10 }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        eventArb,
        async (inputs, cutRatio, next) => {
          const logPath = freshLogPath();
          await writeLog(logPath, inputs);

          const buffer = await fs.readFile(logPath);
          const lastNewline = buffer.lastIndexOf(0x0a, buffer.length - 2);
          const lower = lastNewline + 1;
          // Same bound as above: never cut at exactly the record boundary, where
          // only the newline is lost and the event survives by design.
          const span = buffer.length - 1 - lower;
          const cut = lower + 1 + Math.floor(cutRatio * (span - 2));
          await fs.truncate(logPath, cut);

          const survivors = inputs.length - 1;
          const reopened = await SessionEventLog.open(logPath);
          expect(reopened.repairedTail).toBe(true);
          expect(reopened.nextSequence).toBe(survivors);
          const appended = await reopened.append(next);
          await reopened.close();

          // No gap and no reuse across the repair boundary.
          expect(appended.seq).toBe(survivors);

          const result = await readEventLog(logPath);
          expect(result.truncatedTail).toBe(false);
          expect(result.events.map((event) => event.seq)).toEqual(
            Array.from({ length: survivors + 1 }, (_unused, i) => i)
          );
          expect(result.events[survivors]?.kind).toBe(next.kind);

          // A second reopen must read cleanly — the repaired file never trips
          // the middle-corruption error path.
          const again = await SessionEventLog.open(logPath);
          expect(again.repairedTail).toBe(false);
          expect(again.nextSequence).toBe(survivors + 1);
          await again.close();
        }
      ),
      { numRuns: 40 }
    );
  });

  it('keeps seq dense and lines whole under interleaved concurrent appends', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(eventArb, { minLength: 2, maxLength: 30 }),
        async (inputs) => {
          const logPath = freshLogPath();
          const log = await SessionEventLog.open(logPath);
          const appended = await Promise.all(inputs.map((input) => log.append(input)));
          await log.close();

          expect(appended.map((event) => event.seq)).toEqual(
            Array.from({ length: inputs.length }, (_unused, i) => i)
          );

          const raw = await fs.readFile(logPath, 'utf8');
          const lines = raw.split('\n').filter((line) => line.length > 0);
          expect(lines).toHaveLength(inputs.length);
          for (const line of lines) {
            expect(() => JSON.parse(line) as unknown).not.toThrow();
          }

          const result = await readEventLog(logPath);
          expect(result.events.map((event) => event.seq)).toEqual(
            Array.from({ length: inputs.length }, (_unused, i) => i)
          );
        }
      ),
      { numRuns: 40 }
    );
  });
});
