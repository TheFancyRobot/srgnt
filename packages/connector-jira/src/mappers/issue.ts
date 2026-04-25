/**
 * Jira issue → srgnt canonical entity mappers
 *
 * Maps Jira REST API responses to internal srgnt canonical types.
 * Extra linked data (comments, links, sprints, etc.) is preserved in providerMetadata
 * since the canonical Task model is lossy for these fields.
 */
import type { Task, Person } from '@srgnt/contracts';
import type {
  JiraIssue,
  JiraComment,
  JiraIssueLink,
  JiraSprint,
  JiraWorklog,
  JiraAttachment,
  JiraChangelog,
} from '../api/types.js';
import type { JiraExtractionToggles } from '@srgnt/contracts';

export interface JiraIssueMappingOptions {
  extractionToggles: Partial<JiraExtractionToggles>;
}

interface CanonicalStatusMap {
  [key: string]: Task['status'];
}

const STATUS_MAP: CanonicalStatusMap = {
  'To Do': 'open',
  'In Progress': 'in_progress',
  'Done': 'done',
  'Open': 'open',
  'Closed': 'done',
};

interface CanonicalPriorityMap {
  [key: string]: Task['priority'];
}

const PRIORITY_MAP: CanonicalPriorityMap = {
  'Highest': 'critical',
  'High': 'high',
  'Medium': 'medium',
  'Low': 'low',
  'Lowest': 'low',
  'Critical': 'critical',
};

function mapStatus(statusName: string): Task['status'] {
  return STATUS_MAP[statusName] ?? 'open';
}

function mapPriority(priorityName: string): Task['priority'] {
  return PRIORITY_MAP[priorityName] ?? 'medium';
}

export interface MappedComments {
  comments: {
    id: string;
    author: string;
    body: string;
    created: string;
  }[];
}

export interface MappedIssueLinks {
  links: {
    id: string;
    type: string;
    direction: 'outward' | 'inward';
    linkedIssueKey: string;
    linkedIssueSummary: string;
    linkedIssueStatus: string;
  }[];
}

export interface MappedSubtasks {
  subtasks: {
    id: string;
    key: string;
    summary: string;
    status: string;
  }[];
}

export interface MappedSprints {
  sprints: {
    id: number;
    name: string;
    state: string;
    startDate: string;
    endDate: string;
  }[];
}

export interface MappedWorklogSummary {
  worklogSummaries: {
    id: string;
    author: string;
    timeSpent: string;
    started: string;
  }[];
  totalTimeSpentSeconds: number;
}

export interface MappedAttachmentMetadata {
  attachments: {
    id: string;
    filename: string;
    mimeType: string;
    size: number;
    created: string;
    author: string;
  }[];
}

export interface MappedChangelogSummary {
  changelog: {
    id: string;
    created: string;
    changes: { field: string; fromString: string | null; toString: string | null }[];
  }[];
}

export function mapJiraCommentToComment(comment: JiraComment) {
  return {
    id: comment.id,
    author: comment.author.displayName,
    body: comment.body,
    created: comment.created,
  };
}

export function mapJiraIssueLinkToLink(link: JiraIssueLink) {
  const result: MappedIssueLinks['links'][0] = {
    id: link.id,
    type: link.type.name,
    direction: link.outwardIssue ? 'outward' : 'inward',
    linkedIssueKey: link.outwardIssue?.key ?? link.inwardIssue?.key ?? '',
    linkedIssueSummary: link.outwardIssue?.fields.summary ?? link.inwardIssue?.fields.summary ?? '',
    linkedIssueStatus: link.outwardIssue?.fields.status.name ?? link.inwardIssue?.fields.status.name ?? '',
  };
  return result;
}

export function mapJiraSubtaskToSubtask(subtask: { id: string; key: string; fields: { summary: string; status: { name: string } } }) {
  return {
    id: subtask.id,
    key: subtask.key,
    summary: subtask.fields.summary,
    status: subtask.fields.status.name,
  };
}

export function mapJiraSprintToSprint(sprint: JiraSprint) {
  return {
    id: sprint.id,
    name: sprint.name,
    state: sprint.state,
    startDate: sprint.startDate,
    endDate: sprint.endDate,
  };
}

export function mapJiraWorklogToWorklogSummary(worklog: JiraWorklog): MappedWorklogSummary['worklogSummaries'][0] {
  return {
    id: worklog.id,
    author: worklog.author.displayName,
    timeSpent: worklog.timeSpent,
    started: worklog.started,
  };
}

export function mapJiraAttachmentToAttachmentMetadata(attachment: JiraAttachment): MappedAttachmentMetadata['attachments'][0] {
  return {
    id: attachment.id,
    filename: attachment.filename,
    mimeType: attachment.mimeType,
    size: attachment.size,
    created: attachment.created,
    author: attachment.author.displayName,
  };
}

export function mapJiraChangelogToChangelogSummary(changelog: JiraChangelog): MappedChangelogSummary['changelog'][0] {
  return {
    id: changelog.id,
    created: changelog.created,
    changes: changelog.items.map((item: JiraChangelog['items'][number]) => ({
      field: item.field,
      fromString: item.fromString,
      toString: item.toString,
    })),
  };
}

export function mapJiraIssueToTask(
  issue: JiraIssue,
  options?: JiraIssueMappingOptions
): Task {
  const fields = issue.fields;
  const toggles = options?.extractionToggles ?? {};

  // Build extra data object based on toggles
  const extraData: Record<string, unknown> = {};

  if (toggles.includeComments && fields.comment) {
    extraData.comments = fields.comment.comments.map(mapJiraCommentToComment);
  }

  if (toggles.includeIssueLinks && fields.issuelinks) {
    extraData.issueLinks = fields.issuelinks.map(mapJiraIssueLinkToLink);
  }

  // Extract child subtasks for parent issues when toggle is enabled
  if (toggles.includeSubtasks && fields.subtasks && fields.subtasks.length > 0) {
    extraData.subtasks = fields.subtasks.map(mapJiraSubtaskToSubtask);
  }

  // Mark current issue as a subtask of its parent (not children, that's handled above)
  if (fields.subtask && fields.parent) {
    extraData.subtaskOf = {
      id: fields.parent.id,
      key: fields.parent.key,
      summary: fields.parent.fields.summary,
    };
  }

  if (toggles.includeSprintData) {
    const sprints: MappedSprints['sprints'] = [];
    if (fields.sprint) {
      sprints.push(mapJiraSprintToSprint(fields.sprint));
    }
    if (fields.closedSprints) {
      sprints.push(...fields.closedSprints.map(mapJiraSprintToSprint));
    }
    if (sprints.length > 0) {
      extraData.sprints = sprints;
    }
  }

  if (toggles.includeWorklogSummary && fields.worklog) {
    const summaries = fields.worklog.worklogs.map(mapJiraWorklogToWorklogSummary);
    const totalSeconds = fields.worklog.worklogs.reduce((sum: number, w: JiraWorklog) => sum + w.timeSpentSeconds, 0);
    extraData.worklogSummary = {
      worklogSummaries: summaries,
      totalTimeSpentSeconds: totalSeconds,
    };
  }

  if (toggles.includeAttachmentMetadata && fields.attachment) {
    extraData.attachments = fields.attachment.map(mapJiraAttachmentToAttachmentMetadata);
  }

  if (toggles.includeChangelogSummary && fields.changelog) {
    extraData.changelog = fields.changelog.entries.map(mapJiraChangelogToChangelogSummary);
  }

  return {
    envelope: {
      id: `jira-${issue.id}`,
      canonicalType: 'Task',
      provider: 'jira',
      providerId: issue.key,
      createdAt: fields.created,
      updatedAt: fields.updated,
    },
    title: fields.summary,
    description: fields.description ?? '',
    status: mapStatus(fields.status.name),
    priority: mapPriority(fields.priority.name),
    assignee: fields.assignee?.displayName ?? undefined,
    project: fields.project.key,
    providerMetadata: {
      rawStatus: fields.status.name,
      rawPriority: fields.priority.name,
      projectId: fields.project.id,
      projectName: fields.project.name,
      issueType: fields.issuetype.name,
      labels: fields.labels,
      fixVersions: fields.fixVersions.map((v: JiraIssue['fields']['fixVersions'][number]) => v.name),
      ...extraData,
    },
  };
}

export function mapJiraPersonToPerson(jiraPerson: { accountId: string; displayName: string; emailAddress: string }): Person {
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
