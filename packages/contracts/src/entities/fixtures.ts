import { safeParse } from '../shared-schemas.js';
import { STask, type Task } from './task.js';
import { SEvent, type Event } from './event.js';
import { SMessage, type Message } from './message.js';
import { SPerson, type Person } from './person.js';
import { SArtifact, type Artifact } from './artifact.js';

export { STask, type Task };
export { SEvent, type Event };
export { SMessage, type Message };
export { SPerson, type Person };
export { SArtifact, type Artifact };

export const v1EntityTypes = ['Task', 'Event', 'Message', 'Person', 'Artifact'] as const;
export type V1EntityType = (typeof v1EntityTypes)[number];

export const taskFixtures: Task[] = [
  {
    envelope: { id: 'fixture-task-1', canonicalType: 'Task', provider: 'jira' },
    title: 'Review Q1 OKRs',
    description: 'Review and update team Q1 objectives and key results',
    status: 'open',
    priority: 'high',
    dueDate: '2024-03-31T23:59:59Z',
    assignee: 'engineer@srgnt.app',
    project: 'OKR',
    labels: ['strategy', 'quarterly'],
  },
  {
    envelope: { id: 'fixture-task-2', canonicalType: 'Task' },
    title: 'Send weekly standup notes',
    status: 'done',
    priority: 'low',
  },
];

export const eventFixtures: Event[] = [
  {
    envelope: { id: 'fixture-event-1', canonicalType: 'Event', provider: 'outlook' },
    title: 'Team Standup',
    description: 'Daily sync meeting',
    startTime: '2024-03-25T09:00:00Z',
    endTime: '2024-03-25T09:30:00Z',
    location: 'https://teams.microsoft.com/meet/standup',
    attendees: ['engineer@srgnt.app', 'designer@srgnt.app'],
    organizer: 'manager@srgnt.app',
    recurrence: 'daily',
  },
];

export const messageFixtures: Message[] = [
  {
    envelope: { id: 'fixture-msg-1', canonicalType: 'Message' },
    subject: 'Q1 Planning',
    body: 'Let me know when you are available for Q1 planning.',
    sender: 'manager@srgnt.app',
    recipients: ['engineer@srgnt.app'],
    sentAt: '2024-03-24T14:30:00Z',
    threadId: 'thread-1',
    isRead: false,
  },
];

export const personFixtures: Person[] = [
  {
    envelope: { id: 'fixture-person-1', canonicalType: 'Person' },
    name: 'Alex Engineer',
    email: 'engineer@srgnt.app',
    role: 'Senior Engineer',
    team: 'Platform',
  },
  {
    envelope: { id: 'fixture-person-2', canonicalType: 'Person' },
    name: 'Jordan Manager',
    email: 'manager@srgnt.app',
    role: 'Engineering Manager',
    team: 'Platform',
  },
];

export const artifactFixtures: Artifact[] = [
  {
    envelope: { id: 'fixture-art-1', canonicalType: 'Artifact' },
    name: 'Daily Briefing - March 25',
    content: '# Daily Briefing\n\n## Tasks\n- [ ] Review Q1 OKRs\n\n## Meetings\n- 9:00 AM Team Standup\n',
    contentType: 'markdown',
    sourceSkill: 'daily-briefing',
    createdAt: '2024-03-25T08:00:00Z',
    tags: ['daily', 'brief'],
  },
];

export function validateEntity(entity: unknown): boolean {
  const type = (entity as { envelope?: { canonicalType?: string } })?.envelope?.canonicalType;
  switch (type) {
    case 'Task':
      return safeParse(STask, entity).success;
    case 'Event':
      return safeParse(SEvent, entity).success;
    case 'Message':
      return safeParse(SMessage, entity).success;
    case 'Person':
      return safeParse(SPerson, entity).success;
    case 'Artifact':
      return safeParse(SArtifact, entity).success;
    default:
      return false;
  }
}
