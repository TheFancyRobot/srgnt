import type { Page } from '@playwright/test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { completeOnboarding, expect, test } from './fixtures';

/**
 * Project switcher E2E (PHASE-24, STEP-24-02).
 *
 * Drives the real stack: `project:*` IPC → the main-process projects service →
 * `ProjectStore` writing `projects/<id>/project.json` under the app's real
 * workspace, then back through the switcher UI.
 *
 * Two projects need two directories, and the only way to name a directory from
 * the renderer is `projectEnsure` — the same idempotent call the auto-create
 * path uses — so the spec calls it through the preload bridge rather than
 * inventing a test-only backdoor. Starting a session is what reloads the list
 * (it may have just auto-created a project), so it doubles as the refresh.
 */

/**
 * Onboard, then move the workspace to this test's own temp root.
 *
 * Onboarding's "Use Default Location" lands on the real `~/srgnt-workspace`,
 * which is shared across runs — projects written there would leak between tests
 * (and a previous run's deleted temp checkout would make session creation fail
 * on a rootDir that no longer exists). Re-rooting also exercises the workspace
 * hook the projects service re-roots through.
 */
async function openChatPanel(page: Page, workspaceRoot: string): Promise<void> {
  await completeOnboarding(page);
  await page.evaluate(async (root) => window.srgnt.setWorkspaceRoot(root), workspaceRoot);
  // Re-entering the panel remounts the switcher, which re-reads the now
  // re-rooted project list.
  await page.getByRole('button', { name: 'Chat', exact: true }).click();
  await expect(page.getByTestId('chat-view')).toBeVisible();
  await expect(page.getByTestId('project-switcher')).toBeVisible();
}

/** Materialize a project for `rootDir` through the real IPC surface. */
async function ensureProject(page: Page, rootDir: string): Promise<string> {
  const project = await page.evaluate(async (dir) => window.srgnt.projectEnsure!(dir), rootDir);
  return project.id;
}

/** `mock` is the default target; the session also refreshes the project list. */
async function startSession(page: Page): Promise<void> {
  await page.getByTestId('chat-new-session').click();
  await expect(page.getByTestId('chat-session-badge')).toBeVisible();
  await expect(page.getByTestId('project-list')).toBeVisible();
}

/**
 * Ends the session opened by {@link startSession}. Since STEP-24-03 switching
 * projects no longer needs this — several sessions run at once across projects
 * — but the merge spec still wants a quiet app before it moves sessions around.
 */
async function endSession(page: Page): Promise<void> {
  await page.getByTestId('chat-dispose').click();
  await expect(page.getByTestId('chat-new-session')).toBeVisible();
}

function row(page: Page, projectId: string) {
  return page.locator(`[data-testid="project-row"][data-project-id="${projectId}"]`);
}

test.describe('project switcher', () => {
  let dirA = '';
  let dirB = '';
  let base = '';
  let workspaceRoot = '';

  test.beforeEach(async () => {
    // Same basename on purpose: only the rootDir hint distinguishes the rows.
    base = await fs.mkdtemp(path.join(os.tmpdir(), 'srgnt-e2e-projects-'));
    workspaceRoot = path.join(base, 'workspace-root');
    dirA = path.join(base, 'one', 'workspace');
    dirB = path.join(base, 'two', 'workspace');
    await fs.mkdir(workspaceRoot, { recursive: true });
    await fs.mkdir(dirA, { recursive: true });
    await fs.mkdir(dirB, { recursive: true });
  });

  test.afterEach(async () => {
    await fs.rm(base, { recursive: true, force: true });
  });

  test('auto-creates a project for the session directory', async ({ window: page }) => {
    await openChatPanel(page, workspaceRoot);
    // No project has ever been created for this workspace.
    await expect(page.getByTestId('project-empty')).toBeVisible();

    await startSession(page);

    // Starting a session in a directory with no project materializes one.
    await expect(page.getByTestId('project-row')).toHaveCount(1);
    await expect(page.getByTestId('project-active-name')).toBeVisible();
  });

  test('lists two projects with rootDir hints, switches, and renames', async ({ window: page }) => {
    await openChatPanel(page, workspaceRoot);

    const idA = await ensureProject(page, dirA);
    const idB = await ensureProject(page, dirB);
    expect(idA).not.toBe(idB);
    // Re-ensuring the same directory is idempotent: the id is derived, not new.
    expect(await ensureProject(page, dirA)).toBe(idA);

    await startSession(page);

    await expect(row(page, idA)).toBeVisible();
    await expect(row(page, idB)).toBeVisible();
    // Same name, so the rootDir hint is what makes them distinguishable.
    await expect(row(page, idA)).toContainText(dirA);
    await expect(row(page, idB)).toContainText(dirB);

    // STEP-24-02 refused this while a session was live. Since STEP-24-03 every
    // session carries its own projectId and cwd and several run at once, so
    // switching only changes where the NEXT session opens — the running agent
    // stays in its own directory and the panel says so.
    await expect(row(page, idB).getByTestId('project-select')).toBeEnabled();
    await expect(page.getByTestId('project-switch-locked')).toHaveCount(0);
    await endSession(page);

    await row(page, idB).getByTestId('project-select').click();
    await expect(row(page, idB)).toHaveAttribute('data-active', 'true');
    await expect(row(page, idA)).toHaveAttribute('data-active', 'false');
    await expect(page.getByTestId('project-active-name')).toHaveText('workspace');

    // Rename keeps the id — the row is still found by it — and shows at once.
    await row(page, idB).getByTestId('project-rename').click();
    await page.getByTestId('project-rename-input').fill('Second Checkout');
    await page.getByTestId('project-rename-input').press('Enter');
    await expect(row(page, idB)).toContainText('Second Checkout');
    await expect(row(page, idB)).toHaveAttribute('data-active', 'true');
    await expect(page.getByTestId('project-active-name')).toHaveText('Second Checkout');
  });

  test('merges one project into the active one behind an explicit confirm', async ({ window: page }) => {
    await openChatPanel(page, workspaceRoot);
    const idA = await ensureProject(page, dirA);
    const idB = await ensureProject(page, dirB);
    await startSession(page);
    // Selecting a project is blocked while a session is live; end it first.
    await endSession(page);

    await row(page, idA).getByTestId('project-select').click();
    await expect(row(page, idA)).toHaveAttribute('data-active', 'true');

    // The destructive action is unreachable until a source is chosen.
    await expect(page.getByTestId('project-merge-confirm')).toHaveCount(0);
    await page.getByTestId('project-merge-source').selectOption(idB);
    await expect(page.getByTestId('project-merge-confirm')).toContainText('cannot be undone');

    // Cancelling leaves both projects alone.
    await page.getByTestId('project-merge-cancel').click();
    await expect(page.getByTestId('project-merge-confirm')).toHaveCount(0);
    await expect(row(page, idB)).toBeVisible();

    await page.getByTestId('project-merge-source').selectOption(idB);
    await page.getByTestId('project-merge-apply').click();

    await expect(row(page, idB)).toHaveCount(0);
    await expect(row(page, idA)).toHaveAttribute('data-active', 'true');
  });
});
