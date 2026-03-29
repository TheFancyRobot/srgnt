import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createCrashReporter, redactPayload, writeCrashReportFile } from './crash.js';

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
