/**
 * Tests for Jira markdown rendering
 */
import { describe, it, expect } from 'vitest';
import { renderIssueMarkdown } from './markdown.js';
import type { Task } from '@srgnt/contracts';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    envelope: {
      id: 'jira-10001',
      canonicalType: 'Task',
      provider: 'jira',
      providerId: 'PROJ-123',
      createdAt: '2024-03-01T10:00:00Z',
      updatedAt: '2024-03-25T14:30:00Z',
    },
    title: 'Implement user authentication',
    description: 'Add OAuth2 authentication flow',
    status: 'in_progress',
    priority: 'high',
    project: 'PROJ',
    providerMetadata: {},
    ...overrides,
  } as Task;
}

describe('renderIssueMarkdown', () => {
  it('produces valid frontmatter with required fields', () => {
    const task = makeTask();
    const md = renderIssueMarkdown(task);

    expect(md).toContain('---');
    expect(md).toContain('provider: jira');
    expect(md).toContain('issue_key: PROJ-123');
    expect(md).toContain('project_key: PROJ');
    expect(md).toContain('synced_at:');
    expect(md).toContain('status: in_progress');
    expect(md).toContain('priority: high');
    expect(md).toContain('is_archived: false');
  });

  it('includes source_url when siteUrl is provided', () => {
    const task = makeTask();
    const md = renderIssueMarkdown(task, { siteUrl: 'https://example.atlassian.net' });

    expect(md).toContain('source_url: https://example.atlassian.net/browse/PROJ-123');
  });

  it('omits source_url when siteUrl is not provided', () => {
    const task = makeTask();
    const md = renderIssueMarkdown(task);

    expect(md).not.toContain('source_url:');
  });

  it('renders task title as h1', () => {
    const task = makeTask({ title: 'My Issue Title' });
    const md = renderIssueMarkdown(task);

    expect(md).toContain('# My Issue Title');
  });

  it('renders description section when description is present', () => {
    const task = makeTask({ description: 'This is the description' });
    const md = renderIssueMarkdown(task);

    expect(md).toContain('## Description');
    expect(md).toContain('This is the description');
  });

  it('skips description section when description is empty', () => {
    const task = makeTask({ description: undefined });
    const md = renderIssueMarkdown(task);

    expect(md).not.toContain('## Description');
  });

  it('includes comments when in providerMetadata', () => {
    const task = makeTask({
      providerMetadata: {
        comments: [
          { id: 'c1', author: 'Alice', body: 'Looks good', created: '2024-03-01T10:00:00Z' },
        ],
      },
    });
    const md = renderIssueMarkdown(task, { extractionToggles: { includeComments: true } } as Parameters<typeof renderIssueMarkdown>[1]);

    expect(md).toContain('## Comments');
    expect(md).toContain('Alice');
    expect(md).toContain('Looks good');
  });

  it('includes issue links when in providerMetadata', () => {
    const task = makeTask({
      providerMetadata: {
        issueLinks: [
          {
            id: 'link1', type: 'Blocks', direction: 'outward',
            linkedIssueKey: 'PROJ-456', linkedIssueSummary: 'Blocked issue', linkedIssueStatus: 'Open',
          },
        ],
      },
    } as Partial<Task>);
    const md = renderIssueMarkdown(task, { extractionToggles: { includeIssueLinks: true } } as Parameters<typeof renderIssueMarkdown>[1]);

    expect(md).toContain('## Issue Links');
    expect(md).toContain('Blocks');
    expect(md).toContain('PROJ-456');
  });

  it('includes subtasks when in providerMetadata', () => {
    const task = makeTask({
      providerMetadata: {
        subtasks: [
          { id: '10010', key: 'PROJ-200', summary: 'Subtask 1', status: 'To Do' },
          { id: '10011', key: 'PROJ-201', summary: 'Subtask 2', status: 'In Progress' },
        ],
      },
    } as Partial<Task>);
    const md = renderIssueMarkdown(task, { extractionToggles: { includeSubtasks: true } } as Parameters<typeof renderIssueMarkdown>[1]);

    expect(md).toContain('## Subtasks');
    expect(md).toContain('PROJ-200');
    expect(md).toContain('Subtask 1');
    expect(md).toContain('PROJ-201');
  });

  it('marks archived issues correctly', () => {
    const task = makeTask();
    const md = renderIssueMarkdown(task, { archived: true, archivedReason: 'left_scope' });

    expect(md).toContain('is_archived: true');
    expect(md).toContain('archived_reason: left_scope');
  });

  it('never includes token in output', () => {
    const task = makeTask({ providerMetadata: { rawToken: 'secret-token' } as Record<string, unknown> });
    const md = renderIssueMarkdown(task);

    expect(md).not.toContain('secret-token');
    expect(md).not.toContain('token');
    expect(md).not.toContain('api_key');
  });

  it('renders sprint data when present', () => {
    const task = makeTask({
      providerMetadata: {
        sprints: [
          { id: 1, name: 'Sprint 5', state: 'active', startDate: '2024-03-01', endDate: '2024-03-15' },
        ],
      },
    } as Partial<Task>);
    const md = renderIssueMarkdown(task, { extractionToggles: { includeSprintData: true } } as Parameters<typeof renderIssueMarkdown>[1]);

    expect(md).toContain('## Sprints');
    expect(md).toContain('Sprint 5');
    expect(md).toContain('active');
  });

  it('renders worklog summary when present', () => {
    const task = makeTask({
      providerMetadata: {
        worklogSummary: {
          worklogSummaries: [
            { id: 'w1', author: 'Bob', timeSpent: '3h 30m', started: '2024-03-01' },
          ],
          totalTimeSpentSeconds: 12600,
        },
      },
    } as Partial<Task>);
    const md = renderIssueMarkdown(task, { extractionToggles: { includeWorklogSummary: true } } as Parameters<typeof renderIssueMarkdown>[1]);

    expect(md).toContain('## Worklog Summary');
    expect(md).toContain('3h 30m');
    expect(md).toContain('Bob');
  });

  it('renders attachment metadata when present', () => {
    const task = makeTask({
      providerMetadata: {
        attachments: [
          { id: 'a1', filename: 'design.png', mimeType: 'image/png', size: 102400, created: '2024-03-01', author: 'Alice' },
        ],
      },
    } as Partial<Task>);
    const md = renderIssueMarkdown(task, { extractionToggles: { includeAttachmentMetadata: true } } as Parameters<typeof renderIssueMarkdown>[1]);

    expect(md).toContain('## Attachments');
    expect(md).toContain('design.png');
    expect(md).toContain('100KB');
  });
});