/**
 * Jira search API with bounded pagination
 */
import type { JiraApiClient } from './client.js';
import type {
  JiraSearchParams,
  JiraSearchResult,
} from './types.js';

const DEFAULT_MAX_RESULTS = 100;
const DEFAULT_MAX_TOTAL_RESULTS = 500;
const DEFAULT_FIELDS = [
  'summary', 'description', 'status', 'priority', 'assignee',
  'created', 'updated', 'comment', 'issuelinks', 'subtask',
  'parent', 'subtasks', 'sprint', 'closedSprints', 'worklog', 'attachment',
  'changelog', 'project', 'issuetype', 'labels', 'fixVersions',
].join(',');

function validateJql(jql: string): void {
  if (!jql || !jql.trim()) {
    throw new Error('JQL query is required');
  }
}

export { DEFAULT_MAX_RESULTS, DEFAULT_MAX_TOTAL_RESULTS, DEFAULT_FIELDS };

export async function searchIssues(
  client: JiraApiClient,
  params: JiraSearchParams
): Promise<JiraSearchResult> {
  validateJql(params.jql);

  const query: Record<string, string> = {
    jql: params.jql,
    fields: params.fields?.join(',') ?? DEFAULT_FIELDS,
    startAt: String(params.startAt ?? 0),
    maxResults: String(Math.min(params.maxResults ?? DEFAULT_MAX_RESULTS, 100)),
  };

  if (params.expand) {
    query.expand = params.expand.join(',');
  }

  const result = await client.get<JiraSearchResult>('/rest/api/3/search', { params: query });
  return result;
}
