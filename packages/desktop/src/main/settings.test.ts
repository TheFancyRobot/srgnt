import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  defaultDesktopSettings,
  ensureWorkspaceLayout,
  getDesktopSettingsPath,
  readBootstrapState,
  readDesktopSettings,
  resolveDefaultWorkspaceRoot,
  writeBootstrapState,
  writeDesktopSettings,
} from './settings.js';

const tempPaths: string[] = [];

async function makeTempDir(prefix: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  tempPaths.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempPaths.splice(0).map((entry) => fs.rm(entry, { recursive: true, force: true })));
});

describe('desktop settings helpers', () => {
  it('scaffolds the workspace layout', async () => {
    const workspaceRoot = await makeTempDir('srgnt-workspace-');

    await ensureWorkspaceLayout(workspaceRoot);

    await expect(fs.stat(path.join(workspaceRoot, 'Daily'))).resolves.toBeDefined();
    await expect(fs.stat(path.join(workspaceRoot, '.command-center', 'config'))).resolves.toBeDefined();
    await expect(fs.stat(path.join(workspaceRoot, '.command-center', 'artifacts')).catch(() => null)).resolves.toBeNull();
  });

  it('writes and reads the bootstrap state', async () => {
    const userDataPath = await makeTempDir('srgnt-user-data-');
    const workspaceRoot = '/tmp/example-workspace';

    await writeBootstrapState(userDataPath, { workspaceRoot });

    await expect(readBootstrapState(userDataPath)).resolves.toEqual({ workspaceRoot });
  });

  it('writes and reads desktop settings inside the workspace config folder', async () => {
    const workspaceRoot = await makeTempDir('srgnt-settings-');
    const settings = {
      ...defaultDesktopSettings,
      theme: 'dark' as const,
      updateChannel: 'beta' as const,
      telemetryEnabled: true,
      connectors: {
        jira: true,
        outlook: false,
        teams: true,
      },
      layout: {
        sidebarWidth: 320,
        sidebarCollapsed: true,
      },
      maxConcurrentRuns: '5' as const,
    };

    await writeDesktopSettings(workspaceRoot, settings);

    const filePath = getDesktopSettingsPath(workspaceRoot);
    await expect(fs.stat(filePath)).resolves.toBeDefined();
    await expect(readDesktopSettings(workspaceRoot)).resolves.toEqual(settings);
  });

  it('merges missing layout preferences with defaults when reading settings', async () => {
    const workspaceRoot = await makeTempDir('srgnt-layout-defaults-');
    const filePath = getDesktopSettingsPath(workspaceRoot);

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(
      filePath,
      JSON.stringify({
        theme: 'dark',
        updateChannel: 'beta',
        telemetryEnabled: true,
        crashReportsEnabled: false,
        connectors: {
          jira: true,
          outlook: false,
          teams: false,
        },
        debugMode: false,
        maxConcurrentRuns: '5',
      }),
      'utf8',
    );

    await expect(readDesktopSettings(workspaceRoot)).resolves.toMatchObject({
      theme: 'dark',
      layout: {
        sidebarWidth: 240,
        sidebarCollapsed: false,
      },
    });
  });

  it('uses a stable default workspace root under the home directory', () => {
    expect(resolveDefaultWorkspaceRoot('/home/tester')).toBe('/home/tester/srgnt-workspace');
  });
});
