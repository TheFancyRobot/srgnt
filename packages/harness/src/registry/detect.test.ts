import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { detectCommand, nodeVersionProbe, type ProbeOutcome, type VersionProbe } from './detect.js';

const fakeProbe =
  (outcome: ProbeOutcome): VersionProbe =>
  () =>
    Promise.resolve(outcome);

describe('detectCommand (result mapping via injected probe)', () => {
  it('exit 0 with a semver token → ok', async () => {
    const result = await detectCommand('pi', { probe: fakeProbe({ kind: 'exit', code: 0, stdout: 'pi 0.80.6\n' }) });
    expect(result).toEqual({ status: 'ok', command: 'pi', version: '0.80.6' });
  });

  it('ENOENT spawn error → not-installed', async () => {
    const result = await detectCommand('pi', { probe: fakeProbe({ kind: 'spawn-error', code: 'ENOENT' }) });
    expect(result).toEqual({ status: 'not-installed', command: 'pi' });
  });

  it('timeout → probe-failed/timeout', async () => {
    const result = await detectCommand('pi', { probe: fakeProbe({ kind: 'timeout' }) });
    expect(result).toMatchObject({ status: 'probe-failed', command: 'pi', reason: 'timeout' });
  });

  it('non-zero exit → probe-failed/nonzero-exit', async () => {
    const result = await detectCommand('pi', { probe: fakeProbe({ kind: 'exit', code: 1, stdout: '' }) });
    expect(result).toMatchObject({ status: 'probe-failed', reason: 'nonzero-exit' });
  });

  it('exit 0 with no version token → probe-failed/no-version-output', async () => {
    const result = await detectCommand('pi', { probe: fakeProbe({ kind: 'exit', code: 0, stdout: '   \n' }) });
    expect(result).toMatchObject({ status: 'probe-failed', reason: 'no-version-output' });
  });

  it('non-ENOENT spawn error → probe-failed/spawn-error with the errno', async () => {
    const result = await detectCommand('pi', { probe: fakeProbe({ kind: 'spawn-error', code: 'EACCES' }) });
    // Distinct from nonzero-exit: the process never ran, so callers can tell
    // "could not launch" from "ran and failed".
    expect(result).toMatchObject({ status: 'probe-failed', reason: 'spawn-error', detail: 'EACCES' });
  });
});

describe('nodeVersionProbe (real processes)', () => {
  it('detects a real installed binary (node --version) as ok', async () => {
    const result = await detectCommand(process.execPath, { probe: nodeVersionProbe });
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('reports a missing binary as not-installed', async () => {
    const result = await detectCommand('srgnt-definitely-not-a-real-binary-xyz', { probe: nodeVersionProbe });
    expect(result.status).toBe('not-installed');
  });

  it('kills a hanging probe on timeout and leaves no orphan', async () => {
    const fixture = fileURLToPath(new URL('./__fixtures__/hang-probe.mjs', import.meta.url));
    const dir = mkdtempSync(join(tmpdir(), 'srgnt-probe-'));
    const pidFile = join(dir, 'pid');
    const previous = process.env.HANG_PID_FILE;
    process.env.HANG_PID_FILE = pidFile;
    try {
      const outcome = await nodeVersionProbe(fixture, 300);
      expect(outcome.kind).toBe('timeout');

      const pid = Number(readFileSync(pidFile, 'utf8').trim());
      expect(pid).toBeGreaterThan(0);
      // The probe SIGKILLs the child on timeout; poll until it is reaped.
      const deadline = Date.now() + 2_000;
      let alive = true;
      while (Date.now() < deadline) {
        try {
          process.kill(pid, 0);
          await new Promise((resolve) => setTimeout(resolve, 20));
        } catch {
          alive = false;
          break;
        }
      }
      expect(alive).toBe(false);
    } finally {
      if (previous === undefined) delete process.env.HANG_PID_FILE;
      else process.env.HANG_PID_FILE = previous;
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
