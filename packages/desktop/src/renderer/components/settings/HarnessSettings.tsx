import React from 'react';
import type { HarnessDefinition, HarnessDetection, HarnessListEntry, HarnessListResponse } from '@srgnt/contracts';
import { useProjectsOptional } from '../chat/ProjectsContext.js';

/**
 * Harness settings (PHASE-25, STEP-25-02): the operating surface for
 * `harnesses.json`, which until now was hand-edit-only.
 *
 * Two honest consequences the UI has to state rather than hide:
 *
 * - **Overrides are wholesale.** The registry replaces a shadowed built-in
 *   outright, so an overridden Pi stops tracking future built-in changes (an
 *   adapter version bump, say) until it is reset. That is what the "Overridden"
 *   badge means, and why Reset exists next to it.
 * - **Settings apply on next spawn.** Running agents are deliberately left
 *   alone — no kill/respawn — so the copy says so instead of implying a live
 *   reconfiguration that never happens.
 *
 * Every save sends the COMPLETE definition back, because a partial record would
 * delete the fields it omits. Main canonicalizes anyway: nothing here is
 * trusted to be the record.
 */

/** Env values may be a `${env:NAME}` reference; anything secret-shaped is refused by main. */
const ENV_REFERENCE_HINT = '${env:NAME}';

function DetectionChip({ detection }: { readonly detection: HarnessDetection }): React.ReactElement {
  const [label, tone, detail] =
    detection.status === 'ok'
      ? [`Installed · ${detection.version}`, 'text-success', detection.command]
      : detection.status === 'not-installed'
        ? ['Not installed', 'text-text-tertiary', `${detection.command} is not on srgnt's PATH — install it, or set an explicit binary path below.`]
        : [
            'Probe failed',
            'text-warning',
            `${detection.command} did not answer --version (${detection.reason}${detection.detail === undefined ? '' : `: ${detection.detail}`}). Check the binary path below.`,
          ];
  return (
    <span
      className={`text-xs font-mono-data ${tone}`}
      data-testid="harness-detection"
      data-status={detection.status}
      title={detail}
    >
      {label}
    </span>
  );
}

interface EnvRow {
  readonly key: string;
  readonly value: string;
}

const toRows = (env: Readonly<Record<string, string>>): EnvRow[] =>
  Object.entries(env).map(([key, value]) => ({ key, value }));

const toEnv = (rows: readonly EnvRow[]): Record<string, string> =>
  Object.fromEntries(rows.filter((row) => row.key.trim() !== '').map((row) => [row.key.trim(), row.value]));

function HarnessCard({
  entry,
  onSave,
  onReset,
  onOpenDocs,
}: {
  readonly entry: HarnessListEntry;
  readonly onSave: (definition: HarnessDefinition) => Promise<string | null>;
  readonly onReset: () => Promise<string | null>;
  readonly onOpenDocs: (url: string) => void;
}): React.ReactElement {
  const { definition } = entry;
  const [command, setCommand] = React.useState(definition.launch.command);
  const [detectCommand, setDetectCommand] = React.useState(definition.detectCommand ?? '');
  const [envRows, setEnvRows] = React.useState<EnvRow[]>(() => toRows(definition.launch.env));
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  // The list is re-fetched after every mutation, so the draft follows whatever
  // main actually stored — including a canonicalization the payload did not ask
  // for. Keeping a stale draft would show the user an edit that never landed.
  React.useEffect(() => {
    setCommand(definition.launch.command);
    setDetectCommand(definition.detectCommand ?? '');
    setEnvRows(toRows(definition.launch.env));
  }, [definition]);

  const run = async (action: () => Promise<string | null>): Promise<void> => {
    setBusy(true);
    setError(await action());
    setBusy(false);
  };

  return (
    <div className="card p-4 space-y-3" data-testid="harness-card" data-harness-id={definition.id}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-primary">{definition.name}</span>
            <span className="text-[11px] font-mono-data text-text-tertiary">{definition.source}</span>
            {entry.overridden && (
              <span
                className="text-[11px] font-mono-data text-warning"
                data-testid="harness-overridden"
                title="This definition is stored in your workspace and replaces the shipped one, so it will not pick up future built-in changes until you reset it."
              >
                Overridden
              </span>
            )}
          </div>
          {definition.description !== undefined && (
            <p className="text-xs text-text-tertiary mt-0.5">{definition.description}</p>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <DetectionChip detection={entry.detection} />
          {definition.docsUrl !== undefined && (
            <button
              type="button"
              className="text-xs text-text-secondary underline"
              data-testid="harness-docs"
              onClick={() => onOpenDocs(definition.docsUrl as string)}
            >
              Docs
            </button>
          )}
        </div>
      </div>

      <label className="block text-xs text-text-secondary">
        Binary path
        <input
          className="input w-full text-xs font-mono-data mt-1"
          data-testid="harness-command"
          aria-label={`${definition.name} binary path`}
          value={command}
          onChange={(event) => setCommand(event.target.value)}
        />
      </label>

      <label className="block text-xs text-text-secondary">
        Detect command
        <input
          className="input w-full text-xs font-mono-data mt-1"
          data-testid="harness-detect-command"
          aria-label={`${definition.name} detect command`}
          // Pi launches `npx` but needs the `pi` CLI, so the probed binary is
          // its own field: fixing the launch path without this would leave the
          // chip stuck on the old command forever.
          placeholder={command}
          value={detectCommand}
          onChange={(event) => setDetectCommand(event.target.value)}
        />
      </label>

      <div className="space-y-2">
        <span className="block text-xs text-text-secondary">Environment</span>
        {envRows.map((row, index) => (
          <div key={index} className="flex gap-2">
            <input
              className="input flex-1 text-xs font-mono-data"
              aria-label={`${definition.name} environment name ${index + 1}`}
              data-testid="harness-env-key"
              value={row.key}
              onChange={(event) =>
                setEnvRows((rows) => rows.map((current, at) => (at === index ? { ...current, key: event.target.value } : current)))
              }
            />
            <input
              className="input flex-1 text-xs font-mono-data"
              aria-label={`${definition.name} environment value ${index + 1}`}
              data-testid="harness-env-value"
              placeholder={ENV_REFERENCE_HINT}
              value={row.value}
              onChange={(event) =>
                setEnvRows((rows) => rows.map((current, at) => (at === index ? { ...current, value: event.target.value } : current)))
              }
            />
            <button
              type="button"
              className="btn btn-secondary text-xs px-2"
              aria-label={`Remove ${definition.name} environment variable ${index + 1}`}
              onClick={() => setEnvRows((rows) => rows.filter((_, at) => at !== index))}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn btn-secondary text-xs px-3"
          data-testid="harness-env-add"
          onClick={() => setEnvRows((rows) => [...rows, { key: '', value: '' }])}
        >
          Add variable
        </button>
        <p className="text-[11px] text-text-tertiary">
          Secrets are never stored here: harnesses.json travels with your workspace. Write{' '}
          <code className="font-mono-data">{ENV_REFERENCE_HINT}</code> instead and srgnt resolves it from its own
          environment when the agent starts.
        </p>
      </div>

      {error !== null && (
        <p className="text-xs text-error" role="alert" data-testid="harness-error">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="btn btn-primary text-xs px-3"
          data-testid="harness-save"
          disabled={busy}
          onClick={() =>
            void run(() => {
              // `detectCommand` is dropped off the spread first: clearing the
              // field has to send ABSENT, and a spread would resurrect the old
              // value (the schema rejects `''`, so it cannot be sent empty).
              const { detectCommand: _current, ...rest } = definition;
              return onSave({
                ...rest,
                launch: {
                  ...definition.launch,
                  command,
                  env: toEnv(envRows),
                },
                ...(detectCommand.trim() === '' ? {} : { detectCommand: detectCommand.trim() }),
              } as HarnessDefinition);
            })
          }
        >
          Save
        </button>
        {entry.overridden && (
          <button
            type="button"
            className="btn btn-secondary text-xs px-3"
            data-testid="harness-reset"
            disabled={busy}
            onClick={() => void run(onReset)}
          >
            {definition.source === 'builtin' ? 'Reset to built-in' : 'Delete'}
          </button>
        )}
        <span className="text-[11px] text-text-tertiary">Applies to new sessions.</span>
      </div>
    </div>
  );
}

export function HarnessSettings(): React.ReactElement | null {
  const projects = useProjectsOptional();
  const [response, setResponse] = React.useState<HarnessListResponse | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [defaultError, setDefaultError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async (reprobe = false) => {
    // An older preload has no harness bridge: hide the section rather than
    // crashing Settings.
    if (window.srgnt.harnessList === undefined) return;
    try {
      setResponse(await window.srgnt.harnessList(reprobe));
      setLoadError(null);
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : String(cause));
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  if (window.srgnt.harnessList === undefined) return null;

  /** Mutations answer `{ ok }`; the returned string is the message to render inline. */
  const mutate = async (action: () => Promise<{ ok: true } | { ok: false; error: string }>): Promise<string | null> => {
    try {
      const result = await action();
      await refresh();
      return result.ok ? null : result.error;
    } catch (cause) {
      return cause instanceof Error ? cause.message : String(cause);
    }
  };

  const activeProject = projects?.activeProject ?? null;
  // A stored default that no configured harness answers to. Computed from the
  // same list the select renders, so it cannot disagree with the options.
  const storedDefault = activeProject?.defaultHarnessId ?? null;
  const danglingDefault =
    storedDefault !== null && !(response?.harnesses ?? []).some((e) => e.definition.id === storedDefault)
      ? storedDefault
      : null;

  return (
    <section id="settings-section-harnesses" data-testid="harness-settings">
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-heading">Harnesses</h2>
        <button type="button" className="btn btn-secondary text-xs px-3" data-testid="harness-refresh" onClick={() => void refresh(true)}>
          Re-check
        </button>
      </div>

      {/* The workspace-load result is its own field: an unreadable harnesses.json
          and a workspace with no custom entries both render built-ins, and only
          this tells them apart. */}
      {response?.workspaceLoad.ok === false && (
        <p className="text-xs text-error mb-3" role="alert" data-testid="harness-workspace-error">
          {response.workspaceLoad.error} — built-in harnesses still work, but harness settings cannot be saved until the
          file is fixed.
        </p>
      )}
      {loadError !== null && (
        <p className="text-xs text-error mb-3" role="alert" data-testid="harness-list-error">
          {loadError}
        </p>
      )}

      <div className="space-y-4">
        {(response?.harnesses ?? []).map((entry) => (
          <HarnessCard
            key={entry.definition.id}
            entry={entry}
            // Checked rather than asserted: the section renders whenever
            // `harnessList` exists, so a preload that exposes the read bridge
            // without the mutation ones would throw on click instead of saying
            // what is wrong.
            onSave={(definition) =>
              mutate(async () =>
                window.srgnt.harnessSaveOverride === undefined
                  ? { ok: false as const, error: 'This build cannot save harness overrides. Restart srgnt, or update it if the problem persists.' }
                  : window.srgnt.harnessSaveOverride(entry.definition.id, definition),
              )
            }
            onReset={() =>
              mutate(async () =>
                window.srgnt.harnessResetOverride === undefined
                  ? { ok: false as const, error: 'This build cannot reset harness overrides. Restart srgnt, or update it if the problem persists.' }
                  : window.srgnt.harnessResetOverride(entry.definition.id),
              )
            }
            onOpenDocs={(url) => void window.srgnt.openExternal(url)}
          />
        ))}

        {activeProject !== null && window.srgnt.projectSetDefaults !== undefined && (
          <div className="card p-4" data-testid="harness-project-default">
            <label className="block text-sm font-medium text-text-primary" htmlFor="default-harness-select">
              Default harness for {activeProject.name}
            </label>
            <p className="text-xs text-text-tertiary mt-0.5 mb-2">
              New sessions in this project use it unless you pick another harness.
            </p>
            <select
              id="default-harness-select"
              className="input text-sm"
              value={activeProject.defaultHarnessId ?? ''}
              onChange={(event) => {
                const value = event.target.value;
                void (async () => {
                  setDefaultError(null);
                  try {
                    const setDefaults = window.srgnt.projectSetDefaults;
                    if (setDefaults === undefined) throw new Error('This build cannot change project defaults.');
                    await setDefaults(activeProject.id, { defaultHarnessId: value === '' ? null : value });
                    await projects?.refresh();
                  } catch (cause) {
                    // Silence here would leave the select showing a default the
                    // project never stored — the same lie as the dangling case
                    // below, arrived at from the other direction.
                    setDefaultError(cause instanceof Error ? cause.message : String(cause));
                  }
                })();
              }}
            >
              <option value="">No default (ask each time)</option>
              {(response?.harnesses ?? []).map((entry) => (
                <option key={entry.definition.id} value={entry.definition.id}>
                  {entry.definition.name}
                </option>
              ))}
              {/* The stored id may name a harness that has since been reset,
                  deleted or renamed. Without an option carrying it the browser
                  falls back to the first one, so this screen would read "No
                  default" while the project still stores the dangling id and
                  every new session in it fails. */}
              {danglingDefault !== null && (
                <option value={danglingDefault}>{danglingDefault} — not configured</option>
              )}
            </select>
            {danglingDefault !== null && (
              <p className="text-xs text-status-warning mt-2" data-testid="harness-default-dangling">
                {`"${danglingDefault}" is no longer configured, so new sessions in this project will fail. Pick another harness, or restore it above.`}
              </p>
            )}
            {defaultError !== null && (
              <p className="text-xs text-status-error mt-2" data-testid="harness-default-error">
                {defaultError}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
