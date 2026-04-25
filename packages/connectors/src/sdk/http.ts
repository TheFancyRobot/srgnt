/**
 * Shared HTTP utilities for connector packages
 *
 * Generic request/timeout/retry layer that any connector HTTP client can delegate to.
 * No auth-specific logic — each connector provides its own headers/auth.
 */
export interface HttpClientOptions {
  baseUrl: string;
  requestTimeout?: number;
  maxRetries?: number;
}

export interface HttpRequestOptions {
  method: string;
  path: string;
  body?: unknown;
  params?: Record<string, string>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export interface HttpResponse<T> {
  status: number;
  statusText: string;
  data: T;
  headers: Record<string, string>;
}

export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly statusText: string,
    public readonly isRetryable: boolean,
    public readonly responseBody?: unknown
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

function parseResponseHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

function parseJsonBody(text: string): unknown {
  return text ? JSON.parse(text) : undefined;
}

export abstract class HttpClient {
  protected readonly baseUrl: string;
  protected readonly requestTimeout: number;
  protected readonly maxRetries: number;

  constructor(options: HttpClientOptions) {
    if (!options.baseUrl || !options.baseUrl.trim()) {
      throw new Error('baseUrl is required');
    }
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.requestTimeout = options.requestTimeout ?? 30000;
    this.maxRetries = options.maxRetries ?? 3;
  }

  /** Override to provide authentication headers — called per request */
  protected abstract buildHeaders(): Record<string, string>;

  /** Override to classify/enhance errors — called on non-2xx responses */
  protected abstract classifyError(response: Response, body: unknown): HttpError;

  protected async request<T>(options: HttpRequestOptions): Promise<HttpResponse<T>> {
    const { method, path, body, params, signal } = options;
    let url = `${this.baseUrl}${path}`;

    if (params) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }

    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...this.buildHeaders(),
      ...options.headers,
    };

    let lastError: HttpError | undefined;
    let attempt = 0;

    while (attempt <= this.maxRetries) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

      try {
        const response = await fetch(url, {
          method,
          headers,
          body: body !== undefined ? JSON.stringify(body) : undefined,
          signal: signal ?? controller.signal,
        });

        clearTimeout(timeoutId);

        const responseHeaders = parseResponseHeaders(response.headers);

        if (response.ok) {
          const text = await response.text();
          return {
            status: response.status,
            statusText: response.statusText,
            data: parseJsonBody(text) as T,
            headers: responseHeaders,
          };
        }

        // Parse error body before throwing
        let errorBody: unknown;
        try {
          const errorText = await response.text();
          errorBody = parseJsonBody(errorText);
        } catch {
          errorBody = undefined;
        }

        const httpError = this.classifyError(response, errorBody);

        // Non-retryable: 4xx
        if (!httpError.isRetryable) {
          throw httpError;
        }

        lastError = httpError;
      } catch (e) {
        clearTimeout(timeoutId);

        if (e instanceof HttpError && !e.isRetryable) {
          throw e;
        }

        // Network/timeout errors are retryable
        const err = e instanceof Error ? e : new Error(String(e));
        lastError = new HttpError(err.message, 0, 'Network Error', true);
      }

      attempt++;
      if (attempt <= this.maxRetries && lastError?.isRetryable) {
        await new Promise((r) => setTimeout(r, 100 * attempt));
      }
    }

    throw lastError ?? new HttpError('Request failed after all retries', 0, 'Unknown', false);
  }

  protected async get<T>(path: string, options?: Omit<HttpRequestOptions, 'method' | 'path'>): Promise<HttpResponse<T>> {
    return this.request<T>({ method: 'GET', path, ...options });
  }

  protected async post<T>(path: string, body: unknown, options?: Omit<HttpRequestOptions, 'method' | 'path' | 'body'>): Promise<HttpResponse<T>> {
    return this.request<T>({ method: 'POST', path, body, ...options });
  }

  protected async put<T>(path: string, body: unknown, options?: Omit<HttpRequestOptions, 'method' | 'path' | 'body'>): Promise<HttpResponse<T>> {
    return this.request<T>({ method: 'PUT', path, body, ...options });
  }

  protected async delete<T>(path: string, options?: Omit<HttpRequestOptions, 'method' | 'path'>): Promise<HttpResponse<T>> {
    return this.request<T>({ method: 'DELETE', path, ...options });
  }
}

/** Creates an AbortSignal that combines user signal + timeout */
export function withTimeout(timeoutMs: number, signal?: AbortSignal): AbortSignal {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  if (signal) {
    signal.addEventListener('abort', () => {
      clearTimeout(timeoutId);
      controller.abort();
    });
  }

  return controller.signal;
}