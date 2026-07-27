import { randomBytes } from 'crypto';
import * as fs from 'fs/promises';
import { Schema } from 'effect';
import { SSession, type Session, safeParse } from '@srgnt/contracts';

/** Encoded (on-disk) shape of a session record — `kind` may be omitted. */
export type SessionMetaInput = Schema.Schema.Encoded<typeof SSession>;

export class SessionMetaError extends Error {
  constructor(
    message: string,
    public readonly reason: 'unreadable' | 'invalid',
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'SessionMetaError';
  }
}

/** Decode + validate an arbitrary value into a `Session`, throwing `SessionMetaError`. */
export function parseSessionMeta(value: unknown, subject: string): Session {
  const result = safeParse(SSession, value);
  if (!result.success) {
    throw new SessionMetaError(`Invalid session meta: ${subject}`, 'invalid', result.error);
  }
  return result.data;
}

export async function readSessionMeta(metaPath: string): Promise<Session> {
  let raw: string;
  try {
    raw = await fs.readFile(metaPath, 'utf8');
  } catch (error) {
    throw new SessionMetaError(`Cannot read session meta: ${metaPath}`, 'unreadable', error);
  }

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch (error) {
    throw new SessionMetaError(`Session meta is not valid JSON: ${metaPath}`, 'invalid', error);
  }

  return parseSessionMeta(value, metaPath);
}

/**
 * Write `meta.json` atomically: a fully written temp file is `rename`d over the
 * target, so a crash mid-write leaves the previous readable meta untouched and
 * at worst a stray `.tmp` beside it. Meta is tiny and always rewritten whole —
 * `events.jsonl` is the only append-only file.
 */
export async function writeSessionMeta(metaPath: string, session: Session): Promise<Session> {
  const validated = parseSessionMeta(session, metaPath);
  // Unique per write. A fixed `${metaPath}.tmp` means two overlapping writes
  // share one inode: the second `open(..., 'w')` truncates the file the first is
  // still filling, and whichever `rename` lands first can publish a partial
  // document — which is exactly the atomicity this function exists to provide.
  const tmpPath = `${metaPath}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`;
  try {
    const handle = await fs.open(tmpPath, 'wx');
    try {
      await handle.writeFile(`${JSON.stringify(validated, null, 2)}\n`, 'utf8');
      await handle.sync();
    } finally {
      await handle.close();
    }
    await fs.rename(tmpPath, metaPath);
  } catch (error) {
    // Do not leave the scratch file behind on a failed write; the old fixed
    // name was at least self-cleaning on the next attempt, a unique one is not.
    await fs.rm(tmpPath, { force: true });
    throw error;
  }
  return validated;
}
