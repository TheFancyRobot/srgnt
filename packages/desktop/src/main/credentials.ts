/**
 * Jira Credential Adapter
 *
 * Stores Jira API tokens using Electron's safeStorage encryption in an app-private
 * encrypted blob. NEVER stores tokens in desktop-settings.json or any workspace file.
 *
 * DEC-0017: Token must never appear in:
 *   - DesktopSettings / desktop-settings.json
 *   - Preload getters
 *   - Renderer state rehydration
 *   - Logs
 *   - Crash reports
 *
 * Backend preference order:
 *   1. keytar OS keychain (Windows Credential Manager, macOS Keychain, libsecret)
 *   2. Electron safeStorage encrypted-local blob
 *   3. unavailable with a clear error when no non-plaintext backend works
 */

import { app, safeStorage } from "electron";
import * as fs from "node:fs/promises";
import * as path from "node:path";

export type CredentialBackend = "keychain" | "encrypted-local" | "unavailable";

interface CredentialAdapter {
  setSecret(connectorId: string, secret: string): Promise<void>;
  /** Returns decrypted token or undefined if not stored. Token stays in memory only. */
  getSecret(connectorId: string): Promise<string | undefined>;
  hasSecret(connectorId: string): Promise<boolean>;
  deleteSecret(connectorId: string): Promise<void>;
  getBackendStatus(): CredentialBackend;
}

/**
 * Maps connectorId → base64(safeStorage.encryptString(token))
 * Stored at: app.getPath('userData') / credentials.encrypted.json
 * This is app-private — NOT in the workspace directory.
 */
interface EncryptedCredentialStore {
  [connectorId: string]: string; // base64 encoded encrypted blob
}


function getCredentialStorePath(): string {
  return path.join(app.getPath("userData"), "credentials.encrypted.json");
}

async function readCredentialStore(): Promise<EncryptedCredentialStore> {
  const filePath = getCredentialStorePath();
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as EncryptedCredentialStore;
  } catch {
    return {};
  }
}

async function writeCredentialStore(store: EncryptedCredentialStore): Promise<void> {
  const filePath = getCredentialStorePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(store, null, 2), "utf8");
}

function redactToken(message: string, token?: string): string {
  if (!token) return message;
  // Replace all occurrences of token with [REDACTED] (token may contain regex chars)
  return message.replace(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), "[REDACTED]");
}

function encryptSecret(secret: string): string {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("[credentials] No non-plaintext credential backend is available: keytar failed and safeStorage encryption is unavailable.");
  }

  return safeStorage.encryptString(secret).toString("base64");
}

function decryptSecret(base64: string): string | undefined {
  if (!safeStorage.isEncryptionAvailable()) {
    return undefined;
  }

  try {
    return safeStorage.decryptString(Buffer.from(base64, "base64"));
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Credential adapters
// ---------------------------------------------------------------------------

function createSafeStorageAdapter(): CredentialAdapter {
  return {
    async setSecret(connectorId: string, secret: string): Promise<void> {
      const store = await readCredentialStore();
      store[connectorId] = encryptSecret(secret);
      await writeCredentialStore(store);
    },

    async hasSecret(connectorId: string): Promise<boolean> {
      const store = await readCredentialStore();
      return connectorId in store;
    },

    async deleteSecret(connectorId: string): Promise<void> {
      const store = await readCredentialStore();
      delete store[connectorId];
      await writeCredentialStore(store);
    },

    async getSecret(connectorId: string): Promise<string | undefined> {
      const store = await readCredentialStore();
      const base64 = store[connectorId];
      if (!base64) return undefined;
      return decryptSecret(base64);
    },

    getBackendStatus(): CredentialBackend {
      return safeStorage.isEncryptionAvailable() ? 'encrypted-local' : 'unavailable';
    },
  };
}

interface KeytarModule {
  setPassword(service: string, account: string, password: string): Promise<void>;
  getPassword(service: string, account: string): Promise<string | null>;
  deletePassword(service: string, account: string): Promise<boolean>;
}

let importKeytarImpl = async (): Promise<KeytarModule> => {
  const dynamicImport = new Function('specifier', 'return import(specifier)') as (specifier: string) => Promise<unknown>;
  return dynamicImport('keytar') as Promise<KeytarModule>;
};

function activateSafeStorageAdapter(): CredentialAdapter {
  const adapter = createSafeStorageAdapter();
  _activeBackendAdapter = adapter;
  _status = adapter.getBackendStatus();
  return adapter;
}

function createKeytarAdapter(keytar: KeytarModule): CredentialAdapter {
  const SERVICE = 'srgnt-jira';

  const fallback = async <T>(operation: (adapter: CredentialAdapter) => Promise<T>): Promise<T> => {
    const adapter = activateSafeStorageAdapter();
    return operation(adapter);
  };

  return {
    async setSecret(connectorId: string, secret: string): Promise<void> {
      try {
        await keytar.setPassword(SERVICE, connectorId, secret);
      } catch {
        await fallback((adapter) => adapter.setSecret(connectorId, secret));
      }
    },

    async getSecret(connectorId: string): Promise<string | undefined> {
      try {
        return (await keytar.getPassword(SERVICE, connectorId)) ?? undefined;
      } catch {
        return fallback((adapter) => adapter.getSecret(connectorId));
      }
    },

    async hasSecret(connectorId: string): Promise<boolean> {
      try {
        return (await keytar.getPassword(SERVICE, connectorId)) !== null;
      } catch {
        return fallback((adapter) => adapter.hasSecret(connectorId));
      }
    },

    async deleteSecret(connectorId: string): Promise<void> {
      try {
        await keytar.deletePassword(SERVICE, connectorId);
      } catch {
        await fallback((adapter) => adapter.deleteSecret(connectorId));
      }
    },

    getBackendStatus(): CredentialBackend {
      return 'keychain';
    },
  };
}

// ---------------------------------------------------------------------------
// Module-level singleton
// ---------------------------------------------------------------------------

let _activeBackendAdapter: CredentialAdapter | null = null;
let _delegatingAdapter: CredentialAdapter | null = null;
let _status: CredentialBackend = "unavailable";

function currentBackendAdapter(): CredentialAdapter {
  if (!_activeBackendAdapter) {
    throw new Error('[credentials] Credential adapter has not been initialized.');
  }
  return _activeBackendAdapter;
}

function createDelegatingAdapter(): CredentialAdapter {
  return {
    setSecret: (connectorId, secret) => currentBackendAdapter().setSecret(connectorId, secret),
    getSecret: (connectorId) => currentBackendAdapter().getSecret(connectorId),
    hasSecret: (connectorId) => currentBackendAdapter().hasSecret(connectorId),
    deleteSecret: (connectorId) => currentBackendAdapter().deleteSecret(connectorId),
    getBackendStatus: () => currentBackendAdapter().getBackendStatus(),
  };
}

export async function createCredentialAdapter(): Promise<CredentialAdapter> {
  if (_delegatingAdapter !== null) return _delegatingAdapter;

  _delegatingAdapter = createDelegatingAdapter();

  try {
    const keytar = await importKeytarImpl();
    _activeBackendAdapter = createKeytarAdapter(keytar);
    _status = 'keychain';
  } catch {
    activateSafeStorageAdapter();
  }

  return _delegatingAdapter;
}

export function getCredentialBackendStatus(): CredentialBackend {
  return _status;
}

export function __resetCredentialAdapterForTests(options?: {
  importKeytar?: () => Promise<KeytarModule>;
}): void {
  _activeBackendAdapter = null;
  _delegatingAdapter = null;
  _status = "unavailable";
  importKeytarImpl = options?.importKeytar ?? (async (): Promise<KeytarModule> => {
    const dynamicImport = new Function('specifier', 'return import(specifier)') as (specifier: string) => Promise<unknown>;
    return dynamicImport('keytar') as Promise<KeytarModule>;
  });
}

/**
 * Returns a redacted error message for logging — token material never appears in logs.
 */
export function redactCredentialError(message: string, token?: string): string {
  if (!token) return message;
  return redactToken(message, token);
}
