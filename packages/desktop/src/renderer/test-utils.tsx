import React from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { LayoutProvider } from './components/LayoutContext.js';
import type { PanelDefinition } from './components/LayoutContext.js';
import { navIcons } from './components/icons.js';

const defaultPanels: PanelDefinition[] = [
  { id: 'today', icon: navIcons['today']!, label: 'Daily Dashboard', section: 'main', order: 1 },
  { id: 'calendar', icon: navIcons['calendar']!, label: 'Calendar', section: 'main', order: 2 },
  { id: 'notes', icon: navIcons['notes']!, label: 'Notes', section: 'main', order: 3 },
  { id: 'connectors', icon: navIcons['connectors']!, label: 'Connectors', section: 'system', order: 4 },
  { id: 'settings', icon: navIcons['settings']!, label: 'Settings', section: 'system', order: 5 },
  { id: 'terminal', icon: navIcons['terminal']!, label: 'Terminal', section: 'utility', order: 6 },
];

interface RenderWithLayoutOptions extends RenderOptions {
  defaultPanel?: string;
  initialWidth?: number;
  initialCollapsed?: boolean;
}

function renderWithLayout(ui: React.ReactElement, options?: RenderWithLayoutOptions): RenderResult {
  return render(
    <LayoutProvider
      initialPanels={defaultPanels}
      defaultPanel={options?.defaultPanel ?? 'today'}
      initialWidth={options?.initialWidth ?? 240}
      initialCollapsed={options?.initialCollapsed ?? false}
    >
      {ui}
    </LayoutProvider>,
    options,
  );
}

export { renderWithLayout, render, defaultPanels };