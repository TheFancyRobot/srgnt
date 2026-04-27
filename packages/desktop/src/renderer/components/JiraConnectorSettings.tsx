import React from 'react';

type CredentialBackend = 'keychain' | 'encrypted-local' | 'unavailable';
type CredentialStoragePreference = 'keychain' | 'encrypted-local';
type JiraStorageHelpPlatform = 'darwin' | 'win32' | 'linux' | string | undefined;

function jiraStorageRecoveryGuidance(platform: JiraStorageHelpPlatform): string {
  switch (platform) {
    case 'linux':
      return 'On Linux, SRGNT uses the desktop Secret Service API when available. Install libsecret and run/unlock a keyring provider such as GNOME Keyring or KWallet. In WSL, containers, SSH sessions, or headless desktops, the Secret Service may not be available; use a normal signed-in desktop session with the keyring unlocked.';
    case 'darwin':
      return 'On macOS, SRGNT uses Keychain by default. Make sure you are signed into a normal desktop session, the login keychain is unlocked, and any system permission prompts for SRGNT are allowed.';
    case 'win32':
      return 'On Windows, SRGNT uses Windows Credential Manager by default. Make sure you are running in a normal signed-in desktop session where Credential Manager is available.';
    default:
      return 'Enable a supported OS credential store for this desktop session, then reopen Settings and try saving the Jira token again.';
  }
}

interface JiraConnectorSettingsProps {
  settings: Record<string, unknown> | null;
  tokenStatus: {
    exists: boolean;
    backend: CredentialBackend;
    preferredBackend?: CredentialStoragePreference;
    keychainAvailable?: boolean;
    encryptedLocalAvailable?: boolean;
  } | null;
  tokenDraft: string;
  onSettingsChange: (settings: Record<string, unknown>) => void;
  onTokenChange: (token: string) => void;
  onTokenSubmit: () => void;
  onTokenDelete: () => void;
  onSaveSettings: (settings: Record<string, unknown>) => void;
}

export function JiraConnectorSettingsPanel({
  settings,
  tokenStatus,
  tokenDraft,
  onSettingsChange,
  onTokenChange,
  onTokenSubmit,
  onTokenDelete,
  onSaveSettings,
}: JiraConnectorSettingsProps): React.ReactElement {
  const scopeMode = (settings?.scopeMode as string) ?? 'projects';

  function updateSetting(key: string, value: unknown): void {
    onSettingsChange({ ...(settings ?? {}), [key]: value });
  }

  // BUG-0019: Credential storage preference helpers
  const savedPreference =
    (tokenStatus?.preferredBackend as CredentialStoragePreference | undefined) ??
    ((settings?.credentialStoragePreference as CredentialStoragePreference | undefined) ?? 'keychain');
  const keychainAvailable = tokenStatus?.keychainAvailable ?? tokenStatus?.backend === 'keychain';
  const effectivePreference = keychainAvailable ? savedPreference : 'encrypted-local';
  const backendLabel =
    tokenStatus?.backend === 'keychain'
      ? 'OS keychain'
      : tokenStatus?.backend === 'encrypted-local'
        ? 'encrypted in-app storage'
        : 'No encrypted storage backend available';
  const storageUnavailable = tokenStatus?.backend === 'unavailable';
  const platform = typeof window !== 'undefined' ? window.srgnt?.platform : undefined;
  const storageRecoveryGuidance = jiraStorageRecoveryGuidance(platform);

  return (
    <section id="settings-section-jira" className="space-y-4">
      <h2 className="section-heading mb-4">Jira</h2>

      {/* Site URL */}
      <div className="card p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <label htmlFor="jira-site-url" className="text-sm font-medium text-text-primary">
              Jira Site URL
            </label>
            <p className="text-xs text-text-tertiary mt-0.5">
              Your Atlassian site URL (e.g. https://company.atlassian.net)
            </p>
          </div>
          <div className="flex-shrink-0 mt-0.5">
            <input
              type="text"
              id="jira-site-url"
              value={(settings?.siteUrl as string) ?? ''}
              onChange={(e) => updateSetting('siteUrl', e.target.value)}
              placeholder="https://company.atlassian.net"
              className="input w-64 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Account Email */}
      <div className="card p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <label htmlFor="jira-account-email" className="text-sm font-medium text-text-primary">
              Account Email
            </label>
            <p className="text-xs text-text-tertiary mt-0.5">
              Email address associated with your Jira account
            </p>
          </div>
          <div className="flex-shrink-0 mt-0.5">
            <input
              type="text"
              id="jira-account-email"
              value={(settings?.accountEmail as string) ?? ''}
              onChange={(e) => updateSetting('accountEmail', e.target.value)}
              placeholder="user@company.com"
              className="input w-64 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Scope Mode */}
      <div className="card p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <label htmlFor="jira-scope-mode" className="text-sm font-medium text-text-primary">
              Scope Mode
            </label>
            <p className="text-xs text-text-tertiary mt-0.5">
              Filter issues by project keys or JQL query
            </p>
          </div>
          <div className="flex-shrink-0 mt-0.5">
            <select
              id="jira-scope-mode"
              value={scopeMode}
              onChange={(e) => updateSetting('scopeMode', e.target.value)}
              className="input w-36 text-sm"
            >
              <option value="projects">Projects</option>
              <option value="jql">JQL Query</option>
            </select>
          </div>
        </div>
      </div>

      {/* Project Keys */}
      {scopeMode === 'projects' && (
        <div className="card p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <label htmlFor="jira-project-keys" className="text-sm font-medium text-text-primary">
                Project Keys
              </label>
              <p className="text-xs text-text-tertiary mt-0.5">
                Comma-separated Jira project keys (e.g. PROJ, ADMIN)
              </p>
            </div>
            <div className="flex-shrink-0 mt-0.5">
              <input
                type="text"
                id="jira-project-keys"
                value={
                  Array.isArray(settings?.projectKeys)
                    ? (settings.projectKeys as string[]).join(', ')
                    : ''
                }
                onChange={(e) => {
                  const keys = e.target.value
                    .split(',')
                    .map((k) => k.trim())
                    .filter(Boolean);
                  updateSetting('projectKeys', keys);
                }}
                placeholder="PROJ, ADMIN"
                className="input w-64 text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* JQL */}
      {scopeMode === 'jql' && (
        <div className="card p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <label htmlFor="jira-jql" className="text-sm font-medium text-text-primary">
                JQL Query
              </label>
              <p className="text-xs text-text-tertiary mt-0.5">
                Jira Query Language filter (used when scope mode is JQL)
              </p>
            </div>
            <div className="flex-shrink-0 mt-0.5">
              <input
                type="text"
                id="jira-jql"
                value={(settings?.jql as string) ?? ''}
                onChange={(e) => updateSetting('jql', e.target.value)}
                placeholder="project = PROJ ORDER BY updated DESC"
                className="input w-64 text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Extraction Toggles */}
      {[
        {
          key: 'includeComments',
          label: 'Include Comments',
          description: 'Extract comment count per issue',
        },
        {
          key: 'includeSubtasks',
          label: 'Include Subtasks',
          description: 'Also extract subtask issues',
        },
      ].map(({ key, label, description }) => {
        const toggles = (settings?.extractionToggles as Record<string, boolean>) ?? {};
        return (
          <div key={key} className="card p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <label className="text-sm font-medium text-text-primary">{label}</label>
                <p className="text-xs text-text-tertiary mt-0.5">{description}</p>
              </div>
              <div className="flex-shrink-0 mt-0.5">
                <label className="relative inline-flex items-center cursor-pointer gap-3">
                  <input
                    type="checkbox"
                    checked={Boolean(toggles[key])}
                    onChange={(e) =>
                      onSettingsChange({
                        ...(settings ?? {}),
                        extractionToggles: {
                          ...toggles,
                          [key]: e.target.checked,
                        },
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-border-default peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-srgnt-300/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all after:shadow-xs peer-checked:bg-srgnt-500 transition-colors" />
                  <span className="text-xs text-text-tertiary font-mono-data">
                    {toggles[key] ? 'On' : 'Off'}
                  </span>
                </label>
              </div>
            </div>
          </div>
        );
      })}

      {/* BUG-0019: Token Storage Preference / BUG-0020: unavailable state */}
      <div className="card p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <label htmlFor="jira-token-storage-preference" className="text-sm font-medium text-text-primary">
              Token Storage
            </label>
            <p className="text-xs text-text-tertiary mt-0.5">
              Choose where SRGNT stores your Jira API token. Encrypted in-app storage stays on this device and remains encrypted.
            </p>
            {storageUnavailable && (
              <div className="mt-1 space-y-1">
                <p className="text-xs text-red-400">
                  Secure credential storage is unavailable on this system. SRGNT cannot save Jira API tokens until OS keychain support or Electron encrypted storage is available.
                </p>
                <details className="text-xs text-text-tertiary">
                  <summary className="cursor-pointer text-srgnt-300 hover:text-srgnt-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-srgnt-300/50 rounded-sm w-fit">
                    More Info
                  </summary>
                  <div className="mt-1 space-y-1 rounded border border-border-default bg-surface-secondary/50 p-2">
                    <p>
                      SRGNT intentionally does not save Jira API tokens as plaintext or store them in workspace files.
                    </p>
                    <p>{storageRecoveryGuidance}</p>
                    <p>
                      After enabling secure credential storage, return to Jira settings and save the token again.
                    </p>
                  </div>
                </details>
              </div>
            )}
            {!keychainAvailable && !storageUnavailable && (
              <p className="text-xs text-amber-400 mt-1">
                OS keychain storage is not available on this machine. SRGNT will use encrypted in-app storage instead.
              </p>
            )}
            {(effectivePreference === 'encrypted-local' || (!keychainAvailable && tokenStatus?.backend === 'encrypted-local')) && (
              <p className="text-xs text-text-tertiary mt-1">
                In-app token storage is encrypted and stored inside SRGNT&apos;s app data, not in your workspace files.
              </p>
            )}
          </div>
          <div className="flex-shrink-0 mt-0.5">
            <select
              id="jira-token-storage-preference"
              value={effectivePreference}
              onChange={(e) => updateSetting('credentialStoragePreference', e.target.value as CredentialStoragePreference)}
              className="input w-48 text-sm"
              disabled={storageUnavailable}
            >
              <option value="keychain" disabled={!keychainAvailable || storageUnavailable}>
                OS keychain (recommended)
              </option>
              <option value="encrypted-local" disabled={storageUnavailable}>
                Encrypted in-app storage
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* API Token */}
      <div className="card p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <label htmlFor="jira-token" className="text-sm font-medium text-text-primary">
              API Token
            </label>
            <p className="text-xs text-text-tertiary mt-0.5">
              {tokenStatus?.exists
                ? `Token is stored securely using ${backendLabel}. Submit a new token to replace it.`
                : 'No token configured. Paste your Jira API token to enable live sync. It will be stored using the selected encrypted storage option.'}
            </p>
          </div>
          <div className="flex-shrink-0 mt-0.5 flex gap-2">
            <input
              type="password"
              id="jira-token"
              value={tokenDraft}
              onChange={(e) => onTokenChange(e.target.value)}
              onBlur={onTokenSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onTokenSubmit();
                }
              }}
              placeholder="Paste token and tab out to save"
              className="input w-64 text-sm"
              autoComplete="off"
            />
            <button
              type="button"
              className="btn btn-secondary text-xs px-3"
              onClick={onTokenSubmit}
              disabled={!tokenDraft.trim() || storageUnavailable}
            >
              Save Token
            </button>
          </div>
        </div>
      </div>

      {/* Save Settings */}
      <div className="card p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <label className="text-sm font-medium text-text-primary">Save Jira Settings</label>
            <p className="text-xs text-text-tertiary mt-0.5">
              Save the Jira configuration above (settings only — token is saved separately)
            </p>
          </div>
          <div className="flex-shrink-0 mt-0.5">
            <button
              type="button"
              className="btn btn-primary text-xs px-4"
              onClick={() => {
                if (settings) {
                  onSaveSettings({ connectorId: 'jira', ...settings });
                }
              }}
              disabled={!settings}
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>

      {/* Delete Token */}
      {tokenStatus?.exists && (
        <div className="card p-4 border border-red-500/30">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <label className="text-sm font-medium text-text-primary text-red-400">Remove Token</label>
              <p className="text-xs text-text-tertiary mt-0.5">
                Remove the stored Jira API token. This does not delete the token from Jira.
              </p>
            </div>
            <div className="flex-shrink-0 mt-0.5">
              <button
                type="button"
                className="btn btn-secondary text-xs px-3 text-red-400 border border-red-500/30"
                onClick={onTokenDelete}
              >
                Remove Token
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
