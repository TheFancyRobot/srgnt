import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { LayoutProvider, useLayout, type PanelDefinition } from './LayoutContext.js';
import { navIcons } from './icons.js';

const defaultPanels: PanelDefinition[] = [
  { id: 'today', icon: navIcons['today']!, label: 'Daily Dashboard', section: 'main', order: 1, sidePanelContent: () => <div /> },
  { id: 'calendar', icon: navIcons['calendar']!, label: 'Calendar', section: 'main', order: 2, sidePanelContent: () => <div /> },
  { id: 'terminal', icon: navIcons['terminal']!, label: 'Terminal', section: 'utility', order: 3 },
];

function TestConsumer(): React.ReactElement {
  const layout = useLayout();
  return (
    <div>
      <span data-testid="active-panel">{layout.activePanel}</span>
      <span data-testid="sidebar-collapsed">{String(layout.isSidebarCollapsed)}</span>
      <span data-testid="sidebar-width">{String(layout.sidebarWidth)}</span>
      <span data-testid="panels-count">{String(layout.panels.length)}</span>
      <button data-testid="toggle-sidebar" onClick={layout.toggleSidebar}>Toggle</button>
      <button data-testid="set-width" onClick={() => layout.setSidebarWidth(300)}>SetWidth</button>
      <button data-testid="set-collapsed" onClick={() => layout.setSidebarCollapsed(true)}>SetCollapsed</button>
      <button data-testid="set-panel" onClick={() => layout.setActivePanel('calendar')}>SetPanel</button>
      <button data-testid="register-panel" onClick={() => layout.registerPanel({ id: 'new', icon: navIcons['notes']!, label: 'New', section: 'main', order: 10 })}>Register</button>
      <button data-testid="unregister-panel" onClick={() => layout.unregisterPanel('today')}>Unregister</button>
    </div>
  );
}

describe('LayoutContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useLayout() throws when used outside LayoutProvider', () => {
    function BadConsumer(): React.ReactElement {
      useLayout();
      return <div />;
    }

    expect(() => render(<BadConsumer />)).toThrow('useLayout must be used within a LayoutProvider');
  });

  it('initial state has correct defaults', () => {
    render(<LayoutProvider initialPanels={defaultPanels}><TestConsumer /></LayoutProvider>);

    expect(screen.getByTestId('active-panel')).toHaveTextContent('today');
    expect(screen.getByTestId('sidebar-collapsed')).toHaveTextContent('false');
    expect(screen.getByTestId('sidebar-width')).toHaveTextContent('240');
    expect(screen.getByTestId('panels-count')).toHaveTextContent('3');
  });

  it('setActivePanel with a new ID updates activePanel', () => {
    render(<LayoutProvider initialPanels={defaultPanels}><TestConsumer /></LayoutProvider>);

    fireEvent.click(screen.getByTestId('set-panel'));
    expect(screen.getByTestId('active-panel')).toHaveTextContent('calendar');
  });

  it('toggleSidebar flips isSidebarCollapsed', () => {
    render(<LayoutProvider initialPanels={defaultPanels}><TestConsumer /></LayoutProvider>);

    expect(screen.getByTestId('sidebar-collapsed')).toHaveTextContent('false');

    fireEvent.click(screen.getByTestId('toggle-sidebar'));
    expect(screen.getByTestId('sidebar-collapsed')).toHaveTextContent('true');

    fireEvent.click(screen.getByTestId('toggle-sidebar'));
    expect(screen.getByTestId('sidebar-collapsed')).toHaveTextContent('false');
  });

  it('setSidebarWidth updates sidebarWidth', () => {
    render(<LayoutProvider initialPanels={defaultPanels}><TestConsumer /></LayoutProvider>);

    expect(screen.getByTestId('sidebar-width')).toHaveTextContent('240');

    fireEvent.click(screen.getByTestId('set-width'));
    expect(screen.getByTestId('sidebar-width')).toHaveTextContent('300');
  });

  it('setSidebarWidth clamps to MIN_WIDTH 180', () => {
    function WidthTest(): React.ReactElement {
      const layout = useLayout();
      return (
        <div>
          <span data-testid="sidebar-width">{String(layout.sidebarWidth)}</span>
          <button data-testid="set-width-low" onClick={() => layout.setSidebarWidth(50)}>SetLow</button>
        </div>
      );
    }

    render(<LayoutProvider initialPanels={defaultPanels}><WidthTest /></LayoutProvider>);

    fireEvent.click(screen.getByTestId('set-width-low'));
    expect(screen.getByTestId('sidebar-width')).toHaveTextContent('180');
  });

  it('setSidebarWidth clamps to MAX_WIDTH 480', () => {
    function WidthTest(): React.ReactElement {
      const layout = useLayout();
      return (
        <div>
          <span data-testid="sidebar-width">{String(layout.sidebarWidth)}</span>
          <button data-testid="set-width-high" onClick={() => layout.setSidebarWidth(600)}>SetHigh</button>
        </div>
      );
    }

    render(<LayoutProvider initialPanels={defaultPanels}><WidthTest /></LayoutProvider>);

    fireEvent.click(screen.getByTestId('set-width-high'));
    expect(screen.getByTestId('sidebar-width')).toHaveTextContent('480');
  });

  it('registerPanel adds a panel to the registry', () => {
    render(<LayoutProvider initialPanels={defaultPanels}><TestConsumer /></LayoutProvider>);

    expect(screen.getByTestId('panels-count')).toHaveTextContent('3');

    fireEvent.click(screen.getByTestId('register-panel'));
    expect(screen.getByTestId('panels-count')).toHaveTextContent('4');
  });

  it('registerPanel with an existing ID replaces the panel', () => {
    function ReplaceTest(): React.ReactElement {
      const layout = useLayout();
      return (
        <div>
          <span data-testid="panels-count">{String(layout.panels.length)}</span>
          <button
            data-testid="replace-panel"
            onClick={() => layout.registerPanel({ id: 'today', icon: navIcons['notes']!, label: 'Replaced Today', section: 'main', order: 1 })}
          >
            Replace
          </button>
        </div>
      );
    }

    render(<LayoutProvider initialPanels={defaultPanels}><ReplaceTest /></LayoutProvider>);

    expect(screen.getByTestId('panels-count')).toHaveTextContent('3');

    fireEvent.click(screen.getByTestId('replace-panel'));
    expect(screen.getByTestId('panels-count')).toHaveTextContent('3');
  });

  it('unregisterPanel removes a panel by ID', () => {
    render(<LayoutProvider initialPanels={defaultPanels}><TestConsumer /></LayoutProvider>);

    expect(screen.getByTestId('panels-count')).toHaveTextContent('3');

    fireEvent.click(screen.getByTestId('unregister-panel'));
    expect(screen.getByTestId('panels-count')).toHaveTextContent('2');
  });

  it('panels are sorted by order after registration', () => {
    function OrderTest(): React.ReactElement {
      const layout = useLayout();
      return (
        <div>
          <span data-testid="panel-ids">{layout.panels.map(p => p.id).join(',')}</span>
        </div>
      );
    }

    const unsortedPanels: PanelDefinition[] = [
      { id: 'b', icon: navIcons['today']!, label: 'B', section: 'main', order: 2 },
      { id: 'a', icon: navIcons['calendar']!, label: 'A', section: 'main', order: 1 },
      { id: 'c', icon: navIcons['notes']!, label: 'C', section: 'main', order: 3 },
    ];

    render(<LayoutProvider initialPanels={unsortedPanels}><OrderTest /></LayoutProvider>);

    expect(screen.getByTestId('panel-ids')).toHaveTextContent('a,b,c');
  });

  it('custom initialWidth, initialCollapsed, defaultPanel props are respected', () => {
    render(
      <LayoutProvider
        initialPanels={defaultPanels}
        initialWidth={320}
        initialCollapsed={true}
        defaultPanel="calendar"
      >
        <TestConsumer />
      </LayoutProvider>
    );

    expect(screen.getByTestId('active-panel')).toHaveTextContent('calendar');
    expect(screen.getByTestId('sidebar-collapsed')).toHaveTextContent('true');
    expect(screen.getByTestId('sidebar-width')).toHaveTextContent('320');
  });

  it('the global Ctrl+B / Cmd+B handler toggles sidebar', async () => {
    render(<LayoutProvider initialPanels={defaultPanels}><TestConsumer /></LayoutProvider>);

    expect(screen.getByTestId('sidebar-collapsed')).toHaveTextContent('false');

    const btn = screen.getByTestId('toggle-sidebar');
    btn.focus();

    fireEvent.keyDown(btn, { key: 'b', ctrlKey: true });

    await waitFor(() => {
      expect(screen.getByTestId('sidebar-collapsed')).toHaveTextContent('true');
    });

    fireEvent.keyDown(btn, { key: 'b', ctrlKey: true });

    await waitFor(() => {
      expect(screen.getByTestId('sidebar-collapsed')).toHaveTextContent('false');
    });
  });

  it('Ctrl+B does not toggle when focus is in input/textarea/select', () => {
    function InputTest(): React.ReactElement {
      const layout = useLayout();
      return (
        <div>
          <span data-testid="sidebar-collapsed">{String(layout.isSidebarCollapsed)}</span>
          <input data-testid="test-input" type="text" />
        </div>
      );
    }

    render(<LayoutProvider initialPanels={defaultPanels}><InputTest /></LayoutProvider>);

    const input = screen.getByTestId('test-input');
    input.focus();

    fireEvent.keyDown(input, { key: 'b', ctrlKey: true });

    expect(screen.getByTestId('sidebar-collapsed')).toHaveTextContent('false');
  });

  it('onLayoutChange callback is called when sidebarWidth or sidebarCollapsed changes', () => {
    const onLayoutChange = vi.fn();

    function CallbackTest(): React.ReactElement {
      const layout = useLayout();
      return (
        <div>
          <button data-testid="toggle" onClick={layout.toggleSidebar}>Toggle</button>
          <button data-testid="set-width" onClick={() => layout.setSidebarWidth(300)}>SetWidth</button>
        </div>
      );
    }

    render(<LayoutProvider initialPanels={defaultPanels} onLayoutChange={onLayoutChange}><CallbackTest /></LayoutProvider>);

    fireEvent.click(screen.getByTestId('toggle'));
    expect(onLayoutChange).toHaveBeenCalledWith(expect.objectContaining({ sidebarCollapsed: true }));

    fireEvent.click(screen.getByTestId('set-width'));
    expect(onLayoutChange).toHaveBeenCalledWith(expect.objectContaining({ sidebarWidth: 300 }));
  });

  it('does not emit onLayoutChange on initial mount', () => {
    const onLayoutChange = vi.fn();

    render(<LayoutProvider initialPanels={defaultPanels} onLayoutChange={onLayoutChange}><TestConsumer /></LayoutProvider>);

    expect(onLayoutChange).not.toHaveBeenCalled();
  });

  it('reapplies incoming initial width and collapsed values after mount', () => {
    const { rerender } = render(
      <LayoutProvider initialPanels={defaultPanels} initialWidth={240} initialCollapsed={false}>
        <TestConsumer />
      </LayoutProvider>,
    );

    expect(screen.getByTestId('sidebar-width')).toHaveTextContent('240');
    expect(screen.getByTestId('sidebar-collapsed')).toHaveTextContent('false');

    rerender(
      <LayoutProvider initialPanels={defaultPanels} initialWidth={320} initialCollapsed={true}>
        <TestConsumer />
      </LayoutProvider>,
    );

    expect(screen.getByTestId('sidebar-width')).toHaveTextContent('320');
    expect(screen.getByTestId('sidebar-collapsed')).toHaveTextContent('true');
  });

  it('setSidebarCollapsed updates the collapsed state', () => {
    render(<LayoutProvider initialPanels={defaultPanels}><TestConsumer /></LayoutProvider>);

    expect(screen.getByTestId('sidebar-collapsed')).toHaveTextContent('false');

    fireEvent.click(screen.getByTestId('set-collapsed'));
    expect(screen.getByTestId('sidebar-collapsed')).toHaveTextContent('true');
  });
});
