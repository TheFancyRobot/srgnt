import React, { useRef, useState, useCallback, useEffect } from 'react';
import { navIcons } from './icons.js';

export interface ActivityBarItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  section: 'main' | 'system' | 'utility';
}

export interface ActivityBarProps {
  items: ActivityBarItem[];
  activeId: string | null;
  onNavigate: (id: string) => void;
}

export const defaultActivityBarItems: ActivityBarItem[] = [
  { id: 'today', label: 'Daily Dashboard', icon: navIcons['today']!, section: 'main' },
  { id: 'calendar', label: 'Calendar', icon: navIcons['calendar']!, section: 'main' },
  { id: 'notes', label: 'Notes', icon: navIcons['notes']!, section: 'main' },
  { id: 'connectors', label: 'Connectors', icon: navIcons['connectors']!, section: 'system' },
  { id: 'settings', label: 'Settings', icon: navIcons['settings']!, section: 'system' },
  { id: 'terminal', label: 'Terminal', icon: navIcons['terminal']!, section: 'utility' },
];

export function ActivityBar({ items, activeId, onNavigate }: ActivityBarProps): React.ReactElement {
  const activeIndex = items.findIndex((item) => item.id === activeId);
  const [focusedIndex, setFocusedIndex] = useState(activeIndex >= 0 ? activeIndex : 0);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (items.length === 0) {
      setFocusedIndex(0);
      return;
    }

    setFocusedIndex((currentIndex) => {
      if (activeIndex >= 0) {
        return activeIndex;
      }

      return Math.min(currentIndex, items.length - 1);
    });
  }, [activeIndex, items.length]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (items.length === 0) return;

      let newIndex: number;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          newIndex = (focusedIndex + 1) % items.length;
          break;
        case 'ArrowUp':
          e.preventDefault();
          newIndex = (focusedIndex - 1 + items.length) % items.length;
          break;
        case 'Home':
          e.preventDefault();
          newIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          newIndex = items.length - 1;
          break;
        default:
          return;
      }

      setFocusedIndex(newIndex);
      buttonRefs.current[newIndex]?.focus();
    },
    [focusedIndex, items.length],
  );

  const mainItems = items.filter((i) => i.section === 'main');
  const systemItems = items.filter((i) => i.section === 'system');
  const utilityItems = items.filter((i) => i.section === 'utility');

  const renderItem = (item: ActivityBarItem) => {
    const globalIndex = items.indexOf(item);
    const isActive = item.id === activeId;
    const isFocused = globalIndex === focusedIndex;

    return (
      <button
        key={item.id}
        ref={(el) => {
          buttonRefs.current[globalIndex] = el;
        }}
        type="button"
        className={`activity-bar-btn ${isActive ? 'active' : ''}`}
        aria-pressed={isActive}
        aria-label={item.label}
        title={item.label}
        tabIndex={isFocused ? 0 : -1}
        onClick={() => {
          setFocusedIndex(globalIndex);
          onNavigate(item.id);
        }}
        onKeyDown={handleKeyDown}
      >
        <span aria-hidden="true">{item.icon}</span>
      </button>
    );
  };

  return (
    <nav className="w-12 h-full flex flex-col bg-surface-primary border-r border-border-default">
      <div
        role="toolbar"
        aria-label="Application views"
        aria-orientation="vertical"
        className="flex flex-col items-center h-full py-2"
      >
        <div className="flex flex-col items-center gap-1">
          {mainItems.map((item) => renderItem(item))}
        </div>

        <div className="flex flex-col items-center gap-1 mt-2 pt-2 border-t border-border-muted">
          {systemItems.map((item) => renderItem(item))}
        </div>

        <div className="flex-1" />

        <div className="flex flex-col items-center gap-1 pt-2 border-t border-border-muted">
          {utilityItems.map((item) => renderItem(item))}
        </div>

        <div className="flex justify-center mb-2 mt-2">
          <span
            className="status-indicator connected"
            title="Online"
            aria-label="Online"
          />
        </div>
      </div>
    </nav>
  );
}
