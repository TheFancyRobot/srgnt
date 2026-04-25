import { describe, it, expect } from 'vitest';
import { parseSync } from '@srgnt/contracts';
import { SConnectorManifest } from '@srgnt/contracts';
import jiraConnectorPackage, { factory, manifest, runtime } from './index.js';
import type { HostContext } from '@srgnt/connectors';

function fakeHost(): HostContext {
  return {
    capabilities: {
      http: { fetch: globalThis.fetch },
      logger: { info: () => {}, warn: () => {}, error: () => {} },
      crypto: { randomUUID: () => 'test-uuid' },
      workspace: { root: '/tmp/unused-workspace' },
    },
    connectorId: 'jira',
    sdkVersion: '1.0.0',
  };
}

describe('jiraConnectorPackage', () => {
  it('has manifest, factory, and runtime', () => {
    expect(jiraConnectorPackage.manifest).toBeDefined();
    expect(jiraConnectorPackage.factory).toBeDefined();
    expect(jiraConnectorPackage.runtime).toBeDefined();
  });

  it('manifest parses as valid SConnectorManifest', () => {
    expect(() => parseSync(SConnectorManifest, jiraConnectorPackage.manifest)).not.toThrow();
  });

  it('runtime has correct Phase 20 fields', () => {
    expect(runtime.sdkVersion).toBe('1.0.0');
    expect(runtime.minHostVersion).toBe('1.0.0');
    expect(runtime.entrypoint).toBe('createJiraConnector');
    expect(runtime.capabilities).toContain('http.fetch');
    expect(runtime.capabilities).toContain('logger');
    expect(runtime.capabilities).toContain('crypto.randomUUID');
    expect(runtime.capabilities).toContain('workspace.root');
  });

  it('runtime executionModel is worker (DEC-0016)', () => {
    expect(runtime.executionModel).toBe('worker');
  });

  it('runtime capabilities is a closed union — no raw Node/Electron access', () => {
    const allowed = ['http.fetch', 'logger', 'crypto.randomUUID', 'workspace.root'];
    for (const cap of runtime.capabilities) {
      expect(allowed).toContain(cap);
    }
    // Should NOT have dangerous capabilities
    expect(runtime.capabilities).not.toContain('fs');
    expect(runtime.capabilities).not.toContain('env');
    expect(runtime.capabilities).not.toContain('child_process');
  });

  it('connector ID is stable as jira', () => {
    expect(jiraConnectorPackage.manifest.id).toBe('jira');
  });
});

describe('factory', () => {
  it('produces a JiraConnectorImpl bound to the Jira manifest', async () => {
    const connector = await factory(fakeHost());
    expect(connector.getManifest()).toBe(manifest);
  });

  it('starts disconnected with no lastError', async () => {
    const connector = await factory(fakeHost());
    expect(connector.isConnected()).toBe(false);
    expect(connector.getHealth().status).toBe('disconnected');
    expect(connector.getHealth().lastError).toBeUndefined();
  });
});
