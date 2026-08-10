import type { SessionNotification } from '@agentclientprotocol/sdk';
import { Stream } from 'effect';
import { ConnectionLost } from './errors.js';

/**
 * Non-fatal events the hub reports instead of crashing: updates for unknown
 * sessions are dropped with a warning (tolerant reader, ARCH-0009).
 */
export type UpdateWarning =
  | {
      readonly kind: 'unknown-session';
      readonly sessionId: string;
      readonly notification: SessionNotification;
    }
  | {
      readonly kind: 'after-end';
      readonly sessionId: string;
      readonly notification: SessionNotification;
    };

interface Channel {
  /** Unbounded buffer so a slow consumer can never block the connection read loop. */
  buffer: SessionNotification[];
  waiter: ((result: IteratorResult<SessionNotification>) => void) | undefined;
  ended: boolean;
}

/**
 * Routes `session/update` notifications into per-session, backpressure-safe
 * queues. `dispatch` never throws and never blocks: the connection read loop
 * stays live no matter how slowly (or whether) consumers drain their streams.
 *
 * One consumer per session: `updates(sessionId)` returns the session's single
 * ordered queue; fan-out belongs to callers.
 */
export class SessionUpdateHub {
  private readonly channels = new Map<string, Channel>();
  private readonly warningListeners = new Set<(warning: UpdateWarning) => void>();

  /** Starts routing updates for a sessionId (call when `session/new` returns). */
  register(sessionId: string): void {
    if (!this.channels.has(sessionId)) {
      this.channels.set(sessionId, { buffer: [], waiter: undefined, ended: false });
    }
  }

  has(sessionId: string): boolean {
    return this.channels.has(sessionId);
  }

  /** Routes one notification. Unknown or ended sessions warn and drop; never throws. */
  dispatch(notification: SessionNotification): void {
    const sessionId = notification.sessionId;
    const channel = this.channels.get(sessionId);
    if (channel === undefined) {
      this.warn({ kind: 'unknown-session', sessionId, notification });
      return;
    }
    if (channel.ended) {
      this.warn({ kind: 'after-end', sessionId, notification });
      return;
    }
    if (channel.waiter !== undefined) {
      const waiter = channel.waiter;
      channel.waiter = undefined;
      waiter({ done: false, value: notification });
      return;
    }
    channel.buffer.push(notification);
  }

  /**
   * Ordered async iterator over one session's updates. Ends (done) after
   * `end(sessionId)` once the buffer drains.
   */
  updates(sessionId: string): AsyncIterableIterator<SessionNotification> {
    this.register(sessionId);
    const channel = this.channels.get(sessionId) as Channel;
    const iterator: AsyncIterableIterator<SessionNotification> = {
      [Symbol.asyncIterator]() {
        return this;
      },
      next: () => {
        const buffered = channel.buffer.shift();
        if (buffered !== undefined) {
          return Promise.resolve({ done: false, value: buffered });
        }
        if (channel.ended) {
          // Fully drained and ended: drop the channel so its buffer can be GC'd
          // instead of lingering in the Map for the process's lifetime.
          this.channels.delete(sessionId);
          return Promise.resolve({ done: true, value: undefined });
        }
        return new Promise((resolve) => {
          channel.waiter = resolve;
        });
      },
      return: () => {
        this.end(sessionId);
        this.channels.delete(sessionId);
        return Promise.resolve({ done: true, value: undefined });
      },
    };
    return iterator;
  }

  /** Same updates as an Effect Stream (errors as ConnectionLost defects never occur here). */
  updateStream(sessionId: string): Stream.Stream<SessionNotification, ConnectionLost> {
    return Stream.fromAsyncIterable(
      this.updates(sessionId),
      (cause) =>
        new ConnectionLost({
          message: `Update stream for session ${sessionId} failed`,
          cause,
        }),
    );
  }

  /**
   * Takes everything currently queued for a session, synchronously, without
   * waiting for more.
   *
   * The `updates()` iterator cannot do this: on an empty buffer its `next()`
   * parks until the next live frame, so "read the replay and stop" would block
   * on traffic that may never come. A `session/load` replay is fully queued by
   * the time `load()` resolves (the notifications precede the response on the
   * wire), so a client can take exactly the replay here and then hand the same
   * channel to its live pump — which is what keeps replayed frames out of the
   * persistence tap.
   */
  takeBuffered(sessionId: string): SessionNotification[] {
    const channel = this.channels.get(sessionId);
    if (channel === undefined || channel.buffer.length === 0) return [];
    return channel.buffer.splice(0, channel.buffer.length);
  }

  /** Marks a session's stream complete; buffered updates still drain. */
  end(sessionId: string): void {
    const channel = this.channels.get(sessionId);
    if (channel === undefined || channel.ended) {
      return;
    }
    channel.ended = true;
    if (channel.waiter !== undefined && channel.buffer.length === 0) {
      const waiter = channel.waiter;
      channel.waiter = undefined;
      // Terminal delivery to a blocked consumer: the channel is finished, so
      // remove it. (An ended channel with no waiter is kept so late dispatches
      // still warn `after-end` rather than `unknown-session`.)
      this.channels.delete(sessionId);
      waiter({ done: true, value: undefined });
    }
  }

  /** Ends every session stream (connection closed). */
  endAll(): void {
    // Snapshot keys: end() may delete channels mid-iteration.
    for (const sessionId of [...this.channels.keys()]) {
      this.end(sessionId);
    }
  }

  /** Subscribes to drop warnings; returns an unsubscribe function. */
  onWarning(listener: (warning: UpdateWarning) => void): () => void {
    this.warningListeners.add(listener);
    return () => {
      this.warningListeners.delete(listener);
    };
  }

  private warn(warning: UpdateWarning): void {
    for (const listener of this.warningListeners) {
      listener(warning);
    }
  }
}
