import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { parseArgs, runCli } from './index.js';
import { readDesktopSettings } from '../settings.js';

const tempDirs: string[] = [];

async function makeWorkspace(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'srgnt-cli-e2e-'));
  tempDirs.push(dir);
  // ensureWorkspaceLayout requires a writable dir; resolveCliWorkspaceRoot
  // only requires the dir to exist.
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((d) => fs.rm(d, { recursive: true, force: true })));
});

function demoPayload(id = 'demo', version = '1.0.0') {
  return {
    manifest: {
      id,
      name: id,
      version,
      description: `${id} connector`,
      provider: 'demo',
      authType: 'none',
      config: { authType: 'none', timeout: 5000, retryAttempts: 1 },
      capabilities: [{ capability: 'read', supportedOperations: ['getItem'] }],
      entityTypes: ['Task'],
      freshnessThresholdMs: 60000,
      metadata: {},
    },
    runtime: {
      sdkVersion: '1.0.0',
      minHostVersion: '1.0.0',
      entrypoint: 'default',
      executionModel: 'worker',
      capabilities: ['http.fetch', 'logger'],
    },
  };
}

function recorderIo() {
  const stdoutBuf: string[] = [];
  const stderrBuf: string[] = [];
  return {
    stdout: (m: string) => stdoutBuf.push(m),
    stderr: (m: string) => stderrBuf.push(m),
    stdoutText: () => stdoutBuf.join('\n'),
    stderrText: () => stderrBuf.join('\n'),
  };
}

describe('parseArgs', () => {
  it('parses install with positional url and flags', () => {
    const parsed = parseArgs([
      'install',
      'https://example.com/demo.json',
      '--connector-id',
      'demo',
      '--checksum=abc',
      '--json',
    ]);
    expect(parsed.command).toBe('install');
    expect(parsed.positional).toEqual(['https://example.com/demo.json']);
    expect(parsed.flags.expectedConnectorId).toBe('demo');
    expect(parsed.flags.expectedChecksum).toBe('abc');
    expect(parsed.format).toBe('json');
  });

  it('parses --workspace flag', () => {
    const parsed = parseArgs(['list', '--workspace', '/tmp/foo']);
    expect(parsed.workspace).toBe('/tmp/foo');
  });

  it('defaults to text format', () => {
    const parsed = parseArgs(['list']);
    expect(parsed.format).toBe('text');
  });

  it('rejects unknown commands', () => {
    expect(() => parseArgs(['frobnicate'])).toThrow(/Unknown command/);
  });
});

describe('runCli end-to-end', () => {
  it('supports the full install -> list -> inspect -> remove flow', async () => {
    const workspace = await makeWorkspace();
    const env = {};
    const url = 'https://example.com/demo.json';
    const body = JSON.stringify(demoPayload());

    const fetchImpl = async (u: string) => {
      if (u !== url) throw new Error(`unexpected ${u}`);
      return { ok: true, status: 200, text: async () => body };
    };

    // install
    {
      const io = recorderIo();
      const code = await runCli({
        argv: ['install', url, '--workspace', workspace, '--connector-id', 'demo', '--json'],
        env,
        fetch: fetchImpl,
        stdout: io.stdout,
        stderr: io.stderr,
        now: () => '2026-04-19T00:00:00.000Z',
      });
      expect(code).toBe(0);
      const payload = JSON.parse(io.stdoutText());
      expect(payload.kind).toBe('installed');
      expect(payload.packageId).toBe('demo@1.0.0');
    }

    // list
    {
      const io = recorderIo();
      const code = await runCli({
        argv: ['list', '--workspace', workspace, '--json'],
        env,
        stdout: io.stdout,
        stderr: io.stderr,
      });
      expect(code).toBe(0);
      const payload = JSON.parse(io.stdoutText());
      expect(payload.kind).toBe('list');
      expect(payload.packages).toHaveLength(1);
      expect(payload.packages[0].packageId).toBe('demo@1.0.0');
    }

    // inspect
    {
      const io = recorderIo();
      const code = await runCli({
        argv: ['inspect', 'demo', '--workspace', workspace, '--json'],
        env,
        stdout: io.stdout,
        stderr: io.stderr,
      });
      expect(code).toBe(0);
      const payload = JSON.parse(io.stdoutText());
      expect(payload.kind).toBe('inspect');
      expect(payload.packageId).toBe('demo@1.0.0');
      expect(payload.sourceHost).toBe('https://example.com');
    }

    // remove
    {
      const io = recorderIo();
      const code = await runCli({
        argv: ['remove', 'demo@1.0.0', '--workspace', workspace, '--json'],
        env,
        stdout: io.stdout,
        stderr: io.stderr,
      });
      expect(code).toBe(0);
      const payload = JSON.parse(io.stdoutText());
      expect(payload.kind).toBe('removed');
    }

    // persisted desktop-settings reflects the removal
    const finalSettings = await readDesktopSettings(workspace);
    expect(finalSettings.connectors.installedPackages.packages).toHaveLength(0);
  });

  it('exit code 1 on install failure (checksum mismatch) and stderr carries a structured message', async () => {
    const workspace = await makeWorkspace();
    const url = 'https://example.com/demo.json';
    const body = JSON.stringify(demoPayload());
    const io = recorderIo();
    const code = await runCli({
      argv: ['install', url, '--workspace', workspace, '--checksum', 'deadbeef', '--json'],
      env: {},
      fetch: async (u) => ({ ok: u === url, status: 200, text: async () => body }),
      stdout: io.stdout,
      stderr: io.stderr,
      now: () => '2026-04-19T00:00:00.000Z',
    });
    expect(code).toBe(1);
    const payload = JSON.parse(io.stderrText());
    expect(payload.kind).toBe('install-error');
    expect(payload.code).toBe('CHECKSUM_MISMATCH');
  });

  it('exit code 1 when remove is called on a missing package', async () => {
    const workspace = await makeWorkspace();
    const io = recorderIo();
    const code = await runCli({
      argv: ['remove', 'missing@1.0.0', '--workspace', workspace, '--json'],
      env: {},
      stdout: io.stdout,
      stderr: io.stderr,
    });
    expect(code).toBe(1);
    const payload = JSON.parse(io.stderrText());
    expect(payload.code).toBe('PACKAGE_NOT_FOUND');
  });

  it('exit code 1 on inspect for a missing package', async () => {
    const workspace = await makeWorkspace();
    const io = recorderIo();
    const code = await runCli({
      argv: ['inspect', 'nothing', '--workspace', workspace, '--json'],
      env: {},
      stdout: io.stdout,
      stderr: io.stderr,
    });
    expect(code).toBe(1);
  });

  it('exit code 66 when workspace path does not exist', async () => {
    const io = recorderIo();
    const code = await runCli({
      argv: ['list', '--workspace', '/tmp/does-not-exist-123456789'],
      env: {},
      stdout: io.stdout,
      stderr: io.stderr,
    });
    expect(code).toBe(66);
  });

  it('exit code 64 when install has no URL', async () => {
    const workspace = await makeWorkspace();
    const io = recorderIo();
    const code = await runCli({
      argv: ['install', '--workspace', workspace],
      env: {},
      stdout: io.stdout,
      stderr: io.stderr,
    });
    expect(code).toBe(64);
  });

  it('install failure leaves no stale registry entry (install cleanup after cleanup error)', async () => {
    const workspace = await makeWorkspace();
    const url = 'https://example.com/demo.json';
    const badBody = JSON.stringify({ manifest: { id: '' } });
    const io = recorderIo();
    const code = await runCli({
      argv: ['install', url, '--workspace', workspace, '--json'],
      env: {},
      fetch: async (u) => ({ ok: true, status: 200, text: async () => badBody }),
      stdout: io.stdout,
      stderr: io.stderr,
    });
    expect(code).toBe(1);
    const settings = await readDesktopSettings(workspace);
    expect(settings.connectors.installedPackages.packages).toEqual([]);
  });

  it('install blocks insecure non-localhost http URLs', async () => {
    const workspace = await makeWorkspace();
    const io = recorderIo();
    const code = await runCli({
      argv: ['install', 'http://evil.example.com/pkg.json', '--workspace', workspace, '--json'],
      env: {},
      fetch: async () => ({ ok: true, status: 200, text: async () => '' }),
      stdout: io.stdout,
      stderr: io.stderr,
    });
    expect(code).toBe(1);
    const payload = JSON.parse(io.stderrText());
    expect(payload.code).toBe('PACKAGE_URL_INSECURE');
  });

  it('inspect output is safe for logs (no tokens)', async () => {
    const workspace = await makeWorkspace();
    const url = 'https://example.com/demo.json';
    const body = JSON.stringify(demoPayload());

    await runCli({
      argv: ['install', url, '--workspace', workspace, '--json'],
      env: {},
      fetch: async (u) => ({ ok: u === url, status: 200, text: async () => body }),
      stdout: () => {},
      stderr: () => {},
      now: () => '2026-04-19T00:00:00.000Z',
    });

    // hand-edit the persisted settings to inject a token-bearing URL
    const settings = await readDesktopSettings(workspace);
    const tainted = {
      ...settings,
      connectors: {
        ...settings.connectors,
        installedPackages: {
          packages: [
            {
              ...settings.connectors.installedPackages.packages[0],
              sourceUrl: 'https://private.example.com/packages/demo.json?token=SECRET',
              lastError: 'token=SECRET found during fetch',
            },
          ],
        },
      },
    };
    const { writeDesktopSettings } = await import('../settings.js');
    await writeDesktopSettings(workspace, tainted);

    const io = recorderIo();
    const code = await runCli({
      argv: ['inspect', 'demo@1.0.0', '--workspace', workspace, '--json'],
      env: {},
      stdout: io.stdout,
      stderr: io.stderr,
    });
    expect(code).toBe(0);
    const raw = io.stdoutText();
    expect(raw).not.toContain('token=SECRET');
    expect(raw).not.toContain('SECRET');
  });
});
