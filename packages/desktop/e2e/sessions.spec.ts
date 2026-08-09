import type { Page } from '@playwright/test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { completeOnboarding, expect, test, waitForDesktopReady, workspaceRootFor } from './fixtures';

/**
 * Concurrent sessions + session list E2E (PHASE-24, STEP-24-03).
 *
 * Drives the real stack: two mock agent processes running at once in two
 * different projects, each writing its own `projects/<id>/sessions/<id>/`
 * through the real `SessionStore`, then read back both through the list UI and
 * straight off disk. Reading the files is the point — the DOM alone cannot tell
 * a transcript that was persisted from one that only ever lived in memory.
 *
 * The workspace is the test's own `SRGNT_DEFAULT_WORKSPACE_ROOT` (a sibling of
 * the user-data dir), so nothing is ever written to `~/srgnt-workspace`.
 */

test.use({
  mockScenario: {
    name: 'e2e-concurrent-sessions',
    directives: [
      // Chunked and slow enough that a second session can be started while this
      // turn is still streaming — "concurrent" has to be real, not asserted.
      { type: 'emit_chunks', channel: 'agent', chunks: ['Working', '.', '.', '.'], delayMs: 60 },
      { type: 'emit_chunks', channel: 'agent', chunks: [' done.'], delayMs: 10 },
    ],
  },
});

/** Enter the Chat panel. Remounts the side panel, which re-reads both lists. */
async function enterChat(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Notes', exact: true }).click();
  await page.getByRole('button', { name: 'Chat', exact: true }).click();
  await expect(page.getByTestId('chat-view')).toBeVisible();
  await expect(page.getByTestId('session-list-panel')).toBeVisible();
}

/** First entry of a fresh app: onboard, then open Chat. */
async function firstOpen(page: Page): Promise<void> {
  await completeOnboarding(page);
  await page.getByRole('button', { name: 'Chat', exact: true }).click();
  await expect(page.getByTestId('chat-view')).toBeVisible();
}

/** After a reload the app is already onboarded — do not run onboarding again. */
async function reopenAfterReload(page: Page): Promise<void> {
  await page.reload();
  await waitForDesktopReady(page);
  await page.getByRole('button', { name: 'Chat', exact: true }).click();
  await expect(page.getByTestId('chat-view')).toBeVisible();
  await expect(page.getByTestId('session-list-panel')).toBeVisible();
}

/** Materialize a project through the real IPC surface (the auto-create path). */
async function ensureProject(page: Page, rootDir: string): Promise<string> {
  const project = await page.evaluate(async (dir) => window.srgnt.projectEnsure!(dir), rootDir);
  return project.id;
}

function projectRow(page: Page, projectId: string) {
  return page.locator(`[data-testid="project-row"][data-project-id="${projectId}"]`);
}

function sessionRow(page: Page, sessionId: string) {
  return page.locator(`[data-testid="session-row"][data-session-id="${sessionId}"]`);
}

async function selectProject(page: Page, projectId: string): Promise<void> {
  await projectRow(page, projectId).getByTestId('project-select').click();
  await expect(projectRow(page, projectId)).toHaveAttribute('data-active', 'true');
}

/**
 * Starts a session in the currently active project and returns its srgnt id,
 * read off the row the list marks active. `session-new` (not the header button)
 * because the header only offers "Start session" while nothing is open.
 */
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

function sessionDir(workspaceRoot: string, projectId: string, sessionId: string): string {
  return path.join(workspaceRoot, 'projects', projectId, 'sessions', sessionId);
}

test.describe('concurrent sessions across projects', () => {
  let base = '';
  let dirA = '';
  let dirB = '';

  test.beforeEach(async () => {
    base = await fs.mkdtemp(path.join(os.tmpdir(), 'srgnt-e2e-sessions-'));
    dirA = path.join(base, 'alpha');
    dirB = path.join(base, 'bravo');
    await fs.mkdir(dirA, { recursive: true });
    await fs.mkdir(dirB, { recursive: true });
  });

  test.afterEach(async () => {
    await fs.rm(base, { recursive: true, force: true });
  });

  test('runs a session in each project, persists both, and switches between them', async ({
    window: page,
    userDataDir,
  }) => {
    const workspaceRoot = workspaceRootFor(userDataDir);
    await firstOpen(page);
    const idA = await ensureProject(page, dirA);
    const idB = await ensureProject(page, dirB);
    // Re-entering the panel is what makes the switcher re-read the two projects
    // that were just created behind its back.
    await enterChat(page);
    await expect(page.getByTestId('session-list-empty')).toBeVisible();

    // Session in project A, prompted and left streaming.
    await selectProject(page, idA);
    const sessionA = await startSession(page);
    await sendPrompt(page, 'Alpha work item\nsecond line, not part of the title');
    // The dot goes live the moment the prompt is sent — no disk read needed.
    await expect(sessionRow(page, sessionA).getByTestId('session-status')).toHaveAttribute(
      'data-status',
      'active',
    );

    // Switching projects mid-turn is allowed since STEP-24-03: the running agent
    // stays in its own directory, only the NEXT session opens somewhere else.
    await selectProject(page, idB);
    const sessionB = await startSession(page);
    expect(sessionB).not.toBe(sessionA);
    await sendPrompt(page, 'Bravo work item');

    // Project B's list shows only B's session — sessions are scoped per project.
    await expect(sessionRow(page, sessionB)).toBeVisible();
    await expect(sessionRow(page, sessionA)).toHaveCount(0);
    await expect(page.getByTestId('project-sessions-elsewhere')).toContainText('1 session');

    // Both turns complete, each in its own transcript.
    await expect(page.getByTestId('chat-send')).toHaveText('Send');
    await expect(page.getByTestId('chat-message-agent').first()).toContainText('Working... done.');
    await expect(page.getByTestId('chat-message-user').first()).toContainText('Bravo work item');
    await expect(page.getByTestId('chat-view')).not.toContainText('Alpha work item');

    // Titles derive from the first line of the FIRST prompt, and persist.
    await expect(sessionRow(page, sessionB)).toContainText('Bravo work item');
    await selectProject(page, idA);
    await expect(sessionRow(page, sessionA)).toContainText('Alpha work item');
    await expect(sessionRow(page, sessionA)).not.toContainText('second line');

    // Switching back to A shows A's transcript, complete — the background
    // session kept accumulating while B was on screen.
    await sessionRow(page, sessionA).getByTestId('session-open').click();
    await expect(page.getByTestId('chat-message-user').first()).toContainText('Alpha work item');
    await expect(page.getByTestId('chat-message-agent').first()).toContainText('Working... done.');
    await expect(page.getByTestId('chat-view')).not.toContainText('Bravo work item');

    // The real proof of persistence: two separate logs on disk, each holding
    // only its own prompt. A DOM-only assertion cannot tell these apart.
    const logA = await fs.readFile(path.join(sessionDir(workspaceRoot, idA, sessionA), 'events.jsonl'), 'utf8');
    const logB = await fs.readFile(path.join(sessionDir(workspaceRoot, idB, sessionB), 'events.jsonl'), 'utf8');
    expect(logA).toContain('Alpha work item');
    expect(logA).not.toContain('Bravo work item');
    expect(logB).toContain('Bravo work item');
    expect(logB).not.toContain('Alpha work item');
    // The audit trail the transcript replays from.
    expect(logA).toContain('client/prompt');
    expect(logA).toContain('acp/session_update');
    expect(logA).toContain('client/stop');

    const metaA = JSON.parse(
      await fs.readFile(path.join(sessionDir(workspaceRoot, idA, sessionA), 'meta.json'), 'utf8'),
    ) as { title?: string; status: string; harnessId: string; acpSessionId?: string };
    expect(metaA.title).toBe('Alpha work item');
    expect(metaA.harnessId).toBe('mock');
    expect(metaA.status).toBe('idle');
    // The srgnt id is NOT the ACP id: the mock hands out one fixed ACP id for
    // every session, so a collision would be guaranteed if they were the same.
    expect(metaA.acpSessionId).not.toBe(sessionA);
  });

  test('lists and replays a persisted session after a reload, spawning nothing', async ({
    window: page,
    userDataDir,
  }) => {
    const workspaceRoot = workspaceRootFor(userDataDir);
    await firstOpen(page);
    const idA = await ensureProject(page, dirA);
    await enterChat(page);

    await selectProject(page, idA);
    const sessionA = await startSession(page);
    await sendPrompt(page, 'Remember me');
    await expect(page.getByTestId('chat-send')).toHaveText('Send');
    // End the session so nothing at all is live across the reload.
    await page.getByTestId('chat-dispose').click();
    await expect(page.getByTestId('chat-new-session')).toBeVisible();

    await reopenAfterReload(page);
    await selectProject(page, idA);

    // The list renders from disk alone — this renderer has nothing open, and
    // main did not spawn anything to answer the read.
    await expect(sessionRow(page, sessionA)).toContainText('Remember me');
    await expect(sessionRow(page, sessionA).getByTestId('session-status')).toHaveAttribute(
      'data-status',
      'closed',
    );
    await expect(page.getByTestId('chat-new-session')).toBeVisible();

    // Opening it replays the transcript from `events.jsonl`, still no spawn.
    await sessionRow(page, sessionA).getByTestId('session-open').click();
    await expect(page.getByTestId('chat-message-user').first()).toContainText('Remember me');
    await expect(page.getByTestId('chat-message-agent').first()).toContainText('Working... done.');

    const meta = JSON.parse(
      await fs.readFile(path.join(sessionDir(workspaceRoot, idA, sessionA), 'meta.json'), 'utf8'),
    ) as { status: string };
    expect(meta.status).toBe('closed');
  });
});
