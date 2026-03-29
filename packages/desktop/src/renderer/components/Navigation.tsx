import React from 'react';

export interface NavItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  section?: 'main' | 'system';
}

export interface NavigationProps {
  items: NavItem[];
  activeId?: string;
  onNavigate?: (id: string) => void;
}

/* ─── Icons ─── */

const navIcons: Record<string, React.ReactNode> = {
  today: (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
    </svg>
  ),
  calendar: (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
    </svg>
  ),
  connectors: (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>
  ),
  settings: (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  terminal: (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
    </svg>
  ),
};

/* ─── Canonical v1 nav ─── */

export const canonicalNavItems: NavItem[] = [
  { id: 'today', label: 'Today', section: 'main' },
  { id: 'calendar', label: 'Calendar', section: 'main' },
  { id: 'terminal', label: 'Terminal', section: 'main' },
  { id: 'connectors', label: 'Connectors', section: 'system' },
  { id: 'settings', label: 'Settings', section: 'system' },
];

/* ─── Navigation component ─── */

export function Navigation({ items, activeId, onNavigate }: NavigationProps): React.ReactElement {
  const mainItems = items.filter((i) => !i.section || i.section === 'main');
  const systemItems = items.filter((i) => i.section === 'system');

  return (
    <nav className="flex flex-col h-full py-3 px-2" aria-label="Application navigation">
      {/* Main section */}
      <div className="space-y-0.5">
        <p className="section-heading px-3 mb-2">Command</p>
        <ul className="space-y-0.5" role="list">
          {mainItems.map((item, i) => (
            <NavButton
              key={item.id}
              item={item}
              isActive={item.id === activeId}
              onNavigate={onNavigate}
              stagger={i + 1}
            />
          ))}
        </ul>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* System section */}
      <div className="space-y-0.5 border-t border-border-muted pt-3 mt-3">
        <p className="section-heading px-3 mb-2">System</p>
        <ul className="space-y-0.5" role="list">
          {systemItems.map((item, i) => (
            <NavButton
              key={item.id}
              item={item}
              isActive={item.id === activeId}
              onNavigate={onNavigate}
              stagger={i + 3}
            />
          ))}
        </ul>
      </div>
    </nav>
  );
}

function NavButton({
  item,
  isActive,
  onNavigate,
  stagger,
}: {
  item: NavItem;
  isActive: boolean;
  onNavigate?: (id: string) => void;
  stagger: number;
}): React.ReactElement {
  const icon = navIcons[item.id];

  return (
    <li className={`animate-slide-in-left stagger-${stagger}`}>
      <button
        type="button"
        onClick={() => onNavigate?.(item.id)}
        className={`
          nav-item w-full text-left
          ${isActive ? 'active' : ''}
        `}
        aria-current={isActive ? 'page' : undefined}
      >
        {icon && <span className="flex-shrink-0 opacity-75">{icon}</span>}
        <span className="flex-1">{item.label}</span>
      </button>
    </li>
  );
}

/* ─── App layout shell ─── */

export interface AppLayoutProps {
  children: React.ReactNode;
  activeId?: string;
  onNavigate?: (id: string) => void;
  date?: string;
  fullBleed?: boolean;
}

export function AppLayout({ children, activeId, onNavigate, date, fullBleed = false }: AppLayoutProps): React.ReactElement {
  return (
    <div className="flex h-screen bg-surface-secondary grain">
      {/* Sidebar */}
      <aside className="w-56 border-r border-border-default bg-surface-primary flex flex-col surface-gradient">
        {/* Brand header */}
        <div className="p-4 pb-3 border-b border-border-muted">
          <div className="flex items-center gap-3 animate-fade-in">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-srgnt-400 to-srgnt-600 shadow-xs">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-display font-semibold text-text-primary tracking-tight">srgnt</h1>
              {date && (
                <p className="text-[10px] font-mono-data text-text-tertiary truncate">{date}</p>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <Navigation
            items={canonicalNavItems}
            activeId={activeId}
            onNavigate={onNavigate}
          />
        </div>

        {/* Footer status */}
        <div className="p-3 border-t border-border-muted animate-fade-in">
          <div className="flex items-center gap-2 px-1">
            <span className="status-indicator connected" />
            <span className="text-[11px] text-text-tertiary">Online</span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className={`flex-1 min-w-0 min-h-0 ${fullBleed ? 'overflow-hidden' : 'overflow-auto scrollbar-thin'}`}>
        <div className={fullBleed ? 'h-full' : 'max-w-4xl mx-auto px-8 py-6'}>
          {children}
        </div>
      </main>
    </div>
  );
}
