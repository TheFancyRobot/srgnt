import { test as base, expect, _electron as electron } from '@playwright/test';
import type { ElectronApplication, Page } from '@playwright/test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

interface E2EFixtures {
  electronApp: ElectronApplication;
  window: Page;
  userDataDir: string;
  /**
   * The mock agent's `expect_*` failures for the turns run so far, read back out
   * of the spawned process. Empty when the scenario made no assertions or all of
   * them held — a UI that renders correctly but answers a permission request
   * with the wrong option is only visible here.
   */
  agentAssertions: () => Promise<readonly string[]>;
}

interface E2EOptions {
  /**
   * Scenario the built-in mock agent replays instead of the app's demo script.
   * Set per test/describe with `test.use({ mockScenario: {...} })`; it is written
   * into the test's own temp dir and injected via `SRGNT_MOCK_SCENARIO`.
   */
  mockScenario: unknown;
}

/** Written next to the scenario by the mock bin; see `mockLaunchSpec`. */
const ASSERTIONS_FILE = 'mock-assertions.json';
const SCENARIO_FILE = 'scenario.json';

function shouldDisableElectronSandbox(): boolean {
  return process.platform === 'linux' && (process.env.CI === 'true' || process.env.SRGNT_E2E_DISABLE_SANDBOX === '1');
}

export function getElectronLaunchArgs(baseArgs: string[] = []): string[] {
  return shouldDisableElectronSandbox() ? [...baseArgs, '--no-sandbox'] : baseArgs;
}

export function getElectronLaunchEnv(
  userDataDir: string,
  extra: NodeJS.ProcessEnv = {},
): NodeJS.ProcessEnv {
  return {
    ...process.env,
    ELECTRON_DISABLE_SECURITY_WARNINGS: 'true',
    SRGNT_E2E: '1',
    SRGNT_USER_DATA_PATH: userDataDir,
    // Onboarding's "Use Default Location" otherwise picks $HOME/srgnt-workspace
    // — the developer's real one. Each test gets its own instead, so a run
    // cannot leave notes or auto-created projects on the machine.
    SRGNT_DEFAULT_WORKSPACE_ROOT: path.join(userDataDir, 'workspace'),
    ...extra,
  };
}

export const test = base.extend<E2EFixtures & E2EOptions>({
  mockScenario: [undefined, { option: true }],

  agentAssertions: async ({ userDataDir }, use) => {
    await use(async () => {
      // Deliberately NOT caught. The bin rewrites this file at the end of every
      // completed turn — `[]` when the scenario asserted nothing — so a missing
      // or unparseable file means the channel itself broke: the `--assertions`
      // wiring regressed, the child died mid-turn, or the write failed. Turning
      // that into `[]` would make `expect(await agentAssertions()).toEqual([])`
      // pass no matter what the renderer sent, which is the exact vacuity this
      // channel exists to remove.
      const raw = await fs.readFile(path.join(userDataDir, ASSERTIONS_FILE), 'utf8');
      return JSON.parse(raw) as string[];
    });
  },

  userDataDir: async ({}, use, testInfo) => {
    const slug = testInfo.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), `srgnt-e2e-${slug || 'test'}-`));

    try {
      await use(userDataDir);
    } finally {
      await fs.rm(userDataDir, { recursive: true, force: true });
    }
  },

  electronApp: async ({ userDataDir, mockScenario }, use) => {
    let extraEnv: NodeJS.ProcessEnv = {};
    if (mockScenario !== undefined) {
      const scenarioPath = path.join(userDataDir, SCENARIO_FILE);
      await fs.writeFile(scenarioPath, JSON.stringify(mockScenario));
      extraEnv = { SRGNT_MOCK_SCENARIO: scenarioPath };
    }
    const electronApp = await electron.launch({
      args: getElectronLaunchArgs(['.']),
      env: getElectronLaunchEnv(userDataDir, extraEnv),
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
  const notesButton = window.getByRole('button', { name: 'Notes', exact: true });

  await expect
    .poll(async () => {
      if (await onboardingHeading.count()) {
        return 'onboarding';
      }
      if (await notesButton.count()) {
        return 'app';
      }
      return 'loading';
    })
    .not.toBe('loading');
}

export async function completeOnboarding(window: Page): Promise<void> {
  await waitForDesktopReady(window);
  await expect(window.getByRole('heading', { name: 'Create Your Workspace' })).toBeVisible();
  await window.getByRole('button', { name: 'Use Default Location' }).click();
  await window.getByRole('button', { name: 'Next' }).click();
  await expect(window.getByRole('heading', { name: "You're All Set" })).toBeVisible();
  await window.getByRole('button', { name: 'Get Started' }).click();
  await expect(window.getByRole('button', { name: 'Notes', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(window.getByRole('heading', { name: 'Explorer' })).toBeVisible();
}
