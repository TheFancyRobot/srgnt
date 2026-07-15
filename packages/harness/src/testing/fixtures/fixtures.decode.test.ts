import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isKnownSessionEventKind, readSessionEvent } from '@srgnt/contracts';
import { describe, expect, it } from 'vitest';

/**
 * Tolerant-decode suite over the recorded ACP traffic corpus. Pins the reader's
 * behavior (ARCH-0009): recorded frames must decode with zero errors, unknown
 * `kind`s and unknown extra envelope fields must not fail, and the opaque
 * `payload` must survive verbatim so unknown ACP update fields are preserved.
 */

const piDir = join(dirname(fileURLToPath(import.meta.url)), 'pi');

const fixtureFiles = readdirSync(piDir).filter((f) => f.endsWith('.jsonl'));

function readLines(file: string): { line: string; value: unknown }[] {
  return readFileSync(join(piDir, file), 'utf8')
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => ({ line, value: JSON.parse(line) as unknown }));
}

describe('recorded Pi fixtures decode through the tolerant reader', () => {
  it('discovers the committed corpus', () => {
    expect(fixtureFiles.sort()).toEqual(['cancelled-turn.jsonl', 'simple-prompt.jsonl', 'tool-use.jsonl']);
  });

  it.each(fixtureFiles)('every frame in %s decodes with zero errors', (file) => {
    const lines = readLines(file);
    expect(lines.length).toBeGreaterThan(0);
    for (const { value } of lines) {
      const result = readSessionEvent(value);
      expect(result.success, `failed to decode: ${JSON.stringify(value)}`).toBe(true);
    }
  });

  it('preserves the opaque payload verbatim, including unknown ACP update variants', () => {
    // tool-use.jsonl carries a line whose update variant the SDK does not know.
    const lines = readLines('tool-use.jsonl');
    const unknownUpdate = lines.find(
      ({ value }) =>
        (value as { payload?: { update?: { sessionUpdate?: string } } }).payload?.update?.sessionUpdate ===
        'pi_experimental_reasoning_summary',
    );
    expect(unknownUpdate).toBeDefined();
    const result = readSessionEvent(unknownUpdate!.value);
    expect(result.success).toBe(true);
    if (result.success) {
      // Payload is opaque (Schema.Unknown) → unknown update fields survive.
      expect(result.data.payload).toEqual((unknownUpdate!.value as { payload: unknown }).payload);
    }
  });

  it('drops unknown extra envelope fields on decode', () => {
    // The same tool-use line carries a stray top-level `note` field.
    const withExtra = readLines('tool-use.jsonl').find(
      ({ value }) => Object.prototype.hasOwnProperty.call(value, 'note'),
    );
    expect(withExtra).toBeDefined();
    const result = readSessionEvent(withExtra!.value);
    expect(result.success).toBe(true);
    if (result.success) {
      expect('note' in result.data).toBe(false);
    }
  });

  it('accepts an unknown envelope kind without failing (open string set)', () => {
    const future = {
      seq: 99,
      ts: '2026-07-14T12:00:00.000Z',
      protocolVersion: 1,
      kind: 'future/not_yet_invented',
      payload: { anything: true },
    };
    expect(isKnownSessionEventKind(future.kind)).toBe(false);
    expect(readSessionEvent(future).success).toBe(true);
  });

  it('still fails on structural damage to the envelope itself', () => {
    // Missing required `seq` / `ts` is a genuine decode failure, not tolerated.
    expect(readSessionEvent({ kind: 'acp/session_update', payload: {} }).success).toBe(false);
  });
});
