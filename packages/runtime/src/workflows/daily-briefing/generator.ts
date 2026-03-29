import type { Task, Event, Message, DailyBriefing } from '@srgnt/contracts';
import type { CanonicalStore } from '../../store/canonical.js';
import { createArtifactRegistry } from '../../artifacts/registry.js';
import type { ArtifactRegistry } from '../../artifacts/registry.js';

export interface BriefingSources {
  tasks: Task[];
  events: Event[];
  messages: Message[];
}

export interface DailyBriefingOptions {
  date?: string;
  runId?: string;
}

function generateRunId(): string {
  return `briefing-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function formatTaskItem(task: Task): string {
  const priority = task.priority ? `[${task.priority.toUpperCase()}]` : '';
  const status = task.status ? `(${task.status})` : '';
  const due = task.dueDate ? ` due:${task.dueDate.split('T')[0]}` : '';
  return `- ${priority} ${task.title} ${status}${due}`.trim();
}

function formatEventItem(event: Event): string {
  const time = event.startTime ? event.startTime.split('T')[1]?.substring(0, 5) || '' : '';
  const location = event.location ? ` @ ${event.location}` : '';
  return `- ${time} ${event.title}${location}`;
}

function formatMessageItem(message: Message): string {
  const from = message.sender ? `From: ${message.sender}` : '';
  const subject = message.subject ? `Subject: ${message.subject}` : '';
  return `- ${from} ${subject}`.trim();
}

function buildPrioritiesSection(tasks: Task[]): { title: string; items: string[] } {
  const highPriority = tasks
    .filter((t) => t.priority === 'high' || t.priority === 'critical')
    .sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const aOrder = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 4;
      const bOrder = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 4;
      return aOrder - bOrder;
    })
    .slice(0, 10);

  return {
    title: 'Priorities',
    items: highPriority.map(formatTaskItem),
  };
}

function buildScheduleSection(events: Event[]): { title: string; items: string[] } {
  const sorted = [...events].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  return {
    title: 'Schedule',
    items: sorted.map(formatEventItem),
  };
}

function buildAttentionNeededSection(messages: Message[]): { title: string; items: string[] } {
  const unread = messages.filter((m) => !m.isRead).slice(0, 10);

  return {
    title: 'Attention Needed',
    items: unread.map(formatMessageItem),
  };
}

function buildBlockersSection(tasks: Task[]): { title: string; items: string[] } {
  const blocked = tasks
    .filter((t) => t.status !== 'done' && t.status !== 'cancelled')
    .slice(0, 5);

  return {
    title: 'Blockers / Watch-outs',
    items: blocked.length > 0
      ? blocked.map(formatTaskItem)
      : ['- No active blockers'],
  };
}

function generateMarkdownContent(briefing: DailyBriefing, dateStr: string): string {
  const lines: string[] = [
    `# Daily Briefing — ${dateStr}`,
    '',
    '## Metadata',
    `- Run ID: ${briefing.metadata.runId}`,
    `- Generated: ${briefing.metadata.generatedAt}`,
    `- Sources: ${Object.entries(briefing.metadata.sources).map(([k, v]) => `${k}: ${v}`).join(', ')}`,
    '',
    '## Priorities',
    ...briefing.priorities.items.map((item) => `  ${item}`),
    '',
    '## Schedule',
    ...briefing.schedule.items.map((item) => `  ${item}`),
    '',
    '## Attention Needed',
    ...briefing.attentionNeeded.items.map((item) => `  ${item}`),
    '',
    '## Blockers / Watch-outs',
    ...briefing.blockers.items.map((item) => `  ${item}`),
    '',
    '---',
    '*This briefing was generated automatically. Do not reply to this message.*',
  ];

  return lines.join('\n');
}

export class DailyBriefingGenerator {
  private store: CanonicalStore;
  private registry: ArtifactRegistry;

  constructor(store: CanonicalStore) {
    this.store = store;
    this.registry = createArtifactRegistry();
  }

  generate(options: DailyBriefingOptions = {}): DailyBriefing {
    const runId = options.runId || generateRunId();
    const generatedAt = new Date().toISOString();
    const dateStr = options.date || generatedAt.split('T')[0];

    const allTasks = this.store.findEntitiesByType('Task') as unknown as Task[];
    const allEvents = this.store.findEntitiesByType('Event') as unknown as Event[];
    const allMessages = this.store.findEntitiesByType('Message') as unknown as Message[];

    const priorities = buildPrioritiesSection(allTasks);
    const schedule = buildScheduleSection(allEvents);
    const attentionNeeded = buildAttentionNeededSection(allMessages);
    const blockers = buildBlockersSection(allTasks);

    const briefingDraft: DailyBriefing = {
      envelope: {
        id: `briefing-${dateStr}`,
        canonicalType: 'DailyBriefing',
        provider: 'local',
        createdAt: generatedAt,
        updatedAt: generatedAt,
      },
      metadata: {
        id: `briefing-${dateStr}`,
        runId,
        generatedAt,
        sources: {
          tasks: `${allTasks.length} loaded`,
          events: `${allEvents.length} loaded`,
          messages: `${allMessages.length} loaded`,
        },
      },
      priorities,
      schedule,
      attentionNeeded,
      blockers,
      content: '',
    };

    return {
      ...briefingDraft,
      content: generateMarkdownContent(briefingDraft, dateStr),
    };
  }

  registerBriefing(briefing: DailyBriefing): void {
    this.registry.register({
      envelope: briefing.envelope,
      name: `Daily Briefing ${briefing.metadata.generatedAt.split('T')[0]}`,
      content: briefing.content,
      contentType: 'markdown',
      sourceSkill: 'daily-briefing',
      createdAt: briefing.metadata.generatedAt,
      updatedAt: briefing.metadata.generatedAt,
      tags: ['daily-briefing', 'automated'],
    });
  }
}

export function createDailyBriefingGenerator(store: CanonicalStore): DailyBriefingGenerator {
  return new DailyBriefingGenerator(store);
}
