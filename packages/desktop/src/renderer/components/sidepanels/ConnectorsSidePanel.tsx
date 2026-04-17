import React from 'react';
import type { ConnectorInfo } from '../ConnectorStatus.js';

const statusDotClass: Record<string, string> = {
  connected: 'bg-success-500',
  connecting: 'bg-warning-500 animate-pulse',
  refreshing: 'bg-info-500 animate-pulse',
  disconnected: 'bg-text-tertiary',
  error: 'bg-error-500',
};

export function ConnectorsSidePanel({ connectors }: { connectors: ConnectorInfo[] }): React.ReactElement {
  const handleScrollTo = (id: string) => {
    document.getElementById(`connector-${id}`)?.scrollIntoView({ behavior: 'smooth' });
  };

  const connected = connectors.filter((c) => c.installed && (c.status === 'connected' || c.status === 'refreshing'));
  const installed = connectors.filter(
    (c) => c.installed && c.status !== 'connected' && c.status !== 'refreshing',
  );
  const available = connectors.filter((c) => !c.installed && c.available !== false);

  const sections = [
    { id: 'connected', title: 'Connected', items: connected },
    { id: 'installed', title: 'Installed', items: installed },
    { id: 'available', title: 'Available', items: available },
  ].filter((section) => section.items.length > 0);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border-default">
        <h2 className="section-heading">Connectors</h2>
      </div>
      <nav className="flex-1 overflow-y-auto scrollbar-thin p-1.5" aria-label="Connector list">
        <div className="space-y-3">
          {sections.map((section) => (
            <section key={section.id} aria-labelledby={`connectors-sidepanel-${section.id}`}>
              <h3
                id={`connectors-sidepanel-${section.id}`}
                className="px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-text-tertiary"
              >
                {section.title}
              </h3>
              <ul className="space-y-0.5" role="list">
                {section.items.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => handleScrollTo(c.id)}
                      className="nav-item w-full text-left text-xs"
                    >
                      <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${statusDotClass[c.status] || 'bg-text-tertiary'}`} />
                      <span className="truncate">{c.name}</span>
                      {c.installed ? (
                        <span className="ml-1.5 badge badge-low text-[9px] px-1 py-0.5">Installed</span>
                      ) : (
                        <span className="ml-1.5 text-[10px] text-text-tertiary">Available</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </nav>
    </div>
  );
}
