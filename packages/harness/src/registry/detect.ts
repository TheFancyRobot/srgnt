import { spawn as nodeSpawn } from 'node:child_process';

/**
 * Binary/version detection for a harness's underlying CLI (e.g. `pi`). This is
 * onboarding-facing: STEP-22-05 and Phase 25's settings UI render the three
 * distinct outcomes below so a user knows whether to install, fix PATH, or
 * proceed.
 */

/** Outcome of probing a harness CLI, as three mutually exclusive typed states. */
export type DetectionResult =
  | {
      /** Binary found on PATH and `--version` returned cleanly. */
      readonly status: 'ok';
      readonly command: string;
      readonly version: string;
    }
  | {
      /** Binary found but the version probe failed, hung (timed out), or exited non-zero. */
      readonly status: 'probe-failed';
      readonly command: string;
      readonly reason: 'timeout' | 'nonzero-exit' | 'no-version-output';
      readonly detail?: string;
    }
  | {
      /** Binary is not on PATH (spawn raised ENOENT). */
      readonly status: 'not-installed';
      readonly command: string;
    };

/** Raw result of running one `<command> --version` probe. Injected so unit tests avoid real processes. */
export type ProbeOutcome =
  | { readonly kind: 'exit'; readonly code: number | null; readonly stdout: string }
  | { readonly kind: 'timeout' }
  | { readonly kind: 'spawn-error'; readonly code: string | undefined };

/** Runs `<command> --version` with a hard timeout. Injected for testability. */
export type VersionProbe = (command: string, timeoutMs: number) => Promise<ProbeOutcome>;

const DEFAULT_TIMEOUT_MS = 10_000;

/** Extracts the first semver-ish token from `--version` output (e.g. `pi 0.80.6` → `0.80.6`). */
const parseVersion = (stdout: string): string | undefined => {
  const semver = stdout.match(/\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?/)?.[0];
  if (semver !== undefined) return semver;
  const trimmed = stdout.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

/**
 * Default probe: spawns the real process, captures stdout, and *kills the
 * process tree on timeout* so a hanging PATH shim never leaks an orphan.
 */
export const nodeVersionProbe: VersionProbe = (command, timeoutMs) =>
  new Promise<ProbeOutcome>((resolve) => {
    const child = nodeSpawn(command, ['--version'], { stdio: ['ignore', 'pipe', 'ignore'] });
    let stdout = '';
    let settled = false;
    const finish = (outcome: ProbeOutcome): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(outcome);
    };
    const timer = setTimeout(() => {
      // Reap the hung probe (and any children) before resolving — no orphans.
      child.kill('SIGKILL');
      finish({ kind: 'timeout' });
    }, timeoutMs);
    (timer as { unref?: () => void }).unref?.();
    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });
    child.once('error', (error: NodeJS.ErrnoException) => finish({ kind: 'spawn-error', code: error.code }));
    child.once('exit', (code) => finish({ kind: 'exit', code, stdout }));
  });

export interface DetectOptions {
  /** Milliseconds before the probe is killed and reported as `probe-failed`/timeout. */
  readonly timeoutMs?: number;
  /** Override the probe runner (unit tests inject fake binaries). */
  readonly probe?: VersionProbe;
}

/**
 * Detects whether `command` is an installed, working CLI, returning one of the
 * three {@link DetectionResult} states. `command` is typically the harness's
 * underlying binary (`pi`), not its ACP adapter launcher (`npx pi-acp`).
 */
export async function detectCommand(command: string, options: DetectOptions = {}): Promise<DetectionResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const probe = options.probe ?? nodeVersionProbe;
  const outcome = await probe(command, timeoutMs);
  switch (outcome.kind) {
    case 'timeout':
      return { status: 'probe-failed', command, reason: 'timeout' };
    case 'spawn-error':
      // ENOENT means "not on PATH"; any other spawn error is a genuine probe failure.
      return outcome.code === 'ENOENT'
        ? { status: 'not-installed', command }
        : { status: 'probe-failed', command, reason: 'nonzero-exit', detail: outcome.code };
    case 'exit': {
      if (outcome.code !== 0) {
        return { status: 'probe-failed', command, reason: 'nonzero-exit', detail: `exit ${outcome.code}` };
      }
      const version = parseVersion(outcome.stdout);
      return version === undefined
        ? { status: 'probe-failed', command, reason: 'no-version-output' }
        : { status: 'ok', command, version };
    }
  }
}

/** Detects the `pi` CLI backing the built-in Pi harness. */
export const detectPi = (options?: DetectOptions): Promise<DetectionResult> => detectCommand('pi', options);
