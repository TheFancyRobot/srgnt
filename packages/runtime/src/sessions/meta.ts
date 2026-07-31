import * as fs from 'fs/promises';
import { Schema } from 'effect';
import { SSession, type Session, safeParse } from '@srgnt/contracts';
import { writeJsonAtomic } from '../shared/atomic-json.js';

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

/** Validate, then write `meta.json` atomically (see {@link writeJsonAtomic}). */
export async function writeSessionMeta(metaPath: string, session: Session): Promise<Session> {
  const validated = parseSessionMeta(session, metaPath);
  await writeJsonAtomic(metaPath, validated);
  return validated;
}
