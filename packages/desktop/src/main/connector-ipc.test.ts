import { describe, it, expect, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  chooseConnectorDefinitions,
  parseConnectorCatalogPayload,
  type ConnectorDefinition,
} from './connectors/catalog.js';

const srcDir = path.resolve(__dirname, '..');
const packageJsonPath = path.resolve(srcDir, '../package.json');

describe('connector IPC channels are in sync', () => {
  const mainSource = fs.readFileSync(path.join(srcDir, 'main/index.ts'), 'utf8');
  const preloadSource = fs.readFileSync(path.join(srcDir, 'preload/index.ts'), 'utf8');
  const envSource = fs.readFileSync(path.join(srcDir, 'renderer/env.d.ts'), 'utf8');

  const connectorChannels = [
    'connectorList',
    'connectorStatus',
    'connectorInstall',
    'connectorUninstall',
    'connectorConnect',
    'connectorDisconnect',
  ];

  describe('main process defines all connector channels', () => {
    for (const channel of connectorChannels) {
      it(`main has ipcMain.handle for ${channel}`, () => {
        expect(mainSource).toContain(`ipcMain.handle(ipcChannels.${channel}`);
      });
    }
  });

  describe('preload inlines all connector channels', () => {
    for (const channel of connectorChannels) {
      it(`preload has ${channel} in ipcChannels object`, () => {
        expect(preloadSource).toContain(`${channel}: 'connector:${channel.replace('connector', '').toLowerCase()}'`);
      });
    }
  });

  describe('preload exposes connector API methods', () => {
    it('preload has listConnectors API method', () => {
      expect(preloadSource).toContain('listConnectors:');
    });
    it('preload has installConnector API method', () => {
      expect(preloadSource).toContain('installConnector:');
    });
    it('preload has uninstallConnector API method', () => {
      expect(preloadSource).toContain('uninstallConnector:');
    });
    it('preload has connectConnector API method', () => {
      expect(preloadSource).toContain('connectConnector:');
    });
    it('preload has disconnectConnector API method', () => {
      expect(preloadSource).toContain('disconnectConnector:');
    });
  });

  describe('env.d.ts has connector type declarations', () => {
    it('env.d.ts has ConnectorState interface', () => {
      expect(envSource).toContain('export interface ConnectorState');
    });
    it('env.d.ts has listConnectors method', () => {
      expect(envSource).toContain('listConnectors()');
    });
    it('env.d.ts has installConnector method', () => {
      expect(envSource).toContain('installConnector(id: string)');
    });
    it('env.d.ts has uninstallConnector method', () => {
      expect(envSource).toContain('uninstallConnector(id: string)');
    });
    it('env.d.ts has connectConnector method', () => {
      expect(envSource).toContain('connectConnector(id: string)');
    });
    it('env.d.ts has disconnectConnector method', () => {
      expect(envSource).toContain('disconnectConnector(id: string)');
    });
    it('ConnectorState has installed field', () => {
      expect(envSource).toContain('installed: boolean');
    });
    it('ConnectorState has available field', () => {
      expect(envSource).toContain('available: boolean');
    });
  });
});

describe('connector catalog discovery includes extracted Jira package', () => {
  const mainSource = fs.readFileSync(path.join(srcDir, 'main/index.ts'), 'utf8');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
    build?: { files?: string[]; extraResources?: Array<{ from?: string; to?: string }> };
  };

  function manifest(id: string, name = id) {
    return {
      id,
      name,
      version: '0.1.0',
      description: `${name} connector`,
      provider: 'test',
      authType: 'none',
      config: { authType: 'none', timeout: 30000, retryAttempts: 3 },
      capabilities: [{ capability: 'read', supportedOperations: ['list'] }],
      entityTypes: ['Task'],
      freshnessThresholdMs: 300000,
      metadata: {},
    };
  }

  function definition(id: string): ConnectorDefinition {
    return {
      manifest: manifest(id),
      packageUrl: `https://example.test/${id}.json`,
    } as ConnectorDefinition;
  }

  it('checks package-local dev-connectors when pnpm launches Electron from packages/desktop', () => {
    expect(mainSource).toContain("path.resolve(process.cwd(), 'dev-connectors')");
  });

  it('uses local disk catalog first and skips remote fetch when disk catalog is present', async () => {
    const diskDefinitions = { jira: definition('jira') };
    const loadDisk = vi.fn().mockResolvedValue(diskDefinitions);
    const fetchRemote = vi.fn().mockResolvedValue({ stale: definition('stale') });
    const buildBuiltins = vi.fn().mockReturnValue({ outlook: definition('outlook') });

    const result = await chooseConnectorDefinitions({ loadDisk, fetchRemote, buildBuiltins });

    expect(result).toBe(diskDefinitions);
    expect(fetchRemote).not.toHaveBeenCalled();
    expect(buildBuiltins).not.toHaveBeenCalled();
  });

  it('falls back to remote only when no local disk catalog exists', async () => {
    const remoteDefinitions = { jira: definition('jira') };
    const loadDisk = vi.fn().mockResolvedValue({});
    const fetchRemote = vi.fn().mockResolvedValue(remoteDefinitions);
    const buildBuiltins = vi.fn().mockReturnValue({ outlook: definition('outlook') });

    const result = await chooseConnectorDefinitions({ loadDisk, fetchRemote, buildBuiltins });

    expect(result).toBe(remoteDefinitions);
    expect(fetchRemote).toHaveBeenCalledTimes(1);
    expect(buildBuiltins).not.toHaveBeenCalled();
  });

  it('resolves disk catalog packagePath entries to file URLs instead of localhost URLs', () => {
    const sourcePath = path.resolve('/tmp/srgnt-catalog/dev-connectors');
    const parsed = parseConnectorCatalogPayload({
      connectors: [
        {
          manifest: manifest('jira', 'Jira'),
          packagePath: '/connectors/packages/jira.json',
        },
      ],
    }, { sourcePath });

    expect(parsed.jira?.packageUrl).toMatch(/^file:\/\//);
    expect(parsed.jira?.packageUrl).not.toContain('127.0.0.1');
    expect(fileURLToPath(parsed.jira!.packageUrl!)).toBe(path.join(sourcePath, 'packages', 'jira.json'));
  });

  it('packages the connector catalog for release builds', () => {
    expect(packageJson.build?.files).toContain('dev-connectors/**/*');
    expect(packageJson.build?.extraResources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ from: 'dev-connectors', to: 'dev-connectors' }),
      ]),
    );
  });
});

describe('install-before-connect invariant in main process', () => {
  const mainSource = fs.readFileSync(path.join(srcDir, 'main/index.ts'), 'utf8');

  it('connectorConnect handler throws when connector is not installed', () => {
    // The connectorConnect handler MUST check installed state before allowing connection
    // Pattern: if (!getInstalledStateFromSettings(desktopSettings, connectorId)) { throw ... }
    expect(mainSource).toMatch(/connectorConnect.*?\n.*?getInstalledStateFromSettings.*?throw.*?not installed/is);
  });

  it('connectorInstall persists to installedConnectorIds array', () => {
    // install handler must add to the installedConnectorIds array
    expect(mainSource).toMatch(/installedConnectorIds.*?connectorId.*?\]/s);
  });

  it('connectorUninstall removes from installedConnectorIds array', () => {
    // uninstall handler must filter out the connectorId
    expect(mainSource).toMatch(/installedConnectorIds.*?filter.*?connectorId/s);
  });

  it('connectorInstall is idempotent (no duplicate entries)', () => {
    // install handler checks if already installed before adding
    expect(mainSource).toMatch(/idempotent|already installed|if.*?installed/i);
  });

  it('connectorUninstall is idempotent (safe to call twice)', () => {
    // uninstall handler checks if actually installed before removing
    expect(mainSource).toMatch(/if not installed|already uninstalled|isInstalled/i);
  });
});
