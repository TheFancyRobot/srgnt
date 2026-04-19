import { test, expect, _electron as electron } from '@playwright/test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { completeOnboarding, getElectronLaunchArgs, getElectronLaunchEnv, waitForDesktopReady } from './fixtures';

test('BUG-0013 visual: heading whitespace fix verification', async ({}, testInfo) => {
  test.setTimeout(60_000);
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'srgnt-bug-0013-'));
  const executablePath = path.join(process.cwd(), 'release', 'linux-unpacked', 'srgnt');

  const electronApp = await electron.launch({
    executablePath,
    args: getElectronLaunchArgs(),
    env: getElectronLaunchEnv(userDataDir),
  });

  try {
    const page = await electronApp.firstWindow();
    await waitForDesktopReady(page);

    // Complete onboarding when needed.
    if (await page.getByRole('button', { name: 'Create Workspace' }).count()) {
      await completeOnboarding(page);
    }

    // Get workspace and write test note content directly
    const workspaceRoot = await page.evaluate(async () => window.srgnt.getWorkspaceRoot());
    const notesDir = path.join(workspaceRoot, 'Notes');
    await fs.mkdir(notesDir, { recursive: true });
    await fs.writeFile(
      path.join(notesDir, 'Your mom.md'),
      '# Your mom\n\n## First heading\n\nSome text\n\n## Second heading\n\nMore text\n',
      'utf8',
    );

    await page.reload();
    await waitForDesktopReady(page);

    // Navigate to Notes
    await page.getByRole('button', { name: 'Notes' }).click();
    const noteTreeItem = page.getByRole('treeitem', { name: /Your mom\.md/ });
    await expect(noteTreeItem).toBeVisible();
    await noteTreeItem.evaluate((element) => {
      (element as HTMLElement).click();
    });
    await expect(noteTreeItem).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('heading', { name: 'Your mom.md' })).toBeVisible({ timeout: 10_000 });

    // Focus editor
    await page.locator('.cm-content').click();

    // Navigate to a heading (ArrowUp a few times from top)
    for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(200);

    // Screenshot: non-active heading (should have NO whitespace gap)
    await page.screenshot({ path: testInfo.outputPath('non-active-heading.png') });

    // Click on heading to make it active
    const editor = page.locator('.cm-content');
    const box = await editor.boundingBox();
    if (box) {
      // Click at different vertical positions to hit different headings
      for (const yOffset of [50, 100, 150, 200]) {
        await page.mouse.click(box.x + 50, box.y + yOffset);
        await page.waitForTimeout(100);
      }
    }

    // Screenshot: active heading with syntax visible
    await page.screenshot({ path: testInfo.outputPath('active-heading.png') });

    // Navigate through document to see various formatting
    for (let i = 0; i < 20; i++) await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);
    await page.screenshot({ path: testInfo.outputPath('various-formatting.png') });

  } finally {
    await electronApp.close();
    await fs.rm(userDataDir, { recursive: true, force: true });
  }
});
