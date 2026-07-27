import * as fs from 'fs/promises';
import type { FileHandle } from 'fs/promises';
import { readSessionEvent, type SessionEvent } from '@srgnt/contracts';

const NEWLINE = 0x0a;

export interface ReadEventsResult {
  events: SessionEvent[];
  /**
   * True when the file did not end cleanly on a record boundary — the expected
   * shape of a crash mid-append. Either the trailing bytes could not be decoded
   * (dropped, never returned as a partial event) or the final record landed
   * without its newline.
   */
  truncatedTail: boolean;
  /** Byte offset where a clean append should resume. */
  lastValidByteOffset: number;
  /** The final record decoded but its newline never landed; repair re-adds it. */
  tailMissingNewline: boolean;
}

/**
 * Raised when a line that is *not* the unterminated tail fails to decode.
 * Silently skipping interior damage would hide real data loss, and it is
 * outside the crash model this store is built for — the ARCH-0009 corrupt-tail
 * failure mode covers the tail only.
 */
export class SessionEventLogCorruptionError extends Error {
  constructor(
    message: string,
    public readonly lineNumber: number,
    public readonly byteOffset: number
  ) {
    super(message);
    this.name = 'SessionEventLogCorruptionError';
  }
}

/**
 * An append was refused or failed. Distinct from corruption: the file on disk
 * is still readable, but this handle will not write to it again.
 */
export class SessionEventLogWriteError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'SessionEventLogWriteError';
  }
}

/** Strict decoder: throws on malformed UTF-8 instead of substituting U+FFFD. */
const strictDecoder = new TextDecoder('utf8', { fatal: true });

function decodeUtf8Strict(buffer: Buffer, start: number, end: number): string | undefined {
  try {
    return strictDecoder.decode(buffer.subarray(start, end));
  } catch {
    return undefined;
  }
}

function decodeLine(raw: string | undefined): SessionEvent | undefined {
  if (raw === undefined) return undefined;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return undefined;
  }
  const decoded = readSessionEvent(value);
  return decoded.success ? decoded.data : undefined;
}

/**
 * Read a whole `events.jsonl` tolerantly. A missing file reads as an empty log
 * (a crash between directory creation and the first append). Unknown `kind`
 * values and unknown extra envelope fields decode fine by design.
 */
export async function readEventLog(
  eventsPath: string,
  options: { fromSeq?: number } = {}
): Promise<ReadEventsResult> {
  let buffer: Buffer;
  try {
    buffer = await fs.readFile(eventsPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
      return {
        events: [],
        truncatedTail: false,
        lastValidByteOffset: 0,
        tailMissingNewline: false,
      };
    }
    throw error;
  }

  const events: SessionEvent[] = [];
  let lastValidByteOffset = 0;
  let truncatedTail = false;
  let tailMissingNewline = false;
  let start = 0;
  let lineNumber = 0;

  while (start < buffer.length) {
    lineNumber += 1;
    const newlineAt = buffer.indexOf(NEWLINE, start);
    const terminated = newlineAt !== -1;
    const end = terminated ? newlineAt : buffer.length;
    // Strict UTF-8, per line. `Buffer.toString('utf8')` substitutes U+FFFD for
    // invalid sequences, so flipped bytes inside a string could decode to
    // still-valid JSON and be accepted as a silently altered payload — in the
    // file that is meant to be the session's source of truth. A line that is
    // not valid UTF-8 takes the same path as one that is not valid JSON.
    const event = decodeLine(decodeUtf8Strict(buffer, start, end));

    if (event === undefined) {
      if (!terminated) {
        // Unterminated trailing garbage: the crash case. Drop it.
        truncatedTail = true;
        break;
      }
      throw new SessionEventLogCorruptionError(
        `Corrupt line ${lineNumber} in ${eventsPath} (not the unterminated tail)`,
        lineNumber,
        start
      );
    }

    events.push(event);
    if (terminated) {
      lastValidByteOffset = newlineAt + 1;
      start = newlineAt + 1;
      continue;
    }
    // A valid record whose newline never landed. The data is intact, so keep
    // the event; repair re-adds the newline rather than dropping the record.
    lastValidByteOffset = buffer.length;
    truncatedTail = true;
    tailMissingNewline = true;
    break;
  }

  const { fromSeq } = options;
  return {
    events: fromSeq === undefined ? events : events.filter((event) => event.seq >= fromSeq),
    truncatedTail,
    lastValidByteOffset,
    tailMissingNewline,
  };
}

/**
 * Advisory single-writer lock beside the log.
 *
 * `nextSeq` is derived from a snapshot read, so two handles on one file compute
 * the same next number and both append successfully — duplicate `seq` in the
 * source of truth, with nothing raised. The desktop app does not take an
 * Electron single-instance lock, so a second process is not hypothetical.
 *
 * A lock whose owner is gone is stolen rather than honored: a crash must not
 * make a session permanently unopenable.
 */
async function acquireWriterLock(eventsPath: string): Promise<string> {
  const lockPath = `${eventsPath}.lock`;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const handle = await fs.open(lockPath, 'wx');
      try {
        await handle.writeFile(String(process.pid), 'utf8');
      } finally {
        await handle.close();
      }
      return lockPath;
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code !== 'EEXIST') throw error;
      if (attempt === 1) break;
      if (await lockOwnerIsAlive(lockPath)) break;
      await fs.rm(lockPath, { force: true });
    }
  }
  throw new SessionEventLogWriteError(
    `${eventsPath} is already open for writing by another handle (${lockPath})`
  );
}

async function lockOwnerIsAlive(lockPath: string): Promise<boolean> {
  let pid: number;
  try {
    pid = Number.parseInt(await fs.readFile(lockPath, 'utf8'), 10);
  } catch {
    // Vanished between EEXIST and the read, or unreadable: treat as free and
    // let the retry decide.
    return false;
  }
  if (!Number.isInteger(pid) || pid <= 0) return false;
  if (pid === process.pid) return true;
  try {
    // Signal 0 tests for existence without delivering anything.
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // EPERM means it exists and belongs to someone else — still alive.
    return (error as NodeJS.ErrnoException)?.code === 'EPERM';
  }
}

async function releaseWriterLock(lockPath: string): Promise<void> {
  await fs.rm(lockPath, { force: true });
}

export interface AppendEventInput {
  kind: string;
  payload?: unknown;
  /** Negotiated ACP protocol version; `0` when no connection exists yet. */
  protocolVersion?: number;
  ts?: string;
}

/**
 * Append handle for one session's `events.jsonl`.
 *
 * Opening repairs before it appends: if the previous run left a corrupt or
 * unterminated tail, the file is brought back to a clean record boundary
 * *before* the append handle exists. Without that, the next append would turn
 * the corrupt tail into an interior line and every later read would hit the
 * corruption error path.
 */
export class SessionEventLog {
  private tail: Promise<unknown> = Promise.resolve();
  /** Set by the first failed append; every later append is refused. */
  private failure: unknown;

  private constructor(
    readonly eventsPath: string,
    private readonly handle: FileHandle,
    private nextSeq: number,
    /** True when opening had to repair a corrupt or unterminated tail. */
    readonly repairedTail: boolean,
    private readonly lockPath: string
  ) {}

  // ponytail: `open` (and `readEventLog`) read the whole file — to learn the
  // last seq here, and because `fromSeq` filters after parsing there. Fine
  // while nothing consumes this; a streaming reader plus a seq→offset index is
  // the upgrade once ChatSessionController polls it. See STEP-24-02 follow-ups.
  static async open(eventsPath: string): Promise<SessionEventLog> {
    // Exclusive first: `nextSeq` below is a snapshot, so a second writer would
    // compute the same number and interleave duplicate `seq` values into the
    // file that is meant to be the session's source of truth — silently, since
    // both appends succeed.
    const lock = await acquireWriterLock(eventsPath);
    try {
      const existing = await readEventLog(eventsPath);

      if (existing.truncatedTail) {
        if (existing.tailMissingNewline) {
          await fs.appendFile(eventsPath, '\n');
        } else {
          await fs.truncate(eventsPath, existing.lastValidByteOffset);
        }
      }

      const last = existing.events[existing.events.length - 1];
      const handle = await fs.open(eventsPath, 'a');
      return new SessionEventLog(
        eventsPath,
        handle,
        last === undefined ? 0 : last.seq + 1,
        existing.truncatedTail,
        lock
      );
    } catch (error) {
      await releaseWriterLock(lock);
      throw error;
    }
  }

  get nextSequence(): number {
    return this.nextSeq;
  }

  /**
   * Append one event. `seq` is assigned synchronously at call time and the
   * write is queued behind every earlier append, so concurrent callers get
   * dense, ordered, never-interleaved lines.
   */
  append(input: AppendEventInput): Promise<SessionEvent> {
    // A previous append failed. Continuing would either leave a hole in `seq`
    // (the failed event's number is already spent) or append a clean line after
    // a half-written one, turning a repairable tail into interior corruption
    // that `open` deliberately refuses to fix. Reopening is the repair path.
    if (this.failure !== undefined) {
      return Promise.reject(
        new SessionEventLogWriteError(
          `${this.eventsPath} is closed for writing after an append failure; reopen it to repair`,
          this.failure
        )
      );
    }

    const candidate = {
      seq: this.nextSeq,
      ts: input.ts ?? new Date().toISOString(),
      protocolVersion: input.protocolVersion ?? 0,
      kind: input.kind,
      ...(input.payload === undefined ? {} : { payload: input.payload }),
    };
    // Validate BEFORE spending the sequence number or writing. `protocolVersion`
    // is a plain `number` in the input type, so a negative, fractional, or
    // non-finite one type-checks — and a newline-terminated line the schema
    // rejects is unrecoverable interior corruption on the next read.
    const decoded = readSessionEvent(candidate);
    if (!decoded.success) {
      return Promise.reject(
        new SessionEventLogWriteError(
          `Refusing to append an invalid event to ${this.eventsPath}`,
          decoded.error
        )
      );
    }
    const event = decoded.data;

    this.nextSeq += 1;
    const line = `${JSON.stringify(event)}\n`;
    const bytes = Buffer.from(line, 'utf8');
    const written = this.tail
      .then(async () => {
        const { bytesWritten } = await this.handle.write(bytes);
        // A short write leaves a torn record on disk while the caller is told
        // the event was appended.
        if (bytesWritten !== bytes.length) {
          throw new SessionEventLogWriteError(
            `Short write to ${this.eventsPath}: ${bytesWritten} of ${bytes.length} bytes`
          );
        }
        return event;
      })
      .catch((cause: unknown) => {
        this.failure ??= cause;
        throw cause;
      });
    // Keep the chain alive so a later append still serializes behind this one
    // (it will be rejected by the guard above, but never interleaved).
    this.tail = written.catch(() => undefined);
    return written;
  }

  /** Resolve once every queued append has been written. */
  async drain(): Promise<void> {
    await this.tail;
  }

  async close(): Promise<void> {
    await this.tail.catch(() => undefined);
    // ponytail: fsync on close only, not per append — one trivial Pi turn is
    // 85+ updates. Durability contract is "at most the in-flight chunk is
    // lost". Per-checkpoint fsync arrives with STEP-24-05 if it is ever needed.
    try {
      await this.handle.sync();
    } catch {
      // A failed handle (the poisoned case) cannot be synced; closing and
      // releasing the lock still has to happen.
    } finally {
      try {
        await this.handle.close();
      } finally {
        await releaseWriterLock(this.lockPath);
      }
    }
  }
}
