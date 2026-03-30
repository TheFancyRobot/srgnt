import React from 'react';
import { Titlebar } from './Titlebar.js';
import { ActivityBar } from './ActivityBar.js';
import { SidePanel } from './SidePanel.js';
import { useLayout } from './LayoutContext.js';

export interface AppLayoutProps {
  children: React.ReactNode;
  fullBleed?: boolean;
}

export function AppLayout({ children, fullBleed = false }: AppLayoutProps): React.ReactElement {
  const { activePanel, setActivePanel, panels } = useLayout();
  const activityBarItems = React.useMemo(
    () => panels.map((panel) => ({
      id: panel.id,
      icon: panel.icon,
      label: panel.label,
      section: panel.section,
    })),
    [panels],
  );
  const activePanelDef = panels.find((p) => p.id === activePanel);
  const ActiveSidePanelContent = activePanelDef?.sidePanelContent;

  return (
    <div className="flex flex-col h-screen bg-surface-secondary grain">
      <Titlebar />
      <div className="flex flex-1 min-h-0">
        <ActivityBar
          items={activityBarItems}
          activeId={activePanel}
          onNavigate={setActivePanel}
        />
        {!fullBleed && ActiveSidePanelContent && (
          <SidePanel>
            <ActiveSidePanelContent />
          </SidePanel>
        )}
        <main className={`flex-1 min-w-0 min-h-0 ${fullBleed ? 'overflow-hidden' : 'overflow-auto scrollbar-thin'}`}>
          <div className={fullBleed ? 'h-full' : 'max-w-4xl mx-auto px-8 py-6'}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
