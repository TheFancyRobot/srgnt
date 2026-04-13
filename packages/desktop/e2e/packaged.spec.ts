import { test, expect, _electron as electron } from '@playwright/test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { waitForDesktopReady } from './fixtures';

test.skip(process.platform !== 'linux', 'Packaged smoke test is currently Linux-only.');

test('launches the packaged Linux build and shows first-run onboarding', async () => {
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'srgnt-packaged-e2e-'));
  const executablePath = path.join(process.cwd(), 'release', 'linux-unpacked', 'srgnt');

  const electronApp = await electron.launch({
    executablePath,
    env: {
      ...process.env,
      ELECTRON_DISABLE_SECURITY_WARNINGS: 'true',
      SRGNT_E2E: '1',
      SRGNT_USER_DATA_PATH: userDataDir,
    },
  });

  try {
    const page = await electronApp.firstWindow();
    await waitForDesktopReady(page);

    await expect(page.getByRole('heading', { name: 'Create Your Workspace' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Skip setup' })).toBeVisible();

    const appState = await electronApp.evaluate(async ({ app }) => ({
      isPackaged: app.isPackaged,
      userDataPath: app.getPath('userData'),
    }));

    expect(appState.isPackaged).toBe(true);
    expect(appState.userDataPath).toBe(userDataDir);

    const rendererState = await page.evaluate(() => ({
      hasApi: typeof window.srgnt?.getWorkspaceRoot === 'function',
      hasProcess: typeof globalThis.process !== 'undefined',
      hasRequire: typeof globalThis.require !== 'undefined',
    }));

    expect(rendererState.hasApi).toBe(true);
    expect(rendererState.hasProcess).toBe(false);
    expect(rendererState.hasRequire).toBe(false);
  } finally {
    await electronApp.close();
    await fs.rm(userDataDir, { recursive: true, force: true });
  }
});

/**
 * BUG-0014: Arrow key stack overflow in the packaged Electron app.
 *
 * The bug is Electron-specific: unit tests for 200 rapid arrow presses pass in jsdom,
 * but the user confirms the stack overflow still happens in the real Electron app.
 *
 * Suspicion: `livePreviewPlugin` from `codemirror-live-markdown` rebuilds decorations on
 * `selectionSet` (every arrow key). On large documents, this could cause a recursive loop
 * if the decoration rebuild triggers a state update that itself fires `selectionSet`.
 *
 * Test strategy: Open a large document (313 lines), navigate ALL the way down with ArrowDown,
 * then ALL the way back up with ArrowUp, and monitor the browser dev console for stack overflow
 * errors.
 */
test('BUG-0014: rapid arrow key navigation through large document does not stack overflow (packaged Linux)', async () => {
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'srgnt-bug-0014-'));
  const executablePath = path.join(process.cwd(), 'release', 'linux-unpacked', 'srgnt');

  const electronApp = await electron.launch({
    executablePath,
    env: {
      ...process.env,
      ELECTRON_DISABLE_SECURITY_WARNINGS: 'true',
      SRGNT_E2E: '1',
      SRGNT_USER_DATA_PATH: userDataDir,
    },
  });

  try {
    const page = await electronApp.firstWindow();
    await waitForDesktopReady(page);

    // Complete onboarding to reach the main app
    await page.getByRole('button', { name: 'Create Workspace' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Get Started' }).click();
    await expect(page.getByRole('button', { name: 'Daily Dashboard' })).toHaveAttribute('aria-pressed', 'true');

    // Determine workspace root from the created workspace
    const workspaceRoot = await page.evaluate(async () => {
      return await window.srgnt.getWorkspaceRoot();
    });

    // Copy the large test document into the workspace Notes folder
    const srcNote = path.join(os.homedir(), 'srgnt-workspace', 'Notes', 'Your mom.md');
    const notesDir = path.join(workspaceRoot, 'Notes');
    await fs.mkdir(notesDir, { recursive: true });
    await fs.copyFile(srcNote, path.join(notesDir, 'Your mom.md'));

    // Reload to pick up the new note
    await page.reload();
    await waitForDesktopReady(page);

    // Collect console errors and page errors (stack overflow will appear as one of these)
    const rendererErrors: { type: string; message: string; stack?: string }[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        rendererErrors.push({ type: 'console.error', message: msg.text() });
      }
    });
    page.on('pageerror', (err) => {
      rendererErrors.push({ type: 'pageerror', message: String(err), stack: err.stack });
    });

    // Navigate to Notes and open the large document
    await page.getByRole('button', { name: 'Notes' }).click();
    await page.getByRole('treeitem', { name: /Your mom\.md/ }).click();
    await expect(page.getByRole('heading', { name: 'Your mom.md' })).toBeVisible();

    // Focus the editor
    await page.locator('.cm-content').click();

    // Navigate to the END of the document (ArrowDown until no further movement)
    // We press 400 times to be safe (the doc has 313 lines)
    for (let i = 0; i < 400; i++) {
      await page.keyboard.press('ArrowDown');
    }

    // Navigate back to the TOP of the document (ArrowUp until no further movement)
    for (let i = 0; i < 400; i++) {
      await page.keyboard.press('ArrowUp');
    }

    // Allow time for any async errors to surface
    await page.waitForTimeout(500);

    // Check for stack overflow errors
    const stackOverflowErrors = rendererErrors.filter((e) =>
      e.message.includes('Maximum call stack size exceeded')
      || e.message.includes('call stack')
      || e.stack?.includes('Maximum call stack size exceeded'),
    );

    if (stackOverflowErrors.length > 0) {
      // Report the bug with captured stack traces
      console.error('BUG-0014 REPRODUCED: Stack overflow detected during arrow navigation');
      stackOverflowErrors.forEach((err) => {
        console.error(`  [${err.type}] ${err.message}`);
        if (err.stack) console.error(`  Stack: ${err.stack}`);
      });
    }

    // Assert no stack overflow occurred
    expect(stackOverflowErrors, 'Stack overflow should NOT occur during arrow key navigation').toHaveLength(0);
  } finally {
    await electronApp.close();
    await fs.rm(userDataDir, { recursive: true, force: true });
  }
});