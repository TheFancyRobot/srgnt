import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  CliError,
  loadWorkspaceSettings,
  persistWorkspaceSettings,
  resolveCliWorkspaceRoot,
} from './workspace.js';

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'srgnt-cli-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((d) => fs.rm(d, { recursive: true, force: true })));
});

describe('resolveCliWorkspaceRoot', () => {
  it('prefers the explicit flag when provided', async () => {
    const dir = await makeTempDir();
    const resolved = await resolveCliWorkspaceRoot({
      explicit: dir,
      env: { SRGNT_WORKSPACE: '/some/other/path' },
      homeDir: '/tmp/home',
    });
    expect(resolved.source).toBe('flag');
    expect(resolved.workspaceRoot).toBe(dir);
  });

  it('falls back to SRGNT_WORKSPACE env when flag is missing', async () => {
    const dir = await makeTempDir();
    const resolved = await resolveCliWorkspaceRoot({
      env: { SRGNT_WORKSPACE: dir },
      homeDir: '/tmp/home',
    });
    expect(resolved.source).toBe('env');
    expect(resolved.workspaceRoot).toBe(dir);
  });

  it('falls back to ~/srgnt-workspace when neither flag nor env is set', async () => {
    const homeDir = await makeTempDir();
    const workspace = path.join(homeDir, 'srgnt-workspace');
    await fs.mkdir(workspace);
    const resolved = await resolveCliWorkspaceRoot({ env: {}, homeDir });
    expect(resolved.source).toBe('default');
    expect(resolved.workspaceRoot).toBe(workspace);
  });

  it('throws CliError when the workspace does not exist', async () => {
    await expect(
      resolveCliWorkspaceRoot({
        explicit: path.join('/tmp', `does-not-exist-${Date.now()}`),
        env: {},
        homeDir: '/tmp/home',
      }),
    ).rejects.toBeInstanceOf(CliError);
  });

  it('throws CliError when path exists but is not a directory', async () => {
    const dir = await makeTempDir();
    const filePath = path.join(dir, 'not-a-dir');
    await fs.writeFile(filePath, 'hello');
    await expect(
      resolveCliWorkspaceRoot({ explicit: filePath, env: {}, homeDir: '/tmp/home' }),
    ).rejects.toMatchObject({
      name: 'CliError',
      code: 'WORKSPACE_NOT_A_DIRECTORY',
    });
  });
});

describe('loadWorkspaceSettings / persistWorkspaceSettings', () => {
  it('persists and reads back the installed package registry', async () => {
    const dir = await makeTempDir();
    const start = await loadWorkspaceSettings(dir);
    expect(start.connectors.installedPackages.packages).toEqual([]);

    await persistWorkspaceSettings(dir, {
      ...start,
      connectors: {
        ...start.connectors,
        installedPackages: {
          packages: [
            {
              packageId: 'demo@1.0.0',
              connectorId: 'demo',
              packageVersion: '1.0.0',
              sdkVersion: '1.0.0',
              minHostVersion: '1.0.0',
              sourceUrl: 'https://example.com/demo.json',
              installedAt: '2026-04-19T00:00:00.000Z',
              verificationStatus: 'verified',
              lifecycleState: 'installed',
              executionModel: 'worker',
            },
          ],
        },
      },
    });

    const reread = await loadWorkspaceSettings(dir);
    expect(reread.connectors.installedPackages.packages).toHaveLength(1);
    expect(reread.connectors.installedPackages.packages[0].packageId).toBe('demo@1.0.0');
  });
});
