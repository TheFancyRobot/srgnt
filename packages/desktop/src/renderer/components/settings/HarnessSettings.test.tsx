/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HarnessSettings } from './HarnessSettings.js';
import { ProjectsProvider } from '../chat/ProjectsContext.js';

afterEach(cleanup);

const piDefinition = {
  id: 'pi',
  name: 'Pi',
  description: 'Pi coding agent via the pi-acp adapter.',
  source: 'builtin' as const,
  launch: { command: 'npx', args: ['pi-acp@0.0.31'], env: {} },
  detectCommand: 'pi',
  quirks: ['adapter-mediated'],
  capabilityOverrides: { mcpServers: false },
  docsUrl: 'https://github.com/mariozechner/pi',
};

const opencodeDefinition = {
  id: 'opencode',
  name: 'opencode',
  source: 'builtin' as const,
  launch: { command: 'opencode', args: ['acp'], env: {} },
  quirks: [],
  capabilityOverrides: {},
};

const project = {
  id: 'aaa111',
  name: 'app',
  rootDir: '/checkouts/app',
  additionalDirectories: [] as readonly string[],
  createdAt: '2026-08-13T10:00:00.000Z',
};

type AnyMock = ReturnType<typeof vi.fn>;
let listResponse: unknown;
let api: Record<string, AnyMock | string>;

beforeEach(() => {
  listResponse = {
    workspaceLoad: { ok: true },
    harnesses: [
      { definition: piDefinition, overridden: false, detection: { status: 'ok', command: 'pi', version: '0.84.1' } },
      {
        definition: opencodeDefinition,
        overridden: false,
        detection: { status: 'not-installed', command: 'opencode' },
      },
    ],
  };
  api = {
    harnessList: vi.fn(async () => listResponse) as AnyMock,
    harnessSaveOverride: vi.fn(async () => ({ ok: true })) as AnyMock,
    harnessResetOverride: vi.fn(async () => ({ ok: true })) as AnyMock,
    openExternal: vi.fn(async () => {}) as AnyMock,
    projectList: vi.fn(async () => ({ projects: [project], skipped: [] })) as AnyMock,
    projectSetDefaults: vi.fn(async () => project) as AnyMock,
    getWorkspaceRoot: vi.fn(async () => project.rootDir) as AnyMock,
  };
  (globalThis as { window: { srgnt: unknown } }).window.srgnt = api;
});

const renderSection = () =>
  render(
    <ProjectsProvider>
      <HarnessSettings />
    </ProjectsProvider>,
  );

const card = (id: string): HTMLElement =>
  screen.getAllByTestId('harness-card').find((entry) => entry.getAttribute('data-harness-id') === id)!;

const within_ = (element: HTMLElement, testId: string): HTMLElement =>
  element.querySelector(`[data-testid="${testId}"]`) as HTMLElement;

describe('HarnessSettings', () => {
  it('renders every registry entry with its detection state', async () => {
    renderSection();
    await waitFor(() => expect(screen.getAllByTestId('harness-card')).toHaveLength(2));

    expect(within_(card('pi'), 'harness-detection')).toHaveAttribute('data-status', 'ok');
    expect(within_(card('pi'), 'harness-detection')).toHaveTextContent('0.84.1');
    // The remedy for `not-installed` is the binary-path field right below it.
    expect(within_(card('opencode'), 'harness-detection')).toHaveAttribute('data-status', 'not-installed');
    expect(within_(card('opencode'), 'harness-detection').getAttribute('title')).toMatch(/binary path/);
  });

  it('sends the COMPLETE definition on save, with only the edited fields changed', async () => {
    renderSection();
    await waitFor(() => expect(screen.getAllByTestId('harness-card')).toHaveLength(2));

    fireEvent.change(within_(card('pi'), 'harness-command'), { target: { value: '/opt/bin/npx' } });
    fireEvent.click(within_(card('pi'), 'harness-save'));

    await waitFor(() => expect(api.harnessSaveOverride).toHaveBeenCalled());
    const [harnessId, definition] = (api.harnessSaveOverride as AnyMock).mock.calls[0] as [string, typeof piDefinition];
    expect(harnessId).toBe('pi');
    expect(definition.launch.command).toBe('/opt/bin/npx');
    // A partial payload would DELETE these — the registry replaces wholesale.
    expect(definition.quirks).toEqual(piDefinition.quirks);
    expect(definition.capabilityOverrides).toEqual({ mcpServers: false });
    expect(definition.detectCommand).toBe('pi');
    expect(definition.launch.args).toEqual(piDefinition.launch.args);
  });

  it('round-trips a cleared detect command as ABSENT, never an empty string', async () => {
    renderSection();
    await waitFor(() => expect(screen.getAllByTestId('harness-card')).toHaveLength(2));

    fireEvent.change(within_(card('pi'), 'harness-detect-command'), { target: { value: '' } });
    fireEvent.click(within_(card('pi'), 'harness-save'));

    await waitFor(() => expect(api.harnessSaveOverride).toHaveBeenCalled());
    const [, definition] = (api.harnessSaveOverride as AnyMock).mock.calls[0] as [string, Record<string, unknown>];
    expect('detectCommand' in definition).toBe(false);
  });

  it('edits environment variables and carries them into the save', async () => {
    renderSection();
    await waitFor(() => expect(screen.getAllByTestId('harness-card')).toHaveLength(2));

    fireEvent.click(within_(card('pi'), 'harness-env-add'));
    fireEvent.change(card('pi').querySelector('[data-testid="harness-env-key"]') as HTMLElement, {
      target: { value: 'PI_LOG_LEVEL' },
    });
    fireEvent.change(card('pi').querySelector('[data-testid="harness-env-value"]') as HTMLElement, {
      target: { value: 'debug' },
    });
    fireEvent.click(within_(card('pi'), 'harness-save'));

    await waitFor(() => expect(api.harnessSaveOverride).toHaveBeenCalled());
    const [, definition] = (api.harnessSaveOverride as AnyMock).mock.calls[0] as [string, typeof piDefinition];
    expect(definition.launch.env).toEqual({ PI_LOG_LEVEL: 'debug' });
  });

  it('renders a rejected save inline instead of pretending it landed', async () => {
    api.harnessSaveOverride = vi.fn(async () => ({
      ok: false,
      error: '"GITHUB_TOKEN" looks like a secret. Reference it instead: ${env:GITHUB_TOKEN}',
    })) as AnyMock;
    renderSection();
    await waitFor(() => expect(screen.getAllByTestId('harness-card')).toHaveLength(2));

    fireEvent.click(within_(card('pi'), 'harness-save'));
    await waitFor(() => expect(within_(card('pi'), 'harness-error')).toHaveTextContent('GITHUB_TOKEN'));
  });

  it('badges an overridden built-in and offers reset', async () => {
    listResponse = {
      workspaceLoad: { ok: true },
      harnesses: [
        {
          definition: { ...piDefinition, launch: { ...piDefinition.launch, command: '/opt/bin/npx' } },
          overridden: true,
          detection: { status: 'ok', command: 'pi', version: '0.84.1' },
        },
      ],
    };
    renderSection();
    await waitFor(() => expect(screen.getAllByTestId('harness-card')).toHaveLength(1));

    expect(within_(card('pi'), 'harness-overridden')).toBeInTheDocument();
    // The honest consequence of wholesale shadowing has to be stated somewhere.
    expect(within_(card('pi'), 'harness-overridden').getAttribute('title')).toMatch(/future built-in changes/);
    fireEvent.click(within_(card('pi'), 'harness-reset'));
    await waitFor(() => expect(api.harnessResetOverride).toHaveBeenCalledWith('pi'));
  });

  it('surfaces an unreadable harnesses.json as its own error, with built-ins still listed', async () => {
    listResponse = {
      workspaceLoad: { ok: false, error: '/ws/harnesses.json does not match the harness schema' },
      harnesses: [
        { definition: piDefinition, overridden: false, detection: { status: 'ok', command: 'pi', version: '0.84.1' } },
      ],
    };
    renderSection();
    await waitFor(() => expect(screen.getByTestId('harness-workspace-error')).toHaveTextContent('harnesses.json'));
    expect(screen.getAllByTestId('harness-card')).toHaveLength(1);
  });

  it('writes the per-project default harness through project:set-defaults', async () => {
    renderSection();
    await waitFor(() => expect(screen.getByTestId('harness-project-default')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/Default harness for app/), { target: { value: 'opencode' } });
    await waitFor(() =>
      expect(api.projectSetDefaults).toHaveBeenCalledWith(project.id, { defaultHarnessId: 'opencode' }),
    );
  });

  it('surfaces a stored default that no configured harness answers to', async () => {
    // Without an option carrying the dangling id the browser falls back to the
    // first one, so the screen reads "No default" while the project still
    // stores it and every new session in that project fails.
    api.projectList = vi.fn(async () => ({
      projects: [{ ...project, defaultHarnessId: 'deleted-harness' }],
      skipped: [],
    })) as AnyMock;
    renderSection();

    await waitFor(() => expect(screen.getByTestId('harness-default-dangling')).toBeInTheDocument());
    expect(screen.getByTestId('harness-default-dangling')).toHaveTextContent('deleted-harness');
    expect((screen.getByLabelText(/Default harness for app/) as HTMLSelectElement).value).toBe('deleted-harness');
  });

  it('reports a failed project:set-defaults instead of showing a value it did not store', async () => {
    api.projectSetDefaults = vi.fn(async (): Promise<unknown> => {
      throw new Error('projects store is read-only');
    }) as AnyMock;
    renderSection();
    await waitFor(() => expect(screen.getByTestId('harness-project-default')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/Default harness for app/), { target: { value: 'opencode' } });
    await waitFor(() =>
      expect(screen.getByTestId('harness-default-error')).toHaveTextContent('projects store is read-only'),
    );
  });

  it('re-probes on demand', async () => {
    renderSection();
    await waitFor(() => expect(api.harnessList).toHaveBeenCalled());
    fireEvent.click(screen.getByTestId('harness-refresh'));
    await waitFor(() => expect(api.harnessList).toHaveBeenCalledWith(true));
  });

  it('hides itself when the preload has no harness bridge', () => {
    delete (api as Record<string, unknown>).harnessList;
    const { container } = renderSection();
    expect(container.querySelector('[data-testid="harness-settings"]')).toBeNull();
  });
});
