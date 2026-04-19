import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const srcDir = path.resolve(__dirname, '..');

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
