import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { SrgntAPI } from '../src/renderer/env';
import { completeOnboarding, expect, test, waitForDesktopReady } from './fixtures';

declare global {
  interface Window {
    srgnt: SrgntAPI;
  }
}

test('shows onboarding on first launch and boots into the command center', async ({ electronApp, userDataDir, window: page }) => {
  await waitForDesktopReady(page);
  await expect(page.getByRole('heading', { name: 'Create Your Workspace' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Skip setup' })).toBeVisible();

  await page.getByRole('button', { name: 'Create Workspace' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByRole('heading', { name: 'Know What Connects First' })).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByRole('heading', { name: "You're All Set" })).toBeVisible();
  await page.getByRole('button', { name: 'Get Started' }).click();

  await expect(page.getByRole('button', { name: 'Daily Dashboard' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('heading', { name: 'Priorities' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Attention Needed' })).toBeVisible();

  const appState = await electronApp.evaluate(async ({ app }) => ({
    isPackaged: app.isPackaged,
    userDataPath: app.getPath('userData'),
  }));

  expect(appState.isPackaged).toBe(false);
  expect(appState.userDataPath).toBe(userDataDir);
});

test('navigates across key surfaces and updates connector status', async ({ window: page }) => {
  await completeOnboarding(page);

  await page.getByRole('button', { name: 'Calendar' }).click();
  await expect(page.locator('main h1').filter({ hasText: 'Calendar' })).toBeVisible();
  await page.getByRole('button', { name: /Sprint Planning/ }).first().click();
  await expect(page.getByRole('heading', { name: 'Event Detail' })).toBeVisible();
  await expect(page.getByText('Prep Notes')).toBeVisible();

  await page.getByRole('button', { name: 'Connectors' }).click();
  await expect(page.locator('main h1').filter({ hasText: 'Connectors' })).toBeVisible();

  await page.getByRole('button', { name: 'Connect Jira' }).click();
  await expect(page.getByRole('button', { name: 'Disconnect Jira' })).toBeVisible();
  await page.getByRole('button', { name: 'Disconnect Jira' }).click();
  await expect(page.getByRole('button', { name: 'Connect Jira' })).toBeVisible();

  await page.getByRole('button', { name: 'Notes' }).click();
  await expect(page.locator('main h1').filter({ hasText: 'Notes' })).toBeVisible();
  await expect(page.getByLabel('Side panel').getByText('Notes coming soon')).toBeVisible();

  await page.getByRole('button', { name: 'Notes' }).click();
  await expect(page.getByRole('complementary', { name: 'Side panel' })).toHaveAttribute('data-collapsed', 'true');
  await page.getByRole('button', { name: 'Expand side panel' }).click();
  await expect(page.getByRole('complementary', { name: 'Side panel' })).toHaveAttribute('data-collapsed', 'false');

  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await page.getByRole('button', { name: 'Advanced' }).click();
  await expect(page.getByText('Debug Mode').last()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Check For Updates' })).toBeVisible();
});

test('opens the terminal view without CSP bootstrap failures', async ({ window: page }) => {
  await completeOnboarding(page);

  const consoleMessages: string[] = [];
  page.on('console', (message) => {
    consoleMessages.push(message.text());
  });

  await page.getByRole('button', { name: 'Terminal' }).click();
  await expect(page.getByRole('button', { name: 'Terminal', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('terminal-host')).toBeVisible();
  await expect(page.getByRole('tab')).toBeVisible();
  await expect
    .poll(async () => page.locator('[data-testid="terminal-host"] > *').count())
    .toBeGreaterThan(0);

  await page.waitForTimeout(1000);

  expect(
    consoleMessages.some((message) =>
      message.includes('Content Security Policy')
      || message.includes('Refused to connect to \'data:application/wasm')
      || message.includes('Fetch API cannot load data:application/wasm'),
    ),
  ).toBe(false);
});

test('persists settings and writes redacted crash diagnostics', async ({ userDataDir, window: page }) => {
  await completeOnboarding(page);

  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('navigation', { name: 'Settings categories' }).getByRole('button', { name: 'Privacy' }).click();
  await page.locator('#telemetry-enabled-input + div').click();

  await page.getByRole('navigation', { name: 'Settings categories' }).getByRole('button', { name: 'General' }).click();
  await page.selectOption('#theme-input', 'dark');
  await page.selectOption('#update-channel-input', 'beta');
  await expect(page.locator('#telemetry-enabled-input')).toBeChecked();
  await page.getByRole('button', { name: 'Write Crash Log' }).click();

  const saved = await page.evaluate(async () => {
    const settingsResponse = await window.srgnt.getDesktopSettings();
    const updateResponse = await window.srgnt.checkForUpdates();
    return {
      settings: settingsResponse.settings,
      workspaceRoot: settingsResponse.workspaceRoot,
      updateStatus: updateResponse.status,
    };
  });

  expect(saved.workspaceRoot.startsWith(userDataDir)).toBe(false);
  expect(saved.settings.theme).toBe('dark');
  expect(saved.settings.updateChannel).toBe('beta');
  expect(saved.settings.telemetryEnabled).toBe(true);
  expect(saved.updateStatus).toBe('skipped');

  const settingsPath = path.join(saved.workspaceRoot, '.command-center', 'config', 'desktop-settings.json');
  const settingsContent = await fs.readFile(settingsPath, 'utf8');
  expect(settingsContent).toContain('"theme": "dark"');
  expect(settingsContent).toContain('"updateChannel": "beta"');

  const crashDir = path.join(userDataDir, 'crashes');
  const crashFiles = await fs.readdir(crashDir);
  expect(crashFiles.length).toBeGreaterThan(0);
  const crashContent = await fs.readFile(path.join(crashDir, crashFiles[0]), 'utf8');
  expect(crashContent).not.toContain(saved.workspaceRoot);

  await page.getByRole('button', { name: 'Trigger Renderer Fallback' }).click();
  await expect(page.getByRole('heading', { name: 'Something went wrong' })).toBeVisible();
});

test('exercises preload APIs for persistence, PTY launch, and renderer security', async ({ userDataDir, window: page }) => {
  await completeOnboarding(page);

  const result = await page.evaluate(async () => {
    const generatedAt = new Date('2026-03-28T12:00:00.000Z').toISOString();
    const saveResult = await window.srgnt.saveBriefing({
      content: '# E2E Briefing\n\n- Confirm preload to main persistence.\n',
      metadata: {
        id: 'e2e-briefing',
        runId: 'run-e2e',
        generatedAt,
        sources: {
          jira: 'fixtures',
          outlook: 'fixtures',
          teams: 'fixtures',
        },
      },
    });

    const briefings = await window.srgnt.listBriefings();
    const launch = await window.srgnt.terminalLaunchWithContext({
      launchContext: {
        launchId: 'e2e-launch',
        sourceWorkflow: 'daily-briefing',
        sourceArtifactId: 'SRGNT-142',
        workingDirectory: '/',
        intent: 'readOnly',
        labels: ['e2e', 'terminal'],
        createdAt: generatedAt,
      },
      rows: 24,
      cols: 80,
    });
    const sessions = await window.srgnt.terminalList();
    await window.srgnt.terminalClose(launch.sessionId);

    return {
      briefingPath: saveResult.path,
      briefingIds: briefings.briefings.map((briefing) => briefing.id),
      launch,
      sessionIds: sessions.sessions.map((session) => session.id),
      workspaceRoot: await window.srgnt.getWorkspaceRoot(),
      hasApi: typeof window.srgnt?.getWorkspaceRoot === 'function',
      hasProcess: typeof globalThis.process !== 'undefined',
      hasRequire: typeof globalThis.require !== 'undefined',
    };
  });

  expect(result.hasApi).toBe(true);
  expect(result.hasProcess).toBe(false);
  expect(result.hasRequire).toBe(false);
  expect(result.briefingIds).toContain('e2e-briefing');
  expect(result.launch.launchId).toBe('e2e-launch');
  expect(result.sessionIds).toContain(result.launch.sessionId);
  expect(result.briefingPath.startsWith(path.join(result.workspaceRoot, '.command-center', 'artifacts'))).toBe(true);

  const content = await fs.readFile(result.briefingPath, 'utf8');
  expect(content).toContain('# E2E Briefing');
  expect(content).toContain('Confirm preload to main persistence.');
});

test('today view launch button routes to terminal approval flow with the selected artifact context', async ({ window: page }) => {
  await completeOnboarding(page);

  await expect(page.getByRole('heading', { name: 'Priorities' })).toBeVisible();
  const launchButtons = page.getByRole('button', { name: 'Launch' });
  await expect(launchButtons.first()).toBeVisible();

  await launchButtons.first().click();

  await expect(page.getByRole('button', { name: 'Terminal', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('tab', { name: /daily-briefing: SRGNT-142/i })).toBeVisible();
  await expect(page.getByText('Approval Required')).toBeVisible();
  await expect(page.getByText('daily-briefing')).toBeVisible();
  await expect(page.getByText(/\/workspace\//)).toBeVisible();
});
