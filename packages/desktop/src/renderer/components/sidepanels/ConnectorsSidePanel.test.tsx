import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConnectorsSidePanel } from './ConnectorsSidePanel.js';

describe('ConnectorsSidePanel', () => {
  it('renders the live connector statuses it receives', () => {
    render(
      <ConnectorsSidePanel
        connectors={[
          { id: 'jira', name: 'Jira', status: 'connected', installed: true, available: true },
          { id: 'outlook', name: 'Outlook Calendar', status: 'disconnected', installed: false, available: true },
        ]}
      />,
    );

    expect(screen.getByRole('button', { name: /Jira/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Outlook Calendar/ })).toBeInTheDocument();

    const jiraDot = screen.getByRole('button', { name: /Jira/ }).querySelector('span');
    const outlookDot = screen.getByRole('button', { name: /Outlook Calendar/ }).querySelector('span');

    expect(jiraDot?.className).toContain('bg-success-500');
    expect(outlookDot?.className).toContain('bg-text-tertiary');
  });

  it('groups connectors into Connected, Installed, and Available sections', () => {
    render(
      <ConnectorsSidePanel
        connectors={[
          { id: 'jira', name: 'Jira', status: 'connected', installed: true, available: true },
          { id: 'teams', name: 'Teams', status: 'error', installed: true, available: true },
          { id: 'outlook', name: 'Outlook Calendar', status: 'disconnected', installed: false, available: true },
        ]}
      />,
    );

    expect(screen.getByRole('heading', { level: 3, name: 'Connected' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Installed' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Available' })).toBeInTheDocument();
  });

  it('shows Installed badge for installed-but-not-connected connectors', () => {
    render(
      <ConnectorsSidePanel
        connectors={[
          { id: 'teams', name: 'Teams', status: 'error', installed: true, available: true },
        ]}
      />,
    );
    // Teams nav item should be under "Installed" section
    expect(screen.getByRole('heading', { level: 3, name: 'Installed' })).toBeInTheDocument();
    // The nav item button should contain the "Installed" badge text
    const teamsButton = screen.getByRole('button', { name: /Teams/ });
    expect(teamsButton.textContent).toContain('Installed');
  });

  it('shows Available text for not-installed connectors', () => {
    render(
      <ConnectorsSidePanel
        connectors={[
          { id: 'outlook', name: 'Outlook Calendar', status: 'disconnected', installed: false, available: true },
        ]}
      />,
    );
    expect(screen.getByRole('heading', { level: 3, name: 'Available' })).toBeInTheDocument();
    // The nav item button should contain "Available" text (not a badge)
    const outlookButton = screen.getByRole('button', { name: /Outlook Calendar/ });
    expect(outlookButton.textContent).toContain('Available');
  });

  it('shows no Installed badge for connected connectors (they go under Connected section)', () => {
    render(
      <ConnectorsSidePanel
        connectors={[
          { id: 'jira', name: 'Jira', status: 'connected', installed: true, available: true },
        ]}
      />,
    );
    // Connected goes under "Connected" section (not "Installed")
    expect(screen.getByRole('heading', { level: 3, name: 'Connected' })).toBeInTheDocument();
    // No standalone "Installed" section since the only installed connector is connected
    expect(screen.queryByRole('heading', { level: 3, name: 'Installed' })).not.toBeInTheDocument();
  });
});
