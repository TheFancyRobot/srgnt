import React from 'react';

/* ═══════════════════════════════════════════════════════════
   Calendar View — Day/Agenda + Event Detail + Triage
   
   Phase 05 Step 03: day-view agenda, event detail panel,
   triage/follow-through surface. Rule-based, no AI.
   ═══════════════════════════════════════════════════════════ */

/* ─── Types & fixture data ─── */

interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  attendees: { name: string; status: 'accepted' | 'tentative' | 'declined' | 'pending' }[];
  location?: string;
  description?: string;
  category: 'meeting' | 'focus' | 'lunch' | 'external' | 'one-on-one';
  triageStatus: 'none' | 'needs-prep' | 'needs-followup' | 'needs-decline' | 'done';
  prepNotes?: string;
  followUp?: string;
}

const FIXTURE_EVENTS: CalendarEvent[] = [
  {
    id: 'e1',
    title: 'Sprint Planning',
    startTime: '09:00',
    endTime: '09:45',
    attendees: [
      { name: 'Sarah K.', status: 'accepted' },
      { name: 'Mike R.', status: 'accepted' },
      { name: 'Priya S.', status: 'tentative' },
    ],
    location: 'Teams',
    description: 'Plan the next sprint cycle. Review velocity and capacity, assign stories from the backlog.',
    category: 'meeting',
    triageStatus: 'needs-prep',
    prepNotes: 'Review burndown chart, bring up SRGNT-142 blocker.',
  },
  {
    id: 'e2',
    title: 'Architecture Review: Connector v2',
    startTime: '10:30',
    endTime: '11:15',
    attendees: [
      { name: 'James L.', status: 'accepted' },
      { name: 'Priya S.', status: 'accepted' },
    ],
    location: 'Room 4B',
    description: 'Deep dive on the new connector architecture. Discuss schema changes, migration path, and performance benchmarks.',
    category: 'meeting',
    triageStatus: 'needs-prep',
    prepNotes: 'Prepare connector v2 diagram and benchmark data.',
  },
  {
    id: 'e3',
    title: 'Lunch',
    startTime: '12:00',
    endTime: '12:45',
    attendees: [],
    category: 'lunch',
    triageStatus: 'none',
  },
  {
    id: 'e4',
    title: '1:1 with Sarah',
    startTime: '14:00',
    endTime: '14:30',
    attendees: [
      { name: 'Sarah K.', status: 'accepted' },
    ],
    location: 'Teams',
    description: 'Weekly check-in. Discuss career goals and current project progress.',
    category: 'one-on-one',
    triageStatus: 'needs-followup',
    followUp: 'Share promotion framework doc afterwards.',
  },
  {
    id: 'e5',
    title: 'Focus Time',
    startTime: '15:00',
    endTime: '17:00',
    attendees: [],
    description: 'Protected deep work block. Work on SRGNT-142 and SRGNT-138.',
    category: 'focus',
    triageStatus: 'done',
  },
];

/* ─── Helpers ─── */

function formatDateHeader(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

const categoryColors: Record<CalendarEvent['category'], { bg: string; border: string; dot: string }> = {
  meeting: { bg: 'bg-info-50', border: 'border-l-info-500', dot: 'bg-info-500' },
  focus: { bg: 'bg-success-50', border: 'border-l-success-500', dot: 'bg-success-500' },
  lunch: { bg: 'bg-surface-tertiary', border: 'border-l-text-tertiary', dot: 'bg-text-tertiary' },
  external: { bg: 'bg-warning-50', border: 'border-l-warning-500', dot: 'bg-warning-500' },
  'one-on-one': { bg: 'bg-surface-brand', border: 'border-l-srgnt-400', dot: 'bg-srgnt-400' },
};

const triageLabels: Record<CalendarEvent['triageStatus'], { label: string; cls: string } | null> = {
  none: null,
  'needs-prep': { label: 'Prep', cls: 'badge-info' },
  'needs-followup': { label: 'Follow-up', cls: 'badge-medium' },
  'needs-decline': { label: 'Decline?', cls: 'badge-high' },
  done: { label: 'Done', cls: 'badge-low' },
};

function AttendeeStatus({ status }: { status: CalendarEvent['attendees'][0]['status'] }): React.ReactElement {
  const map: Record<string, string> = {
    accepted: 'bg-success-500',
    tentative: 'bg-warning-500',
    declined: 'bg-error-500',
    pending: 'bg-text-tertiary',
  };
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${map[status]}`} />;
}

/* ─── Event Detail Panel ─── */

function EventDetail({ event, onClose }: { event: CalendarEvent; onClose: () => void }): React.ReactElement {
  const colors = categoryColors[event.category];
  const triage = triageLabels[event.triageStatus];

  return (
    <div className="animate-scale-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-display font-semibold text-text-primary">{event.title}</h3>
        <button
          type="button"
          onClick={onClose}
          className="btn btn-ghost p-1.5 -mr-1.5"
          aria-label="Close detail"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Time & location */}
      <div className="space-y-2 mb-5">
        <div className="flex items-center gap-2 text-sm">
          <svg className="w-4 h-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-mono-data text-text-primary">{event.startTime}</span>
          <span className="text-text-tertiary">&ndash;</span>
          <span className="font-mono-data text-text-primary">{event.endTime}</span>
        </div>
        {event.location && (
          <div className="flex items-center gap-2 text-sm">
            <svg className="w-4 h-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            <span className="text-text-secondary">{event.location}</span>
          </div>
        )}
      </div>

      {/* Category + triage status */}
      <div className="flex items-center gap-2 mb-5">
        <span className={`inline-block w-2.5 h-2.5 rounded-full ${colors.dot}`} />
        <span className="text-xs text-text-secondary capitalize">{event.category.replace('-', ' ')}</span>
        {triage && <span className={`badge ${triage.cls} ml-1`}>{triage.label}</span>}
      </div>

      {/* Description */}
      {event.description && (
        <div className="mb-5">
          <p className="section-heading mb-1.5">Description</p>
          <p className="text-sm text-text-secondary leading-relaxed">{event.description}</p>
        </div>
      )}

      {/* Attendees */}
      {event.attendees.length > 0 && (
        <div className="mb-5">
          <p className="section-heading mb-2">Attendees ({event.attendees.length})</p>
          <div className="space-y-1.5">
            {event.attendees.map((a) => (
              <div key={a.name} className="flex items-center gap-2 text-sm">
                <AttendeeStatus status={a.status} />
                <span className="text-text-primary">{a.name}</span>
                <span className="text-[10px] text-text-tertiary capitalize">{a.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prep / Follow-up notes */}
      {event.prepNotes && (
        <div className="p-3 rounded-lg bg-info-50 border border-info-100 mb-3">
          <p className="text-xs font-semibold text-info-600 uppercase tracking-wider mb-1">Prep Notes</p>
          <p className="text-sm text-text-primary">{event.prepNotes}</p>
        </div>
      )}
      {event.followUp && (
        <div className="p-3 rounded-lg bg-warning-50 border border-warning-100">
          <p className="text-xs font-semibold text-warning-600 uppercase tracking-wider mb-1">Follow-up</p>
          <p className="text-sm text-text-primary">{event.followUp}</p>
        </div>
      )}
    </div>
  );
}

/* ─── Main view ─── */

export function CalendarView(): React.ReactElement {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const selectedEvent = FIXTURE_EVENTS.find((e) => e.id === selectedId) || null;
  const dateHeader = formatDateHeader();

  const needsAttention = FIXTURE_EVENTS.filter(
    (e) => e.triageStatus === 'needs-prep' || e.triageStatus === 'needs-followup' || e.triageStatus === 'needs-decline'
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="animate-slide-up flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold text-text-primary tracking-tight mb-1">
            Calendar
          </h1>
          <p className="text-sm text-text-secondary">{dateHeader}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-tertiary">
            <span className="font-mono-data font-medium text-text-primary">{FIXTURE_EVENTS.length}</span> events
          </span>
          {needsAttention.length > 0 && (
            <span className="badge badge-medium">
              {needsAttention.length} need action
            </span>
          )}
        </div>
      </header>

      {/* Triage strip */}
      {needsAttention.length > 0 && (
        <section className="animate-slide-up stagger-1">
          <h2 className="section-heading mb-3 flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-srgnt-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Triage
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
            {needsAttention.map((ev) => {
              const triage = triageLabels[ev.triageStatus];
              return (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => setSelectedId(ev.id)}
                  className={`card-brand p-3 min-w-[200px] max-w-[240px] flex-shrink-0 text-left transition-all hover:shadow-md cursor-pointer ${
                    selectedId === ev.id ? 'ring-2 ring-srgnt-400' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono-data text-text-tertiary">{ev.startTime}</span>
                    {triage && <span className={`badge ${triage.cls}`}>{triage.label}</span>}
                  </div>
                  <p className="text-sm font-medium text-text-primary truncate">{ev.title}</p>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Main content: agenda + detail */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Agenda column */}
        <section className={`animate-slide-up stagger-2 ${selectedEvent ? 'lg:col-span-3' : 'lg:col-span-5'}`}>
          <h2 className="section-heading mb-3 flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-srgnt-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            Day Agenda
          </h2>
          <div className="card divide-y divide-border-muted">
            {FIXTURE_EVENTS.map((ev) => {
              const colors = categoryColors[ev.category];
              const triage = triageLabels[ev.triageStatus];
              const isSelected = ev.id === selectedId;

              return (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => setSelectedId(isSelected ? null : ev.id)}
                  className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-all border-l-[3px] ${colors.border} ${
                    isSelected ? 'bg-surface-brand' : 'hover:bg-surface-tertiary/50'
                  }`}
                >
                  {/* Time column */}
                  <div className="w-14 flex-shrink-0 text-right pt-0.5">
                    <span className="text-xs font-mono-data text-text-secondary">{ev.startTime}</span>
                    <span className="block text-[10px] font-mono-data text-text-tertiary">{ev.endTime}</span>
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />
                      <p className="text-sm font-medium text-text-primary truncate">{ev.title}</p>
                      {triage && <span className={`badge ${triage.cls}`}>{triage.label}</span>}
                    </div>
                    {ev.attendees.length > 0 && (
                      <p className="text-xs text-text-tertiary mt-0.5 truncate ml-4">
                        {ev.attendees.map((a) => a.name).join(', ')}
                        {ev.location && <span> &middot; {ev.location}</span>}
                      </p>
                    )}
                  </div>

                  {/* Expand indicator */}
                  <svg
                    className={`w-4 h-4 text-text-tertiary flex-shrink-0 mt-0.5 transition-transform ${isSelected ? 'rotate-90' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              );
            })}
          </div>
        </section>

        {/* Detail panel */}
        {selectedEvent && (
          <aside className="lg:col-span-2 animate-slide-up stagger-3">
            <h2 className="section-heading mb-3">Event Detail</h2>
            <div className="card p-5 sticky top-6">
              <EventDetail event={selectedEvent} onClose={() => setSelectedId(null)} />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
