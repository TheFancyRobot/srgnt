import type { Task, Person } from '@srgnt/contracts';
import type { ConnectorManifest } from '@srgnt/contracts';

export interface JiraIssue {
  id: string;
  key: string;
  summary: string;
  description: string;
  status: string;
  priority: string;
  assignee: string | null;
  created: string;
  updated: string;
}

export interface JiraFixture {
  issues: JiraIssue[];
  persons: { accountId: string; displayName: string; emailAddress: string }[];
}

export const jiraFixtures: JiraFixture = {
  issues: [
    {
      id: '10001',
      key: 'PROJ-123',
      summary: 'Implement user authentication',
      description: 'Add OAuth2 authentication flow',
      status: 'In Progress',
      priority: 'High',
      assignee: 'user1',
      created: '2024-03-01T10:00:00Z',
      updated: '2024-03-25T14:30:00Z',
    },
    {
      id: '10002',
      key: 'PROJ-124',
      summary: 'Add dashboard widget',
      description: 'Create a daily briefing widget',
      status: 'To Do',
      priority: 'Medium',
      assignee: 'user2',
      created: '2024-03-15T10:00:00Z',
      updated: '2024-03-20T10:00:00Z',
    },
    {
      id: '10003',
      key: 'PROJ-125',
      summary: 'Fix login bug',
      description: 'Users cannot login with SSO',
      status: 'Done',
      priority: 'Critical',
      assignee: 'user1',
      created: '2024-03-10T10:00:00Z',
      updated: '2024-03-22T16:00:00Z',
    },
  ],
  persons: [
    { accountId: 'user1', displayName: 'Alice Engineer', emailAddress: 'alice@example.com' },
    { accountId: 'user2', displayName: 'Bob Designer', emailAddress: 'bob@example.com' },
  ],
};

function mapJiraIssueToTask(issue: JiraIssue): Task {
  const statusMap: Record<string, Task['status']> = {
    'To Do': 'open',
    'In Progress': 'in_progress',
    Done: 'done',
  };

  const priorityMap: Record<string, Task['priority']> = {
    Critical: 'critical',
    High: 'high',
    Medium: 'medium',
    Low: 'low',
  };

  return {
    envelope: {
      id: `jira-${issue.id}`,
      canonicalType: 'Task',
      provider: 'jira',
      providerId: issue.key,
      createdAt: issue.created,
      updatedAt: issue.updated,
    },
    title: issue.summary,
    description: issue.description,
    status: statusMap[issue.status] || 'open',
    priority: priorityMap[issue.priority] || 'medium',
    assignee: issue.assignee || undefined,
    project: issue.key.split('-')[0],
    providerMetadata: {
      rawStatus: issue.status,
    },
  };
}

function mapJiraPersonToPerson(jiraPerson: { accountId: string; displayName: string; emailAddress: string }): Person {
  return {
    envelope: {
      id: `jira-person-${jiraPerson.accountId}`,
      canonicalType: 'Person',
      provider: 'jira',
      providerId: jiraPerson.accountId,
    },
    name: jiraPerson.displayName,
    email: jiraPerson.emailAddress,
  };
}

export function loadJiraFixtures(): { tasks: Task[]; persons: Person[] } {
  return {
    tasks: jiraFixtures.issues.map(mapJiraIssueToTask),
    persons: jiraFixtures.persons.map(mapJiraPersonToPerson),
  };
}

export const jiraConnectorManifest: ConnectorManifest = {
  id: 'jira',
  name: 'Jira',
  version: '0.1.0',
  description: 'Atlassian Jira connector for issue tracking',
  provider: 'atlassian',
  authType: 'oauth2',
  config: {
    authType: 'oauth2',
    timeout: 30000,
    retryAttempts: 3,
  },
  capabilities: [
    {
      capability: 'read',
      supportedOperations: ['getIssue', 'searchIssues', 'getProjects'],
      entityMappings: [
        { canonicalType: 'Task', providerType: 'Issue' },
      ],
    },
    {
      capability: 'write',
      supportedOperations: ['transitionIssue', 'addComment'],
      entityMappings: [
        { canonicalType: 'Task', providerType: 'Issue' },
      ],
    },
  ],
  entityTypes: ['Task', 'Person'],
  freshnessThresholdMs: 300000,
  metadata: {},
};

export { mapJiraIssueToTask, mapJiraPersonToPerson };