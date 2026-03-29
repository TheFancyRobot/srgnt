import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export interface CrashReport {
  date: string;
  type: 'uncaughtException' | 'unhandledRejection' | 'diagnostic';
  message: string;
  stack?: string;
  metadata?: Record<string, unknown>;
}

export interface CrashReporter {
  start(): void;
  stop(): void;
  getLastCrashReport(): CrashReport | null;
  setOptOut(optOut: boolean): void;
  setWorkspaceRoot(workspaceRoot: string): void;
  setCrashDirectory(crashDirectory: string): void;
  writeCrashReport(type: CrashReport['type'], error: unknown, metadata?: Record<string, unknown>): Promise<CrashReport>;
}

export interface TelemetryEvent {
  name: string;
  properties: Record<string, unknown>;
  timestamp: Date;
}

export interface TelemetryPolicy {
  enabled: boolean;
  redactPatterns: RegExp[];
  samplingRate: number;
}

const DEFAULT_MAX_CRASH_REPORTS = 10;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const UNIX_PATH_PATTERN = /(^|[\s([{'"=])((?:\/[^\s\])}'":]+)+)/g;
const WINDOWS_PATH_PATTERN = /(^|[\s([{'"=])([A-Za-z]:\\[^\s\])}'":]+)/g;
const SECRET_VALUE_PATTERNS = [
  /(token|password|secret|api[_-]?key|bearer|authorization)\s*[:=]\s*[^\s,;]+/gi,
  /(oauth[_-]?callback|refresh[_-]?token|access[_-]?token)\s*[:=]\s*[^\s,;]+/gi,
];

function normalizeError(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return {
      message: error.message || error.name,
      stack: error.stack,
    };
  }

  return {
    message: typeof error === 'string' ? error : JSON.stringify(error),
  };
}

function redactString(value: string, workspaceRoot?: string): string {
  let redacted = value;

  if (workspaceRoot) {
    const escaped = escapeRegExp(workspaceRoot);
    redacted = redacted.replace(new RegExp(escaped, 'gi'), '[workspace-root]');
  }

  redacted = redacted.replace(EMAIL_PATTERN, '[redacted-email]');
  redacted = redacted.replace(UNIX_PATH_PATTERN, (_match, prefix: string) => `${prefix}[redacted-path]`);
  redacted = redacted.replace(WINDOWS_PATH_PATTERN, (_match, prefix: string) => `${prefix}[redacted-path]`);

  for (const pattern of SECRET_VALUE_PATTERNS) {
    redacted = redacted.replace(pattern, (_match, label: string) => `${label}=[redacted]`);
  }

  return redacted;
}

export function redactPayload<T>(value: T, workspaceRoot?: string): T {
  if (typeof value === 'string') {
    return redactString(value, workspaceRoot) as T;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => redactPayload(entry, workspaceRoot)) as T;
  }

  if (value && typeof value === 'object') {
    const redactedEntries = Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      redactPayload(entry, workspaceRoot),
    ]);
    return Object.fromEntries(redactedEntries) as T;
  }

  return value;
}

export async function writeCrashReportFile(
  crashDirectory: string,
  report: CrashReport,
  maxCrashReports = DEFAULT_MAX_CRASH_REPORTS,
): Promise<string> {
  await fs.mkdir(crashDirectory, { recursive: true });

  const filename = `crash-${report.date.replace(/[:.]/g, '-')}.json`;
  const filePath = path.join(crashDirectory, filename);
  await fs.writeFile(filePath, JSON.stringify(report, null, 2), 'utf8');

  const files = (await fs.readdir(crashDirectory))
    .filter((entry) => entry.endsWith('.json'))
    .sort();

  while (files.length > maxCrashReports) {
    const oldest = files.shift();
    if (!oldest) {
      break;
    }
    await fs.rm(path.join(crashDirectory, oldest), { force: true });
  }

  return filePath;
}

export class ElectronCrashReporter implements CrashReporter {
  private crashReports: CrashReport[] = [];
  private optOut = false;
  private workspaceRoot = '';
  private crashDirectory = '';

  start(): void {
    // Local-only crash logging does not need a background transport.
  }

  stop(): void {
    // No-op for the local-only reporter.
  }

  getLastCrashReport(): CrashReport | null {
    return this.crashReports[this.crashReports.length - 1] || null;
  }

  setOptOut(optOut: boolean): void {
    this.optOut = optOut;
  }

  setWorkspaceRoot(workspaceRoot: string): void {
    this.workspaceRoot = workspaceRoot;
  }

  setCrashDirectory(crashDirectory: string): void {
    this.crashDirectory = crashDirectory;
  }

  async writeCrashReport(
    type: CrashReport['type'],
    error: unknown,
    metadata: Record<string, unknown> = {},
  ): Promise<CrashReport> {
    const normalized = normalizeError(error);
    const report = redactPayload<CrashReport>({
      date: new Date().toISOString(),
      type,
      message: normalized.message,
      stack: normalized.stack,
      metadata,
    }, this.workspaceRoot);

    this.crashReports.push(report);

    if (this.crashDirectory && !this.optOut) {
      await writeCrashReportFile(this.crashDirectory, report);
    }

    return report;
  }

  get isOptedOut(): boolean {
    return this.optOut;
  }
}

export class RedactionAwareTelemetry {
  private events: TelemetryEvent[] = [];
  private policy: TelemetryPolicy;

  constructor(policy: TelemetryPolicy) {
    this.policy = policy;
  }

  trackEvent(name: string, properties: Record<string, unknown>): void {
    if (!this.policy.enabled) return;

    if (Math.random() > this.policy.samplingRate) return;

    const redactedProperties = this.redact(properties);
    this.events.push({
      name,
      properties: redactedProperties,
      timestamp: new Date(),
    });
  }

  private redact(properties: Record<string, unknown>): Record<string, unknown> {
    const redacted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(properties)) {
      if (typeof value === 'string' && this.policy.redactPatterns.some((pattern) => pattern.test(value))) {
        redacted[key] = '[REDACTED]';
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        redacted[key] = this.redact(value as Record<string, unknown>);
      } else {
        redacted[key] = value;
      }
    }
    return redacted;
  }

  getEvents(): TelemetryEvent[] {
    return [...this.events];
  }

  clear(): void {
    this.events = [];
  }

  get size(): number {
    return this.events.length;
  }
}

export const defaultTelemetryPolicy: TelemetryPolicy = {
  enabled: false,
  redactPatterns: [
    /token/i,
    /password/i,
    /secret/i,
    /api[_-]?key/i,
    /bearer/i,
    /auth/i,
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  ],
  samplingRate: 1.0,
};

export function createTelemetry(policy: TelemetryPolicy = defaultTelemetryPolicy): RedactionAwareTelemetry {
  return new RedactionAwareTelemetry(policy);
}

export function createCrashReporter(): CrashReporter {
  return new ElectronCrashReporter();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
