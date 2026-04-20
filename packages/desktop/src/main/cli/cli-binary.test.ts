import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { spawn } from 'node:child_process';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

/**
 * End-to-end coverage that runs the compiled CLI binary as a child process so
 * the packaged artifact is exercised, not just the source modules.
 *
 * This test is intentionally small: it proves that `dist/main/cli/index.js` is
 * a runnable Node script, that it handles argument parsing + workspace
 * resolution in a real process, and that its stdout is the expected shape.
 * Deeper behaviour is covered by the in-process `cli-integration.test.ts`.
 */

const distCliPath = path.resolve(__dirname, '../../../dist/main/cli/index.js');

async function distExists(): Promise<boolean> {
  try {
    await fs.access(distCliPath);
    return true;
  } catch {
    return false;
  }
}

const tempDirs: string[] = [];

async function makeWorkspace(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'srgnt-cli-bin-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((d) => fs.rm(d, { recursive: true, force: true })));
});

interface SpawnResult {
  code: number;
  stdout: string;
  stderr: string;
}

async function runBinary(args: readonly string[], env: NodeJS.ProcessEnv = {}): Promise<SpawnResult> {
  return new Promise<SpawnResult>((resolve, reject) => {
    const proc = spawn(process.execPath, [distCliPath, ...args], {
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString('utf8'); });
    proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString('utf8'); });
    proc.on('error', reject);
    proc.on('exit', (code) => {
      resolve({ code: code ?? -1, stdout, stderr });
    });
  });
}

describe('compiled CLI binary', () => {
  let haveDist = false;
  beforeAll(async () => {
    haveDist = await distExists();
  });

  // These tests spawn a child `node` process which can be slow to cold-start
  // when vitest runs many parallel workers, so we allow a generous timeout
  // to avoid flakiness on loaded CI/local runs.
  const SPAWN_TIMEOUT_MS = 30_000;

  it.skipIf(!distExists)('help exits 0 and prints usage', async () => {
    if (!haveDist) return;
    const result = await runBinary(['help']);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('srgnt-connectors');
    expect(result.stdout).toContain('install');
  }, SPAWN_TIMEOUT_MS);

  it.skipIf(!distExists)('list on a fresh workspace prints the empty message', async () => {
    if (!haveDist) return;
    const workspace = await makeWorkspace();
    const result = await runBinary(['list', '--workspace', workspace]);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('no connector packages installed');
  }, SPAWN_TIMEOUT_MS);

  it.skipIf(!distExists)('missing workspace returns exit code 66', async () => {
    if (!haveDist) return;
    const result = await runBinary(['list', '--workspace', '/tmp/does-not-exist-srgnt-bin-test']);
    expect(result.code).toBe(66);
  }, SPAWN_TIMEOUT_MS);
});
