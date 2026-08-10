import type { Page } from '@playwright/test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { completeOnboarding, expect, test, waitForDesktopReady, workspaceRootFor } from './fixtures';

/**
 * Honest resume + fork E2E (PHASE-24, STEP-24-04).
 *
 * Three mock variants, because the whole feature IS the capability branch:
 * a) `loadSession` only            → transparent continue via `session/load`.
 * b) both advertised, resume −32601 → still continues, via the load fallback.
 * c) neither                        → read-only, and fork is the only way on.
 *
 * Driven through the real stack: a real mock agent process, the real
 * `SessionStore`, and the lineage read back off disk — the DOM alone cannot
 * tell a session that genuinely resumed from one that was quietly re-primed.
 */

/** Chunks every variant replies with, so "the turn ran again" is assertable. */
const REPLY = ['Working', '.', '.', '.', ' done.'];

function scenarioFor(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    name: 'e2e-resume',
    directives: [{ type: 'emit_chunks', channel: 'agent', chunks: REPLY, delayMs: 10 }],
    ...overrides,
  };
}

async function firstOpen(page: Page): Promise<void> {
  await completeOnboarding(page);
  await page.getByRole('button', { name: 'Chat', exact: true }).click();
  await expect(page.getByTestId('chat-view')).toBeVisible();
}

async function reopenAfterReload(page: Page): Promise<void> {
  await page.reload();
  await waitForDesktopReady(page);
  await page.getByRole('button', { name: 'Chat', exact: true }).click();
  await expect(page.getByTestId('chat-view')).toBeVisible();
  await expect(page.getByTestId('session-list-panel')).toBeVisible();
}

async function ensureProject(page: Page, rootDir: string): Promise<string> {
  const project = await page.evaluate(async (dir) => window.srgnt.projectEnsure!(dir), rootDir);
  return project.id;
}

function sessionRow(page: Page, sessionId: string) {
  return page.locator(`[data-testid="session-row"][data-session-id="${sessionId}"]`);
}

async function selectProject(page: Page, projectId: string): Promise<void> {
  await page
    .locator(`[data-testid="project-row"][data-project-id="${projectId}"]`)
    .getByTestId('project-select')
    .click();
}

async function startSession(page: Page): Promise<string> {
  await page.getByTestId('session-new').click();
  await expect(page.getByTestId('chat-session-badge')).toBeVisible();
  await expect(page.getByTestId('chat-input')).toBeEnabled();
  const active = page.locator('[data-testid="session-row"][data-active="true"]');
  await expect(active).toHaveCount(1);
  return (await active.getAttribute('data-session-id'))!;
}

async function sendPrompt(page: Page, text: string): Promise<void> {
  await page.getByTestId('chat-input').fill(text);
  await page.getByTestId('chat-send').click();
}

function metaPath(workspaceRoot: string, projectId: string, sessionId: string): string {
  return path.join(workspaceRoot, 'projects', projectId, 'sessions', sessionId, 'meta.json');
}

async function readMeta(
  workspaceRoot: string,
  projectId: string,
  sessionId: string,
): Promise<{ parentSessionId?: string; forkedSessionIds?: string[]; idempotencyKey?: string }> {
  return JSON.parse(await fs.readFile(metaPath(workspaceRoot, projectId, sessionId), 'utf8')) as never;
}

/**
 * Runs a session to completion, ends it, and reopens it after a renderer
 * reload — the state every variant below starts from: on screen, on disk, and
 * with no process behind it.
 */
async function persistAndReopen(page: Page, projectId: string): Promise<string> {
  await selectProject(page, projectId);
  const sessionId = await startSession(page);
  await sendPrompt(page, 'Remember me');
  await expect(page.getByTestId('chat-send')).toHaveText('Send');
  await expect(page.getByTestId('chat-message-agent').first()).toContainText('Working... done.');
  await page.getByTestId('chat-dispose').click();
  await expect(page.getByTestId('chat-new-session')).toBeVisible();

  await reopenAfterReload(page);
  await selectProject(page, projectId);
  await sessionRow(page, sessionId).getByTestId('session-open').click();
  // Rendered from `events.jsonl`, with nothing running.
  await expect(page.getByTestId('chat-message-user').first()).toContainText('Remember me');
  return sessionId;
}

let base = '';
let dir = '';

test.beforeEach(async () => {
  base = await fs.mkdtemp(path.join(os.tmpdir(), 'srgnt-e2e-resume-'));
  dir = path.join(base, 'alpha');
  await fs.mkdir(dir, { recursive: true });
});

test.afterEach(async () => {
  await fs.rm(base, { recursive: true, force: true });
});

test.describe('load-capable harness resumes transparently', () => {
  test.use({
    mockScenario: scenarioFor({
      initialize: { loadSession: true, modes: ['off', 'high'] },
      // Identical to the turn's own output, so the replay reconciles cleanly.
      loadReplay: [{ type: 'emit_chunks', channel: 'agent', chunks: REPLY, delayMs: 0 }],
    }),
  });

  test('reopening and prompting continues the session via session/load', async ({ window: page }) => {
    await firstOpen(page);
    const projectId = await ensureProject(page, dir);
    await reopenAfterReload(page);
    const sessionId = await persistAndReopen(page, projectId);

    await sendPrompt(page, 'keep going');
    await expect(page.getByTestId('chat-send')).toHaveText('Send');

    // The turn ran on the SAME session — no read-only banner, no new session.
    await expect(page.getByTestId('chat-read-only')).toHaveCount(0);
    await expect(page.getByTestId('chat-message-user').nth(1)).toContainText('keep going');
    await expect(page.getByTestId('chat-message-agent')).toHaveCount(2);
    await expect(sessionRow(page, sessionId)).toHaveAttribute('data-active', 'true');
    // A matching replay is not a divergence.
    await expect(page.getByTestId('chat-history-diverged')).toHaveCount(0);
    // The load response's modes come back, so the thinking-level selector does.
    await expect(page.getByTestId('chat-mode-select')).toBeVisible();
  });
});

test.describe('advertised-but-unimplemented resume falls back to load', () => {
  test.use({
    mockScenario: scenarioFor({
      // Advertises BOTH and implements only one — the pinned-Pi shape.
      initialize: { loadSession: true, resumeSession: true },
      loadReplay: [{ type: 'emit_chunks', channel: 'agent', chunks: REPLY, delayMs: 0 }],
      unimplementedMethods: ['session/resume'],
    }),
  });

  test('continues via session/load after session/resume answers -32601', async ({
    window: page,
    userDataDir,
  }) => {
    const workspaceRoot = workspaceRootFor(userDataDir);
    await firstOpen(page);
    const projectId = await ensureProject(page, dir);
    await reopenAfterReload(page);
    const sessionId = await persistAndReopen(page, projectId);

    await sendPrompt(page, 'keep going');
    await expect(page.getByTestId('chat-send')).toHaveText('Send');

    // Transparent continue: the mis-advertised capability cost nothing visible.
    await expect(page.getByTestId('chat-read-only')).toHaveCount(0);
    await expect(page.getByTestId('chat-message-agent')).toHaveCount(2);

    // …but it IS recorded, so a later read-only notice could name it.
    const log = await fs.readFile(
      path.join(workspaceRoot, 'projects', projectId, 'sessions', sessionId, 'events.jsonl'),
      'utf8',
    );
    expect(log).toContain('client/capability_mismatch');
    expect(log).toContain('resumeSession');
    expect(log).toContain('client/reconnected');
  });
});

test.describe('non-capable harness goes read-only and forks', () => {
  test.use({ mockScenario: scenarioFor({}) });

  test('reopening read-only offers a fork that links and pre-fills the handoff', async ({
    window: page,
    userDataDir,
  }) => {
    const workspaceRoot = workspaceRootFor(userDataDir);
    await firstOpen(page);
    const projectId = await ensureProject(page, dir);
    await reopenAfterReload(page);
    const sessionId = await persistAndReopen(page, projectId);

    // Reopening alone must not have concluded anything: the first prompt is
    // what probes the harness's real capabilities.
    await expect(page.getByTestId('chat-read-only')).toHaveCount(0);
    await sendPrompt(page, 'keep going');

    await expect(page.getByTestId('chat-read-only')).toBeVisible();
    await expect(page.getByTestId('chat-read-only-reason')).toContainText(/cannot continue|does not implement/);
    // Read-only means read-only: no second turn ran.
    await expect(page.getByTestId('chat-message-agent')).toHaveCount(1);
    await expect(page.getByTestId('chat-input')).toBeDisabled();

    await page.getByTestId('chat-fork').click();
    // The handoff is a DRAFT. Nothing was sent.
    await expect(page.getByTestId('chat-input')).toHaveValue(/Continuing from "Remember me"/);
    await expect(page.getByTestId('chat-input')).toBeEnabled();
    await expect(page.getByTestId('chat-message-user')).toHaveCount(0);

    const forkId = (await page
      .locator('[data-testid="session-row"][data-active="true"]')
      .getAttribute('data-session-id'))!;
    expect(forkId).not.toBe(sessionId);

    // Lineage is on disk, both ways, and navigable in the list.
    const child = await readMeta(workspaceRoot, projectId, forkId);
    expect(child.parentSessionId).toBe(sessionId);
    expect(child.idempotencyKey).toBeTruthy();
    await expect
      .poll(async () => (await readMeta(workspaceRoot, projectId, sessionId)).forkedSessionIds)
      .toEqual([forkId]);
    await expect(sessionRow(page, forkId).getByTestId('session-lineage')).toHaveAttribute(
      'data-target-session-id',
      sessionId,
    );

    // The fork is a real, working session: sending the handoff runs a turn.
    await page.getByTestId('chat-send').click();
    await expect(page.getByTestId('chat-send')).toHaveText('Send');
    await expect(page.getByTestId('chat-message-agent').first()).toContainText('Working... done.');
  });
});
