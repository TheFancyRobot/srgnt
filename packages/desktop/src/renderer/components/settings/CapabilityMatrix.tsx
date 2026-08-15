import React from 'react';
import type { HarnessCapabilitiesResponse, HarnessCapabilityRow, HarnessQuirk } from '@srgnt/contracts';

/**
 * The capability matrix (PHASE-25, STEP-25-03) — ARCH-0009's
 * capability-driven-degradation invariant made human-legible.
 *
 * Every cell answers *why* a feature is on or off for a harness: advertised,
 * genuinely absent, advertised-then-clamped by a definition override, forced on
 * by one, discovered only mid-session, or never measured at all. A feature that
 * silently is not there is the failure this screen exists to prevent.
 *
 * Nothing here is keyed on a harness id. Rows come from the registry, cells from
 * the last-negotiated cache, behavioral columns from declared quirks — so
 * Phase-26's arbitrary harnesses render with zero changes to this file, the same
 * constraint STEP-23-03 set for `TrustBadge`.
 */

/**
 * The negotiated fields worth a column, in reading order. A UI list of *which
 * capabilities are interesting*, not per-harness knowledge: a key absent from a
 * row renders as not-measured, never as a no.
 */
const CAPABILITY_COLUMNS: readonly { readonly key: string; readonly label: string }[] = [
  { key: 'loadSession', label: 'Replay' },
  { key: 'resumeSession', label: 'Resume' },
  { key: 'modes', label: 'Modes' },
  { key: 'slashCommands', label: 'Slash commands' },
  { key: 'images', label: 'Images' },
  { key: 'audio', label: 'Audio' },
  { key: 'embeddedContext', label: 'Embedded context' },
  { key: 'mcpServers', label: 'MCP stdio' },
  { key: 'mcpHttp', label: 'MCP http' },
  { key: 'mcpSse', label: 'MCP sse' },
];

/** Quirk → the behavioral column it drives. Read from quirk data, never from an id. */
const SELF_APPROVING_QUIRK: HarnessQuirk = 'permission-routing-gaps';
const NO_DELEGATION_QUIRK: HarnessQuirk = 'no-client-delegation';

type CellState = 'yes' | 'no' | 'clamped' | 'forced' | 'not-observed' | 'not-measured';

interface Cell {
  readonly state: CellState;
  readonly label: string;
  readonly title: string;
}

const NOT_MEASURED: Cell = {
  state: 'not-measured',
  label: '—',
  title: 'Not measured yet. Capabilities are recorded when a session connects to this harness.',
};

/**
 * One cell, from the row's own data.
 *
 * The distinctions this makes are the whole point: `false` on a
 * session-discovered field is "not observed yet", not "no"; a negotiated `true`
 * that the effective view turned off is a srgnt decision and must say so; and a
 * row with no measurement behind it renders honestly rather than as a wall of
 * no.
 */
function capabilityCell(row: HarnessCapabilityRow, key: string): Cell {
  if (row.state !== 'measured') {
    return row.state === 'stale'
      ? {
          ...NOT_MEASURED,
          title:
            'This harness definition changed since it was last measured, so the recorded capabilities describe a different launch. Start a session to refresh it.',
        }
      : NOT_MEASURED;
  }
  const negotiated = row.negotiated[key];
  const effective = row.effective[key];
  // A field this build does not model (an older or newer cache row) is unknown,
  // not absent — reporting it as a no would invent a measurement.
  if (typeof negotiated !== 'boolean' || typeof effective !== 'boolean') return NOT_MEASURED;
  if (negotiated && !effective) {
    return {
      state: 'clamped',
      label: 'clamped',
      title:
        'The agent advertised this capability, and this harness definition disables it. srgnt will not use it.',
    };
  }
  if (!negotiated && effective) {
    return {
      state: 'forced',
      label: 'forced',
      title:
        'The agent did not advertise this capability, and this harness definition forces it on. srgnt will use it anyway.',
    };
  }
  if (negotiated) return { state: 'yes', label: 'yes', title: 'Advertised by the agent and enabled.' };
  return row.provenance[key] === 'session'
    ? {
        state: 'not-observed',
        label: 'not seen',
        title:
          'Discovered per session, not at connect time: the agent has not shown this in a measured session yet. It is not a no.',
      }
    : { state: 'no', label: 'no', title: 'The agent did not advertise this capability.' };
}

const TONE: Record<CellState, string> = {
  yes: 'text-success',
  no: 'text-text-tertiary',
  clamped: 'text-warning',
  forced: 'text-warning',
  'not-observed': 'text-text-secondary',
  'not-measured': 'text-text-tertiary',
};

function CellBody({
  cell,
  harnessId,
  capability,
}: {
  readonly cell: Cell;
  readonly harnessId: string;
  readonly capability: string;
}): React.ReactElement {
  return (
    <td className="px-2 py-1.5 whitespace-nowrap">
      <span
        className={`text-xs font-mono-data ${TONE[cell.state]}`}
        data-testid="capability-cell"
        data-harness-id={harnessId}
        data-capability={capability}
        data-state={cell.state}
        title={cell.title}
      >
        {cell.label}
      </span>
    </td>
  );
}

/** A behavioral column: not in the negotiation at all, driven by declared quirks. */
function QuirkCell({
  row,
  quirk,
  present,
  absent,
}: {
  readonly row: HarnessCapabilityRow;
  readonly quirk: HarnessQuirk;
  readonly present: Cell;
  readonly absent: Cell;
}): React.ReactElement {
  return (
    <CellBody
      cell={row.quirks.includes(quirk) ? present : absent}
      harnessId={row.harnessId}
      capability={quirk}
    />
  );
}

/** "measured 2026-08-15" / "never connected", plus the agent version behind it. */
function Freshness({ row }: { readonly row: HarnessCapabilityRow }): React.ReactElement {
  if (row.state === 'not-yet-measured') {
    return (
      <span className="text-[11px] text-text-tertiary" data-testid="capability-freshness" data-state={row.state}>
        never connected
      </span>
    );
  }
  return (
    <span
      className={`text-[11px] ${row.state === 'stale' ? 'text-warning' : 'text-text-tertiary'}`}
      data-testid="capability-freshness"
      data-state={row.state}
      title={row.capturedAt}
    >
      {row.state === 'stale' ? 'definition changed — re-connect to refresh' : `measured ${(row.capturedAt ?? '').slice(0, 10)}`}
      {row.agentVersion !== undefined && ` · ${row.agentVersion}`}
    </span>
  );
}

export function CapabilityMatrix(): React.ReactElement | null {
  const [response, setResponse] = React.useState<HarnessCapabilitiesResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    // An older preload has no capability bridge: hide the section rather than
    // crashing Settings, exactly as the harness list does.
    const read = window.srgnt.harnessCapabilities;
    if (read === undefined) return;
    void (async () => {
      try {
        setResponse(await read());
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
      }
    })();
  }, []);

  if (window.srgnt.harnessCapabilities === undefined) return null;

  const rows = response?.entries ?? [];
  // Which columns are session-discovered comes from the payload, not from a
  // second list of field names kept in sync by hand.
  const sessionDiscovered = new Set(
    rows.flatMap((row) =>
      Object.entries(row.provenance)
        .filter(([, provenance]) => provenance === 'session')
        .map(([key]) => key),
    ),
  );

  return (
    <section id="settings-section-capabilities" data-testid="capability-matrix">
      <h2 className="section-heading mb-1">Capabilities</h2>
      <p className="text-xs text-text-tertiary mb-3">
        What each configured harness could actually do the last time srgnt connected to it. Recorded from the agent&apos;s
        own `initialize` negotiation — never assumed — so a feature that is missing says why.
      </p>

      {error !== null && (
        <p className="text-xs text-error mb-3" role="alert" data-testid="capability-error">
          {error}
        </p>
      )}

      {rows.length === 0 ? (
        <p className="text-xs text-text-tertiary" data-testid="capability-empty">
          No harnesses are configured yet.
        </p>
      ) : (
        /* Scrolls inside itself: the matrix is wider than the settings column and
           must never make the page scroll sideways. */
        <div className="overflow-x-auto">
          <table className="text-xs" data-testid="capability-table">
            <thead>
              <tr className="text-text-secondary">
                <th className="px-2 py-1.5 text-left font-medium">Harness</th>
                {CAPABILITY_COLUMNS.map((column) => (
                  <th key={column.key} className="px-2 py-1.5 text-left font-medium whitespace-nowrap">
                    <span
                      title={
                        sessionDiscovered.has(column.key)
                          ? 'Discovered per session: the agent reveals this after connecting, never at initialize.'
                          : undefined
                      }
                      data-testid="capability-column"
                      data-capability={column.key}
                      data-discovery={sessionDiscovered.has(column.key) ? 'session' : 'initialize'}
                    >
                      {column.label}
                      {sessionDiscovered.has(column.key) && (
                        <span className="block text-[10px] font-normal text-text-tertiary">per session</span>
                      )}
                    </span>
                  </th>
                ))}
                <th className="px-2 py-1.5 text-left font-medium whitespace-nowrap">Permissions</th>
                <th className="px-2 py-1.5 text-left font-medium whitespace-nowrap">Client delegation</th>
                <th className="px-2 py-1.5 text-left font-medium">Measured</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.harnessId} data-testid="capability-row" data-harness-id={row.harnessId} data-state={row.state}>
                  <td className="px-2 py-1.5 text-text-primary whitespace-nowrap">{row.name}</td>
                  {CAPABILITY_COLUMNS.map((column) => (
                    <CellBody
                      key={column.key}
                      cell={capabilityCell(row, column.key)}
                      harnessId={row.harnessId}
                      capability={column.key}
                    />
                  ))}
                  <QuirkCell
                    row={row}
                    quirk={SELF_APPROVING_QUIRK}
                    // The same honest copy as the chat trust badge: srgnt is not
                    // protecting the user here, and cannot.
                    present={{
                      state: 'clamped',
                      label: 'self-approving',
                      title:
                        'This agent approves its own tool use inside its own process. srgnt cannot gate it, and no permission prompts will appear.',
                    }}
                    absent={{
                      state: 'yes',
                      label: 'srgnt gates',
                      title: 'Tool use is routed through srgnt’s permission engine.',
                    }}
                  />
                  <QuirkCell
                    row={row}
                    quirk={NO_DELEGATION_QUIRK}
                    present={{
                      state: 'no',
                      label: 'none',
                      title:
                        'This agent runs its tools in its own process and never calls srgnt’s file or terminal services, so their output cannot be shown inline.',
                    }}
                    absent={{
                      ...NOT_MEASURED,
                      title:
                        'Not measured: nothing in the negotiation records whether an agent delegates file and terminal work to the client. Only a declared quirk can say it does not.',
                    }}
                  />
                  <td className="px-2 py-1.5">
                    <Freshness row={row} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
