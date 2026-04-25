import type { JiraApiClient } from './client.js';
import type { JiraSearchParams, JiraIssue, SearchAllOptions } from './types.js';
import { searchIssues } from './search.js';
import { PaginationBoundExceededError } from './errors.js';

const DEFAULT_MAX_TOTAL_RESULTS = 500;

export { PaginationBoundExceededError };

export async function searchAllIssues(
  client: JiraApiClient,
  params: JiraSearchParams,
  options: SearchAllOptions = {}
): Promise<JiraIssue[]> {
  const maxTotal = options.maxTotalResults ?? DEFAULT_MAX_TOTAL_RESULTS;
  if (maxTotal <= 0) {
    throw new PaginationBoundExceededError(
      `maxTotalResults must be positive, got ${maxTotal}`,
      maxTotal,
      0
    );
  }

  let startAt = params.startAt ?? 0;
  const maxResults = Math.min(params.maxResults ?? 100, 100);
  const allIssues: JiraIssue[] = [];
  let total = Infinity;

  while (allIssues.length < maxTotal) {
    const result = await searchIssues(client, { ...params, startAt, maxResults });

    total = result.total;
    allIssues.push(...result.issues);

    options.onProgress?.(allIssues.length, total);

    if (allIssues.length >= total || result.issues.length < maxResults) {
      break;
    }

    if (allIssues.length + maxResults > maxTotal) {
      const allowed = maxTotal - allIssues.length;
      if (allowed <= 0) break;

      const nextStartAt = startAt + maxResults;
      const boundResult = await searchIssues(client, { ...params, startAt: nextStartAt, maxResults: allowed });
      allIssues.push(...boundResult.issues);

      throw new PaginationBoundExceededError(
        `Pagination bound exceeded: ${maxTotal} max, ${total} found`,
        maxTotal,
        total
      );
    }

    startAt += maxResults;
  }

  return allIssues.slice(0, maxTotal);
}
