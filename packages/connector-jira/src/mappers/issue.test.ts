/**
 * Tests for Jira issue → Task mappers
 */
import { describe, it, expect } from 'vitest';
import { mapJiraIssueToTask } from './issue.js';
import type { JiraIssue } from '../api/types.js';

function makeIssue(overrides: Partial<{ subtask: boolean; parent: JiraIssue['fields']['parent']; subtasks: JiraIssue[] }> = {}): JiraIssue {
  return {
    id: '10001',
    key: 'PROJ-123',
    self: '',
    expand: '',
    fields: {
      summary: 'Parent issue',
      description: 'Description here',
      status: { name: 'In Progress', id: '3' },
      priority: { name: 'High', id: '2' },
      assignee: null,
      creator: { accountId: 'u1', displayName: 'Creator', emailAddress: 'c@example.com', active: true },
      reporter: { accountId: 'u1', displayName: 'Reporter', emailAddress: 'c@example.com', active: true },
      created: '2024-03-01T10:00:00Z',
      updated: '2024-03-25T14:30:00Z',
      project: { id: '1', key: 'PROJ', name: 'Project' },
      issuetype: { id: '1', name: 'Task', subtask: false },
      labels: [],
      fixVersions: [],
      subtask: false,
      ...overrides,
    } as JiraIssue['fields'],
  };
}

function makeSubtask(id: string, key: string, summary: string): JiraIssue {
  return {
    id,
    key,
    self: '',
    expand: '',
    fields: {
      summary,
      description: null,
      status: { name: 'To Do', id: '1' },
      priority: { name: 'Medium', id: '3' },
      assignee: null,
      creator: { accountId: 'u1', displayName: 'U', emailAddress: 'u@example.com', active: true },
      reporter: { accountId: 'u1', displayName: 'U', emailAddress: 'u@example.com', active: true },
      created: '2024-03-01T10:00:00Z',
      updated: '2024-03-01T10:00:00Z',
      project: { id: '1', key: 'PROJ', name: 'Project' },
      issuetype: { id: '2', name: 'Sub-task', subtask: true },
      labels: [],
      fixVersions: [],
    } as JiraIssue['fields'],
  };
}

describe('mapJiraIssueToTask — status and priority', () => {
  it('maps Jira status to canonical task status', () => {
    const issue = makeIssue();
    const task = mapJiraIssueToTask(issue);
    expect(task.status).toBe('in_progress'); // 'In Progress' → in_progress
  });

  it('maps Jira priority to canonical task priority', () => {
    const issue = makeIssue();
    const task = mapJiraIssueToTask(issue);
    expect(task.priority).toBe('high');
  });
});

describe('mapJiraIssueToTask — subtask extraction', () => {
  it('includeSubtasks: true — parent issue includes child subtasks in providerMetadata', () => {
    const child1 = makeSubtask('10010', 'PROJ-200', 'Subtask 1');
    const child2 = makeSubtask('10011', 'PROJ-201', 'Subtask 2');
    const issue = makeIssue({ subtasks: [child1, child2] });

    const task = mapJiraIssueToTask(issue, {
      extractionToggles: { includeSubtasks: true },
    });

    expect(task.providerMetadata).toBeDefined();
    const meta = task.providerMetadata as Record<string, unknown>;
    expect(meta.subtasks).toBeDefined();
    const subtasks = meta.subtasks as { id: string; key: string; summary: string; status: string }[];
    expect(subtasks).toHaveLength(2);
    expect(subtasks[0].key).toBe('PROJ-200');
    expect(subtasks[0].summary).toBe('Subtask 1');
    expect(subtasks[1].key).toBe('PROJ-201');
  });

  it('includeSubtasks: false — parent issue has no subtasks in providerMetadata', () => {
    const child1 = makeSubtask('10010', 'PROJ-200', 'Subtask 1');
    const issue = makeIssue({ subtasks: [child1] });

    const task = mapJiraIssueToTask(issue, {
      extractionToggles: { includeSubtasks: false },
    });

    expect(task.providerMetadata).toBeDefined();
    const meta = task.providerMetadata as Record<string, unknown>;
    expect(meta.subtasks).toBeUndefined();
  });

  it('includeSubtasks undefined — defaults to not extracting subtasks', () => {
    const child1 = makeSubtask('10010', 'PROJ-200', 'Subtask 1');
    const issue = makeIssue({ subtasks: [child1] });

    const task = mapJiraIssueToTask(issue, { extractionToggles: {} });

    const meta = task.providerMetadata as Record<string, unknown>;
    expect(meta.subtasks).toBeUndefined();
  });

  it('issue that is itself a subtask has subtaskOf in providerMetadata', () => {
    const parent: JiraIssue['fields']['parent'] = {
      id: '10000',
      key: 'PROJ-100',
      fields: { summary: 'Parent task', status: { name: 'In Progress' } },
    };
    const issue = makeIssue({ subtask: true, parent });

    const task = mapJiraIssueToTask(issue);

    expect(task.providerMetadata).toBeDefined();
    const meta = task.providerMetadata as Record<string, unknown>;
    expect(meta.subtaskOf).toBeDefined();
    const subtaskOf = meta.subtaskOf as { id: string; key: string; summary: string };
    expect(subtaskOf.key).toBe('PROJ-100');
    expect(subtaskOf.summary).toBe('Parent task');
  });

  it('issue with no subtasks and not a subtask — no subtask-related metadata', () => {
    const issue = makeIssue();

    const task = mapJiraIssueToTask(issue, {
      extractionToggles: { includeSubtasks: true },
    });

    const meta = task.providerMetadata as Record<string, unknown>;
    expect(meta.subtasks).toBeUndefined();
    expect(meta.subtaskOf).toBeUndefined();
  });
});