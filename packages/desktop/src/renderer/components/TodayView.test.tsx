import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TodayView } from './TodayView';

describe('TodayView', () => {
  beforeEach(() => {
    window.srgnt = {
      getAppVersion: vi.fn(),
      getUserDataPath: vi.fn(),
      checkForUpdates: vi.fn(),
      getWorkspaceRoot: vi.fn().mockResolvedValue('/workspace/demo'),
      setWorkspaceRoot: vi.fn(),
      chooseWorkspaceRoot: vi.fn(),
      createDefaultWorkspaceRoot: vi.fn(),
      listConnectors: vi.fn(),
      getConnectorStatus: vi.fn(),
      connectConnector: vi.fn(),
      disconnectConnector: vi.fn(),
      getDesktopSettings: vi.fn(),
      saveDesktopSettings: vi.fn(),
      listSkills: vi.fn(),
      runSkill: vi.fn(),
      cancelSkill: vi.fn(),
      requestApproval: vi.fn(),
      resolveApproval: vi.fn(),
      terminalSpawn: vi.fn(),
      terminalWrite: vi.fn(),
      terminalResize: vi.fn(),
      terminalClose: vi.fn(),
      terminalList: vi.fn(),
      onTerminalData: vi.fn(),
      onTerminalExit: vi.fn(),
      terminalLaunchWithContext: vi.fn(),
      listEntities: vi.fn(),
      saveBriefing: vi.fn(),
      listBriefings: vi.fn(),
      writeDiagnosticCrashLog: vi.fn(),
    };
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
        intent: 'readOnly',
        labels: ['SRGNT-142', 'srgnt-core'],
      }),
    );
  });
});
