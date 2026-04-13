import { test as base, expect, _electron as electron } from '@playwright/test';
import type { ElectronApplication, Page } from '@playwright/test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

interface E2EFixtures {
  electronApp: ElectronApplication;
  window: Page;
  userDataDir: string;
}

export const test = base.extend<E2EFixtures>({
  userDataDir: async ({}, use, testInfo) => {
    const slug = testInfo.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), `srgnt-e2e-${slug || 'test'}-`));

    try {
      await use(userDataDir);
    } finally {
      await fs.rm(userDataDir, { recursive: true, force: true });
    }
  },

  electronApp: async ({ userDataDir }, use) => {
    const electronApp = await electron.launch({
      args: ['.'],
      env: {
        ...process.env,
        ELECTRON_DISABLE_SECURITY_WARNINGS: 'true',
        SRGNT_E2E: '1',
        SRGNT_USER_DATA_PATH: userDataDir,
      },
    });

    try {
      await use(electronApp);
    } finally {
      await electronApp.close();
    }
  },

  window: async ({ electronApp }, use) => {
    const window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
    await use(window);
  },
});

export { expect };

/**
 * Disable CSS animations and transitions for deterministic screenshots.
 * Injects a style rule that forces animation-duration and transition-duration to 0.
 */
export async function disableAnimations(window: Page): Promise<void> {
  await window.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    `,
  });
}

export async function waitForDesktopReady(window: Page): Promise<void> {
  await window.waitForLoadState('domcontentloaded');
  await expect(window.locator('body')).toBeVisible();

  const onboardingHeading = window.getByRole('heading', { name: 'Create Your Workspace' });
  const dashboardButton = window.getByRole('button', { name: 'Daily Dashboard' });

  await expect
    .poll(async () => {
      if (await onboardingHeading.count()) {
        return 'onboarding';
      }
      if (await dashboardButton.count()) {
        return 'app';
      }
      return 'loading';
    })
    .not.toBe('loading');
}

export async function completeOnboarding(window: Page): Promise<void> {
  await waitForDesktopReady(window);
  await expect(window.getByRole('heading', { name: 'Create Your Workspace' })).toBeVisible();
  await window.getByRole('button', { name: 'Create Workspace' }).click();
  await window.getByRole('button', { name: 'Next' }).click();
  await expect(window.getByRole('heading', { name: 'Know What Connects First' })).toBeVisible();
  await window.getByRole('button', { name: 'Next' }).click();
  await expect(window.getByRole('heading', { name: "You're All Set" })).toBeVisible();
  await window.getByRole('button', { name: 'Get Started' }).click();
  await expect(window.getByRole('button', { name: 'Daily Dashboard' })).toHaveAttribute('aria-pressed', 'true');
  await expect(window.getByRole('heading', { name: 'Priorities' })).toBeVisible();
}
