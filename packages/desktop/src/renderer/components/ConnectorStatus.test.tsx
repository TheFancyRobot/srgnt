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
