/**
 * @vitest-environment jsdom
 *
 * Rows are built by running the REAL `negotiateCapabilities` over the committed
 * capture fixtures, so this suite asserts fixture → rendered row rather than
 * fixture → expectations-someone-typed. The opencode fixture's catalog values
 * are positional placeholders by design (STEP-25-01), so nothing here asserts a
 * value from it — only shape, counts and capability booleans.
 */
import { negotiateCapabilities } from '@srgnt/harness';
import type { HarnessCapabilityRow } from '@srgnt/contracts';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import opencodeInitialize from '../../../../../harness/src/testing/fixtures/opencode/initialize.json';
import spikeFrames from '../../../../../harness/src/testing/fixtures/pi-spike/spike-frames.json';
import { CapabilityMatrix } from './CapabilityMatrix.js';

afterEach(cleanup);

/** Every field the protocol only reveals mid-session, as the payload marks them. */
const PROVENANCE = { modes: 'session', slashCommands: 'session' } as const;

const rowFrom = (
  init: unknown,
  overrides: Partial<HarnessCapabilityRow> & Pick<HarnessCapabilityRow, 'harnessId' | 'name'>,
): HarnessCapabilityRow => {
  const negotiated = negotiateCapabilities(init as Parameters<typeof negotiateCapabilities>[0]) as unknown as Record<
    string,
    unknown
  >;
  return {
    quirks: [],
    state: 'measured',
    negotiated,
    effective: negotiated,
    provenance: { ...Object.fromEntries(Object.keys(negotiated).map((key) => [key, 'initialize'])), ...PROVENANCE },
    authMethods: [],
    capturedAt: '2026-08-15T09:00:00.000Z',
    definitionFingerprint: 'abc123',
    ...overrides,
  } as HarnessCapabilityRow;
};

const piInit = spikeFrames.probe3_initialize_response.msg.result;

/** Pi as srgnt actually ships it: mcpServers advertised, then clamped off. */
const piRow = (): HarnessCapabilityRow => {
  const row = rowFrom(piInit, {
    harnessId: 'pi',
    name: 'Pi',
    quirks: ['adapter-mediated', 'permission-routing-gaps', 'mcp-passthrough-gaps', 'no-client-delegation'],
    agentVersion: '0.0.31',
  });
  return { ...row, effective: { ...row.negotiated, mcpServers: false } };
};

const opencodeRow = (): HarnessCapabilityRow =>
  rowFrom(opencodeInitialize.result, { harnessId: 'opencode', name: 'opencode', agentVersion: '1.18.18' });

let entries: HarnessCapabilityRow[];

beforeEach(() => {
  entries = [piRow(), opencodeRow()];
  (globalThis as { window: { srgnt: unknown } }).window.srgnt = {
    harnessCapabilities: vi.fn(async () => ({ entries })),
  };
});

const cell = (harnessId: string, capability: string): HTMLElement =>
  screen
    .getAllByTestId('capability-cell')
    .find(
      (element) =>
        element.getAttribute('data-harness-id') === harnessId &&
        element.getAttribute('data-capability') === capability,
    )!;

const renderMatrix = async (): Promise<void> => {
  render(<CapabilityMatrix />);
  await waitFor(() => expect(screen.getAllByTestId('capability-row').length).toBe(entries.length));
};

const stateOf = (harnessId: string, capability: string): string | null =>
  cell(harnessId, capability).getAttribute('data-state');

describe('CapabilityMatrix', () => {
  it("renders Pi's measured row cell for cell, clamp included", async () => {
    await renderMatrix();
    // Straight from the spike's initialize frame.
    expect(stateOf('pi', 'loadSession')).toBe('yes');
    expect(stateOf('pi', 'resumeSession')).toBe('no');
    expect(stateOf('pi', 'images')).toBe('yes');
    expect(stateOf('pi', 'audio')).toBe('no');
    expect(stateOf('pi', 'embeddedContext')).toBe('no');
    expect(stateOf('pi', 'mcpHttp')).toBe('no');
    // Advertised true, disabled by the definition — and the copy has to say
    // which of the two it was.
    expect(stateOf('pi', 'mcpServers')).toBe('clamped');
    expect(cell('pi', 'mcpServers').getAttribute('title')).toMatch(/definition disables it/);
  });

  it("renders opencode's measured row from its fixture — no more, no less", async () => {
    await renderMatrix();
    // opencode is native: resume and the richer prompt/MCP surface are real.
    expect(stateOf('opencode', 'loadSession')).toBe('yes');
    expect(stateOf('opencode', 'resumeSession')).toBe('yes');
    expect(stateOf('opencode', 'embeddedContext')).toBe('yes');
    expect(stateOf('opencode', 'mcpHttp')).toBe('yes');
    expect(stateOf('opencode', 'mcpSse')).toBe('yes');
    expect(stateOf('opencode', 'audio')).toBe('no');
    // Nothing was clamped: it declares no quirks and no overrides.
    expect(stateOf('opencode', 'mcpServers')).toBe('yes');
  });

  it('never prints a hard "no" for a capability the protocol reveals mid-session', async () => {
    await renderMatrix();
    for (const harnessId of ['pi', 'opencode']) {
      // Both fixtures are initialize payloads, where `slashCommands` is false by
      // construction — opencode has 93 of them, discovered on the first turn.
      expect(stateOf(harnessId, 'slashCommands')).toBe('not-observed');
      expect(cell(harnessId, 'slashCommands').getAttribute('title')).toMatch(/not a no/i);
    }
    // The caption comes from the payload's provenance, not from a second list
    // of field names in the renderer: exactly the two session-discovered ones.
    expect(screen.getAllByText('per session')).toHaveLength(2);
    expect(
      screen
        .getAllByTestId('capability-column')
        .filter((column) => column.getAttribute('data-discovery') === 'session')
        .map((column) => column.getAttribute('data-capability')),
    ).toEqual(['modes', 'slashCommands']);
  });

  it('renders a session-discovered capability as measured once it was observed', async () => {
    // The post-initialize half of the same row: `available_commands_update`
    // arrived, the cache folded it in, and the cell must now read yes.
    const [pi, opencode] = entries;
    entries = [
      pi!,
      {
        ...opencode!,
        negotiated: { ...opencode!.negotiated, slashCommands: true },
        effective: { ...opencode!.effective, slashCommands: true },
      },
    ];
    await renderMatrix();
    expect(stateOf('opencode', 'slashCommands')).toBe('yes');
    expect(stateOf('pi', 'slashCommands')).toBe('not-observed');
  });

  it('renders a never-connected harness as not measured, never as no', async () => {
    entries = [
      {
        harnessId: 'invented',
        name: 'Invented',
        quirks: [],
        state: 'not-yet-measured',
        negotiated: {},
        effective: {},
        provenance: PROVENANCE,
        authMethods: [],
      },
    ];
    await renderMatrix();
    for (const capability of ['loadSession', 'images', 'mcpServers', 'slashCommands']) {
      expect(stateOf('invented', capability)).toBe('not-measured');
    }
    expect(screen.getByTestId('capability-freshness')).toHaveTextContent('never connected');
  });

  it('treats a row measured against a changed definition as stale, not as current', async () => {
    entries = [{ ...piRow(), state: 'stale' }];
    await renderMatrix();
    expect(stateOf('pi', 'loadSession')).toBe('not-measured');
    expect(screen.getByTestId('capability-freshness')).toHaveTextContent('re-connect to refresh');
  });

  it('shows a forced capability as forced, not as advertised', async () => {
    const row = piRow();
    entries = [{ ...row, effective: { ...row.negotiated, resumeSession: true } }];
    await renderMatrix();
    expect(stateOf('pi', 'resumeSession')).toBe('forced');
  });

  it('drives the behavioral columns from quirks alone', async () => {
    await renderMatrix();
    // Pi: same honest copy as the chat trust badge — srgnt cannot gate it.
    expect(stateOf('pi', 'permission-routing-gaps')).toBe('clamped');
    expect(cell('pi', 'permission-routing-gaps').getAttribute('title')).toMatch(/srgnt cannot gate/);
    expect(cell('pi', 'no-client-delegation')).toHaveTextContent('none');
    // opencode declares neither quirk: gated, and delegation simply unmeasured.
    expect(cell('opencode', 'permission-routing-gaps')).toHaveTextContent('srgnt gates');
    expect(stateOf('opencode', 'no-client-delegation')).toBe('not-measured');
  });

  it('adds a row for a harness it has never heard of, with zero component changes', async () => {
    entries = [
      ...entries,
      {
        harnessId: 'phase-26-agent',
        name: 'Some Future Agent',
        quirks: ['permission-routing-gaps'],
        state: 'measured',
        negotiated: { loadSession: true, modes: false, slashCommands: false },
        effective: { loadSession: true, modes: false, slashCommands: false },
        provenance: { loadSession: 'initialize', ...PROVENANCE },
        authMethods: [],
        capturedAt: '2026-08-15T09:00:00.000Z',
      },
    ];
    await renderMatrix();
    expect(stateOf('phase-26-agent', 'loadSession')).toBe('yes');
    expect(stateOf('phase-26-agent', 'permission-routing-gaps')).toBe('clamped');
    // A capability this build models but that row never measured stays unknown.
    expect(stateOf('phase-26-agent', 'images')).toBe('not-measured');
  });

  it('shows when each row was measured, and against which agent version', async () => {
    await renderMatrix();
    const freshness = screen.getAllByTestId('capability-freshness');
    expect(freshness[0]).toHaveTextContent('measured 2026-08-15');
    expect(freshness[0]).toHaveTextContent('0.0.31');
    expect(freshness[1]).toHaveTextContent('1.18.18');
  });

  it('hides itself when the preload has no capability bridge', () => {
    (globalThis as { window: { srgnt: unknown } }).window.srgnt = {};
    const { container } = render(<CapabilityMatrix />);
    expect(container).toBeEmptyDOMElement();
  });
});
