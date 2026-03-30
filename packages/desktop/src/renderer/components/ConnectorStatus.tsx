import React from 'react';

export interface ConnectorInfo {
  id: string;
  name: string;
  status: 'disconnected' | 'connecting' | 'connected' | 'error' | 'refreshing';
  lastSyncAt?: string;
  lastError?: string;
  entityCounts?: Record<string, number>;
}

export interface ConnectorStatusPanelProps {
  connectors: ConnectorInfo[];
  onConnect?: (id: string) => void;
  onDisconnect?: (id: string) => void;
}

const statusConfig: Record<ConnectorInfo['status'], { dot: string; label: string; animate: boolean }> = {
  connected: { dot: 'bg-success-500', label: 'Connected', animate: false },
  connecting: { dot: 'bg-warning-500', label: 'Connecting...', animate: true },
  refreshing: { dot: 'bg-info-500', label: 'Refreshing...', animate: true },
  disconnected: { dot: 'bg-text-tertiary', label: 'Disconnected', animate: false },
  error: { dot: 'bg-error-500', label: 'Error', animate: false },
};

const connectorMeta: Record<string, { icon: React.ReactNode; description: string }> = {
  jira: {
    description: 'Tasks, stories, and sprint data',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.571 11.513H0a5.218 5.218 0 005.232 5.215h2.13v2.057A5.215 5.215 0 0012.575 24V12.518a1.005 1.005 0 00-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 005.215 5.214h2.129v2.058a5.218 5.218 0 005.215 5.214V6.758a1.001 1.001 0 00-1-1.001zM23.013 0H11.455a5.215 5.215 0 005.215 5.215h2.129v2.057A5.215 5.215 0 0024 12.483V1.005A1.005 1.005 0 0023.013 0z" />
      </svg>
    ),
  },
  outlook: {
    description: 'Calendar events and scheduling',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M1.75 5.25a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75H22.25a.75.75 0 00.75-.75V6a.75.75 0 00-.75-.75H1.75zM2.5 6v12.25h19V6L12 11.875 2.5 6zm9.105 2.072l4.245 2.965-4.245 3.588V8.072zm-.044 5.965l4.245-3.588.001 5.553-4.246 2.965v-4.93z" />
      </svg>
    ),
  },
  teams: {
    description: 'Messages, mentions, and channels',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.625 8.25c0-.453-.094-.886-.256-1.286a3.001 3.001 0 00-3.397-1.539c-.828.14-1.547.603-2.046 1.286-.5-.683-1.218-1.146-2.046-1.286a3.001 3.001 0 00-3.397 1.539c-.162.4-.256.833-.256 1.286v5.5c0 .453.094.886.256 1.286a3.001 3.001 0 003.397 1.539c.828-.14 1.547-.603 2.046-1.286.5.683 1.218 1.146 2.046 1.286a3.001 3.001 0 003.397-1.539c.162-.4.256-.833.256-1.286v-5.5zm-8.5 0c0-.453-.094-.886-.256-1.286a3.001 3.001 0 00-3.397-1.539c-.828.14-1.547.603-2.046 1.286-.5-.683-1.218-1.146-2.046-1.286a3.001 3.001 0 00-3.397 1.539c-.162.4-.256.833-.256 1.286v5.5c0 .453.094.886.256 1.286a3.001 3.001 0 003.397 1.539c.828-.14 1.547-.603 2.046-1.286.5.683 1.218 1.146 2.046 1.286a3.001 3.001 0 003.397-1.539c.162-.4.256-.833.256-1.286v-5.5zM24 11.25v2c0 1.874-1.626 3.5-3.5 3.5H16.5a3.501 3.501 0 003.5-3.5v-2h4z" />
      </svg>
    ),
  },
};

function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/* ─── Connector card ─── */

function ConnectorCard({
  connector,
  onConnect,
  onDisconnect,
  stagger,
}: {
  connector: ConnectorInfo;
  onConnect?: (id: string) => void;
  onDisconnect?: (id: string) => void;
  stagger: number;
}): React.ReactElement {
  const isActive = connector.status === 'connected' || connector.status === 'refreshing';
  const isTransitioning = connector.status === 'connecting' || connector.status === 'refreshing';
  const config = statusConfig[connector.status];
  const meta = connectorMeta[connector.id];

  return (
    <div id={`connector-${connector.id}`} className={`card p-5 animate-slide-up stagger-${stagger}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isActive ? 'bg-surface-brand text-text-brand' : 'bg-surface-tertiary text-text-secondary'
          }`}>
            {meta?.icon || (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
              </svg>
            )}
          </div>

          {/* Info */}
          <div className="min-w-0">
            <h3 className="text-sm font-medium text-text-primary">{connector.name}</h3>
            {meta?.description && (
              <p className="text-xs text-text-tertiary mt-0.5">{meta.description}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${config.dot} ${config.animate ? 'animate-pulse' : ''}`} />
              <span className="text-xs text-text-secondary">{config.label}</span>
            </div>
          </div>
        </div>

        {/* Action */}
        <div className="flex-shrink-0">
          {isActive ? (
            <button
              type="button"
              onClick={() => onDisconnect?.(connector.id)}
              disabled={isTransitioning}
              aria-label={`Disconnect ${connector.name}`}
              className="btn btn-ghost text-xs"
            >
              Disconnect
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onConnect?.(connector.id)}
              disabled={isTransitioning}
              aria-label={`Connect ${connector.name}`}
              className="btn btn-primary text-xs"
            >
              {isTransitioning ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Connecting...
                </>
              ) : (
                'Connect'
              )}
            </button>
          )}
        </div>
      </div>

      {/* Sync time */}
      {connector.lastSyncAt && (
        <div className="mt-3 pt-3 border-t border-border-muted">
          <div className="flex items-center gap-2 text-xs text-text-tertiary">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Last synced: <span className="font-mono-data">{formatRelativeTime(connector.lastSyncAt)}</span>
          </div>
        </div>
      )}

      {/* Error */}
      {connector.lastError && connector.status === 'error' && (
        <div className="mt-3 p-3 bg-error-50 border border-error-100 rounded-lg flex items-start gap-2">
          <svg className="w-4 h-4 text-error-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <p className="text-xs text-error-600">{connector.lastError}</p>
        </div>
      )}

      {/* Entity counts */}
      {connector.entityCounts && Object.keys(connector.entityCounts).length > 0 && (
        <div className="mt-3 pt-3 border-t border-border-muted flex flex-wrap gap-2">
          {Object.entries(connector.entityCounts).map(([type, count]) => (
            <span key={type} className="badge badge-low">
              <span className="font-mono-data font-medium">{count}</span> {type}{count !== 1 ? 's' : ''}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Panel ─── */

export function ConnectorStatusPanel({
  connectors,
  onConnect,
  onDisconnect,
}: ConnectorStatusPanelProps): React.ReactElement {
  const connected = connectors.filter((c) => c.status === 'connected' || c.status === 'refreshing');
  const disconnected = connectors.filter((c) => c.status !== 'connected' && c.status !== 'refreshing');

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="animate-slide-up">
        <h1 className="text-2xl font-display font-semibold text-text-primary tracking-tight mb-1">
          Connectors
        </h1>
        <p className="text-sm text-text-secondary">
          Connect your work tools to aggregate data into your daily briefing.
        </p>
        <div className="flex items-center gap-3 mt-3">
          <span className="text-xs text-text-tertiary">
            <span className="font-mono-data font-medium text-text-primary">{connected.length}</span> active
          </span>
          <span className="text-xs text-text-tertiary">
            <span className="font-mono-data font-medium text-text-primary">{disconnected.length}</span> available
          </span>
        </div>
      </header>

      {/* Connected */}
      {connected.length > 0 && (
        <section>
          <h2 className="section-heading mb-3 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-success-500" />
            Active
          </h2>
          <div className="space-y-4">
            {connected.map((c, i) => (
              <ConnectorCard key={c.id} connector={c} onConnect={onConnect} onDisconnect={onDisconnect} stagger={i + 1} />
            ))}
          </div>
        </section>
      )}

      {/* Disconnected */}
      {disconnected.length > 0 && (
        <section>
          <h2 className="section-heading mb-3">Available</h2>
          <div className="space-y-4">
            {disconnected.map((c, i) => (
              <ConnectorCard key={c.id} connector={c} onConnect={onConnect} onDisconnect={onDisconnect} stagger={i + connected.length + 1} />
            ))}
          </div>
        </section>
      )}

      {/* Empty */}
      {connectors.length === 0 && (
        <div className="text-center py-16 animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface-tertiary flex items-center justify-center">
            <svg className="w-7 h-7 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
          </div>
          <h3 className="font-display font-medium text-text-primary mb-1">No connectors</h3>
          <p className="text-sm text-text-secondary">Connect your tools to get started</p>
        </div>
      )}
    </div>
  );
}

export const defaultConnectors: ConnectorInfo[] = [
  { id: 'jira', name: 'Jira', status: 'disconnected' },
  { id: 'outlook', name: 'Outlook Calendar', status: 'disconnected' },
  { id: 'teams', name: 'Microsoft Teams', status: 'disconnected' },
];
