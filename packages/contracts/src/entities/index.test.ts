import { describe, it, expect } from 'vitest';
import { parseSync } from '../shared-schemas.js';
import { SEntityEnvelope, STask, SEvent, SMessage, SPerson, SArtifact } from './index.js';

describe('SEntityEnvelope', () => {
  it('validates a minimal entity envelope', () => {
    const envelope = {
      id: 'entity-1',
      canonicalType: 'Task',
    };
    expect(() => parseSync(SEntityEnvelope, envelope)).not.toThrow();
  });

  it('accepts all optional fields', () => {
    const envelope = {
      id: 'entity-1',
      canonicalType: 'Task',
      provider: 'jira',
      providerId: 'JIRA-123',
      raw: { field: 'value' },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    };
    expect(() => parseSync(SEntityEnvelope, envelope)).not.toThrow();
  });

  it('rejects missing id', () => {
    const envelope = { canonicalType: 'Task' };
    expect(() => parseSync(SEntityEnvelope, envelope)).toThrow();
  });

  it('rejects missing canonicalType', () => {
    const envelope = { id: 'entity-1' };
    expect(() => parseSync(SEntityEnvelope, envelope)).toThrow();
  });
});

describe('STask', () => {
  it('validates a minimal task', () => {
    const task = {
      envelope: { id: 'task-1', canonicalType: 'Task' },
      title: 'Test Task',
    };
    expect(() => parseSync(STask, task)).not.toThrow();
  });

  it('validates a full task with all fields', () => {
    const task = {
      envelope: { id: 'task-1', canonicalType: 'Task', provider: 'jira' },
      title: 'Test Task',
      description: 'A description',
      status: 'in_progress',
      priority: 'high',
      dueDate: '2024-12-31T23:59:59Z',
      assignee: 'user@example.com',
      project: 'SRGNT',
      labels: ['bug', 'urgent'],
      providerMetadata: { jiraKey: 'JIRA-123' },
    };
    expect(() => parseSync(STask, task)).not.toThrow();
  });

  it('rejects invalid status', () => {
    const task = {
      envelope: { id: 'task-1', canonicalType: 'Task' },
      title: 'Test Task',
      status: 'invalid',
    };
    expect(() => parseSync(STask, task)).toThrow();
  });

  it('rejects invalid priority', () => {
    const task = {
      envelope: { id: 'task-1', canonicalType: 'Task' },
      title: 'Test Task',
      priority: 'invalid',
    };
    expect(() => parseSync(STask, task)).toThrow();
  });
});

describe('SEvent', () => {
  it('validates a minimal event', () => {
    const event = {
      envelope: { id: 'event-1', canonicalType: 'Event' },
      title: 'Team Meeting',
      startTime: '2024-01-01T10:00:00Z',
    };
    expect(() => parseSync(SEvent, event)).not.toThrow();
  });

  it('validates event with all optional fields', () => {
    const event = {
      envelope: { id: 'event-1', canonicalType: 'Event' },
      title: 'Team Meeting',
      description: 'Weekly sync',
      startTime: '2024-01-01T10:00:00Z',
      endTime: '2024-01-01T11:00:00Z',
      location: 'Room 101',
      attendees: ['user1@example.com', 'user2@example.com'],
      organizer: 'user@example.com',
      recurrence: 'weekly',
      providerMetadata: {},
    };
    expect(() => parseSync(SEvent, event)).not.toThrow();
  });

  it('rejects invalid datetime for startTime', () => {
    const event = {
      envelope: { id: 'event-1', canonicalType: 'Event' },
      title: 'Team Meeting',
      startTime: 'not-a-date',
    };
    expect(() => parseSync(SEvent, event)).toThrow();
  });
});

describe('SMessage', () => {
  it('validates a minimal message', () => {
    const message = {
      envelope: { id: 'msg-1', canonicalType: 'Message' },
      body: 'Hello world',
      sender: 'sender@example.com',
      sentAt: '2024-01-01T10:00:00Z',
    };
    expect(() => parseSync(SMessage, message)).not.toThrow();
  });

  it('accepts any string as sender (no email validation)', () => {
    const message = {
      envelope: { id: 'msg-1', canonicalType: 'Message' },
      body: 'Hello world',
      sender: 'not-an-email',
      sentAt: '2024-01-01T10:00:00Z',
    };
    expect(() => parseSync(SMessage, message)).not.toThrow();
  });
});

describe('SPerson', () => {
  it('validates a minimal person', () => {
    const person = {
      envelope: { id: 'person-1', canonicalType: 'Person' },
      name: 'John Doe',
    };
    expect(() => parseSync(SPerson, person)).not.toThrow();
  });

  it('validates person with email', () => {
    const person = {
      envelope: { id: 'person-1', canonicalType: 'Person' },
      name: 'John Doe',
      email: 'john@example.com',
    };
    expect(() => parseSync(SPerson, person)).not.toThrow();
  });

  it('rejects invalid email format', () => {
    const person = {
      envelope: { id: 'person-1', canonicalType: 'Person' },
      name: 'John Doe',
      email: 'not-an-email',
    };
    expect(() => parseSync(SPerson, person)).toThrow();
  });

  it('rejects invalid avatarUrl', () => {
    const person = {
      envelope: { id: 'person-1', canonicalType: 'Person' },
      name: 'John Doe',
      avatarUrl: 'not-a-url',
    };
    expect(() => parseSync(SPerson, person)).toThrow();
  });
});

describe('SArtifact', () => {
  it('validates a minimal artifact', () => {
    const artifact = {
      envelope: { id: 'art-1', canonicalType: 'Artifact' },
      name: 'Daily Brief',
      content: '# Today\n\n- Task 1\n- Task 2',
      createdAt: '2024-01-01T10:00:00Z',
    };
    expect(() => parseSync(SArtifact, artifact)).not.toThrow();
  });

  it('validates artifact with all fields', () => {
    const artifact = {
      envelope: { id: 'art-1', canonicalType: 'Artifact' },
      name: 'Daily Brief',
      content: '# Today',
      contentType: 'markdown',
      sourceSkill: 'daily-briefing',
      createdAt: '2024-01-01T10:00:00Z',
      updatedAt: '2024-01-02T10:00:00Z',
      tags: ['daily', 'brief'],
    };
    expect(() => parseSync(SArtifact, artifact)).not.toThrow();
  });

  it('rejects invalid contentType', () => {
    const artifact = {
      envelope: { id: 'art-1', canonicalType: 'Artifact' },
      name: 'Daily Brief',
      content: '# Today',
      contentType: 'invalid',
      createdAt: '2024-01-01T10:00:00Z',
    };
    expect(() => parseSync(SArtifact, artifact)).toThrow();
  });
});
