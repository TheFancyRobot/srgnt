import type { SessionNotification } from '@agentclientprotocol/sdk';
import { Chunk, Effect, Stream } from 'effect';
import { describe, expect, it } from 'vitest';
import { SessionUpdateHub, type UpdateWarning } from './stream.js';

const note = (sessionId: string, text: string): SessionNotification => ({
  sessionId,
  update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text } },
});

const textOf = (n: SessionNotification): string =>
  n.update.sessionUpdate === 'agent_message_chunk' && n.update.content.type === 'text'
    ? n.update.content.text
    : '';

describe('SessionUpdateHub', () => {
  it('buffers updates dispatched before the consumer starts reading (slow consumer)', async () => {
    const hub = new SessionUpdateHub();
    hub.register('s1');
    for (let i = 0; i < 100; i++) {
      hub.dispatch(note('s1', `chunk-${i}`));
    }
    // dispatch never blocked; now drain
    const iterator = hub.updates('s1');
    const received: string[] = [];
    for (let i = 0; i < 100; i++) {
      const result = await iterator.next();
      expect(result.done).toBe(false);
      received.push(textOf(result.value as SessionNotification));
    }
    expect(received[0]).toBe('chunk-0');
    expect(received[99]).toBe('chunk-99');
  });

  it('hands updates directly to a waiting consumer in order', async () => {
    const hub = new SessionUpdateHub();
    hub.register('s1');
    const iterator = hub.updates('s1');
    const pending = iterator.next();
    hub.dispatch(note('s1', 'live'));
    const result = await pending;
    expect(result.done).toBe(false);
    expect(textOf(result.value as SessionNotification)).toBe('live');
  });

  it('drops updates for unknown sessionIds with a warning, never a crash', () => {
    const hub = new SessionUpdateHub();
    const warnings: UpdateWarning[] = [];
    hub.onWarning((w) => warnings.push(w));
    expect(() => hub.dispatch(note('ghost', 'boo'))).not.toThrow();
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({ kind: 'unknown-session', sessionId: 'ghost' });
  });

  it('warns and drops updates dispatched after end()', () => {
    const hub = new SessionUpdateHub();
    hub.register('s1');
    hub.end('s1');
    const warnings: UpdateWarning[] = [];
    hub.onWarning((w) => warnings.push(w));
    hub.dispatch(note('s1', 'late'));
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({ kind: 'after-end', sessionId: 's1' });
  });

  it('end() lets buffered updates drain before completing the iterator', async () => {
    const hub = new SessionUpdateHub();
    hub.register('s1');
    hub.dispatch(note('s1', 'a'));
    hub.dispatch(note('s1', 'b'));
    hub.end('s1');
    const iterator = hub.updates('s1');
    expect(textOf((await iterator.next()).value as SessionNotification)).toBe('a');
    expect(textOf((await iterator.next()).value as SessionNotification)).toBe('b');
    expect((await iterator.next()).done).toBe(true);
  });

  it('drops the channel once ended and fully drained (no unbounded Map growth)', async () => {
    const hub = new SessionUpdateHub();
    hub.register('s1');
    hub.dispatch(note('s1', 'a'));
    hub.end('s1');
    // An ended-but-undrained channel is retained so late dispatches still warn.
    expect(hub.has('s1')).toBe(true);
    const iterator = hub.updates('s1');
    await iterator.next(); // 'a'
    await iterator.next(); // done → channel removed
    expect(hub.has('s1')).toBe(false);
  });

  it('drops the channel when a blocked consumer is completed by endAll()', async () => {
    const hub = new SessionUpdateHub();
    hub.register('s1');
    const iterator = hub.updates('s1');
    const pending = iterator.next();
    hub.endAll();
    await pending;
    expect(hub.has('s1')).toBe(false);
  });

  it('endAll() completes a consumer blocked on next()', async () => {
    const hub = new SessionUpdateHub();
    hub.register('s1');
    const iterator = hub.updates('s1');
    const pending = iterator.next();
    hub.endAll();
    expect((await pending).done).toBe(true);
  });

  it('exposes updates as an Effect Stream', async () => {
    const hub = new SessionUpdateHub();
    hub.register('s1');
    hub.dispatch(note('s1', 'x'));
    hub.dispatch(note('s1', 'y'));
    hub.end('s1');
    const collected = await Effect.runPromise(Stream.runCollect(hub.updateStream('s1')));
    expect(Chunk.toReadonlyArray(collected).map(textOf)).toEqual(['x', 'y']);
  });
});
