/**
 * Jira issue → markdown renderer
 *
 * Converts Jira-mapped Tasks (with providerMetadata) into human-readable
 * markdown files with YAML frontmatter. Stable per issue key.
 */
import type { Task } from '@srgnt/contracts';

// Frontmatter fields to always include
interface IssueFrontmatter {
  provider: string;
  provider_id: string;
  issue_key: string;
  project_key: string;
  source_url?: string;
  synced_at: string;
  issue_updated_at: string;
  status: string;
  priority: string;
  labels?: string[];
  is_archived: boolean;
  archived_reason?: string;
}

interface JiraProviderMetadata {
  rawStatus?: string;
  rawPriority?: string;
  projectId?: string;
  projectName?: string;
  issueType?: string;
  labels?: string[];
  fixVersions?: string[];
  comments?: { id: string; author: string; body: string; created: string }[];
  issueLinks?: {
    id: string;
    type: string;
    direction: 'outward' | 'inward';
    linkedIssueKey: string;
    linkedIssueSummary: string;
    linkedIssueStatus: string;
  }[];
  sprints?: {
    id: number;
    name: string;
    state: string;
    startDate: string;
    endDate: string;
  }[];
  worklogSummary?: {
    worklogSummaries: { id: string; author: string; timeSpent: string; started: string }[];
    totalTimeSpentSeconds: number;
  };
  attachments?: {
    id: string;
    filename: string;
    mimeType: string;
    size: number;
    created: string;
    author: string;
  }[];
  changelog?: {
    id: string;
    created: string;
    changes: { field: string; fromString: string | null; toString: string | null }[];
  }[];
  subtasks?: {
    id: string;
    key: string;
    summary: string;
    status: string;
  }[];
  subtaskOf?: {
    id: string;
    key: string;
    summary: string;
  };
}

export interface RenderOptions {
  /** URL base for the Jira instance */
  siteUrl?: string;
  /** Override the synced_at timestamp (default: now ISO) */
  syncedAt?: string;
  /** If true, mark the issue as archived in frontmatter and add a reason section */
  archived?: boolean;
  archivedReason?: string;
}

/**
 * Renders a Jira-mapped Task into markdown with YAML frontmatter.
 * Token is never written — no secret material enters the file.
 */
export function renderIssueMarkdown(task: Task, options: RenderOptions = {}): string {
  const meta = task.providerMetadata as JiraProviderMetadata;
  const syncedAt = options.syncedAt ?? new Date().toISOString();
  const isArchived = options.archived ?? false;

  // Build frontmatter
  const frontmatter: IssueFrontmatter = {
    provider: 'jira',
    provider_id: task.envelope.id,
    issue_key: task.envelope.providerId ?? 'UNKNOWN',
    project_key: task.project ?? 'UNKNOWN',
    source_url: options.siteUrl
      ? `${options.siteUrl}/browse/${task.envelope.providerId}`
      : '',
    synced_at: syncedAt,
    issue_updated_at: task.envelope.updatedAt ?? syncedAt,
    status: task.status ?? 'open',
    priority: task.priority ?? 'medium',
    labels: meta.labels ? [...meta.labels] : task.labels ? [...task.labels] : undefined,
    is_archived: isArchived,
    archived_reason: isArchived ? (options.archivedReason ?? 'left_scope') : undefined,
  };

  const fm = buildFrontmatter(frontmatter);
  const body = buildBody(task, meta);

  return fm + body;
}

function buildFrontmatter(data: IssueFrontmatter): string {
  const lines: string[] = ['---'];
  lines.push(`provider: ${data.provider}`);
  lines.push(`provider_id: ${data.provider_id}`);
  lines.push(`issue_key: ${data.issue_key}`);
  lines.push(`project_key: ${data.project_key}`);
  if (data.source_url) {
    lines.push(`source_url: ${data.source_url}`);
  }
  lines.push(`synced_at: ${data.synced_at}`);
  lines.push(`issue_updated_at: ${data.issue_updated_at}`);
  lines.push(`status: ${data.status}`);
  lines.push(`priority: ${data.priority}`);
  if (data.labels && data.labels.length > 0) {
    lines.push(`labels: [${data.labels.map((l) => `'${l}'`).join(', ')}]`);
  }
  lines.push(`is_archived: ${data.is_archived}`);
  if (data.archived_reason) {
    lines.push(`archived_reason: ${data.archived_reason}`);
  }
  lines.push('---');
  lines.push('');
  return lines.join('\n');
}

function buildBody(task: Task, meta: JiraProviderMetadata): string {
  const lines: string[] = [];

  // Title
  lines.push(`# ${task.title}`);
  lines.push('');

  // Description
  if (task.description) {
    lines.push('## Description');
    lines.push(task.description);
    lines.push('');
  }

  // Metadata section
  lines.push('## Metadata');
  lines.push(`- **Status**: ${meta.rawStatus ?? task.status ?? 'open'}`);
  lines.push(`- **Priority**: ${meta.rawPriority ?? task.priority ?? 'medium'}`);
  if (meta.issueType) {
    lines.push(`- **Type**: ${meta.issueType}`);
  }
  if (meta.projectName) {
    lines.push(`- **Project**: ${meta.projectName} (${task.project})`);
  }
  if (meta.fixVersions && meta.fixVersions.length > 0) {
    lines.push(`- **Fix Versions**: ${meta.fixVersions.join(', ')}`);
  }
  lines.push('');

  // Comments
  if (meta.comments && meta.comments.length > 0) {
    lines.push('## Comments');
    for (const c of meta.comments) {
      const date = new Date(c.created).toLocaleDateString();
      lines.push(`### ${c.author} — ${date}`);
      lines.push(c.body);
      lines.push('');
    }
  }

  // Issue links
  if (meta.issueLinks && meta.issueLinks.length > 0) {
    lines.push('## Issue Links');
    for (const link of meta.issueLinks) {
      const dir = link.direction === 'outward' ? '→' : '←';
      lines.push(`- ${link.type} ${dir} [${link.linkedIssueKey}](${link.linkedIssueStatus}): ${link.linkedIssueSummary}`);
    }
    lines.push('');
  }

  // Subtasks
  if (meta.subtasks && meta.subtasks.length > 0) {
    lines.push('## Subtasks');
    for (const st of meta.subtasks) {
      lines.push(`- [${st.key}] ${st.summary} (${st.status})`);
    }
    lines.push('');
  }

  // Parent reference
  if (meta.subtaskOf) {
    lines.push('## Parent');
    lines.push(`- Parent: [${meta.subtaskOf.key}](${meta.subtaskOf.summary})`);
    lines.push('');
  }

  // Sprints
  if (meta.sprints && meta.sprints.length > 0) {
    lines.push('## Sprints');
    for (const sp of meta.sprints) {
      const badge = sp.state === 'active' ? '🟢' : sp.state === 'closed' ? '🔴' : '⚪';
      lines.push(`- ${badge} ${sp.name} (${sp.state}) — ${sp.startDate} → ${sp.endDate}`);
    }
    lines.push('');
  }

  // Worklog summary
  if (meta.worklogSummary) {
    lines.push('## Worklog Summary');
    lines.push(`Total time: ${formatSeconds(meta.worklogSummary.totalTimeSpentSeconds)}`);
    if (meta.worklogSummary.worklogSummaries.length > 0) {
      lines.push('| Author | Time | Started |');
      lines.push('|--------|------|---------|');
      for (const w of meta.worklogSummary.worklogSummaries) {
        lines.push(`| ${w.author} | ${w.timeSpent} | ${w.started} |`);
      }
    }
    lines.push('');
  }

  // Attachments
  if (meta.attachments && meta.attachments.length > 0) {
    lines.push('## Attachments');
    for (const a of meta.attachments) {
      const size = formatBytes(a.size);
      lines.push(`- ${a.filename} (${a.mimeType}, ${size}) — ${a.author}, ${a.created}`);
    }
    lines.push('');
  }

  // Changelog summary
  if (meta.changelog && meta.changelog.length > 0) {
    lines.push('## Change History');
    for (const entry of meta.changelog) {
      lines.push(`### ${entry.created}`);
      for (const change of entry.changes) {
        const from = change.fromString ?? '(none)';
        const to = change.toString ?? '(none)';
        lines.push(`- **${change.field}**: ${from} → ${to}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

function formatSeconds(seconds: number): string {
  if (seconds < 3600) {
    return `${Math.round(seconds / 60)}m`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${Math.round(bytes / (1024 * 1024))}MB`;
}