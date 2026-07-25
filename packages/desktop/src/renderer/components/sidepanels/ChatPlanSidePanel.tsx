import React from 'react';
import { useChatSession } from '../chat/ChatSessionContext.js';

/**
 * The agent plan panel (PHASE-23, STEP-23-02).
 *
 * Per the ACP spec every `plan` update carries the FULL entry list, so this
 * panel **replaces** rather than merges — an update with fewer entries means the
 * agent dropped them, and an empty list means the plan is gone. Merging would
 * leave stale steps on screen forever.
 *
 * The parse is tolerant (ARCH-0009): entries missing `priority`/`status` take
 * the spec's defaults instead of vanishing, and a malformed entry is skipped
 * rather than throwing the panel away.
 */

export const PLAN_PRIORITIES = ['high', 'medium', 'low'] as const;
export type PlanPriority = (typeof PLAN_PRIORITIES)[number];

export const PLAN_STATUSES = ['pending', 'in_progress', 'completed'] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

export interface PlanEntry {
  readonly content: string;
  readonly priority: PlanPriority;
  readonly status: PlanStatus;
}

const STATUS_LABELS: Record<PlanStatus, string> = {
  pending: 'To do',
  in_progress: 'In progress',
  completed: 'Done',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function oneOf<T extends string>(options: readonly T[], value: unknown, fallback: T): T {
  return typeof value === 'string' && (options as readonly string[]).includes(value) ? (value as T) : fallback;
}

/** Pure, exported for tests: raw `plan.entries` payload → renderable entries. */
export function readPlanEntries(plan: unknown): readonly PlanEntry[] {
  if (!Array.isArray(plan)) return [];
  const entries: PlanEntry[] = [];
  for (const raw of plan) {
    if (!isRecord(raw)) continue;
    const content = raw['content'];
    if (typeof content !== 'string' || content === '') continue;
    entries.push({
      content,
      priority: oneOf(PLAN_PRIORITIES, raw['priority'], 'medium'),
      status: oneOf(PLAN_STATUSES, raw['status'], 'pending'),
    });
  }
  return entries;
}

export function ChatPlanSidePanel(): React.ReactElement {
  const { transcript } = useChatSession();
  const entries = React.useMemo(() => readPlanEntries(transcript.plan), [transcript.plan]);
  const done = entries.filter((entry) => entry.status === 'completed').length;

  return (
    <div className="flex flex-col h-full" data-testid="chat-plan-panel">
      <div className="p-3 border-b border-border-default flex items-baseline justify-between gap-2">
        <h2 className="section-heading">Plan</h2>
        {entries.length > 0 && (
          <span className="text-[11px] font-mono-data text-text-tertiary" data-testid="chat-plan-progress">
            {done}/{entries.length}
          </span>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="p-3 text-xs text-text-tertiary" data-testid="chat-plan-empty">
          No plan yet. Agents that publish one will show their steps here.
        </p>
      ) : (
        <ol className="flex-1 overflow-y-auto scrollbar-thin p-1.5 space-y-0.5" data-testid="chat-plan-entries">
          {entries.map((entry, index) => (
            <li
              key={`${index}-${entry.content}`}
              className="chat-plan-entry"
              data-testid="chat-plan-entry"
              data-status={entry.status}
              data-priority={entry.priority}
            >
              <span className="chat-plan-entry-status" aria-label={STATUS_LABELS[entry.status]}>
                {entry.status === 'completed' ? '✓' : entry.status === 'in_progress' ? '▸' : '○'}
              </span>
              <span className="chat-plan-entry-content">{entry.content}</span>
              <span className="chat-plan-entry-priority">{entry.priority}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
