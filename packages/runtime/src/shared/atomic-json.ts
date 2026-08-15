import { randomBytes } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Write a JSON document atomically: a fully written, fsync'd temp file is
 * `rename`d over the target, so a crash mid-write leaves the previous readable
 * document untouched and at worst a stray `.tmp` beside it.
 *
 * The temp name is unique per write. A fixed `${filePath}.tmp` means two
 * overlapping writes share one inode: the second `open(..., 'w')` truncates the
 * file the first is still filling, and whichever `rename` lands first can
 * publish a partial document — exactly the atomicity this exists to provide.
 *
 * Shared by `meta.json` (sessions) and `project.json` (projects); both are tiny
 * and always rewritten whole. `events.jsonl` is the only append-only file.
 */
export async function writeJsonAtomic(filePath: string, value: unknown, mode?: number): Promise<void> {
  await writeFileAtomic(filePath, `${JSON.stringify(value, null, 2)}\n`, mode);
}

/**
 * The same tmp+fsync+rename discipline for a plain text document. Used by
 * `transcript.md` (STEP-24-05), which is markdown rather than JSON but needs
 * the identical guarantee: a reader (memsearch, an editor) must never observe
 * a half-written file, and a crash mid-checkpoint must leave the previous
 * render intact.
 */
export async function writeFileAtomic(filePath: string, contents: string, mode?: number): Promise<void> {
  const tmpPath = `${filePath}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`;
  try {
    // The mode is applied to the TEMP file, which is the file the contents ever
    // live in: creating it world-readable and tightening the permissions after
    // the rename would leave exactly the window `0600` exists to close. The
    // explicit `chmod` is because `open`'s mode is masked by the process umask,
    // and "at most 0600" is not the same promise as "0600".
    const handle = await fs.open(tmpPath, 'wx', mode);
    try {
      if (mode !== undefined) await handle.chmod(mode);
      await handle.writeFile(contents, 'utf8');
      await handle.sync();
    } finally {
      await handle.close();
    }
    await fs.rename(tmpPath, filePath);
    await syncDirectory(path.dirname(filePath));
  } catch (error) {
    // Do not leave the scratch file behind on a failed write; a fixed name was
    // at least self-cleaning on the next attempt, a unique one is not.
    await fs.rm(tmpPath, { force: true });
    throw error;
  }
}

/**
 * `handle.sync()` flushes the temp file's contents; the *rename* lives in the
 * parent directory, so without this a crash can lose the publish and leave the
 * old document — or, for the merge journal, leave recovery blind to work that
 * already started.
 *
 * Not every platform lets you fsync a directory (Windows rejects the open), and
 * failing a completed write over a durability hint would be worse than the hint.
 */
async function syncDirectory(directory: string): Promise<void> {
  let handle;
  try {
    handle = await fs.open(directory, 'r');
  } catch {
    return;
  }
  try {
    await handle.sync();
  } catch {
    // EINVAL/EPERM/EISDIR depending on platform and filesystem.
  } finally {
    await handle.close();
  }
}
