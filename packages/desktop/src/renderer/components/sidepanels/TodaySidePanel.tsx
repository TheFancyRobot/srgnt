import React from 'react';

const SECTIONS = [
  { id: 'section-blockers', label: 'Blockers & Watch-outs' },
  { id: 'section-priorities', label: 'Priorities' },
  { id: 'section-schedule', label: 'Schedule' },
  { id: 'section-attention-needed', label: 'Attention Needed' },
] as const;

export function TodaySidePanel(): React.ReactElement {
  const handleScrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border-default">
        <h2 className="section-heading">Sections</h2>
      </div>
      <nav className="flex-1 overflow-y-auto scrollbar-thin p-1.5" aria-label="Dashboard sections">
        <ul className="space-y-0.5" role="list">
          {SECTIONS.map((section) => (
            <li key={section.id}>
              <button
                type="button"
                onClick={() => handleScrollTo(section.id)}
                className="nav-item w-full text-left text-xs"
              >
                {section.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
