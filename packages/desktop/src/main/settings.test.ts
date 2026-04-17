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

describe('connector install-state persistence', () => {
  it('fresh default settings have zero installed connectors', async () => {
    // This is the single source of truth for fresh-workspace onboarding:
    // NO connector is pre-installed. Users must explicitly install connectors.
    expect(defaultDesktopSettings.connectors.installedConnectorIds).toEqual([]);
  });

  it('explicit install array round-trips correctly through write and read', async () => {
    const workspaceRoot = await makeTempDir('srgnt-install-roundtrip-');
    const settings = {
      ...defaultDesktopSettings,
      connectors: {
        installedConnectorIds: ['outlook', 'teams'],
      },
    };

    await writeDesktopSettings(workspaceRoot, settings);
    const read = await readDesktopSettings(workspaceRoot);

    expect(read.connectors.installedConnectorIds).toContain('outlook');
    expect(read.connectors.installedConnectorIds).toContain('teams');
    expect(read.connectors.installedConnectorIds).toHaveLength(2);
  });

  it('empty workspace root returns fresh defaults with zero installed connectors', async () => {
    // When workspace root is empty string (not yet set), defaults apply
    const settings = await readDesktopSettings('');
    expect(settings.connectors.installedConnectorIds).toEqual([]);
  });
});

describe('desktop settings helpers', () => {
  it('scaffolds the workspace layout', async () => {
    const workspaceRoot = await makeTempDir('srgnt-workspace-');

    await ensureWorkspaceLayout(workspaceRoot);

    await expect(fs.stat(path.join(workspaceRoot, 'Daily'))).resolves.toBeDefined();
    await expect(fs.stat(path.join(workspaceRoot, '.command-center', 'config'))).resolves.toBeDefined();
    await expect(fs.stat(path.join(workspaceRoot, '.command-center', 'artifacts')).catch(() => null)).resolves.toBeNull();
  });

  it('writes and reads desktop settings with the new install array shape', async () => {
    const workspaceRoot = await makeTempDir('srgnt-settings-');
    const settings = {
      ...defaultDesktopSettings,
      theme: 'dark' as const,
      updateChannel: 'beta' as const,
      telemetryEnabled: true,
      connectors: {
        installedConnectorIds: ['jira', 'teams'],
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

  it('migrates legacy connector booleans to install array when reading', async () => {
    const workspaceRoot = await makeTempDir('srgnt-connector-migration-');
    const filePath = getDesktopSettingsPath(workspaceRoot);

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(
      filePath,
      JSON.stringify({
        theme: 'system',
        updateChannel: 'stable',
        telemetryEnabled: false,
        crashReportsEnabled: false,
        connectors: {
          jira: true,
          outlook: false,
          teams: true,
        },
        debugMode: false,
        maxConcurrentRuns: '3',
      }),
      'utf8',
    );

    await expect(readDesktopSettings(workspaceRoot)).resolves.toMatchObject({
      connectors: {
        installedConnectorIds: ['jira', 'teams'],
      },
    });
  });

  it('prefers explicit installed array over legacy keys during migration and normalizes duplicates', async () => {
    const workspaceRoot = await makeTempDir('srgnt-connector-migration-preferred-');
    const filePath = getDesktopSettingsPath(workspaceRoot);

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(
      filePath,
      JSON.stringify({
        theme: 'system',
        updateChannel: 'stable',
        telemetryEnabled: false,
        crashReportsEnabled: false,
        connectors: {
          installedConnectorIds: ['teams', 'jira', 'jira', 'unknown'],
          jira: false,
          outlook: true,
        },
        debugMode: false,
        maxConcurrentRuns: '3',
      }),
      'utf8',
    );

    await expect(readDesktopSettings(workspaceRoot)).resolves.toMatchObject({
      connectors: {
        installedConnectorIds: ['jira', 'teams', 'unknown'],
      },
    });
  });

  it('ignores unknown legacy IDs and malformed values', async () => {
    const workspaceRoot = await makeTempDir('srgnt-connector-malformed-');
    const filePath = getDesktopSettingsPath(workspaceRoot);

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(
      filePath,
      JSON.stringify({
        theme: 'system',
        updateChannel: 'stable',
        telemetryEnabled: false,
        crashReportsEnabled: false,
        connectors: {
          jira: 'yes',
          outlook: 1,
          teams: true,
          connectorX: true,
        },
        debugMode: false,
        maxConcurrentRuns: '3',
      }),
      'utf8',
    );

    await expect(readDesktopSettings(workspaceRoot)).resolves.toMatchObject({
      connectors: {
        installedConnectorIds: ['teams'],
      },
    });
  });

  it('uses stable install defaults (empty array) when connectors are missing', async () => {
    const workspaceRoot = await makeTempDir('srgnt-default-connectors-');
    const filePath = getDesktopSettingsPath(workspaceRoot);

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(
      filePath,
      JSON.stringify({
        theme: 'system',
        updateChannel: 'stable',
        telemetryEnabled: false,
        crashReportsEnabled: false,
        connectors: {},
        debugMode: false,
        maxConcurrentRuns: '3',
      }),
      'utf8',
    );

    await expect(readDesktopSettings(workspaceRoot)).resolves.toMatchObject({
      connectors: {
        installedConnectorIds: [],
      },
    });
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
          jira: false,
          outlook: false,
          teams: false,
        },
        debugMode: false,
        maxConcurrentRuns: '5',
      }),
      'utf8',
    );

    // Legacy jira:false/outlook:false/teams:false → all false, so migrated installedConnectorIds is []
    await expect(readDesktopSettings(workspaceRoot)).resolves.toMatchObject({
      theme: 'dark',
      layout: {
        sidebarWidth: 240,
        sidebarCollapsed: false,
      },
      connectors: {
        installedConnectorIds: [],
      },
    });
  });

  it('uses a stable default workspace root under the home directory', () => {
    expect(resolveDefaultWorkspaceRoot('/home/tester')).toBe('/home/tester/srgnt-workspace');
  });
});