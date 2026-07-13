import type { LaunchSpec } from '@srgnt/contracts';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { FakeChild } from './__fixtures__/fake-child.js';
import { HarnessProcess } from './harness-process.js';
import type { ProcessState } from './types.js';

const LAUNCH: LaunchSpec = { command: 'fake', args: [], env: {} };

// Every edge the linear, single-use machine may take. The first three are the
// happy path; the rest are the dispose-before-ready / failure paths:
//   idle->dead        dispose() before the process was ever started
//   spawning->dead    spawn error (ENOENT) before 'spawn' fired
//   spawning->reaping  dispose() while still spawning (no pid yet)
//   ready->dead       the process crashed / exited on its own
const LEGAL_TRANSITIONS = new Set<`${ProcessState}->${ProcessState}`>([
  'idle->spawning',
  'idle->dead',
  'spawning->ready',
  'spawning->dead',
  'spawning->reaping',
  'ready->reaping',
  'ready->dead',
  'reaping->dead',
]);

type Command = 'start' | 'spawn' | 'exit-clean' | 'exit-crash' | 'error' | 'dispose';

const command = fc.constantFrom<Command>(
  'start',
  'spawn',
  'exit-clean',
  'exit-crash',
  'error',
  'dispose',
);

const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

describe('HarnessProcess state machine (property)', () => {
  it('never takes an illegal transition under arbitrary event sequences', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(command, { maxLength: 12 }), async (commands) => {
        let child: FakeChild | undefined;
        const process = new HarnessProcess({
          launch: LAUNCH,
          killGraceMs: 5,
          delay: () => Promise.resolve(),
          spawnChild: () => {
            child = new FakeChild();
            return child;
          },
          killTree: () => {
            /* the fixture drives exits explicitly */
          },
        });

        const seen: ProcessState[] = [process.state];
        process.onStateChange((state) => seen.push(state));

        for (const cmd of commands) {
          switch (cmd) {
            case 'start':
              process.start().catch(() => {});
              break;
            case 'spawn':
              child?.spawnOk();
              break;
            case 'exit-clean':
              child?.exit(0, null);
              break;
            case 'exit-crash':
              child?.exit(1, null);
              break;
            case 'error':
              child?.fail(new Error('boom'));
              break;
            case 'dispose':
              process.dispose().catch(() => {});
              break;
          }
          await flush();
        }

        for (let i = 1; i < seen.length; i += 1) {
          const edge = `${seen[i - 1]}->${seen[i]}` as `${ProcessState}->${ProcessState}`;
          expect(LEGAL_TRANSITIONS.has(edge), `illegal transition ${edge}`).toBe(true);
        }
        // `dead` is terminal: it may only ever be the last observed state.
        const deadAt = seen.indexOf('dead');
        if (deadAt !== -1) {
          expect(deadAt).toBe(seen.length - 1);
        }
      }),
      { numRuns: 250 },
    );
  });
});
