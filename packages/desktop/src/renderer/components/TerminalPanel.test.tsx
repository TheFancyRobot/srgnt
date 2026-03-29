import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { LaunchContext } from '@srgnt/contracts';
import { TerminalPanel } from './TerminalPanel';

vi.mock('ghostty-web', () => {
  class MockGhostty {
    static async load() {
      return new MockGhostty();
    }
  }

  class MockTerminal {
    options: { fontSize: number; fontFamily: string };
    rows: number;
    cols: number;

    constructor(options: { fontSize: number; fontFamily: string; rows: number; cols: number }) {
      this.options = options;
      this.rows = options.rows;
      this.cols = options.cols;
    }

    open() {}
    onData() {}
    onResize() {}
    loadAddon() {}
    resize(cols: number, rows: number) {
      this.cols = cols;
      this.rows = rows;
    }
    write() {}
    dispose() {}
    focus() {}
  }

  class MockFitAddon {
    activate() {}
    dispose() {}
    fit() {}
    proposeDimensions() { return undefined; }
    observeResize() {}
  }

  return {
    Ghostty: MockGhostty,
    Terminal: MockTerminal,
    FitAddon: MockFitAddon,
  };
});

vi.mock('../effects/terminal-ipc.js', () => ({
  TerminalIpc: {
    close: vi.fn(() => ({ _tag: 'close' })),
    spawn: vi.fn(() => ({ _tag: 'spawn' })),
    launchWithContext: vi.fn(() => ({ _tag: 'launch' })),
    write: vi.fn(() => ({ _tag: 'write' })),
    resize: vi.fn(() => ({ _tag: 'resize' })),
    resolveLaunchApproval: vi.fn(() => ({ _tag: 'resolve' })),
  },
  runSafe: vi.fn(),
  runUnsafe: vi.fn(async () => ({ sessionId: 'session-default', pid: 100 })),
}));

function setupSrgntMocks(overrides: Record<string, unknown> = {}) {
  window.srgnt = {
    terminalWrite: vi.fn().mockResolvedValue(undefined),
    terminalResize: vi.fn().mockResolvedValue(undefined),
    terminalClose: vi.fn().mockResolvedValue(undefined),
    terminalSpawn: vi.fn().mockResolvedValue({ sessionId: 'session-default', pid: 100 }),
    terminalList: vi.fn(),
    terminalLaunchWithContext: vi.fn(),
    onLaunchApprovalRequired: vi.fn(() => () => {}),
    resolveLaunchApproval: vi.fn().mockResolvedValue(undefined),
    onTerminalData: vi.fn(() => () => {}),
    onTerminalExit: vi.fn(() => () => {}),
    ...overrides,
  } as unknown as typeof window.srgnt;
}

describe('TerminalPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    class ResizeObserverMock {
      observe = vi.fn();
      disconnect = vi.fn();
    }

    global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      font: '',
      measureText: () => ({ width: 8 }),
    })) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  });

  describe('tab management', () => {
    it('renders a default tab on mount', async () => {
      setupSrgntMocks();
      render(<TerminalPanel />);
      await waitFor(() => {
        expect(screen.getByRole('tab')).toBeInTheDocument();
        expect(screen.getByLabelText('Open new terminal tab')).toBeInTheDocument();
      });
    });

    it('adds a new tab when + button is clicked', async () => {
      setupSrgntMocks();
      render(<TerminalPanel />);
      await waitFor(() => {
        expect(screen.getAllByRole('tab')).toHaveLength(1);
      });
      fireEvent.click(screen.getByLabelText('Open new terminal tab'));
      await waitFor(() => {
        expect(screen.getAllByRole('tab')).toHaveLength(2);
      });
    });

    it('closes a tab when the close button is clicked', async () => {
      setupSrgntMocks();
      render(<TerminalPanel />);
      await waitFor(() => {
        expect(screen.getAllByRole('tab')).toHaveLength(1);
      });
      fireEvent.click(screen.getByLabelText('Open new terminal tab'));
      await waitFor(() => {
        expect(screen.getAllByRole('tab')).toHaveLength(2);
      });
      const closeButtons = screen.getAllByLabelText(/Close /);
      fireEvent.click(closeButtons[0]);
      await waitFor(() => {
        expect(screen.getAllByRole('tab')).toHaveLength(1);
      });
    });

    it('closes the active tab and selects an adjacent one', async () => {
      const { runUnsafe } = await import('../effects/terminal-ipc.js');
      (runUnsafe as ReturnType<typeof vi.fn>).mockImplementation(async (effect: unknown) => {
        const tag = (effect as { _tag?: string })?._tag;
        if (tag === 'spawn') {
          return { sessionId: `session-${Date.now()}`, pid: 100 };
        }
        return { sessionId: 'session-default', pid: 100 };
      });

      setupSrgntMocks();
      render(<TerminalPanel />);

      await waitFor(() => {
        expect(screen.getAllByRole('tab')).toHaveLength(1);
      });

      fireEvent.click(screen.getByLabelText('Open new terminal tab'));
      await waitFor(() => {
        expect(screen.getAllByRole('tab')).toHaveLength(2);
      });

      const tabs = screen.getAllByRole('tab');
      const lastTab = tabs[tabs.length - 1];
      expect(lastTab).toHaveAttribute('aria-selected', 'true');

      const closeButtons = screen.getAllByLabelText(/Close /);
      fireEvent.click(closeButtons[closeButtons.length - 1]);
      await waitFor(() => {
        expect(screen.getAllByRole('tab')).toHaveLength(1);
      });

      const remainingTabs = screen.getAllByRole('tab');
      expect(remainingTabs[0]).toHaveAttribute('aria-selected', 'true');
    });

    it('adds a tab with launch context and makes it active', async () => {
      const { runUnsafe } = await import('../effects/terminal-ipc.js');
      (runUnsafe as ReturnType<typeof vi.fn>).mockImplementation(async (effect: unknown) => {
        const tag = (effect as { _tag?: string })?._tag;
        if (tag === 'launch') {
          return {
            sessionId: 'session-launch-1',
            pid: 200,
            launchId: 'launch-1',
            status: 'approved',
          };
        }
        return { sessionId: 'session-default', pid: 100 };
      });

      setupSrgntMocks();

      const launchContext: LaunchContext = {
        launchId: 'launch-1',
        sourceWorkflow: 'daily-briefing',
        sourceArtifactId: 'SRGNT-138',
        workingDirectory: '/workspace/demo',
        intent: 'artifactAffecting',
        createdAt: new Date().toISOString(),
        labels: ['SRGNT-138'],
      };

      render(<TerminalPanel launchContext={launchContext} />);
      const launchTab = await screen.findByRole('tab', { name: /daily-briefing/ });
      expect(launchTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('approval flow', () => {
    it('shows approval preview and resolves on approve', async () => {
      let approvalRequiredHandler:
        | ((payload: { approvalId: string; launchContext: LaunchContext; command: string; riskLevel: string }) => void)
        | undefined;
      let resolveLaunch: (() => void) | undefined;

      const launchContext: LaunchContext = {
        launchId: 'launch-1',
        sourceWorkflow: 'daily-briefing',
        sourceArtifactId: 'SRGNT-138',
        workingDirectory: '/workspace/demo',
        intent: 'artifactAffecting',
        createdAt: new Date().toISOString(),
        labels: ['SRGNT-138'],
      };

      const { runUnsafe, TerminalIpc } = await import('../effects/terminal-ipc.js');

      (runUnsafe as ReturnType<typeof vi.fn>).mockImplementation(async (effect: unknown) => {
        const tag = (effect as { _tag?: string })?._tag;
        if (tag === 'launch') {
          approvalRequiredHandler?.({
            approvalId: 'approval-1',
            launchContext,
            command: 'bash',
            riskLevel: 'high',
          });
          return new Promise((resolve) => {
            resolveLaunch = () => {
              resolve({
                sessionId: 'session-1',
                pid: 123,
                launchId: 'launch-1',
                status: 'approved',
              });
            };
          });
        }
        return { sessionId: 'session-default', pid: 100 };
      });

      setupSrgntMocks({
        onLaunchApprovalRequired: vi.fn((callback) => {
          approvalRequiredHandler = callback;
          return () => {
            approvalRequiredHandler = undefined;
          };
        }),
        resolveLaunchApproval: vi.fn().mockImplementation(async () => {
          resolveLaunch?.();
        }),
      });

      render(<TerminalPanel launchContext={launchContext} />);
      expect(await screen.findByText('Approval Required')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

      await waitFor(() => {
        expect(TerminalIpc.resolveLaunchApproval).toHaveBeenCalledWith('approval-1', true);
      });
    });
  });
});
