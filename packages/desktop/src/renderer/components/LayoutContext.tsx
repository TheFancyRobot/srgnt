import React from 'react';

export interface PanelDefinition {
  id: string;
  icon: React.ReactNode;
  label: string;
  sidePanelContent?: React.ComponentType;
  section: 'main' | 'system' | 'utility';
  order: number;
  badge?: number | string;
}

export interface LayoutPreferences {
  sidebarWidth: number;
  sidebarCollapsed: boolean;
}

export interface LayoutContextValue {
  activePanel: string;
  setActivePanel: (id: string) => void;
  isSidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
  panels: PanelDefinition[];
  registerPanel: (panel: PanelDefinition) => void;
  unregisterPanel: (id: string) => void;
  calendarYear: number;
  calendarMonth: number;
  setCalendarDate: (year: number, month: number) => void;
}

const LayoutContext = React.createContext<LayoutContextValue | null>(null);

const MIN_WIDTH = 180;
const MAX_WIDTH = 480;

function clampWidth(width: number): number {
  return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width));
}

function sameLayoutPreferences(a: LayoutPreferences | null, b: LayoutPreferences): boolean {
  return a !== null && a.sidebarWidth === b.sidebarWidth && a.sidebarCollapsed === b.sidebarCollapsed;
}

export function LayoutProvider({
  children,
  defaultPanel = 'today',
  initialWidth = 240,
  initialCollapsed = false,
  initialPanels = [],
  onLayoutChange,
}: {
  children: React.ReactNode;
  defaultPanel?: string;
  initialWidth?: number;
  initialCollapsed?: boolean;
  initialPanels?: PanelDefinition[];
  onLayoutChange?: (prefs: LayoutPreferences) => void;
}): React.ReactElement {
  const [activePanel, setActivePanelRaw] = React.useState<string>(defaultPanel);
  const [isSidebarCollapsed, setSidebarCollapsedRaw] = React.useState(initialCollapsed);
  const [sidebarWidth, setSidebarWidthRaw] = React.useState(() => clampWidth(initialWidth));
  const [panels, setPanels] = React.useState<PanelDefinition[]>(() =>
    [...initialPanels].sort((a, b) => a.order - b.order),
  );

  const now = new Date();
  const [calendarYear, setCalendarYear] = React.useState(now.getFullYear());
  const [calendarMonth, setCalendarMonth] = React.useState(now.getMonth());

  const setCalendarDate = React.useCallback((year: number, month: number) => {
    setCalendarYear(year);
    setCalendarMonth(month);
  }, []);

  const userCollapsedPref = React.useRef(initialCollapsed);
  const collapsedRef = React.useRef(initialCollapsed);
  const hasEmittedInitialLayout = React.useRef(false);
  const lastEmittedLayout = React.useRef<LayoutPreferences | null>(null);

  React.useEffect(() => {
    collapsedRef.current = isSidebarCollapsed;
  }, [isSidebarCollapsed]);

  React.useEffect(() => {
    const nextCollapsed = Boolean(initialCollapsed);
    const nextWidth = clampWidth(initialWidth);

    userCollapsedPref.current = nextCollapsed;
    collapsedRef.current = nextCollapsed;
    setSidebarCollapsedRaw(nextCollapsed);
    setSidebarWidthRaw(nextWidth);
  }, [initialCollapsed, initialWidth]);

  const setActivePanel = React.useCallback((id: string) => {
    setPanels((currentPanels) => {
      const exists = currentPanels.some((p) => p.id === id);
      if (!exists) return currentPanels;

      setActivePanelRaw((prevId) => {
        if (prevId === id) {
          userCollapsedPref.current = !userCollapsedPref.current;
          collapsedRef.current = userCollapsedPref.current;
          setSidebarCollapsedRaw(userCollapsedPref.current);
          return prevId;
        }

        const prevPanel = currentPanels.find((p) => p.id === prevId);
        const nextPanel = currentPanels.find((p) => p.id === id);

        if (nextPanel && nextPanel.sidePanelContent === undefined) {
          if (!prevPanel || prevPanel.sidePanelContent !== undefined) {
            userCollapsedPref.current = collapsedRef.current;
            collapsedRef.current = true;
            setSidebarCollapsedRaw(true);
          }
        } else {
          if (prevPanel && prevPanel.sidePanelContent === undefined) {
            collapsedRef.current = userCollapsedPref.current;
            setSidebarCollapsedRaw(userCollapsedPref.current);
          }
        }

        return id;
      });

      return currentPanels;
    });
  }, []);

  const setSidebarCollapsed = React.useCallback((collapsed: boolean) => {
    userCollapsedPref.current = collapsed;
    collapsedRef.current = collapsed;
    setSidebarCollapsedRaw(collapsed);
  }, []);

  const toggleSidebar = React.useCallback(() => {
    userCollapsedPref.current = !userCollapsedPref.current;
    collapsedRef.current = userCollapsedPref.current;
    setSidebarCollapsedRaw((prev) => !prev);
  }, []);

  const setSidebarWidth = React.useCallback((width: number) => {
    setSidebarWidthRaw(clampWidth(width));
  }, []);

  const registerPanel = React.useCallback((panel: PanelDefinition) => {
    setPanels((prev) => {
      const filtered = prev.filter((p) => p.id !== panel.id);
      return [...filtered, panel].sort((a, b) => a.order - b.order);
    });
  }, []);

  const unregisterPanel = React.useCallback((id: string) => {
    setPanels((prev) => prev.filter((p) => p.id !== id));
  }, []);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'b') return;

      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;

      const target = e.target;
      if (target instanceof HTMLElement) {
        const tagName = target.tagName.toLowerCase();
        if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') return;
        if (target.closest('[contenteditable]:not([contenteditable="false"])')) return;
      }

      e.preventDefault();
      userCollapsedPref.current = !userCollapsedPref.current;
      collapsedRef.current = userCollapsedPref.current;
      setSidebarCollapsedRaw((prev) => !prev);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  React.useEffect(() => {
    if (!onLayoutChange) {
      return;
    }

    const nextLayout = { sidebarWidth, sidebarCollapsed: userCollapsedPref.current };

    if (!hasEmittedInitialLayout.current) {
      hasEmittedInitialLayout.current = true;
      lastEmittedLayout.current = nextLayout;
      return;
    }

    if (sameLayoutPreferences(lastEmittedLayout.current, nextLayout)) {
      return;
    }

    lastEmittedLayout.current = nextLayout;
    onLayoutChange(nextLayout);
  }, [sidebarWidth, isSidebarCollapsed, onLayoutChange]);

  const value = React.useMemo<LayoutContextValue>(
    () => ({
      activePanel,
      setActivePanel,
      isSidebarCollapsed,
      setSidebarCollapsed,
      toggleSidebar,
      sidebarWidth,
      setSidebarWidth,
      panels,
      registerPanel,
      unregisterPanel,
      calendarYear,
      calendarMonth,
      setCalendarDate,
    }),
    [activePanel, setActivePanel, isSidebarCollapsed, setSidebarCollapsed, toggleSidebar, sidebarWidth, setSidebarWidth, panels, registerPanel, unregisterPanel, calendarYear, calendarMonth, setCalendarDate],
  );

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
}

export function useLayout(): LayoutContextValue {
  const ctx = React.useContext(LayoutContext);
  if (!ctx) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return ctx;
}
