/**
 * Re-export barrel from @srgnt/jira-client for backward compatibility.
 *
 * Consumers within connector-jira can import from './api/index.js' or the
 * specific sub-modules; all symbols originate from the jira-client package.
 */
export type * from '@srgnt/jira-client/api/types';
export { JiraApiError, PaginationBoundExceededError } from '@srgnt/jira-client/api/errors';
export { JiraApiClient, createJiraApiClient, type JiraApiClientOptions } from '@srgnt/jira-client/api/client';
export { searchIssues, DEFAULT_MAX_RESULTS, DEFAULT_MAX_TOTAL_RESULTS, DEFAULT_FIELDS } from '@srgnt/jira-client/api/search';
export { searchAllIssues } from '@srgnt/jira-client/api/pagination';
