import React from 'react';
import { useLayout } from './LayoutContext.js';

function ChevronIcon({ direction }: { direction: 'left' | 'right' }): React.ReactElement {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d={direction === 'left' ? 'M8 2L4 6L8 10' : 'M4 2L8 6L4 10'} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SidePanel({ children }: { children: React.ReactNode }): React.ReactElement {
  const { isSidebarCollapsed, sidebarWidth, setSidebarWidth, toggleSidebar } = useLayout();
  const widthRef = React.useRef(sidebarWidth);
  const frameRef = React.useRef<number | null>(null);
  const clickTimeoutRef = React.useRef<number | null>(null);
  const dragCleanupRef = React.useRef<(() => void) | null>(null);

  const commitWidth = React.useCallback(
    (nextWidth: number) => {
      setSidebarWidth(nextWidth);
    },
    [setSidebarWidth],
  );

  const handleMouseDown = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = widthRef.current;

      dragCleanupRef.current?.();

      document.body.style.userSelect = 'none';

      const handleMouseMove = (ev: MouseEvent) => {
        const newWidth = startWidth + (ev.clientX - startX);
        widthRef.current = Math.max(180, Math.min(480, newWidth));

        if (frameRef.current !== null) {
          return;
        }

        frameRef.current = window.requestAnimationFrame(() => {
          frameRef.current = null;
          commitWidth(widthRef.current);
        });
      };

      const cleanupDrag = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.userSelect = '';

        if (frameRef.current !== null) {
          window.cancelAnimationFrame(frameRef.current);
          frameRef.current = null;
        }

        dragCleanupRef.current = null;
      };

      const handleMouseUp = () => {
        cleanupDrag();
        commitWidth(widthRef.current);
      };

      dragCleanupRef.current = cleanupDrag;
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [commitWidth],
  );

  const handleResizeClick = React.useCallback(() => {
    if (clickTimeoutRef.current) {
      window.clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      commitWidth(240);
      return;
    }

    clickTimeoutRef.current = window.setTimeout(() => {
      clickTimeoutRef.current = null;
    }, 300);
  }, [commitWidth]);

  React.useEffect(() => {
    widthRef.current = sidebarWidth;
  }, [sidebarWidth]);

  React.useEffect(() => {
    return () => {
      dragCleanupRef.current?.();

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }

      if (clickTimeoutRef.current) {
        window.clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  return (
    <aside
      className="side-panel surface-gradient border-r border-border-default"
      role="complementary"
      aria-label="Side panel"
      data-collapsed={isSidebarCollapsed}
      style={{ '--sidebar-width': sidebarWidth + 'px' } as React.CSSProperties}
    >
      <button
        type="button"
        className="sidebar-toggle-chevron"
        onClick={toggleSidebar}
        aria-label={isSidebarCollapsed ? 'Expand side panel' : 'Collapse side panel'}
        aria-expanded={!isSidebarCollapsed}
      >
        <ChevronIcon direction={isSidebarCollapsed ? 'right' : 'left'} />
      </button>
      <div className="flex h-full min-w-0">
        <div className="flex-1 min-w-0 overflow-hidden">{children}</div>
        {!isSidebarCollapsed && (
          <div
            className="resize-handle"
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize side panel"
            onClick={handleResizeClick}
            onMouseDown={handleMouseDown}
          />
        )}
      </div>
    </aside>
  );
}
