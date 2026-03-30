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

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border-default">
        <h2 className="section-heading">Connectors</h2>
      </div>
      <nav className="flex-1 overflow-y-auto scrollbar-thin p-1.5" aria-label="Connector list">
        <ul className="space-y-0.5" role="list">
          {connectors.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => handleScrollTo(c.id)}
                className="nav-item w-full text-left text-xs"
              >
                <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${statusDotClass[c.status] || 'bg-text-tertiary'}`} />
                <span className="truncate">{c.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
