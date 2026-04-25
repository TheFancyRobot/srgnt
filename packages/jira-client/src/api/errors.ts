import { HttpError } from '@srgnt/connectors';

export class JiraApiError extends HttpError {
  constructor(
    message: string,
    status: number,
    statusText: string,
    public readonly atlassianErrorCode?: string,
    public readonly atlassianErrorMessage?: string,
    isRetryable?: boolean,
    responseBody?: unknown
  ) {
    super(message, status, statusText, isRetryable ?? status >= 500, responseBody);
    this.name = 'JiraApiError';
  }
}

export class PaginationBoundExceededError extends Error {
  constructor(
    message: string,
    public readonly maxTotalResults: number,
    public readonly totalFound: number
  ) {
    super(message);
    this.name = 'PaginationBoundExceededError';
  }
}
