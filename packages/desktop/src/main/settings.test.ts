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
        installedPackages: { packages: [] },
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
    expect(resolveDefaultWorkspaceRoot('/home/tester')).toBe(path.join('/home/tester', 'srgnt-workspace'));
  });
});

describe('installedPackages field', () => {
  it('fresh default settings have empty installedPackages', async () => {
    expect(defaultDesktopSettings.connectors.installedPackages).toEqual({ packages: [] });
  });

  it('installedPackages round-trips correctly through write and read', async () => {
    const workspaceRoot = await makeTempDir('srgnt-packages-roundtrip-');
    const settings = {
      ...defaultDesktopSettings,
      connectors: {
        installedConnectorIds: ['jira'],
        installedPackages: {
          packages: [
            {
              packageId: 'jira-connector@1.0.0',
              connectorId: 'jira',
              packageVersion: '1.0.0',
              sdkVersion: '1.0.0',
              minHostVersion: '1.0.0',
              sourceUrl: 'https://example.com/jira-connector.tgz',
              installedAt: '2024-01-15T10:30:00.000Z',
              verificationStatus: 'verified' as const,
              lifecycleState: 'installed' as const,
              executionModel: 'worker' as const,
            },
          ],
        },
      },
    };

    await writeDesktopSettings(workspaceRoot, settings);
    const read = await readDesktopSettings(workspaceRoot);

    expect(read.connectors.installedPackages.packages).toHaveLength(1);
    expect(read.connectors.installedPackages.packages[0].packageId).toBe('jira-connector@1.0.0');
    expect(read.connectors.installedPackages.packages[0].connectorId).toBe('jira');
  });

  it('settings without installedPackages default to empty packages array', async () => {
    const workspaceRoot = await makeTempDir('srgnt-packages-default-');
    const settings = {
      ...defaultDesktopSettings,
      connectors: {
        installedConnectorIds: ['jira'],
      },
    };

    await writeDesktopSettings(workspaceRoot, settings);
    const read = await readDesktopSettings(workspaceRoot);

    expect(read.connectors.installedPackages).toEqual({ packages: [] });
  });

  it('unknown fields in installedPackages are ignored during merge', async () => {
    const workspaceRoot = await makeTempDir('srgnt-packages-unknown-fields-');
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
          installedConnectorIds: ['jira'],
          installedPackages: {
            packages: [
              {
                packageId: 'jira-connector@1.0.0',
                connectorId: 'jira',
                packageVersion: '1.0.0',
                sdkVersion: '1.0.0',
                minHostVersion: '1.0.0',
                sourceUrl: 'https://example.com/jira-connector.tgz',
                installedAt: '2024-01-15T10:30:00.000Z',
                verificationStatus: 'verified',
                lifecycleState: 'installed',
                executionModel: 'worker',
                unknownField: 'should be ignored',
              },
            ],
            unknownTopLevelField: 'should be ignored',
          },
        },
        debugMode: false,
        maxConcurrentRuns: '3',
      }),
      'utf8',
    );

    // Should not throw and should parse valid fields
    const read = await readDesktopSettings(workspaceRoot);
    expect(read.connectors.installedPackages.packages).toHaveLength(1);
    expect(read.connectors.installedPackages.packages[0].packageId).toBe('jira-connector@1.0.0');
  });

  it('malformed installedPackages (non-array packages) defaults to empty', async () => {
    const workspaceRoot = await makeTempDir('srgnt-packages-malformed-');
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
          installedConnectorIds: ['jira'],
          installedPackages: {
            packages: 'not an array',
          },
        },
        debugMode: false,
        maxConcurrentRuns: '3',
      }),
      'utf8',
    );

    // Should not throw and should default to empty packages
    const read = await readDesktopSettings(workspaceRoot);
    expect(read.connectors.installedPackages).toEqual({ packages: [] });
  });

  it('backward compatibility: installedConnectorIds works without installedPackages', async () => {
    const workspaceRoot = await makeTempDir('srgnt-packages-backward-compat-');
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
    expect(read.connectors.installedPackages).toEqual({ packages: [] });
  });

  it('empty installedPackages defaults correctly', async () => {
    const workspaceRoot = await makeTempDir('srgnt-packages-empty-');
    const settings = {
      ...defaultDesktopSettings,
      connectors: {
        installedConnectorIds: [],
        installedPackages: { packages: [] },
      },
    };

    await writeDesktopSettings(workspaceRoot, settings);
    const read = await readDesktopSettings(workspaceRoot);

    expect(read.connectors.installedPackages.packages).toHaveLength(0);
  });
});