/**
 * @vitest-environment node
 *
 * IPC regression test for BUG-0020: connectorCredentialSet handler sanitization.
 *
 * Verifies that the main-process handler path for connectorCredentialSet
 * sanitizes errors so that Electron internals and token material never reach
 * the renderer.
 *
 * Uses the same hoisted-mocks pattern as notes-ipc.test.ts to avoid
 * vi.mock('electron') hoisting conflicts.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { ipcChannels } from '@srgnt/contracts';

// ─── Hoisted mocks — use vi.hoisted to avoid hoisting reference errors ───
const { mockIpcMainHandlers, mockRemoveHandler, mockHandle } = vi.hoisted(() => {
  const mockIpcMainHandlers = new Map<string, Function>();
  const mockRemoveHandler = vi.fn();
  const mockHandle = vi.fn((channel: string, handler: Function) => {
    mockIpcMainHandlers.set(channel, handler);
  });
  return { mockIpcMainHandlers, mockRemoveHandler, mockHandle };
});

const electronMock = vi.hoisted(() => ({
  userDataPath: '',
  homePath: '',
  safeStorageAvailable: false,
  encryptedPrefix: 'safe:',
  app: {
    getPath: vi.fn((name: string) => {
      if (name === 'userData') return electronMock.userDataPath;
      if (name === 'home') return electronMock.homePath;
      return electronMock.userDataPath;
    }),
    commandLine: {
      appendSwitch: vi.fn(),
    },
  },
  safeStorage: {
    isEncryptionAvailable: vi.fn(() => electronMock.safeStorageAvailable),
    encryptString: vi.fn((_secret: string) => {
      throw new Error(
        'Error while encrypting the text provided to safeStorage.encryptString. Encryption is not available.',
      );
    }),
    decryptString: vi.fn((encrypted: Buffer) =>
      encrypted.toString('utf8').replace(electronMock.encryptedPrefix, ''),
    ),
  },
}));

const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform')!;

function setProcessPlatform(platform: NodeJS.Platform): void {
  Object.defineProperty(process, 'platform', {
    configurable: true,
    value: platform,
  });
}

vi.mock('electron', () => ({
  app: electronMock.app,
  safeStorage: electronMock.safeStorage,
  ipcMain: {
    handle: mockHandle,
    removeHandler: mockRemoveHandler,
  },
}));

// ─── Imports after mock hoisting ───
import {
  __resetCredentialAdapterForTests,
  createCredentialAdapter,
  sanitizeCredentialError,
  getCredentialBackendAvailability,
  getCredentialPreferredBackend,
  type CredentialStoragePreference,
} from './credentials.js';

// ─── Re-implement the exact IPC handler logic for testing ────────────────────
// This is a bit-exact copy of connectorCredentialSet handler (index.ts:956-968).
// We simulate the handler here so we don't need to import index.ts, which
// has top-level `app.commandLine` calls that would fail in the test environment.
async function simulatedConnectorCredentialSetHandler(
  raw: { connectorId: string; token: string },
): Promise<void> {
  // Simulate getJiraCredentialStoragePreference() returning 'encrypted-local'
  // (the failing path). The actual handler reads from Jira settings, but in
  // our test both keychain and encrypted-local backends are unavailable, so
  // the sanitization path is the same regardless of preference.
  const preference: CredentialStoragePreference = 'encrypted-local';
  const adapter = await createCredentialAdapter(preference);
  try {
    await adapter.setSecret(raw.connectorId, raw.token);
  } catch (err) {
    throw new Error(sanitizeCredentialError(err, raw.token));
  }
}

// Note: the actual index.ts module is NOT imported here because it has top-level
// `app.commandLine` calls that fail in the vitest node environment. Instead, we
// simulate the exact handler logic (see simulatedConnectorCredentialSetHandler below).

// ─── Helpers ───
async function readStore(): Promise<Record<string, string>> {
  const raw = await fs.readFile(
    path.join(electronMock.userDataPath, 'credentials.encrypted.json'),
    'utf8',
  );
  return JSON.parse(raw) as Record<string, string>;
}

describe('BUG-0020 IPC regression: connectorCredentialSet sanitization', () => {
  beforeEach(async () => {
    electronMock.userDataPath = await fs.mkdtemp(
      path.join(os.tmpdir(), 'srgnt-connector-credential-ipc-test-'),
    );
    electronMock.homePath = path.join(electronMock.userDataPath, 'home');
    electronMock.safeStorageAvailable = false;
    setProcessPlatform('linux');
    vi.clearAllMocks();
    mockIpcMainHandlers.clear();
    __resetCredentialAdapterForTests({
      importKeytar: async () => {
        throw new Error('keytar unavailable');
      },
    });
  });

  afterEach(async () => {
    setProcessPlatform(originalPlatform.value as NodeJS.Platform);
    await fs.rm(electronMock.userDataPath, { recursive: true, force: true });
    __resetCredentialAdapterForTests();
  });

describe('BUG-0020 IPC regression: connectorCredentialSet sanitization', () => {
    it('throws a sanitized error WITHOUT safeStorage.encryptString internals', async () => {
      // Simulate the exact IPC handler path from index.ts
      const adapter = await createCredentialAdapter('encrypted-local');
      const token = 'ATATT3xFfGF0TOKEn-secret-jira-token';

      let caughtError: Error | null = null;
      try {
        await adapter.setSecret('jira', token);
      } catch (err) {
        // This is exactly what the IPC handler does at index.ts:956-968
        caughtError = new Error(sanitizeCredentialError(err, token));
      }

      expect(caughtError).not.toBeNull();
      const message = caughtError!.message;

      // BUG-0020: Must NOT contain Electron internals
      expect(message).not.toContain('safeStorage.encryptString');
      expect(message).not.toContain('Error while encrypting the text provided to');
      expect(message).not.toContain('Encryption is not available');
      expect(message).not.toContain('safeStorage');
    });

    it('throws a sanitized error WITHOUT token material', async () => {
      const adapter = await createCredentialAdapter('encrypted-local');
      const token = 'my-super-secret-jira-token-123456';

      let caughtError: Error | null = null;
      try {
        await adapter.setSecret('jira', token);
      } catch (err) {
        caughtError = new Error(sanitizeCredentialError(err, token));
      }

      expect(caughtError).not.toBeNull();
      const message = caughtError!.message;

      // Token material must NOT appear in the error
      expect(message).not.toContain(token);
    });

    it('throws a sanitized error that IS a clear SRGNT-owned message', async () => {
      const adapter = await createCredentialAdapter('encrypted-local');
      const token = 'any-token-here';

      let caughtError: Error | null = null;
      try {
        await adapter.setSecret('jira', token);
      } catch (err) {
        caughtError = new Error(sanitizeCredentialError(err, token));
      }

      expect(caughtError).not.toBeNull();
      const message = caughtError!.message;

      // Must be a clear, user-facing SRGNT-owned message
      expect(message).toContain('Secure credential storage is not available on this system');
      expect(message).toMatch(/^\[credentials\] Failed to store token:/);
    });

    it('full simulated IPC handler path throws sanitized error', async () => {
      // Use the simulated handler to match the actual IPC handler exactly
      const token = 'full-ipc-handler-test-token';
      const rawPayload = { connectorId: 'jira', token };

      // The simulated handler should throw a sanitized error
      await expect(
        simulatedConnectorCredentialSetHandler(rawPayload),
      ).rejects.toThrow();

      try {
        await simulatedConnectorCredentialSetHandler(rawPayload);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);

        // Must NOT have Electron internals
        expect(message).not.toContain('safeStorage.encryptString');
        expect(message).not.toContain('Error while encrypting');

        // Must NOT have token
        expect(message).not.toContain(token);

        // Must have clear SRGNT-owned message
        expect(message).toContain(
          'Secure credential storage is not available on this system',
        );
      }
    });

    it('electron error string injected via adapter catches sanitization', async () => {
      // This is the raw error that BUG-0020 surfaced in the wild:
      // "Error while encrypting the text provided to safeStorage.encryptString..."
      const rawElectronError = new Error(
        'Error while encrypting the text provided to safeStorage.encryptString. Encryption is not available.',
      );
      const token = 'ATATT3xFfGF0TOKEn';

      const result = sanitizeCredentialError(rawElectronError, token);

      // No Electron internals in output
      expect(result).not.toContain('safeStorage.encryptString');
      expect(result).not.toContain('Error while encrypting the text provided to');
      // No token material
      expect(result).not.toContain(token);
      // Has clear SRGNT-owned message
      expect(result).toContain('Credential storage is unavailable.');
      expect(result).toMatch(/^\[credentials\] Failed to store token:/);
    });

    it('keychain preference also sanitizes when both backends unavailable', async () => {
      // Same test but with keychain preference (the default in getJiraCredentialStoragePreference)
      const adapter = await createCredentialAdapter('keychain');
      const token = 'keychain-preference-token';

      let caughtError: Error | null = null;
      try {
        await adapter.setSecret('jira', token);
      } catch (err) {
        caughtError = new Error(sanitizeCredentialError(err, token));
      }

      expect(caughtError).not.toBeNull();
      const message = caughtError!.message;

      // No Electron internals
      expect(message).not.toContain('safeStorage.encryptString');
      expect(message).not.toContain('Error while encrypting');

      // No token
      expect(message).not.toContain(token);

      // Clear SRGNT-owned error
      expect(message).toContain('Secure credential storage is not available on this system');
    });
  });
});
