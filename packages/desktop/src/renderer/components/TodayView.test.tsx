import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TodayView } from './TodayView';

describe('TodayView', () => {
  beforeEach(() => {
    window.srgnt = {
      getWorkspaceRoot: vi.fn().mockResolvedValue('/workspace/demo'),
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
});
