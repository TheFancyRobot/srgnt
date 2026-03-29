import React from 'react';
import type { LaunchContext } from '@srgnt/contracts';

/* ═══════════════════════════════════════════════════════════
   Today View — Daily Command Center
   
   Rule-based aggregation only (no AI/LLM).
   Shows priorities, schedule, attention items, and blockers
   from Jira, Outlook Calendar, and Teams fixture data.
   ═══════════════════════════════════════════════════════════ */

/* ─── Fixture data ─── */

interface JiraTask {
  key: string;
  summary: string;
  priority: 'high' | 'medium' | 'low';
  status: 'in-progress' | 'to-do' | 'review' | 'blocked';
  assignee: string;
  project: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  attendees: string[];
  location?: string;
  isNext?: boolean;
  requiresPrep?: boolean;
}

interface TeamsMessage {
  id: string;
  sender: string;
  channel: string;
  preview: string;
  timestamp: string;
  type: 'mention' | 'reply' | 'direct';
  unread: boolean;
}

interface Blocker {
  id: string;
  title: string;
  source: 'jira' | 'teams' | 'calendar';
  sourceRef: string;
  severity: 'critical' | 'warning';
}

const FIXTURE_TASKS: JiraTask[] = [
  { key: 'SRGNT-142', summary: 'OAuth token refresh fails silently after 24h', priority: 'high', status: 'in-progress', assignee: 'You', project: 'srgnt-core' },
  { key: 'SRGNT-138', summary: 'Add retry logic to connector sync pipeline', priority: 'high', status: 'to-do', assignee: 'You', project: 'srgnt-core' },
  { key: 'SRGNT-155', summary: 'Calendar event dedup across Outlook instances', priority: 'medium', status: 'in-progress', assignee: 'You', project: 'srgnt-desktop' },
  { key: 'SRGNT-161', summary: 'Write E2E tests for onboarding wizard flow', priority: 'medium', status: 'to-do', assignee: 'You', project: 'srgnt-desktop' },
  { key: 'SRGNT-149', summary: 'Bump electron-builder to latest stable', priority: 'low', status: 'to-do', assignee: 'You', project: 'srgnt-desktop' },
  { key: 'SRGNT-163', summary: 'Document connector API for third-party devs', priority: 'low', status: 'review', assignee: 'You', project: 'srgnt-docs' },
];

const FIXTURE_EVENTS: CalendarEvent[] = [
  { id: 'e1', title: 'Sprint Planning', startTime: '09:00', endTime: '09:45', attendees: ['Sarah K.', 'Mike R.', 'Priya S.'], location: 'Teams', requiresPrep: true },
  { id: 'e2', title: 'Architecture Review: Connector v2', startTime: '10:30', endTime: '11:15', attendees: ['James L.', 'Priya S.'], location: 'Room 4B', isNext: true, requiresPrep: true },
  { id: 'e3', title: 'Lunch', startTime: '12:00', endTime: '12:45', attendees: [], location: undefined },
  { id: 'e4', title: '1:1 with Sarah', startTime: '14:00', endTime: '14:30', attendees: ['Sarah K.'], location: 'Teams' },
  { id: 'e5', title: 'Focus Time', startTime: '15:00', endTime: '17:00', attendees: [], location: undefined },
];

const FIXTURE_MESSAGES: TeamsMessage[] = [
  { id: 'm1', sender: 'Sarah K.', channel: '#srgnt-core', preview: 'Can you review the PR for the sync retry logic? It\'s ready.', timestamp: '8:42 AM', type: 'mention', unread: true },
  { id: 'm2', sender: 'Mike R.', channel: 'DM', preview: 'Hey, the staging deploy is green. Good to promote to prod?', timestamp: '8:15 AM', type: 'direct', unread: true },
  { id: 'm3', sender: 'Priya S.', channel: '#srgnt-desktop', preview: 'FYI the electron-builder bump has a breaking change with notarization', timestamp: 'Yesterday', type: 'reply', unread: false },
];

const FIXTURE_BLOCKERS: Blocker[] = [
  { id: 'b1', title: 'OAuth refresh bug blocks all 24h+ sessions', source: 'jira', sourceRef: 'SRGNT-142', severity: 'critical' },
  { id: 'b2', title: 'Architecture review needs prep docs', source: 'calendar', sourceRef: 'Architecture Review: Connector v2', severity: 'warning' },
];

/* ─── Time-of-day greeting ─── */

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

/* ─── Sub-components ─── */

function PriorityBadge({ priority }: { priority: JiraTask['priority'] }): React.ReactElement {
  const cls = priority === 'high' ? 'badge-high' : priority === 'medium' ? 'badge-medium' : 'badge-low';
  return <span className={`badge ${cls}`}>{priority}</span>;
}

function StatusDot({ status }: { status: JiraTask['status'] }): React.ReactElement {
  const colorMap: Record<string, string> = {
    'in-progress': 'bg-info-500',
    'to-do': 'bg-text-tertiary',
    review: 'bg-warning-500',
    blocked: 'bg-error-500',
  };
  return (
    <span className={`inline-block w-1.5 h-1.5 rounded-full ${colorMap[status] || 'bg-text-tertiary'}`} />
  );
}

function BlockerIcon({ severity }: { severity: Blocker['severity'] }): React.ReactElement {
  if (severity === 'critical') {
    return (
      <svg className="w-4 h-4 text-error-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4 text-warning-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  );
}

function MessageTypeIcon({ type }: { type: TeamsMessage['type'] }): React.ReactElement {
  if (type === 'mention') {
    return (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" d="M16.5 12a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zm0 0c0 1.657 1.007 3 2.25 3S21 13.657 21 12a9 9 0 10-2.636 6.364M16.5 12V8.25" />
      </svg>
    );
  }
  if (type === 'direct') {
    return (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    );
  }
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  );
}

/* ─── Main view ─── */

export interface TodayViewProps {
  onLaunchContext?: (launchContext: LaunchContext) => void | Promise<void>;
}

export function TodayView({ onLaunchContext }: TodayViewProps = {}): React.ReactElement {
  const [pendingLaunch, setPendingLaunch] = React.useState<string | null>(null);

  const handleLaunch = async (task: JiraTask) => {
    setPendingLaunch(task.key);
    try {
      const workspaceRoot = await window.srgnt.getWorkspaceRoot();
      const launchContext: LaunchContext = {
        launchId: `launch-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        sourceWorkflow: 'daily-briefing',
        sourceArtifactId: task.key,
        workingDirectory: workspaceRoot || '/',
        intent: 'readOnly',
        labels: [task.key, task.project],
        createdAt: new Date().toISOString(),
      };

      if (onLaunchContext) {
        await onLaunchContext(launchContext);
      } else {
        await window.srgnt.terminalLaunchWithContext({ launchContext, rows: 24, cols: 80 });
      }
    } catch (err) {
      console.error('Launch failed:', err);
    } finally {
      setPendingLaunch(null);
    }
  };

  const greeting = getGreeting();
  const dateStr = formatDate();
  const highPriorityCount = FIXTURE_TASKS.filter((t) => t.priority === 'high').length;
  const unreadCount = FIXTURE_MESSAGES.filter((m) => m.unread).length;
  const nextEvent = FIXTURE_EVENTS.find((e) => e.isNext);

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="animate-slide-up">
        <h1 className="text-2xl font-display font-semibold text-text-primary tracking-tight mb-1">
          {greeting}
        </h1>
        <p className="text-sm text-text-secondary">{dateStr}</p>

        {/* Summary strip */}
        <div className="flex items-center gap-4 mt-4 flex-wrap">
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-block w-2 h-2 rounded-full bg-error-500" />
            <span className="text-text-secondary">
              <span className="font-mono-data font-medium text-text-primary">{highPriorityCount}</span> high priority
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-block w-2 h-2 rounded-full bg-info-500" />
            <span className="text-text-secondary">
              <span className="font-mono-data font-medium text-text-primary">{FIXTURE_EVENTS.length}</span> meetings
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-block w-2 h-2 rounded-full bg-srgnt-400" />
            <span className="text-text-secondary">
              <span className="font-mono-data font-medium text-text-primary">{unreadCount}</span> unread
            </span>
          </div>
          {nextEvent && (
            <div className="flex items-center gap-2 text-xs ml-auto">
              <svg className="w-3.5 h-3.5 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-text-tertiary">
                Next: <span className="text-text-secondary">{nextEvent.title}</span> at {nextEvent.startTime}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Blockers — always on top */}
      {FIXTURE_BLOCKERS.length > 0 && (
        <section className="animate-slide-up stagger-1">
          <h2 className="section-heading mb-3 flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-error-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
            </svg>
            Blockers & Watch-outs
          </h2>
          <div className="space-y-2">
            {FIXTURE_BLOCKERS.map((b) => (
              <div
                key={b.id}
                className={`card p-3 flex items-start gap-3 border-l-[3px] ${
                  b.severity === 'critical' ? 'border-l-error-500' : 'border-l-warning-500'
                }`}
              >
                <BlockerIcon severity={b.severity} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary">{b.title}</p>
                  <p className="text-xs text-text-tertiary mt-0.5">
                    {b.source === 'jira' ? 'Jira' : b.source === 'teams' ? 'Teams' : 'Calendar'} &middot; {b.sourceRef}
                  </p>
                </div>
                <span className={`badge ${b.severity === 'critical' ? 'badge-high' : 'badge-medium'}`}>
                  {b.severity}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Two-column grid: Priorities + Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priorities (Jira) */}
        <section className="animate-slide-up stagger-2">
          <h2 className="section-heading mb-3 flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-srgnt-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
            </svg>
            Priorities
          </h2>
          <div className="card divide-y divide-border-muted">
            {FIXTURE_TASKS.map((task) => (
              <div key={task.key} className="px-4 py-3 flex items-center gap-3 hover:bg-surface-tertiary/50 transition-colors">
                <StatusDot status={task.status} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono-data text-text-tertiary">{task.key}</span>
                    <PriorityBadge priority={task.priority} />
                  </div>
                  <p className="text-sm text-text-primary truncate mt-0.5">{task.summary}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleLaunch(task)}
                  disabled={pendingLaunch !== null}
                  className="text-[10px] px-2 py-0.5 rounded border border-srgnt-400 text-srgnt-500 hover:bg-srgnt-500 hover:text-white transition-colors whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
                  title={`Open terminal for ${task.key}`}
                >
                  {pendingLaunch === task.key ? 'Opening...' : 'Launch'}
                </button>
                <span className="text-[11px] font-mono-data text-text-tertiary whitespace-nowrap capitalize">
                  {task.status}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Schedule (Outlook) */}
        <section className="animate-slide-up stagger-3">
          <h2 className="section-heading mb-3 flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-srgnt-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Schedule
          </h2>
          <div className="card divide-y divide-border-muted">
            {FIXTURE_EVENTS.map((ev) => (
              <div
                key={ev.id}
                className={`px-4 py-3 flex items-start gap-3 transition-colors ${
                  ev.isNext ? 'bg-surface-brand' : 'hover:bg-surface-tertiary/50'
                }`}
              >
                <div className="w-14 flex-shrink-0 text-right">
                  <span className="text-xs font-mono-data text-text-secondary">{ev.startTime}</span>
                  <span className="block text-[10px] font-mono-data text-text-tertiary">{ev.endTime}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-text-primary truncate">{ev.title}</p>
                    {ev.isNext && <span className="badge badge-brand">Next</span>}
                    {ev.requiresPrep && <span className="badge badge-info">Prep</span>}
                  </div>
                  {ev.attendees.length > 0 && (
                    <p className="text-xs text-text-tertiary mt-0.5 truncate">
                      {ev.attendees.join(', ')}
                      {ev.location && <span> &middot; {ev.location}</span>}
                    </p>
                  )}
                  {ev.attendees.length === 0 && ev.location && (
                    <p className="text-xs text-text-tertiary mt-0.5">{ev.location}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Attention Needed (Teams) */}
      <section className="animate-slide-up stagger-4">
        <h2 className="section-heading mb-3 flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-srgnt-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
          Attention Needed
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-srgnt-500 text-[9px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </h2>
        <div className="card divide-y divide-border-muted">
          {FIXTURE_MESSAGES.map((msg) => (
            <div
              key={msg.id}
              className={`px-4 py-3 flex items-start gap-3 transition-colors hover:bg-surface-tertiary/50 ${
                msg.unread ? '' : 'opacity-60'
              }`}
            >
              <div className="mt-0.5 text-text-tertiary">
                <MessageTypeIcon type={msg.type} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${msg.unread ? 'font-medium text-text-primary' : 'text-text-secondary'}`}>
                    {msg.sender}
                  </span>
                  <span className="text-[11px] text-text-tertiary">{msg.channel}</span>
                </div>
                <p className="text-sm text-text-secondary mt-0.5 truncate">{msg.preview}</p>
              </div>
              <span className="text-[11px] font-mono-data text-text-tertiary whitespace-nowrap flex-shrink-0">
                {msg.timestamp}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
