import type { LaunchContext } from '@srgnt/contracts';

export interface RunLog {
  id: string;
  launchId: string;
  context: LaunchContext;
  command: string;
  startTime: Date;
  endTime?: Date;
  exitCode?: number;
  outputSummary: string;
  approvalId?: string;
  approvalStatus?: 'pending' | 'approved' | 'denied' | 'expired';
  redactedFields: string[];
}

export interface RedactionPolicy {
  maxOutputLength: number;
  redactPatterns: string[];
  sensitiveEnvKeys: string[];
}

export const DEFAULT_REDACTION_POLICY: RedactionPolicy = {
  maxOutputLength: 10000,
  redactPatterns: [
    'SECRET',
    'TOKEN',
    'PASSWORD',
    'PRIVATE',
    'CREDENTIAL',
    'API_KEY',
    'ACCESS_TOKEN',
  ],
  sensitiveEnvKeys: [
    'SECRET',
    'TOKEN',
    'PASSWORD',
    'PRIVATE',
    'CREDENTIAL',
    'API_KEY',
    'ACCESS_TOKEN',
    'REFRESH_TOKEN',
    'AUTH',
  ],
};

export function redactEnv(env: Record<string, string>, policy: RedactionPolicy = DEFAULT_REDACTION_POLICY): { redacted: Record<string, string>; redactedFields: string[] } {
  const redacted: Record<string, string> = {};
  const redactedFields: string[] = [];

  for (const [key, value] of Object.entries(env)) {
    const isSensitive = policy.sensitiveEnvKeys.some((k) => key.toUpperCase().includes(k));
    if (isSensitive) {
      redacted[key] = '[REDACTED]';
      redactedFields.push(key);
    } else {
      redacted[key] = value;
    }
  }

  return { redacted, redactedFields };
}

export function truncateOutput(output: string, maxLength: number = DEFAULT_REDACTION_POLICY.maxOutputLength): string {
  if (output.length <= maxLength) return output;
  return output.slice(0, maxLength) + `\n... [TRUNCATED: ${output.length - maxLength} characters omitted]`;
}

export interface RunLogService {
  startRun(launchId: string, context: LaunchContext, command: string, approvalId?: string): RunLog;
  completeRun(launchId: string, exitCode: number, output: string): RunLog | undefined;
  getRun(launchId: string): RunLog | undefined;
  listRuns(): RunLog[];
  toMarkdown(log: RunLog): string;
}

export function createRunLogService(policy: RedactionPolicy = DEFAULT_REDACTION_POLICY): RunLogService {
  const runs = new Map<string, RunLog>();

  return {
    startRun(launchId, context, command, approvalId) {
      const log: RunLog = {
        id: `runlog-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        launchId,
        context,
        command,
        startTime: new Date(),
        outputSummary: '',
        approvalId,
        approvalStatus: approvalId ? 'pending' : undefined,
        redactedFields: [],
      };
      runs.set(launchId, log);
      return log;
    },

    completeRun(launchId, exitCode, output) {
      const log = runs.get(launchId);
      if (!log) return undefined;
      log.endTime = new Date();
      log.exitCode = exitCode;
      const truncated = truncateOutput(output, policy.maxOutputLength);
      log.outputSummary = truncated;
      if (log.approvalStatus === 'pending') {
        log.approvalStatus = exitCode === 0 ? 'approved' : 'denied';
      }
      return log;
    },

    getRun(launchId) {
      return runs.get(launchId);
    },

    listRuns() {
      return Array.from(runs.values());
    },

    toMarkdown(log) {
      const lines: string[] = [
        '# Run Log',
        '',
        '## Metadata',
        `- Run ID: ${log.id}`,
        `- Launch ID: ${log.launchId}`,
        `- Command: \`${log.command}\``,
        `- Started: ${log.startTime.toISOString()}`,
      ];

      if (log.endTime) {
        lines.push(`- Ended: ${log.endTime.toISOString()}`);
        const duration = log.endTime.getTime() - log.startTime.getTime();
        lines.push(`- Duration: ${duration}ms`);
      }

      if (log.exitCode !== undefined) {
        lines.push(`- Exit Code: ${log.exitCode}`);
      }

      lines.push('',
        '## Context',
        `- Source Workflow: ${log.context.sourceWorkflow}`,
        `- Working Directory: ${log.context.workingDirectory}`,
      );

      if (log.context.sourceArtifactId) {
        lines.push(`- Source Artifact: ${log.context.sourceArtifactId}`);
      }

      if (log.context.sourceRunId) {
        lines.push(`- Source Run: ${log.context.sourceRunId}`);
      }

      if (log.context.labels && log.context.labels.length > 0) {
        lines.push(`- Labels: ${log.context.labels.join(', ')}`);
      }

      if (log.approvalId) {
        lines.push('',
          '## Approval',
          `- Approval ID: ${log.approvalId}`,
          `- Status: ${log.approvalStatus}`,
        );
      }

      if (log.redactedFields.length > 0) {
        lines.push('',
          '## Redacted Fields',
          log.redactedFields.map((f) => `- ${f}`).join('\n'),
        );
      }

      lines.push('',
        '## Output',
        '```',
        log.outputSummary || '(no output)',
        '```',
      );

      return lines.join('\n');
    },
  };
}