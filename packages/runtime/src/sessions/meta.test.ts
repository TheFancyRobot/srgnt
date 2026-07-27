import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import type { Session } from '@srgnt/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SessionMetaError, readSessionMeta, writeSessionMeta } from './meta.js';

let dir: string;
let metaPath: string;

const session: Session = {
  id: 'sess-1',
  projectId: 'proj-1',
  harnessId: 'pi',
  kind: 'single',
  status: 'idle',
  title: 'A session with ünïcode 🎈',
  acpSessionId: 'acp-abc',
  createdAt: '2026-07-27T00:00:00.000Z',
};

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'srgnt-meta-'));
  metaPath = path.join(dir, 'meta.json');
});

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

describe('session meta', () => {
  it('round-trips the contracts Session shape', async () => {
    await writeSessionMeta(metaPath, session);
    expect(await readSessionMeta(metaPath)).toEqual(session);
  });

  it('fills the kind default when it is absent on disk', async () => {
    const { kind: _dropped, ...withoutKind } = session;
    await fs.writeFile(metaPath, JSON.stringify(withoutKind));
    expect((await readSessionMeta(metaPath)).kind).toBe('single');
  });

  it('reports a missing file as unreadable', async () => {
    await expect(readSessionMeta(metaPath)).rejects.toMatchObject({
      name: 'SessionMetaError',
      reason: 'unreadable',
    });
  });

  it.each([
    ['not json', 'not json at all'],
    ['wrong status', JSON.stringify({ ...session, status: 'sleeping' })],
    ['missing harnessId', JSON.stringify({ id: 'a', projectId: 'b', status: 'idle', createdAt: session.createdAt })],
    ['bad createdAt', JSON.stringify({ ...session, createdAt: 'yesterday' })],
  ])('rejects invalid meta (%s)', async (_label, raw) => {
    await fs.writeFile(metaPath, raw);
    await expect(readSessionMeta(metaPath)).rejects.toMatchObject({
      name: 'SessionMetaError',
      reason: 'invalid',
    });
  });

  it('refuses to write invalid meta', async () => {
    await expect(
      writeSessionMeta(metaPath, { ...session, status: 'bogus' } as unknown as Session)
    ).rejects.toBeInstanceOf(SessionMetaError);
    // Nothing was written, not even a temp file.
    expect(await fs.readdir(dir)).toEqual([]);
  });

  it('leaves the readable meta intact when a previous write crashed mid-flight', async () => {
    await writeSessionMeta(metaPath, session);
    // A crash between the temp write and the rename leaves a stray .tmp.
    await fs.writeFile(`${metaPath}.tmp`, '{"half-writ');

    expect(await readSessionMeta(metaPath)).toEqual(session);

    // The next successful write replaces the stray temp and renames cleanly.
    const updated: Session = { ...session, status: 'closed' };
    await writeSessionMeta(metaPath, updated);
    expect(await readSessionMeta(metaPath)).toEqual(updated);
    // The stray scratch file from the crashed write is NOT adopted by the next
    // one — temp names are unique per write, so an interrupted write can never
    // hand its half-filled inode to a later one.
    expect(await fs.readdir(dir)).toContain('meta.json');
    expect(await fs.readdir(dir)).toContain('meta.json.tmp');
  });
});
