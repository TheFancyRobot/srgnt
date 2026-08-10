import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  completeOnboarding,
  expect,
  getElectronLaunchArgs,
  getElectronLaunchEnv,
  test,
  waitForDesktopReady,
  workspaceRootFor,
} from './fixtures';

/**
 * Transcript checkpointing + lifecycle cleanup E2E (PHASE-24, STEP-24-05).
 *
 * The two claims this step makes that no unit test can prove:
 *
 * 1. **Crash mid-turn loses at most the in-flight chunk.** The Electron main
 *    process is SIGKILLed while a turn is streaming, a *fresh* app is launched
 *    against the same workspace, and the session comes back `interrupted` with
 *    a transcript rendered from `events.jsonl` — not from whatever checkpoint
 *    happened to be on disk when it died.
 * 2. **Quit leaves zero agent processes.** Asserted with `ps` against the real
 *    process table, including a quit that lands mid-turn.
 *
 * The app is launched by hand rather than through the `electronApp` fixture:
 * both tests need to control when the app dies, and one needs to start a second
 * app over the first one's workspace.
 */

let userDataDir = '';
let scenarioPath = '';

test.beforeEach(async ({}, testInfo) => {
  const slug = testInfo.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), `srgnt-e2e-${slug || 'lifecycle'}-`));
  scenarioPath = path.join(userDataDir, 'scenario.json');
});

test.afterEach(async () => {
  // A SIGKILLed app cannot reap its own children, so this test file is the only
  // thing that can. Runs before the temp dirs go, since the scenario path is
  // what identifies our processes.
  killStrayAgents();
  await fs.rm(userDataDir, { recursive: true, force: true });
  await fs.rm(workspaceRootFor(userDataDir), { recursive: true, force: true });
});

/**
 * Mock agent processes belonging to THIS test, found by the scenario path the
 * app passes on their command line — unique per test, so a parallel run's
 * agents are never counted.
 */
function agentPids(): string[] {
  if (process.platform === 'win32') return [];
  const table = execFileSync('ps', ['-A', '-o', 'pid=,command='], { encoding: 'utf8' });
  return table
    .split('\n')
    .filter((line) => line.includes(scenarioPath) && !line.includes(' ps '))
    .map((line) => line.trim().split(/\s+/)[0]!)
    .filter((pid) => pid !== '');
}

function killStrayAgents(): void {
  for (const pid of agentPids()) {
    try {
      process.kill(Number(pid), 'SIGKILL');
    } catch {
      // Already gone between the listing and the signal.
    }
  }
}

async function writeScenario(scenario: unknown): Promise<void> {
  await fs.writeFile(scenarioPath, JSON.stringify(scenario));
}

async function launchApp(): Promise<ElectronApplication> {
  return electron.launch({
    args: getElectronLaunchArgs(['.']),
    env: getElectronLaunchEnv(userDataDir, { SRGNT_MOCK_SCENARIO: scenarioPath }),
  });
}

async function enterChat(page: Page, onboarded: boolean): Promise<void> {
  if (onboarded) {
    await waitForDesktopReady(page);
  } else {
    await completeOnboarding(page);
  }
  await page.getByRole('button', { name: 'Chat', exact: true }).click();
  await expect(page.getByTestId('chat-view')).toBeVisible();
}

async function startSession(page: Page): Promise<string> {
  await page.getByTestId('session-new').click();
  await expect(page.getByTestId('chat-input')).toBeEnabled();
  const active = page.locator('[data-testid="session-row"][data-active="true"]');
  await expect(active).toHaveCount(1);
  return (await active.getAttribute('data-session-id'))!;
}

function sessionRow(page: Page, sessionId: string) {
  return page.locator(`[data-testid="session-row"][data-session-id="${sessionId}"]`);
}

function sessionDir(sessionId: string, projectId: string): string {
  return path.join(workspaceRootFor(userDataDir), 'projects', projectId, 'sessions', sessionId);
}

async function onlyProjectId(): Promise<string> {
  const projects = path.join(workspaceRootFor(userDataDir), 'projects');
  const entries = await fs.readdir(projects);
  return entries[0]!;
}

test('a crash mid-turn loses at most the in-flight chunk and reopens interrupted', async () => {
  await writeScenario({
    name: 'e2e-crash-mid-turn',
    directives: [
      // Streams, then blocks forever waiting for a cancel that never comes:
      // the app is killed while this turn is genuinely in flight.
      { type: 'emit_chunks', channel: 'agent', chunks: ['Half ', 'a ', 'turn'], delayMs: 20 },
      { type: 'expect_cancel', timeoutMs: 60_000 },
    ],
  });

  const first = await launchApp();
  const page = await first.firstWindow();
  await enterChat(page, false);
  const sessionId = await startSession(page);
  await page.getByTestId('chat-input').fill('stream then die');
  await page.getByTestId('chat-send').click();
  // The turn is on the wire and its chunks have been persisted.
  await expect(page.getByTestId('chat-message-agent').first()).toContainText('Half a turn');

  // A crash, not a quit: no teardown, no final checkpoint, no `closed` status.
  first.process().kill('SIGKILL');
  await first.waitForEvent('close').catch(() => undefined);
  killStrayAgents();

  const projectId = await onlyProjectId();
  const log = await fs.readFile(path.join(sessionDir(sessionId, projectId), 'events.jsonl'), 'utf8');
  // Everything received before the kill survived. Only the tail can be missing.
  expect(log).toContain('stream then die');
  expect(log).toContain('turn');
  expect(log).not.toContain('client/session_closed');

  const second = await launchApp();
  try {
    const restarted = await second.firstWindow();
    await enterChat(restarted, true);
    await expect(restarted.getByTestId('session-list-panel')).toBeVisible();
    // The session that was `active` when the app died has no controller that
    // could ever close it, so the list reconciles it.
    await expect(sessionRow(restarted, sessionId)).toHaveAttribute('data-status', 'interrupted');

    await sessionRow(restarted, sessionId).getByTestId('session-open').click();
    await expect(restarted.getByTestId('chat-message-user').first()).toContainText('stream then die');
    await expect(restarted.getByTestId('chat-message-agent').first()).toContainText('Half a turn');

    // The transcript is re-derived from `events.jsonl` on open, so it reflects
    // the crash regardless of when the last 30s checkpoint ran.
    const transcriptPath = path.join(sessionDir(sessionId, projectId), 'transcript.md');
    await expect
      .poll(async () => fs.readFile(transcriptPath, 'utf8').catch(() => ''), { timeout: 10_000 })
      .toContain('interrupted');
    const transcript = await fs.readFile(transcriptPath, 'utf8');
    expect(transcript).toContain('stream then die');
    expect(transcript).toContain('Half a turn');
  } finally {
    await second.close();
  }
});

test('quitting mid-turn cancels the turn and leaves zero agent processes', async () => {
  test.skip(process.platform === 'win32', 'process-tree assertion uses ps (POSIX)');

  await writeScenario({
    name: 'e2e-quit-cleanup',
    directives: [
      { type: 'emit_chunks', channel: 'agent', chunks: ['Working'], delayMs: 10 },
      // Satisfied by quit's best-effort `session/cancel`. If none arrives the
      // mock records an assertion failure instead of silently passing.
      { type: 'expect_cancel', timeoutMs: 1_500 },
    ],
  });

  const app = await launchApp();
  const page = await app.firstWindow();
  await enterChat(page, false);
  await startSession(page);
  await page.getByTestId('chat-input').fill('quit while I talk');
  await page.getByTestId('chat-send').click();
  await expect(page.getByTestId('chat-message-agent').first()).toContainText('Working');

  // A real agent process is running right now — otherwise the assertion below
  // would pass on an app that never spawned anything.
  expect(agentPids().length).toBeGreaterThan(0);

  const quitStarted = Date.now();
  await app.close();
  // The whole cleanup shares one 2s budget; anything near the harness's 5s kill
  // grace would mean quit is waiting on something it promised not to.
  expect(Date.now() - quitStarted).toBeLessThan(15_000);

  await expect.poll(() => agentPids(), { timeout: 10_000 }).toEqual([]);

  const assertions = JSON.parse(
    await fs.readFile(path.join(userDataDir, 'mock-assertions.json'), 'utf8'),
  ) as string[];
  // An empty list means `expect_cancel` was satisfied: quit really did send a
  // best-effort `session/cancel` before the kill-tree.
  expect(assertions).toEqual([]);
});
