import type { Page } from '@playwright/test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { completeOnboarding, expect, test } from './fixtures';

/**
 * Harness settings E2E (PHASE-25, STEP-25-02).
 *
 * Drives the real stack the unit tests stub on both sides: the renderer section
 * → `harness:*` IPC → the main-process harnesses service → `harnesses.json` on
 * disk, then back out through a fresh list. What it proves that a component
 * test cannot: the section is actually mounted in Settings, the preload bridge
 * exists, and a saved override lands as a file the registry re-reads.
 *
 * No agent is ever spawned here — this is configuration, and the "applies to
 * new sessions" promise is asserted at the service/connector seam in
 * `src/main/services/harnesses.test.ts`.
 */

async function openHarnessSettings(page: Page, workspaceRoot: string): Promise<void> {
  await completeOnboarding(page);
  // Re-root into this test's own temp workspace: `harnesses.json` is workspace
  // data, and the default root is the developer's real one.
  await page.evaluate(async (root) => window.srgnt.setWorkspaceRoot(root), workspaceRoot);
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  // Remount so the section lists against the re-rooted workspace.
  await page.getByRole('button', { name: 'Notes' }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByTestId('harness-settings')).toBeVisible();
}

const card = (page: Page, id: string) => page.locator(`[data-testid="harness-card"][data-harness-id="${id}"]`);

test.describe('harness settings', () => {
  let workspaceRoot = '';

  test.beforeEach(async () => {
    workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'srgnt-e2e-harnesses-'));
  });

  test.afterEach(async () => {
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  });

  test('lists both built-in harnesses with a detection chip', async ({ window: page }) => {
    await openHarnessSettings(page, workspaceRoot);

    await expect(card(page, 'pi')).toBeVisible();
    await expect(card(page, 'opencode')).toBeVisible();
    // Whatever this machine has installed, the chip must report one of the
    // three states rather than rendering blank.
    const status = await card(page, 'pi').getByTestId('harness-detection').getAttribute('data-status');
    expect(['ok', 'probe-failed', 'not-installed']).toContain(status);
  });

  test('saves a binary-path override to harnesses.json, badges it, and resets', async ({ window: page }) => {
    await openHarnessSettings(page, workspaceRoot);

    await card(page, 'pi').getByTestId('harness-command').fill('/fake/bin/agent-a');
    await card(page, 'pi').getByTestId('harness-save').click();
    await expect(card(page, 'pi').getByTestId('harness-overridden')).toBeVisible();

    const file = path.join(workspaceRoot, 'harnesses.json');
    const stored = JSON.parse(await fs.readFile(file, 'utf8')) as {
      harnesses: { id: string; launch: { command: string }; quirks: string[]; capabilityOverrides: Record<string, boolean> }[];
    };
    expect(stored.harnesses).toHaveLength(1);
    expect(stored.harnesses[0]?.launch.command).toBe('/fake/bin/agent-a');
    // The wholesale-replace registry makes a partial save destructive, so the
    // fields the editor never showed must still be there.
    expect(stored.harnesses[0]?.quirks).toContain('adapter-mediated');
    expect(stored.harnesses[0]?.capabilityOverrides).toEqual({ mcpServers: false });
    // Workspace config is owner-only.
    expect((await fs.stat(file)).mode & 0o777).toBe(0o600);

    await card(page, 'pi').getByTestId('harness-reset').click();
    await expect(card(page, 'pi').getByTestId('harness-overridden')).toHaveCount(0);
    expect(JSON.parse(await fs.readFile(file, 'utf8')).harnesses).toEqual([]);
  });

  test('refuses a secret literal and leaves the file untouched', async ({ window: page }) => {
    await openHarnessSettings(page, workspaceRoot);

    await card(page, 'pi').getByTestId('harness-env-add').click();
    await card(page, 'pi').getByTestId('harness-env-key').fill('GITHUB_TOKEN');
    await card(page, 'pi').getByTestId('harness-env-value').fill('ghp_realtokenvalue');
    await card(page, 'pi').getByTestId('harness-save').click();

    await expect(card(page, 'pi').getByTestId('harness-error')).toContainText('GITHUB_TOKEN');
    await expect(card(page, 'pi').getByTestId('harness-error')).toContainText('${env:');
    // Nothing was written: the seeded file is untouched and the token never
    // reached the disk at all.
    const raw = await fs.readFile(path.join(workspaceRoot, 'harnesses.json'), 'utf8');
    expect(JSON.parse(raw).harnesses).toEqual([]);
    expect(raw).not.toContain('ghp_realtokenvalue');
  });

  test('surfaces an unreadable harnesses.json instead of overwriting it', async ({ window: page }) => {
    const file = path.join(workspaceRoot, 'harnesses.json');
    const broken = '{ "version": 1, "harnesses": [ { "id": "inhouse", "name": 42 } ] }';
    await fs.writeFile(file, broken, 'utf8');

    await openHarnessSettings(page, workspaceRoot);
    await expect(page.getByTestId('harness-workspace-error')).toContainText('harnesses.json');
    // Built-ins still render and still work.
    await expect(card(page, 'pi')).toBeVisible();

    await card(page, 'pi').getByTestId('harness-command').fill('/fake/bin/agent-a');
    await card(page, 'pi').getByTestId('harness-save').click();
    await expect(card(page, 'pi').getByTestId('harness-error')).toContainText('harnesses.json');
    // The file the product could not parse is still the user's data.
    expect(await fs.readFile(file, 'utf8')).toBe(broken);
  });
});
