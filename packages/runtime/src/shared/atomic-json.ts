import { randomBytes } from 'crypto';
import * as fs from 'fs/promises';

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
export async function writeJsonAtomic(filePath: string, value: unknown): Promise<void> {
  const tmpPath = `${filePath}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`;
  try {
    const handle = await fs.open(tmpPath, 'wx');
    try {
      await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
      await handle.sync();
    } finally {
      await handle.close();
    }
    await fs.rename(tmpPath, filePath);
  } catch (error) {
    // Do not leave the scratch file behind on a failed write; a fixed name was
    // at least self-cleaning on the next attempt, a unique one is not.
    await fs.rm(tmpPath, { force: true });
    throw error;
  }
}
