/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ConnectorInfo } from './ConnectorStatus.js';
import { ConnectorStatusPanel, defaultConnectors } from './ConnectorStatus.js';

function makeConnector(overrides: Partial<ConnectorInfo> & Pick<ConnectorInfo, 'id' | 'name'>): ConnectorInfo {
  return { status: 'disconnected', ...overrides };
}

describe('ConnectorStatusPanel', () => {
  it('renders "Connectors" heading', () => {
    render(<ConnectorStatusPanel connectors={defaultConnectors} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Connectors' })).toBeInTheDocument();
  });

  it('shows active and available counts in header', () => {
    const connectors: ConnectorInfo[] = [
      makeConnector({ id: 'jira', name: 'Jira', status: 'connected' }),
      makeConnector({ id: 'outlook', name: 'Outlook', status: 'disconnected' }),
      makeConnector({ id: 'teams', name: 'Teams', status: 'disconnected' }),
    ];
    render(<ConnectorStatusPanel connectors={connectors} />);
    // "1 active" and "2 available" appear as text content
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('available')).toBeInTheDocument();
  });

  it('groups connected connectors under "Active" section', () => {
    const connectors: ConnectorInfo[] = [
      makeConnector({ id: 'jira', name: 'Jira', status: 'connected' }),
      makeConnector({ id: 'teams', name: 'Teams', status: 'refreshing' }),
      makeConnector({ id: 'outlook', name: 'Outlook', status: 'disconnected' }),
    ];
    render(<ConnectorStatusPanel connectors={connectors} />);
    const activeHeading = screen.getByRole('heading', { level: 2, name: 'Active' });
    expect(activeHeading).toBeInTheDocument();
  });

  it('groups disconnected connectors under "Available" section', () => {
    const connectors: ConnectorInfo[] = [
      makeConnector({ id: 'jira', name: 'Jira', status: 'disconnected' }),
      makeConnector({ id: 'outlook', name: 'Outlook', status: 'error' }),
    ];
    render(<ConnectorStatusPanel connectors={connectors} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Available' })).toBeInTheDocument();
  });

  it('renders empty state when no connectors', () => {
    render(<ConnectorStatusPanel connectors={[]} />);
    expect(screen.getByText('No connectors')).toBeInTheDocument();
    expect(screen.getByText('Connect your tools to get started')).toBeInTheDocument();
  });
});

describe('ConnectorCard (via ConnectorStatusPanel)', () => {
  it('renders connector name', () => {
    const connectors: ConnectorInfo[] = [
      makeConnector({ id: 'jira', name: 'Jira Cloud', status: 'disconnected' }),
    ];
    render(<ConnectorStatusPanel connectors={connectors} />);
    expect(screen.getByText('Jira Cloud')).toBeInTheDocument();
  });

  it('shows correct status label', () => {
    const cases: Array<{ status: ConnectorInfo['status']; label: string }> = [
      { status: 'connected', label: 'Connected' },
      { status: 'disconnected', label: 'Disconnected' },
      { status: 'error', label: 'Error' },
      { status: 'connecting', label: 'Connecting...' },
      { status: 'refreshing', label: 'Refreshing...' },
    ];
    for (const { status, label } of cases) {
      const { unmount } = render(
        <ConnectorStatusPanel
          connectors={[makeConnector({ id: 'x', name: 'X', status })]}
        />,
      );
      // Use getAllByText because the label may appear in both the status dot area and the button
      expect(screen.getAllByText(label).length).toBeGreaterThanOrEqual(1);
      unmount();
    }
  });

  it('shows "Connect" button when disconnected', () => {
    render(
      <ConnectorStatusPanel
        connectors={[makeConnector({ id: 'jira', name: 'Jira', status: 'disconnected' })]}
      />,
    );
    expect(screen.getByRole('button', { name: 'Connect Jira' })).toBeInTheDocument();
  });

  it('shows "Disconnect" button when connected', () => {
    render(
      <ConnectorStatusPanel
        connectors={[makeConnector({ id: 'jira', name: 'Jira', status: 'connected' })]}
      />,
    );
    expect(screen.getByRole('button', { name: 'Disconnect Jira' })).toBeInTheDocument();
  });

  it('shows "Connecting..." text when connecting', () => {
    render(
      <ConnectorStatusPanel
        connectors={[makeConnector({ id: 'jira', name: 'Jira', status: 'connecting' })]}
      />,
    );
    // The connecting state renders both a status label and a button with "Connecting..."
    expect(screen.getAllByText('Connecting...').length).toBeGreaterThanOrEqual(1);
  });

  it('disables buttons during transitioning states', () => {
    const cases: ConnectorInfo['status'][] = ['connecting', 'refreshing'];
    for (const status of cases) {
      const { unmount } = render(
        <ConnectorStatusPanel
          connectors={[makeConnector({ id: 'jira', name: 'Jira', status })]}
        />,
      );
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      unmount();
    }
  });
});

describe('Error state', () => {
  it('shows error message when status is error and lastError is set', () => {
    const connectors: ConnectorInfo[] = [
      makeConnector({ id: 'jira', name: 'Jira', status: 'error', lastError: 'Auth token expired' }),
    ];
    render(<ConnectorStatusPanel connectors={connectors} />);
    expect(screen.getByText('Auth token expired')).toBeInTheDocument();
  });
});

describe('Entity counts', () => {
  it('shows entity count badges', () => {
    const connectors: ConnectorInfo[] = [
      makeConnector({
        id: 'jira',
        name: 'Jira',
        status: 'connected',
        entityCounts: { task: 5, epic: 2 },
      }),
    ];
    render(<ConnectorStatusPanel connectors={connectors} />);
    // Badge text is split across nested spans, use getAllByText with substring
    expect(screen.getAllByText('5').some((el) => el.closest('.badge') !== null)).toBe(true);
    expect(screen.getByText('tasks')).toBeInTheDocument();
    expect(screen.getAllByText('2').some((el) => el.closest('.badge') !== null)).toBe(true);
    expect(screen.getByText('epics')).toBeInTheDocument();
  });
});

describe('Callback: onConnect', () => {
  it('fires onConnect with connector ID when Connect is clicked', async () => {
    const user = userEvent.setup();
    const onConnect = vi.fn();
    render(
      <ConnectorStatusPanel
        connectors={[makeConnector({ id: 'jira', name: 'Jira', status: 'disconnected' })]}
        onConnect={onConnect}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Connect Jira' }));
    expect(onConnect).toHaveBeenCalledOnce();
    expect(onConnect).toHaveBeenCalledWith('jira');
  });

  it('does not show Connect button for a connected connector', () => {
    render(
      <ConnectorStatusPanel
        connectors={[makeConnector({ id: 'jira', name: 'Jira', status: 'connected' })]}
        onConnect={vi.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Connect Jira' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Disconnect Jira' })).toBeInTheDocument();
  });

  it('does not call onConnect for a connected connector even if callback is provided', async () => {
    const user = userEvent.setup();
    const onConnect = vi.fn();
    const onDisconnect = vi.fn();
    render(
      <ConnectorStatusPanel
        connectors={[makeConnector({ id: 'jira', name: 'Jira', status: 'connected' })]}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
      />,
    );
    // The only button is Disconnect
    await user.click(screen.getByRole('button', { name: 'Disconnect Jira' }));
    expect(onConnect).not.toHaveBeenCalled();
    expect(onDisconnect).toHaveBeenCalledWith('jira');
  });
});

describe('Callback: onDisconnect', () => {
  it('fires onDisconnect with connector ID when Disconnect is clicked', async () => {
    const user = userEvent.setup();
    const onDisconnect = vi.fn();
    render(
      <ConnectorStatusPanel
        connectors={[makeConnector({ id: 'outlook', name: 'Outlook', status: 'connected' })]}
        onDisconnect={onDisconnect}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Disconnect Outlook' }));
    expect(onDisconnect).toHaveBeenCalledOnce();
    expect(onDisconnect).toHaveBeenCalledWith('outlook');
  });
});

describe('formatRelativeTime', () => {
  function isoFromNow(msAgo: number): string {
    return new Date(Date.now() - msAgo).toISOString();
  }

  it('shows seconds ago for recent sync', () => {
    render(
      <ConnectorStatusPanel
        connectors={[makeConnector({ id: 'jira', name: 'Jira', status: 'connected', lastSyncAt: isoFromNow(30_000) })]}
      />,
    );
    expect(screen.getByText('30s ago')).toBeInTheDocument();
  });

  it('shows minutes ago', () => {
    render(
      <ConnectorStatusPanel
        connectors={[makeConnector({ id: 'jira', name: 'Jira', status: 'connected', lastSyncAt: isoFromNow(5 * 60_000) })]}
      />,
    );
    expect(screen.getByText('5m ago')).toBeInTheDocument();
  });

  it('shows hours ago', () => {
    render(
      <ConnectorStatusPanel
        connectors={[makeConnector({ id: 'jira', name: 'Jira', status: 'connected', lastSyncAt: isoFromNow(3 * 60 * 60_000) })]}
      />,
    );
    expect(screen.getByText('3h ago')).toBeInTheDocument();
  });

  it('shows days ago', () => {
    render(
      <ConnectorStatusPanel
        connectors={[makeConnector({ id: 'jira', name: 'Jira', status: 'connected', lastSyncAt: isoFromNow(2 * 24 * 60 * 60_000) })]}
      />,
    );
    expect(screen.getByText('2d ago')).toBeInTheDocument();
  });
});

describe('Error with no lastError', () => {
  it('does not show error message box when status is error but lastError is undefined', () => {
    const { container } = render(
      <ConnectorStatusPanel
        connectors={[makeConnector({ id: 'jira', name: 'Jira', status: 'error' })]}
      />,
    );
    // Error message box has bg-error-50 class
    expect(container.querySelector('.bg-error-50')).not.toBeInTheDocument();
  });
});

describe('Unknown connector (no meta)', () => {
  it('renders generic icon and no description for unknown connector ID', () => {
    const connectors: ConnectorInfo[] = [
      makeConnector({ id: 'github', name: 'GitHub', status: 'disconnected' }),
    ];
    const { container } = render(<ConnectorStatusPanel connectors={connectors} />);
    // Should have the generic link icon (stroke-based, not fill-based like known icons)
    const svg = container.querySelector('#connector-github svg[stroke]');
    expect(svg).toBeInTheDocument();
    // No description should be rendered (connectorMeta has no 'github' entry)
    expect(screen.queryByText('Tasks, stories, and sprint data')).not.toBeInTheDocument();
    expect(screen.queryByText('Calendar events and scheduling')).not.toBeInTheDocument();
    expect(screen.queryByText('Messages, mentions, and channels')).not.toBeInTheDocument();
  });
});

describe('Entity count singular form', () => {
  it('shows singular form when count is 1', () => {
    render(
      <ConnectorStatusPanel
        connectors={[makeConnector({ id: 'jira', name: 'Jira', status: 'connected', entityCounts: { task: 1 } })]}
      />,
    );
    // Badge text is split across spans: <span>1</span> <span>task</span>
    const badge = document.querySelector('.badge.badge-low');
    expect(badge).toBeTruthy();
    expect(badge!.textContent).toMatch(/\b1\s+task\b/);
    expect(badge!.textContent).not.toContain('1 tasks');
  });
});

describe('Multiple connectors: mixed states', () => {
  it('shows correct active and available counts with mixed statuses', () => {
    const connectors: ConnectorInfo[] = [
      makeConnector({ id: 'jira', name: 'Jira', status: 'connected' }),
      makeConnector({ id: 'outlook', name: 'Outlook', status: 'refreshing' }),
      makeConnector({ id: 'teams', name: 'Teams', status: 'disconnected' }),
      makeConnector({ id: 'slack', name: 'Slack', status: 'error' }),
      makeConnector({ id: 'github', name: 'GitHub', status: 'connecting' }),
    ];
    render(<ConnectorStatusPanel connectors={connectors} />);
    // active = connected + refreshing = 2
    // available = disconnected + error + connecting = 3
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    // Verify section headings
    expect(screen.getByRole('heading', { level: 2, name: 'Active' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Available' })).toBeInTheDocument();
  });
});

describe('defaultConnectors', () => {
  it('contains jira, outlook, teams with disconnected status', () => {
    expect(defaultConnectors).toHaveLength(3);
    const ids = defaultConnectors.map((c) => c.id);
    expect(ids).toContain('jira');
    expect(ids).toContain('outlook');
    expect(ids).toContain('teams');
    for (const c of defaultConnectors) {
      expect(c.status).toBe('disconnected');
    }
  });
});
