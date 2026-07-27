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

function decodeLine(raw: string): SessionEvent | undefined {
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
    const event = decodeLine(buffer.toString('utf8', start, end));

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

  private constructor(
    readonly eventsPath: string,
    private readonly handle: FileHandle,
    private nextSeq: number,
    /** True when opening had to repair a corrupt or unterminated tail. */
    readonly repairedTail: boolean
  ) {}

  static async open(eventsPath: string): Promise<SessionEventLog> {
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
      existing.truncatedTail
    );
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
    const event: SessionEvent = {
      seq: this.nextSeq++,
      ts: input.ts ?? new Date().toISOString(),
      protocolVersion: input.protocolVersion ?? 0,
      kind: input.kind,
      ...(input.payload === undefined ? {} : { payload: input.payload }),
    };
    const line = `${JSON.stringify(event)}\n`;
    const written = this.tail.then(() => this.handle.write(line)).then(() => event);
    // Keep the chain alive after a failed write so later appends still serialize.
    this.tail = written.catch(() => undefined);
    return written;
  }

  /** Resolve once every queued append has been written. */
  async drain(): Promise<void> {
    await this.tail;
  }

  async close(): Promise<void> {
    await this.tail;
    // ponytail: fsync on close only, not per append — one trivial Pi turn is
    // 85+ updates. Durability contract is "at most the in-flight chunk is
    // lost". Per-checkpoint fsync arrives with STEP-24-05 if it is ever needed.
    try {
      await this.handle.sync();
    } finally {
      await this.handle.close();
    }
  }
}
