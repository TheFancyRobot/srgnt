import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  defaultDesktopSettings,
  ensureWorkspaceLayout,
  getDesktopSettingsPath,
  readDesktopSettings,
  resolveDefaultWorkspaceRoot,
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
  it('scaffolds the workspace v2 layout', async () => {
    const workspaceRoot = await makeTempDir('srgnt-workspace-');

    await ensureWorkspaceLayout(workspaceRoot);

    await expect(fs.stat(path.join(workspaceRoot, 'projects'))).resolves.toBeDefined();
    await expect(fs.stat(path.join(workspaceRoot, 'groups', 'templates'))).resolves.toBeDefined();
    await expect(fs.stat(path.join(workspaceRoot, 'harnesses.json'))).resolves.toBeDefined();
    await expect(fs.stat(path.join(workspaceRoot, 'settings.json'))).resolves.toBeDefined();
    await expect(fs.stat(path.join(workspaceRoot, 'Daily')).catch(() => null)).resolves.toBeNull();
    await expect(fs.stat(path.join(workspaceRoot, '.command-center')).catch(() => null)).resolves.toBeNull();
  });

  it('re-running ensureWorkspaceLayout never overwrites existing files', async () => {
    const workspaceRoot = await makeTempDir('srgnt-workspace-rerun-');

    await ensureWorkspaceLayout(workspaceRoot);
    const custom = '{ "theme": "dark" }\n';
    await fs.writeFile(path.join(workspaceRoot, 'settings.json'), custom, 'utf8');

    await ensureWorkspaceLayout(workspaceRoot);

    await expect(fs.readFile(path.join(workspaceRoot, 'settings.json'), 'utf8')).resolves.toBe(custom);
  });

  it('falls back to the legacy aggregator-era settings file when settings.json is a fresh seed', async () => {
    const workspaceRoot = await makeTempDir('srgnt-legacy-fallback-');
    const legacyPath = path.join(workspaceRoot, '.command-center', 'config', 'desktop-settings.json');

    await fs.mkdir(path.dirname(legacyPath), { recursive: true });
    await fs.writeFile(legacyPath, JSON.stringify({ ...defaultDesktopSettings, theme: 'dark' }), 'utf8');
    await ensureWorkspaceLayout(workspaceRoot); // seeds an empty settings.json

    const read = await readDesktopSettings(workspaceRoot);
    expect(read.theme).toBe('dark');
  });

  it('empty workspace root returns fresh defaults', async () => {
    const settings = await readDesktopSettings('');
    expect(settings).toEqual(defaultDesktopSettings);
  });

  it('writes and reads desktop settings', async () => {
    const workspaceRoot = await makeTempDir('srgnt-settings-');
    const settings = {
      ...defaultDesktopSettings,
      theme: 'dark' as const,
      updateChannel: 'beta' as const,
      telemetryEnabled: true,
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

  it('strips the aggregator-era connectors key from legacy settings files', async () => {
    const workspaceRoot = await makeTempDir('srgnt-legacy-connectors-');
    const filePath = getDesktopSettingsPath(workspaceRoot);

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(
      filePath,
      JSON.stringify({
        theme: 'dark',
        updateChannel: 'stable',
        telemetryEnabled: false,
        crashReportsEnabled: false,
        connectors: {
          installedConnectorIds: ['jira', 'teams'],
          installedPackages: { packages: [] },
        },
        debugMode: false,
        maxConcurrentRuns: '3',
      }),
      'utf8',
    );

    const read = await readDesktopSettings(workspaceRoot);
    expect(read.theme).toBe('dark');
    expect(read).not.toHaveProperty('connectors');
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
    expect(resolveDefaultWorkspaceRoot('/home/tester')).toBe(path.join('/home/tester', 'srgnt-workspace'));
  });
});
