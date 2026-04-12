import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createCrashReporter, createTelemetry, redactPayload, RedactionAwareTelemetry, writeCrashReportFile } from './crash.js';

const tempPaths: string[] = [];

async function makeTempDir(prefix: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  tempPaths.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempPaths.splice(0).map((entry) => fs.rm(entry, { recursive: true, force: true })));
});

describe('crash helpers', () => {
  it('redacts workspace paths, email addresses, and tokens', () => {
    const payload = redactPayload(
      {
        message: 'Failed to read /home/tester/srgnt-workspace/Daily/Today.md for user@example.com token=abc123',
      },
      '/home/tester/srgnt-workspace',
    );

    expect(payload.message).not.toContain('/home/tester/srgnt-workspace');
    expect(payload.message).not.toContain('user@example.com');
    expect(payload.message).not.toContain('abc123');
    expect(payload.message).toContain('[workspace-root]');
    expect(payload.message).toContain('[redacted-email]');
    expect(payload.message).toContain('token=[redacted]');
  });

  it('writes redacted crash reports to disk', async () => {
    const crashDir = await makeTempDir('srgnt-crashes-');
    const reporter = createCrashReporter();
    reporter.setCrashDirectory(crashDir);
    reporter.setWorkspaceRoot('/home/tester/srgnt-workspace');

    await reporter.writeCrashReport(
      'diagnostic',
      new Error('Boom at /home/tester/srgnt-workspace/Meetings/Notes.md token=abc123'),
      { email: 'user@example.com' },
    );

    const files = await fs.readdir(crashDir);
    expect(files).toHaveLength(1);

    const content = await fs.readFile(path.join(crashDir, files[0]), 'utf8');
    expect(content).not.toContain('/home/tester/srgnt-workspace');
    expect(content).not.toContain('user@example.com');
    expect(content).not.toContain('abc123');
  });

  it('rotates old crash reports', async () => {
    const crashDir = await makeTempDir('srgnt-rotate-');

    for (let index = 0; index < 3; index += 1) {
      await writeCrashReportFile(
        crashDir,
        {
          date: new Date(Date.UTC(2026, 2, 28, 12, 0, index)).toISOString(),
          type: 'diagnostic',
          message: `report-${index}`,
        },
        2,
      );
    }

    const files = await fs.readdir(crashDir);
    expect(files).toHaveLength(2);
  });
});

describe('ElectronCrashReporter', () => {
  it('does not write crash report when opted out', async () => {
    const reporter = createCrashReporter();
    reporter.setOptOut(true);

    const report = await reporter.writeCrashReport('diagnostic', new Error('test error'));
    expect(report.type).toBe('diagnostic');
    expect(report.message).toBe('test error');
    expect(reporter.isOptedOut).toBe(true);
    expect(reporter.getLastCrashReport()).toEqual(report);
  });

  it('writes crash report when not opted out and crash directory is set', async () => {
    const crashDir = await makeTempDir('srgnt-noopt-');
    const reporter = createCrashReporter();
    reporter.setCrashDirectory(crashDir);
    reporter.setOptOut(false);

    await reporter.writeCrashReport('uncaughtException', new Error('crash'));
    const files = await fs.readdir(crashDir);
    expect(files).toHaveLength(1);
  });

  it('returns null getLastCrashReport when no reports exist', () => {
    const reporter = createCrashReporter();
    expect(reporter.getLastCrashReport()).toBeNull();
  });

  it('start and stop are no-ops', () => {
    const reporter = createCrashReporter();
    reporter.start();
    reporter.stop();
    expect(reporter.getLastCrashReport()).toBeNull();
  });
});

describe('RedactionAwareTelemetry', () => {
  it('does not track events when disabled', () => {
    const telemetry = new RedactionAwareTelemetry({
      enabled: false,
      redactPatterns: [/secret/i],
      samplingRate: 1.0,
    });
    telemetry.trackEvent('test', { foo: 'bar' });
    expect(telemetry.size).toBe(0);
    expect(telemetry.getEvents()).toEqual([]);
  });

  it('drops events below sampling rate', () => {
    const telemetry = new RedactionAwareTelemetry({
      enabled: true,
      redactPatterns: [],
      samplingRate: 0,
    });
    telemetry.trackEvent('test', { foo: 'bar' });
    expect(telemetry.size).toBe(0);
  });

  it('tracks events and redacts matching string values', () => {
    const telemetry = new RedactionAwareTelemetry({
      enabled: true,
      redactPatterns: [/password/i],
      samplingRate: 1.0,
    });
    telemetry.trackEvent('login', { user: 'alice', credential: 'my-password-123' });
    const events = telemetry.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0].name).toBe('login');
    expect(events[0].properties.user).toBe('alice');
    expect(events[0].properties.credential).toBe('[REDACTED]');
    expect(events[0].timestamp).toBeInstanceOf(Date);
  });

  it('redacts nested object values', () => {
    const telemetry = new RedactionAwareTelemetry({
      enabled: true,
      redactPatterns: [/token/i],
      samplingRate: 1.0,
    });
    telemetry.trackEvent('api_call', { config: { session_id: 'abc123tokenxyz' } });
    const events = telemetry.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0].properties.config.session_id).toBe('[REDACTED]');
  });

  it('clears events', () => {
    const telemetry = new RedactionAwareTelemetry({
      enabled: true,
      redactPatterns: [],
      samplingRate: 1.0,
    });
    telemetry.trackEvent('a', {});
    telemetry.trackEvent('b', {});
    expect(telemetry.size).toBe(2);
    telemetry.clear();
    expect(telemetry.size).toBe(0);
    expect(telemetry.getEvents()).toEqual([]);
  });
});

describe('createTelemetry', () => {
  it('creates telemetry with default policy (disabled)', () => {
    const telemetry = createTelemetry();
    telemetry.trackEvent('test', { foo: 'bar' });
    expect(telemetry.size).toBe(0);
  });

  it('creates telemetry with custom policy', () => {
    const telemetry = createTelemetry({
      enabled: true,
      redactPatterns: [],
      samplingRate: 1.0,
    });
    telemetry.trackEvent('test', { foo: 'bar' });
    expect(telemetry.size).toBe(1);
  });
});
