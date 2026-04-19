import { describe, it, expect, vi } from 'vitest';
import type { InstalledConnectorPackage } from '@srgnt/contracts';
import { ManagedPackageRegistry } from './registry.js';

function samplePackage(overrides: Partial<InstalledConnectorPackage> = {}): InstalledConnectorPackage {
  return {
    packageId: 'jira-connector@1.0.0',
    connectorId: 'jira',
    packageVersion: '1.0.0',
    sdkVersion: '1.0.0',
    minHostVersion: '1.0.0',
    sourceUrl: 'https://example.com/jira-connector.tgz',
    installedAt: '2026-04-19T00:00:00.000Z',
    verificationStatus: 'verified',
    lifecycleState: 'installed',
    executionModel: 'worker',
    ...overrides,
  };
}

describe('ManagedPackageRegistry', () => {
  it('starts empty when no initial packages are provided', () => {
    const registry = new ManagedPackageRegistry();
    expect(registry.size()).toBe(0);
    expect(registry.list()).toEqual([]);
  });

  it('seeds from an initial snapshot', () => {
    const registry = new ManagedPackageRegistry({
      initial: { packages: [samplePackage()] },
    });
    expect(registry.size()).toBe(1);
    expect(registry.get('jira-connector@1.0.0')?.connectorId).toBe('jira');
  });

  it('upserts a package and flushes to the persist callback', async () => {
    const persist = vi.fn().mockResolvedValue(undefined);
    const registry = new ManagedPackageRegistry({ persist });
    const pkg = samplePackage();
    await registry.upsert(pkg);
    expect(registry.size()).toBe(1);
    expect(persist).toHaveBeenCalledWith({ packages: [pkg] });
  });

  it('removes a package and flushes to persist', async () => {
    const persist = vi.fn().mockResolvedValue(undefined);
    const registry = new ManagedPackageRegistry({
      initial: { packages: [samplePackage()] },
      persist,
    });
    const removed = await registry.remove('jira-connector@1.0.0');
    expect(removed).toBe(true);
    expect(registry.size()).toBe(0);
    expect(persist).toHaveBeenCalledWith({ packages: [] });
  });

  it('returns false when removing an unknown package', async () => {
    const persist = vi.fn().mockResolvedValue(undefined);
    const registry = new ManagedPackageRegistry({ persist });
    const removed = await registry.remove('unknown');
    expect(removed).toBe(false);
    expect(persist).not.toHaveBeenCalled();
  });

  it('updates lifecycle state and preserves other fields', async () => {
    const registry = new ManagedPackageRegistry({
      initial: { packages: [samplePackage()] },
    });
    const updated = await registry.setLifecycleState('jira-connector@1.0.0', 'activated');
    expect(updated?.lifecycleState).toBe('activated');
    expect(updated?.connectorId).toBe('jira');
  });

  it('returns undefined when updating an unknown package', async () => {
    const registry = new ManagedPackageRegistry();
    const updated = await registry.setLifecycleState('unknown', 'errored');
    expect(updated).toBeUndefined();
  });

  it('records lastError when moving to errored and clears it when instructed', async () => {
    const registry = new ManagedPackageRegistry({
      initial: { packages: [samplePackage()] },
    });
    const withError = await registry.setLifecycleState('jira-connector@1.0.0', 'errored', 'Boom');
    expect(withError?.lastError).toBe('Boom');

    const cleared = await registry.clearLastError('jira-connector@1.0.0');
    expect(cleared?.lastError).toBeUndefined();
  });

  it('snapshot returns the full package registry shape', () => {
    const registry = new ManagedPackageRegistry({
      initial: { packages: [samplePackage()] },
    });
    expect(registry.snapshot()).toEqual({ packages: [samplePackage()] });
  });

  it('getByConnectorId finds the matching record', () => {
    const registry = new ManagedPackageRegistry({
      initial: {
        packages: [
          samplePackage({ packageId: 'jira@1.0.0', connectorId: 'jira' }),
          samplePackage({ packageId: 'outlook@2.0.0', connectorId: 'outlook' }),
        ],
      },
    });
    expect(registry.getByConnectorId('outlook')?.packageId).toBe('outlook@2.0.0');
    expect(registry.getByConnectorId('missing')).toBeUndefined();
  });
});
