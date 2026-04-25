import React from 'react';

interface JiraConnectorSettingsProps {
  settings: Record<string, unknown> | null;
  tokenStatus: { exists: boolean; backend: string } | null;
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

      {/* API Token */}
      <div className="card p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <label htmlFor="jira-token" className="text-sm font-medium text-text-primary">
              API Token
            </label>
            <p className="text-xs text-text-tertiary mt-0.5">
              {tokenStatus?.exists
                ? 'Token is stored securely. Submit a new token to replace the existing one.'
                : 'No token configured. Paste your Jira API token to enable live sync.'}
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
              disabled={!tokenDraft.trim()}
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
