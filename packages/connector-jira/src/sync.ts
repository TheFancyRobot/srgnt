/**
 * Jira sync orchestration
 *
 * Coordinates credential validation, API fetching, mapping, and result assembly.
 * Fails closed on missing credentials or invalid settings before any network work.
 */
import type { JiraConnectorSettings, JiraExtractionToggles, Task } from '@srgnt/contracts';
import { createJiraApiClient } from './api/client.js';
import { searchAllIssues } from './api/search.js';
import type { JiraIssue } from './api/types.js';
import { mapJiraIssueToTask } from './mappers/issue.js';

export interface JiraSyncStats {
  pagesFetched: number;
  totalIssuesFound: number;
  issuesProcessed: number;
  durationMs: number;
}

export interface JiraSyncResult {
  success: boolean;
  entitiesAdded: number;
  entitiesUpdated: number;
  entitiesRemoved: number;
  errors: JiraSyncError[];
  syncStats: JiraSyncStats;
  /** Tasks mapped from Jira issues — pass to persistence layer */
  tasks: Task[];
}

export interface JiraSyncOptions {
  settings: JiraConnectorSettings;
  token: string;
  extractionToggles?: Partial<JiraExtractionToggles>;
  maxTotalResults?: number;
  onProgress?: (fetched: number, total: number) => void;
  signal?: AbortSignal;
}

export class JiraSyncError extends Error {
  constructor(
    message: string,
    public readonly phase: 'validation' | 'fetch' | 'map' | 'unknown',
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'JiraSyncError';
  }
}

export class CredentialMissingError extends JiraSyncError {
  constructor(field: string) {
    super(`Credential missing: ${field}`, 'validation');
  }
}

function validateSettings(settings: JiraConnectorSettings, token: string): void {
  if (!settings.siteUrl || !settings.siteUrl.trim()) {
    throw new CredentialMissingError('siteUrl');
  }
  if (!settings.accountEmail || !settings.accountEmail.trim()) {
    throw new CredentialMissingError('accountEmail');
  }
  if (!token || !token.trim()) {
    throw new CredentialMissingError('token');
  }

  // Validate JQL scope
  if (settings.scopeMode === 'jql' && (!settings.jql || !settings.jql.trim())) {
    throw new JiraSyncError('JQL scope mode requires a non-empty JQL query', 'validation');
  }
  if (settings.scopeMode !== 'jql' && (!settings.projectKeys || settings.projectKeys.length === 0)) {
    throw new JiraSyncError('Project scope mode requires at least one project key', 'validation');
  }
}

function buildJql(settings: JiraConnectorSettings): string {
  if (settings.scopeMode === 'jql') {
    return settings.jql!;
  }

  // Project mode: build JQL from project keys
  const projectList = settings.projectKeys.join(', ');
  return `project IN (${projectList}) ORDER BY updated DESC`;
}

export async function syncJira(options: JiraSyncOptions): Promise<JiraSyncResult> {
  const startTime = Date.now();
  const errors: JiraSyncError[] = [];
  let pagesFetched = 0;
  let totalIssuesFound = 0;
  let issuesProcessed = 0;

  // Fail closed on credential issues before any network work
  try {
    validateSettings(options.settings, options.token);
  } catch (e) {
    return {
      success: false,
      entitiesAdded: 0,
      entitiesUpdated: 0,
      entitiesRemoved: 0,
      errors: [e as JiraSyncError],
      tasks: [],
      syncStats: {
        pagesFetched: 0,
        totalIssuesFound: 0,
        issuesProcessed: 0,
        durationMs: Date.now() - startTime,
      },
    };
  }

  let client;
  try {
    client = createJiraApiClient(options.settings, options.token);
  } catch (e) {
    return {
      success: false,
      entitiesAdded: 0,
      entitiesUpdated: 0,
      entitiesRemoved: 0,
      errors: [new JiraSyncError('Failed to create API client', 'validation', e)],
      tasks: [],
      syncStats: {
        pagesFetched: 0,
        totalIssuesFound: 0,
        issuesProcessed: 0,
        durationMs: Date.now() - startTime,
      },
    };
  }

  const jql = buildJql(options.settings);
  const extractionToggles = options.extractionToggles ?? {};

  let tasks: Task[] = [];

  try {
    const issues = await searchAllIssues(
      client,
      { jql, startAt: 0, maxResults: 100 },
      {
        maxTotalResults: options.maxTotalResults ?? 500,
        onProgress: (fetched: number, total: number) => {
          pagesFetched++;
          totalIssuesFound = total;
          options.onProgress?.(fetched, total);
        },
      }
    );

    issuesProcessed = issues.length;

    // Map each issue to Task, filtering out nulls
    tasks = issues
      .map((issue: JiraIssue) => {
        try {
          return mapJiraIssueToTask(issue, { extractionToggles });
        } catch (e) {
          errors.push(new JiraSyncError(`Failed to map issue ${issue.key}`, 'map', e));
          return null;
        }
      })
      .filter((t: Task | null): t is Task => t !== null);
  } catch (e) {
    errors.push(
      e instanceof JiraSyncError
        ? e
        : new JiraSyncError('Search failed', 'fetch', e)
    );
  }

  return {
    success: errors.length === 0,
    entitiesAdded: tasks.length,
    entitiesUpdated: 0,
    entitiesRemoved: 0,
    errors,
    tasks,
    syncStats: {
      pagesFetched,
      totalIssuesFound,
      issuesProcessed,
      durationMs: Date.now() - startTime,
    },
  };
}