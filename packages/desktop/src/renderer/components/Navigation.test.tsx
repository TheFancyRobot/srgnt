/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockSetActivePanel = vi.fn();

vi.mock('./LayoutContext.js', () => ({
  useLayout: () => ({
    activePanel: 'today',
    setActivePanel: mockSetActivePanel,
    panels: [
      {
        id: 'today',
        icon: 'sun',
        label: 'Today',
        section: 'main',
        sidePanelContent: () => <div data-testid="side-panel-today">Today Panel</div>,
      },
      {
        id: 'calendar',
        icon: 'calendar',
        label: 'Calendar',
        section: 'main',
        sidePanelContent: () => <div data-testid="side-panel-calendar">Calendar Panel</div>,
      },
    ],
  }),
}));

vi.mock('./Titlebar.js', () => ({
  Titlebar: () => <div data-testid="titlebar">Titlebar</div>,
}));

vi.mock('./ActivityBar.js', () => ({
  ActivityBar: ({ items: _items, activeId, onNavigate }: { items: unknown[]; activeId: string; onNavigate: (id: string) => void }) => (
    <div data-testid="activity-bar">
      <span>{activeId}</span>
      <button onClick={() => onNavigate('calendar')}>switch</button>
    </div>
  ),
}));

vi.mock('./SidePanel.js', () => ({
  SidePanel: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="side-panel">{children}</div>
  ),
}));

import { AppLayout } from './Navigation.js';

describe('AppLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Titlebar and ActivityBar', () => {
    render(<AppLayout>Hello</AppLayout>);
    expect(screen.getByTestId('titlebar')).toBeInTheDocument();
    expect(screen.getByTestId('activity-bar')).toBeInTheDocument();
  });

  it('renders children in the main content area', () => {
    render(<AppLayout>Test Content</AppLayout>);
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders the active panel side panel content', () => {
    render(<AppLayout>Content</AppLayout>);
    expect(screen.getByTestId('side-panel-today')).toBeInTheDocument();
  });

  it('does not render side panel when fullBleed is true', () => {
    render(<AppLayout fullBleed>Content</AppLayout>);
    expect(screen.queryByTestId('side-panel')).not.toBeInTheDocument();
  });
});
