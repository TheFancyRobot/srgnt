/**
 * Jira REST API HTTP client
 *
 * Delegates to shared HttpClient for generic request/timeout/retry logic.
 * Owns only Jira-specific: Basic auth construction and Jira error parsing.
 */
import { HttpClient, HttpError } from '@srgnt/connectors';
import type { JiraConnectorSettings } from '@srgnt/contracts';
import { JiraApiError } from './errors.js';

export interface JiraApiClientOptions {
  baseUrl: string;
  email: string;
  token: string;
  requestTimeout?: number;
  maxRetries?: number;
}

interface JiraErrorBody {
  errorMessages?: string[];
  errors?: Record<string, string>;
  errorCode?: string;
  message?: string;
}

export class JiraApiClient extends HttpClient {
  private readonly email: string;
  private readonly token: string;

  constructor(options: JiraApiClientOptions) {
    if (!options.email || !options.email.trim()) {
      throw new JiraApiError('Jira account email is required', 0, 'Configuration Error');
    }
    if (!options.token || !options.token.trim()) {
      throw new JiraApiError('Jira API token is required', 0, 'Configuration Error');
    }

    super({
      baseUrl: options.baseUrl,
      requestTimeout: options.requestTimeout ?? 30000,
      maxRetries: options.maxRetries ?? 3,
    });

    this.email = options.email;
    this.token = options.token;
  }

  protected buildHeaders(): Record<string, string> {
    const encoded = btoa(`${this.email}:${this.token}`);
    return { 'Authorization': `Basic ${encoded}` };
  }

  protected classifyError(response: Response, body: unknown): HttpError {
    const status = response.status;
    const statusText = response.statusText;

    let atlassianErrorCode: string | undefined;
    let atlassianErrorMessage: string | undefined;

    if (body && typeof body === 'object') {
      const eb = body as JiraErrorBody;
      atlassianErrorCode = eb.errorCode ?? eb.errorMessages?.[0];
      atlassianErrorMessage = eb.message ?? Object.values(eb.errors ?? {})[0];
    }

    const isRetryable = status >= 500 || status === 0;
    const message = atlassianErrorMessage
      ? `Jira API error: ${atlassianErrorMessage}`
      : `Jira API error: ${status} ${statusText}`;

    return new JiraApiError(
      message,
      status,
      statusText,
      atlassianErrorCode,
      atlassianErrorMessage,
      isRetryable,
      body
    );
  }

  async get<T>(path: string, options?: { params?: Record<string, string>; signal?: AbortSignal; headers?: Record<string, string> }): Promise<T> {
    const response = await super.get<T>(path, options);
    return response.data;
  }

  async post<T>(path: string, body: unknown, options?: { params?: Record<string, string>; signal?: AbortSignal; headers?: Record<string, string> }): Promise<T> {
    const response = await super.post<T>(path, body, options);
    return response.data;
  }

  async put<T>(path: string, body: unknown, options?: { params?: Record<string, string>; signal?: AbortSignal; headers?: Record<string, string> }): Promise<T> {
    const response = await super.put<T>(path, body, options);
    return response.data;
  }

  async delete<T>(path: string, options?: { params?: Record<string, string>; signal?: AbortSignal; headers?: Record<string, string> }): Promise<T> {
    const response = await super.delete<T>(path, options);
    return response.data;
  }
}

export function createJiraApiClient(settings: JiraConnectorSettings, token: string): JiraApiClient {
  if (!settings.siteUrl || !settings.siteUrl.trim()) {
    throw new JiraApiError('Jira site URL is required', 0, 'Configuration Error');
  }
  return new JiraApiClient({
    baseUrl: settings.siteUrl,
    email: settings.accountEmail,
    token,
    requestTimeout: 30000,
    maxRetries: 3,
  });
}
