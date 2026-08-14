import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { writeJsonAtomic } from './atomic-json.js';

let dir = '';

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'srgnt-atomic-'));
});

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

describe('writeJsonAtomic', () => {
  it('publishes the document and leaves no scratch file behind', async () => {
    const file = path.join(dir, 'doc.json');
    await writeJsonAtomic(file, { a: 1 });
    expect(JSON.parse(await fs.readFile(file, 'utf8'))).toEqual({ a: 1 });
    expect(await fs.readdir(dir)).toEqual(['doc.json']);
  });

  it('gives the published file the requested mode, tmp window included', async () => {
    // See the harnesses service tests: `stat().mode` is not POSIX permission
    // bits on Windows, where this suite also runs.
    if (process.platform === 'win32') return;
    const file = path.join(dir, 'private.json');
    await writeJsonAtomic(file, { secret: false }, 0o600);
    // `rename` moves the temp file's inode, so the mode read here IS the mode
    // the temp file carried while the contents were being written — nothing
    // chmods after publishing. A helper that skipped the mode would land 0644.
    expect((await fs.stat(file)).mode & 0o777).toBe(0o600);
  });

  it('leaves the mode to the process default when none is requested', async () => {
    if (process.platform === 'win32') return;
    const file = path.join(dir, 'plain.json');
    await writeJsonAtomic(file, { a: 1 });
    expect((await fs.stat(file)).mode & 0o600).toBe(0o600);
  });
});
