import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConnectorsSidePanel } from './ConnectorsSidePanel.js';

describe('ConnectorsSidePanel', () => {
  it('renders the live connector statuses it receives', () => {
    render(
      <ConnectorsSidePanel
        connectors={[
          { id: 'jira', name: 'Jira', status: 'connected' },
          { id: 'outlook', name: 'Outlook Calendar', status: 'disconnected' },
        ]}
      />,
    );

    expect(screen.getByRole('button', { name: 'Jira' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Outlook Calendar' })).toBeInTheDocument();

    const jiraDot = screen.getByRole('button', { name: 'Jira' }).querySelector('span');
    const outlookDot = screen.getByRole('button', { name: 'Outlook Calendar' }).querySelector('span');

    expect(jiraDot?.className).toContain('bg-success-500');
    expect(outlookDot?.className).toContain('bg-text-tertiary');
  });
});
