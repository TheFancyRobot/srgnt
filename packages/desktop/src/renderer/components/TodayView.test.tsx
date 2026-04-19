import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TodayView } from './TodayView';

describe('TodayView', () => {
  beforeEach(() => {
    window.srgnt = {
      getWorkspaceRoot: vi.fn().mockResolvedValue('/workspace/demo'),
      terminalLaunchWithContext: vi.fn().mockResolvedValue({ sessionId: 'test-session', pid: 1 }),
    } as unknown as typeof window.srgnt;
  });

  it('builds a launch context for the selected task', async () => {
    const onLaunchContext = vi.fn().mockResolvedValue(undefined);

    render(<TodayView onLaunchContext={onLaunchContext} />);

    const launchButtons = screen.getAllByRole('button', { name: 'Launch' });
    fireEvent.click(launchButtons[0]!);

    await waitFor(() => expect(onLaunchContext).toHaveBeenCalledTimes(1));

    expect(onLaunchContext).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceWorkflow: 'daily-briefing',
        sourceArtifactId: 'SRGNT-142',
        workingDirectory: '/workspace/demo',
        intent: 'artifactAffecting',
        labels: ['SRGNT-142', 'srgnt-core'],
      }),
    );
  });

  /* ── BUG-0003 regression: intent must never be readOnly for Today View launches ── */
  it('BUG-0003: launch intent is artifactAffecting, never readOnly', async () => {
    const onLaunchContext = vi.fn().mockResolvedValue(undefined);

    render(<TodayView onLaunchContext={onLaunchContext} />);

    const launchButtons = screen.getAllByRole('button', { name: 'Launch' });
    fireEvent.click(launchButtons[0]!);

    await waitFor(() => expect(onLaunchContext).toHaveBeenCalledTimes(1));

    const launchContext = onLaunchContext.mock.calls[0]![0];
    expect(launchContext.intent).toBe('artifactAffecting');
    expect(launchContext.intent).not.toBe('readOnly');
  });

  it('BUG-0003: all task launch buttons use artifactAffecting intent', async () => {
    const onLaunchContext = vi.fn().mockResolvedValue(undefined);

    render(<TodayView onLaunchContext={onLaunchContext} />);

    const launchButtons = screen.getAllByRole('button', { name: 'Launch' });

    for (const button of launchButtons) {
      onLaunchContext.mockClear();
      fireEvent.click(button);

      await waitFor(() => expect(onLaunchContext).toHaveBeenCalledTimes(1));
      expect(onLaunchContext.mock.calls[0]![0].intent).toBe('artifactAffecting');
    }
  });

  it('BUG-0003: IPC fallback path sends artifactAffecting intent', async () => {
    render(<TodayView />);

    const launchButtons = screen.getAllByRole('button', { name: 'Launch' });
    fireEvent.click(launchButtons[0]!);

    await waitFor(() =>
      expect(window.srgnt.terminalLaunchWithContext).toHaveBeenCalledTimes(1),
    );

    const ipcCall = vi.mocked(window.srgnt.terminalLaunchWithContext).mock.calls[0]![0];
    expect(ipcCall.launchContext.intent).toBe('artifactAffecting');
    expect(ipcCall.launchContext.intent).not.toBe('readOnly');
  });
});
