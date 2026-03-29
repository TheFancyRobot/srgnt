import { describe, it, expect } from 'vitest';
import {
  createRunLogService,
  redactEnv,
  truncateOutput,
  DEFAULT_REDACTION_POLICY,
} from './run-log.js';

const makeContext = () => ({
  launchId: 'launch-test-001',
  sourceWorkflow: 'daily-briefing',
  sourceArtifactId: 'SRGNT-142',
  workingDirectory: '/workspace/demo',
  command: 'git status',
  intent: 'readOnly' as const,
  createdAt: new Date().toISOString(),
});

describe('RunLogService', () => {
  it('startRun creates a run log entry', () => {
    const svc = createRunLogService();
    const ctx = makeContext();
    const log = svc.startRun(ctx.launchId, ctx, 'git status');

    expect(log.launchId).toBe('launch-test-001');
    expect(log.command).toBe('git status');
    expect(log.startTime).toBeInstanceOf(Date);
    expect(log.endTime).toBeUndefined();
    expect(log.exitCode).toBeUndefined();
  });

  it('completeRun sets endTime, exitCode, and outputSummary', () => {
    const svc = createRunLogService();
    const ctx = makeContext();
    svc.startRun(ctx.launchId, ctx, 'git status');

    const log = svc.completeRun(ctx.launchId, 0, 'On branch main\nnothing to commit');

    expect(log).toBeDefined();
    expect(log!.endTime).toBeInstanceOf(Date);
    expect(log!.exitCode).toBe(0);
    expect(log!.outputSummary).toContain('On branch main');
  });

  it('completeRun returns undefined for unknown launchId', () => {
    const svc = createRunLogService();
    const result = svc.completeRun('nonexistent', 0, '');
    expect(result).toBeUndefined();
  });

  it('getRun retrieves a run by launchId', () => {
    const svc = createRunLogService();
    const ctx = makeContext();
    svc.startRun(ctx.launchId, ctx, 'git status');

    const log = svc.getRun(ctx.launchId);
    expect(log).toBeDefined();
    expect(log!.launchId).toBe('launch-test-001');
  });

  it('listRuns returns all runs', () => {
    const svc = createRunLogService();
    const ctx1 = { ...makeContext(), launchId: 'launch-001' };
    const ctx2 = { ...makeContext(), launchId: 'launch-002' };
    svc.startRun(ctx1.launchId, ctx1, 'git status');
    svc.startRun(ctx2.launchId, ctx2, 'git log');

    const runs = svc.listRuns();
    expect(runs).toHaveLength(2);
  });

  it('toMarkdown produces valid markdown', () => {
    const svc = createRunLogService();
    const ctx = makeContext();
    const log = svc.startRun(ctx.launchId, ctx, 'git status');
    svc.completeRun(ctx.launchId, 0, 'clean');

    const md = svc.toMarkdown(log);
    expect(md).toContain('# Run Log');
    expect(md).toContain('launch-test-001');
    expect(md).toContain('git status');
    expect(md).toContain('daily-briefing');
  });

  it('startRun with approvalId sets approvalStatus to pending', () => {
    const svc = createRunLogService();
    const ctx = makeContext();
    const log = svc.startRun(ctx.launchId, ctx, 'git push', 'approval-001');

    expect(log.approvalId).toBe('approval-001');
    expect(log.approvalStatus).toBe('pending');
  });

  it('completeRun resolves approval based on exit code', () => {
    const svc = createRunLogService();
    const ctx = makeContext();
    svc.startRun(ctx.launchId, ctx, 'git push', 'approval-001');

    const log = svc.completeRun(ctx.launchId, 0, 'pushed');
    expect(log!.approvalStatus).toBe('approved');

    const ctx2 = { ...makeContext(), launchId: 'launch-002' };
    svc.startRun(ctx2.launchId, ctx2, 'git push', 'approval-002');
    const log2 = svc.completeRun(ctx2.launchId, 1, 'error');
    expect(log2!.approvalStatus).toBe('denied');
  });
});

describe('redactEnv', () => {
  it('redacts sensitive keys', () => {
    const env = {
      PATH: '/usr/bin',
      API_KEY: 'secret123',
      MY_TOKEN: 'tok123',
      SAFE_VAR: 'visible',
    };

    const { redacted, redactedFields } = redactEnv(env);

    expect(redacted.PATH).toBe('/usr/bin');
    expect(redacted.API_KEY).toBe('[REDACTED]');
    expect(redacted.MY_TOKEN).toBe('[REDACTED]');
    expect(redacted.SAFE_VAR).toBe('visible');
    expect(redactedFields).toContain('API_KEY');
    expect(redactedFields).toContain('MY_TOKEN');
  });
});

describe('truncateOutput', () => {
  it('returns output unchanged when under max length', () => {
    const output = 'short output';
    expect(truncateOutput(output, 100)).toBe('short output');
  });

  it('truncates long output', () => {
    const output = 'a'.repeat(200);
    const result = truncateOutput(output, 100);
    expect(result.length).toBeGreaterThan(100);
    expect(result.length).toBeLessThan(200);
    expect(result).toContain('TRUNCATED');
  });

  it('uses default max length from policy', () => {
    const output = 'x'.repeat(DEFAULT_REDACTION_POLICY.maxOutputLength + 500);
    const result = truncateOutput(output);
    expect(result).toContain('TRUNCATED');
  });
});
