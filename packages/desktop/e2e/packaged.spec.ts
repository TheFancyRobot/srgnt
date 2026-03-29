import { test, expect, _electron as electron } from '@playwright/test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

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
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByRole('heading', { name: 'Create Your Workspace' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Skip setup' })).toBeVisible();

    const appState = await electronApp.evaluate(async ({ app }) => ({
      isPackaged: app.isPackaged,
      userDataPath: app.getPath('userData'),
    }));

    expect(appState.isPackaged).toBe(true);
    expect(appState.userDataPath).toBe(userDataDir);

    const rendererState = await page.evaluate(() => ({
      hasApi: typeof window.srgnt?.getAppVersion === 'function',
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
