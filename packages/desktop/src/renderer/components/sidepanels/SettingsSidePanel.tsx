import React from 'react';

const CATEGORIES = [
  { id: 'general', label: 'General' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'advanced', label: 'Advanced' },
] as const;

export function SettingsSidePanel(): React.ReactElement {
  const handleScrollTo = (id: string) => {
    document.getElementById(`settings-section-${id}`)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border-default">
        <h2 className="section-heading">Categories</h2>
      </div>
      <nav className="flex-1 overflow-y-auto scrollbar-thin p-1.5" aria-label="Settings categories">
        <ul className="space-y-0.5" role="list">
          {CATEGORIES.map((cat) => (
            <li key={cat.id}>
              <button
                type="button"
                onClick={() => handleScrollTo(cat.id)}
                className="nav-item w-full text-left text-xs"
              >
                {cat.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
