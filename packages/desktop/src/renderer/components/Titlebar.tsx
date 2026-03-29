import React from 'react';

export function Titlebar(): React.ReactElement {
  const [isMaximized, setIsMaximized] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    window.srgnt.windowIsMaximized().then((v) => {
      if (mounted) setIsMaximized(v);
    }).catch(() => {});
    const unsub = window.srgnt.onWindowMaximizedChange(setIsMaximized);
    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  return (
    <div className="titlebar drag-region flex items-center justify-between bg-surface-primary border-b border-border-muted select-none">
      {/* Left spacer / drag area */}
      <div className="flex-1 h-full" />

      {/* Window controls */}
      <div className="no-drag flex items-center h-full">
        <button
          type="button"
          className="titlebar-btn titlebar-btn-default"
          onClick={() => void window.srgnt.windowMinimize()}
          aria-label="Minimize"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </button>
        <button
          type="button"
          className="titlebar-btn titlebar-btn-default"
          onClick={() => void window.srgnt.windowMaximize()}
          aria-label={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect x="3.5" y="1.5" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.1" />
              <path d="M1.5 4.5v4a1 1 0 001 1h4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect x="2" y="2" width="8" height="8" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          )}
        </button>
        <button
          type="button"
          className="titlebar-btn titlebar-btn-close"
          onClick={() => void window.srgnt.windowClose()}
          aria-label="Close"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
