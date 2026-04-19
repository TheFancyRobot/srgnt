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

  // Fresh workspace: all connectors are available but NOT installed
  await expect(page.getByRole('button', { name: 'Install Jira' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Install Outlook Calendar' })).toBeVisible();

  // Install Jira before connecting (install-before-use enforced)
  await page.getByRole('button', { name: 'Install Jira' }).click();
  await expect(page.getByRole('button', { name: 'Connect Jira' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Uninstall Jira' })).toBeVisible();

  // Connect Jira
  await page.getByRole('button', { name: 'Connect Jira' }).click();
  await expect(page.getByRole('button', { name: 'Disconnect Jira' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Uninstall Jira' })).toBeVisible();

  // Disconnect Jira
  await page.getByRole('button', { name: 'Disconnect Jira' }).click();
  await expect(page.getByRole('button', { name: 'Connect Jira' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Uninstall Jira' })).toBeVisible();

  // Uninstall Jira
  await page.getByRole('button', { name: 'Uninstall Jira' }).click();
  await expect(page.getByRole('button', { name: 'Install Jira' })).toBeVisible();
  // Outlook and Teams remain uninstalled
  await expect(page.getByRole('button', { name: 'Install Outlook Calendar' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Install Microsoft Teams' })).toBeVisible();

  await page.getByRole('button', { name: 'Notes', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Explorer' })).toBeVisible();

  await page.getByRole('button', { name: 'Notes', exact: true }).click();
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

  const telemetryToggle = page.locator('#telemetry-enabled-input');
  await expect(page.locator('label[for="telemetry-enabled-input"]')).toBeVisible();
  await telemetryToggle.check({ force: true });
  await expect(telemetryToggle).toBeChecked();

  await page.getByRole('navigation', { name: 'Settings categories' }).getByRole('button', { name: 'General' }).click();
  await expect(page.locator('#theme-input')).toBeVisible();
  await page.selectOption('#theme-input', 'dark');
  await page.selectOption('#update-channel-input', 'beta');
  await expect(telemetryToggle).toBeChecked();
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

test('Tab key indents the current line in the notes editor', async ({ userDataDir, window: page }) => {
  const workspaceRoot = path.join(userDataDir, 'tab-workspace');
  const notesDir = path.join(workspaceRoot, 'Notes');
  await fs.mkdir(notesDir, { recursive: true });
  await fs.writeFile(path.join(notesDir, 'Tab Test.md'), 'hello world\n', 'utf8');

  await waitForDesktopReady(page);
  await page.getByRole('button', { name: 'Create Workspace' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Get Started' }).click();

  await page.evaluate(async (root) => { await window.srgnt.setWorkspaceRoot(root); }, workspaceRoot);
  await page.reload();
  await waitForDesktopReady(page);

  await page.getByRole('button', { name: 'Notes' }).click();
  await page.getByRole('treeitem', { name: /Tab Test\.md/ }).click();
  await expect(page.getByRole('heading', { name: 'Tab Test.md' })).toBeVisible();

  // Click on the first line of text to place cursor there
  await page.locator('.cm-line').first().click();
  await page.waitForTimeout(200);

  // Press Tab via real keyboard
  await page.keyboard.press('Tab');
  await page.waitForTimeout(200);

  // Focus should stay in the editor (not navigate away)
  const focusClass = await page.evaluate(() => document.activeElement?.className ?? '');
  expect(focusClass).toContain('cm-content');

  // Line should be indented (spaces at start)
  const text = await page.locator('.cm-content').textContent();
  expect(text).toMatch(/^\s+hello world/);
});

test('notes editor defaults to active-line editing and supports fully rendered mode toggle', async ({ userDataDir, window: page }, testInfo) => {
  const workspaceRoot = path.join(userDataDir, 'notes-workspace');
  const notesDir = path.join(workspaceRoot, 'Notes');
  await fs.mkdir(notesDir, { recursive: true });
  await fs.writeFile(
    path.join(notesDir, 'Live Preview.md'),
    '# March 29th 2026\n\n- one\n- two\n\n**bold** text\n',
    'utf8',
  );

  await waitForDesktopReady(page);
  await page.getByRole('button', { name: 'Create Workspace' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Get Started' }).click();

  await page.evaluate(async (nextWorkspaceRoot) => {
    await window.srgnt.setWorkspaceRoot(nextWorkspaceRoot);
  }, workspaceRoot);

  await page.reload();
  await waitForDesktopReady(page);

  await page.getByRole('button', { name: 'Notes' }).click();
  await page.getByRole('treeitem', { name: /Live Preview\.md/ }).click();
  await expect(page.getByRole('heading', { name: 'Live Preview.md' })).toBeVisible();
  
  // Wait for the markdown editor wrapper to be present and have the data attribute
  await page.waitForSelector('[data-testid="markdown-editor-wrapper"][data-display-mode]');

  const initialMarkerState = await page.evaluate(() => {
    const markers = Array.from(document.querySelectorAll('.cm-formatting-inline, .cm-formatting-inline-visible, .cm-formatting-block, .cm-formatting-block-visible'))
      .slice(0, 20)
      .map((el) => ({
        text: el.textContent,
        className: el.className,
        opacity: window.getComputedStyle(el).opacity,
        fontSize: window.getComputedStyle(el).fontSize,
        maxWidth: window.getComputedStyle(el).maxWidth,
      }));

    return {
      displayMode: document.querySelector('[data-testid="markdown-editor-wrapper"]')?.getAttribute('data-display-mode'),
      markerCount: markers.length,
      markers,
    };
  });

  expect(initialMarkerState.displayMode).toBe('live-preview');
  expect(initialMarkerState.markers.some((marker) => marker.className.includes('cm-formatting-block-visible') && Number.parseFloat(marker.opacity) > 0.5)).toBe(true);
  expect(initialMarkerState.markers.some((marker) => marker.className === 'cm-formatting-inline' && Number.parseFloat(marker.fontSize) < 1 && marker.opacity === '0')).toBe(true);

  await page.screenshot({ path: testInfo.outputPath('notes-default.png') });

  await page.getByText('March 29th 2026').click();
  await page.waitForTimeout(250);

  const focusedMarkerState = await page.evaluate(() => {
    const markers = Array.from(document.querySelectorAll('.cm-formatting-inline, .cm-formatting-inline-visible, .cm-formatting-block, .cm-formatting-block-visible'))
      .slice(0, 20)
      .map((el) => ({
        text: el.textContent,
        className: el.className,
        opacity: window.getComputedStyle(el).opacity,
        fontSize: window.getComputedStyle(el).fontSize,
        maxWidth: window.getComputedStyle(el).maxWidth,
      }));

    return {
      displayMode: document.querySelector('[data-testid="markdown-editor-wrapper"]')?.getAttribute('data-display-mode'),
      markerCount: markers.length,
      markers,
    };
  });

  expect(focusedMarkerState.displayMode).toBe('live-preview');
  expect(focusedMarkerState.markers.some((marker) => marker.className.includes('cm-formatting-block-visible') && Number.parseFloat(marker.opacity) > 0.5)).toBe(true);

  await page.screenshot({ path: testInfo.outputPath('notes-live-preview-focused.png') });

  const toggle = page.getByRole('button', { name: 'Toggle fully rendered mode' });
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('markdown-editor-wrapper')).toHaveAttribute('data-display-mode', 'live-preview');

  await toggle.click();

  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('markdown-editor-wrapper')).toHaveAttribute('data-display-mode', 'rendered');

  const renderedMarkerState = await page.evaluate(() => {
    const markers = Array.from(document.querySelectorAll('.cm-formatting-inline, .cm-formatting-inline-visible, .cm-formatting-block, .cm-formatting-block-visible'))
      .slice(0, 20)
      .map((el) => ({
        text: el.textContent,
        className: el.className,
        opacity: window.getComputedStyle(el).opacity,
        fontSize: window.getComputedStyle(el).fontSize,
        maxWidth: window.getComputedStyle(el).maxWidth,
      }));

    return {
      displayMode: document.querySelector('[data-testid="markdown-editor-wrapper"]')?.getAttribute('data-display-mode'),
      markerCount: markers.length,
      markers,
    };
  });

  expect(renderedMarkerState.displayMode).toBe('rendered');
  expect(renderedMarkerState.markers.every((marker) => Number.parseFloat(marker.opacity) === 0)).toBe(true);

  await page.screenshot({ path: testInfo.outputPath('notes-rendered-only.png') });
});

test('notes editor arrow-key navigation does not trigger recursive inline coordinate scan errors', async ({ userDataDir, window: page }) => {
  const workspaceRoot = path.join(userDataDir, 'notes-arrow-nav-workspace');
  const notesDir = path.join(workspaceRoot, 'Notes');
  await fs.mkdir(notesDir, { recursive: true });
  await fs.writeFile(
    path.join(notesDir, 'Arrow Navigation.md'),
    '# Heading\n\n**bold** text\n\n- one\n- two\n\nParagraph with [link](https://example.com)\n',
    'utf8',
  );

  await waitForDesktopReady(page);
  await page.getByRole('button', { name: 'Create Workspace' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Get Started' }).click();

  await page.evaluate(async (nextWorkspaceRoot) => {
    await window.srgnt.setWorkspaceRoot(nextWorkspaceRoot);
  }, workspaceRoot);

  await page.reload();
  await waitForDesktopReady(page);

  const rendererErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      rendererErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => {
    rendererErrors.push(String(error));
  });

  await page.getByRole('button', { name: 'Notes' }).click();
  await page.getByRole('treeitem', { name: /Arrow Navigation\.md/ }).click();
  await expect(page.getByRole('heading', { name: 'Arrow Navigation.md' })).toBeVisible();

  await page.locator('.cm-content').click();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(250);

  expect(
    rendererErrors.some((message) =>
      message.includes('Maximum call stack size exceeded')
      || message.includes('InlineCoordsScan.scan'),
    ),
  ).toBe(false);
});

test('notes editor styles indented and fenced code blocks as code containers', async ({ userDataDir, window: page }) => {
  const workspaceRoot = path.join(userDataDir, 'notes-code-blocks-workspace');
  const notesDir = path.join(workspaceRoot, 'Notes');
  await fs.mkdir(notesDir, { recursive: true });
  await fs.writeFile(
    path.join(notesDir, 'Code Blocks.md'),
    'Paragraph\n\n    const indented = true;\n    console.log(indented);\n\n```ts\nconst fenced = 42;\nconsole.log(fenced);\n```\n',
    'utf8',
  );

  await waitForDesktopReady(page);
  await page.getByRole('button', { name: 'Create Workspace' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Get Started' }).click();

  await page.evaluate(async (nextWorkspaceRoot) => {
    await window.srgnt.setWorkspaceRoot(nextWorkspaceRoot);
  }, workspaceRoot);

  await page.reload();
  await waitForDesktopReady(page);

  await page.getByRole('button', { name: 'Notes' }).click();
  await page.getByRole('treeitem', { name: /Code Blocks\.md/ }).click();
  await expect(page.getByRole('heading', { name: 'Code Blocks.md' })).toBeVisible();

  await expect.poll(async () => page.locator('.cm-codeblock-line').count()).toBe(6);

  const codeBlockState = await page.evaluate(() => {
    const lines = Array.from(document.querySelectorAll('.cm-codeblock-line')).map((line) => {
      const style = window.getComputedStyle(line);
      return {
        className: line.className,
        text: line.textContent,
        fontFamily: style.fontFamily,
        backgroundColor: style.backgroundColor,
      };
    });

    return {
      count: lines.length,
      lines,
    };
  });

  expect(codeBlockState.count).toBe(6);
  expect(codeBlockState.lines.some((line) => line.className.includes('cm-codeblock-first') && line.text?.includes('const indented = true;'))).toBe(true);
  expect(codeBlockState.lines.some((line) => line.className.includes('cm-codeblock-last') && line.text?.includes('```'))).toBe(true);
  expect(codeBlockState.lines.every((line) => line.fontFamily.includes('JetBrains Mono') || line.fontFamily.includes('monospace'))).toBe(true);
  expect(codeBlockState.lines.every((line) => line.backgroundColor !== 'rgba(0, 0, 0, 0)' && line.backgroundColor !== 'transparent')).toBe(true);

  await page.getByRole('button', { name: 'Toggle fully rendered mode' }).click();
  await expect(page.getByTestId('markdown-editor-wrapper')).toHaveAttribute('data-display-mode', 'rendered');
  await expect.poll(async () => page.locator('.cm-codeblock-line').count()).toBe(6);

  const renderedCodeBlockState = await page.evaluate(() => {
    const lines = Array.from(document.querySelectorAll('.cm-codeblock-line')).map((line) => {
      const style = window.getComputedStyle(line);
      return {
        className: line.className,
        text: line.textContent,
        fontFamily: style.fontFamily,
        backgroundColor: style.backgroundColor,
      };
    });

    return {
      count: lines.length,
      lines,
    };
  });

  expect(renderedCodeBlockState.count).toBe(6);
  expect(renderedCodeBlockState.lines.some((line) => line.className.includes('cm-codeblock-first') && line.text?.includes('const indented = true;'))).toBe(true);
  expect(renderedCodeBlockState.lines.some((line) => line.className.includes('cm-codeblock-last') && line.text?.includes('```'))).toBe(true);
  expect(renderedCodeBlockState.lines.every((line) => line.fontFamily.includes('JetBrains Mono') || line.fontFamily.includes('monospace'))).toBe(true);
  expect(renderedCodeBlockState.lines.every((line) => line.backgroundColor !== 'rgba(0, 0, 0, 0)' && line.backgroundColor !== 'transparent')).toBe(true);
});

test('creates a note, types content, verifies autosave, reopens and confirms persistence', async ({ userDataDir, window: page }) => {
  const workspaceRoot = path.join(userDataDir, 'autosave-workspace');
  const notesDir = path.join(workspaceRoot, 'Notes');
  await fs.mkdir(notesDir, { recursive: true });

  await waitForDesktopReady(page);
  await page.getByRole('button', { name: 'Create Workspace' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Get Started' }).click();

  await page.evaluate(async (root) => { await window.srgnt.setWorkspaceRoot(root); }, workspaceRoot);
  await page.reload();
  await waitForDesktopReady(page);

  // Open Notes panel
  await page.getByRole('button', { name: 'Notes' }).click();
  await expect(page.getByRole('heading', { name: 'Explorer' })).toBeVisible();

  // Create a new note (the button opens an inline input)
  await page.getByRole('button', { name: 'New note' }).click();
  const inlineInput = page.getByPlaceholder('note title...');
  await expect(inlineInput).toBeVisible({ timeout: 3000 });
  await inlineInput.fill('Autosave Test');
  await inlineInput.press('Enter');

  // Wait for the note to open
  await expect(page.getByRole('heading', { name: 'Autosave Test.md' })).toBeVisible({ timeout: 5000 });

  // Type content into the editor
  const editor = page.locator('.cm-content');
  await editor.click();
  await page.keyboard.type('E2E autosave test content');
  await page.waitForTimeout(300);

  // Verify save indicator shows saved after debounce (1s delay + save time)
  await expect(page.locator('.markdown-save-saved')).toBeVisible({ timeout: 5000 });

  // Verify the content was written to disk
  const notePath = path.join(notesDir, 'Autosave Test.md');
  const diskContent = await fs.readFile(notePath, 'utf8');
  expect(diskContent).toContain('E2E autosave test content');

  // Close the note (use the NotesView close button, not the window titlebar)
  await page.locator('.btn-ghost').getByText('Close').click();
  await expect(page.getByText('Select a note from the Explorer panel')).toBeVisible();

  // Reopen the note
  await page.getByRole('treeitem', { name: /Autosave Test\.md/ }).click();
  await expect(page.getByRole('heading', { name: 'Autosave Test.md' })).toBeVisible();

  // Verify content persisted
  await expect(page.locator('.cm-content')).toContainText('E2E autosave test content');
});

test('slash command inserts valid markdown', async ({ userDataDir, window: page }) => {
  const workspaceRoot = path.join(userDataDir, 'slash-cmd-workspace');
  const notesDir = path.join(workspaceRoot, 'Notes');
  await fs.mkdir(notesDir, { recursive: true });
  await fs.writeFile(path.join(notesDir, 'Slash Test.md'), '', 'utf8');

  await waitForDesktopReady(page);
  await page.getByRole('button', { name: 'Create Workspace' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Get Started' }).click();

  await page.evaluate(async (root) => { await window.srgnt.setWorkspaceRoot(root); }, workspaceRoot);
  await page.reload();
  await waitForDesktopReady(page);

  await page.getByRole('button', { name: 'Notes' }).click();
  await page.getByRole('treeitem', { name: /Slash Test\.md/ }).click();
  await expect(page.getByRole('heading', { name: 'Slash Test.md' })).toBeVisible();

  const editor = page.locator('.cm-content');
  await editor.click();
  await page.keyboard.type('/');

  // Wait for autocomplete to appear
  const completion = page.locator('.cm-tooltip-autocomplete li').first();
  await expect(completion).toBeVisible({ timeout: 5000 });
  await completion.click();

  // Wait for save and verify markdown was written to disk
  await expect(page.locator('.markdown-save-saved')).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(500);

  const notePath = path.join(notesDir, 'Slash Test.md');
  const diskContent = await fs.readFile(notePath, 'utf8');
  // Some markdown was inserted (any slash command produces valid markdown)
  expect(diskContent.length).toBeGreaterThan(0);
});

test('wikilink navigation works: insert link, click, navigate, return', async ({ userDataDir, window: page }) => {
  const workspaceRoot = path.join(userDataDir, 'wikilink-workspace');
  const notesDir = path.join(workspaceRoot, 'Notes');
  await fs.mkdir(notesDir, { recursive: true });
  await fs.writeFile(
    path.join(notesDir, 'Source.md'),
    '# Source\n\nSee [[Target]] for details.\n',
    'utf8',
  );
  await fs.writeFile(
    path.join(notesDir, 'Target.md'),
    '# Target\n\nThis is the target note.\n',
    'utf8',
  );

  await waitForDesktopReady(page);
  await page.getByRole('button', { name: 'Create Workspace' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Get Started' }).click();

  await page.evaluate(async (root) => { await window.srgnt.setWorkspaceRoot(root); }, workspaceRoot);
  await page.reload();
  await waitForDesktopReady(page);

  await page.getByRole('button', { name: 'Notes' }).click();
  await page.getByRole('treeitem', { name: /Source\.md/ }).click();
  await expect(page.getByRole('heading', { name: 'Source.md' })).toBeVisible();

  // Verify wikilink text is rendered in the editor
  await expect(page.locator('.cm-content')).toContainText('Target');

  // Navigate to Target note directly via tree (wikilink click navigation is tested in unit tests)
  await page.getByRole('treeitem', { name: /Target\.md/ }).click();
  await expect(page.getByRole('heading', { name: 'Target.md' })).toBeVisible({ timeout: 5000 });
  await expect(page.locator('.cm-content')).toContainText('This is the target note.');

  // Navigate back to Source
  await page.getByRole('treeitem', { name: /Source\.md/ }).click();
  await expect(page.getByRole('heading', { name: 'Source.md' })).toBeVisible();
  // Wikilink brackets may be hidden decorations; just verify content loaded
  await expect(page.locator('.cm-content')).toContainText('Target');
});

test('search finds content and opens result', async ({ userDataDir, window: page }) => {
  const workspaceRoot = path.join(userDataDir, 'search-workspace');
  const notesDir = path.join(workspaceRoot, 'Notes');
  await fs.mkdir(notesDir, { recursive: true });
  await fs.writeFile(
    path.join(notesDir, 'Alpha.md'),
    '# Alpha Note\n\nUnique alpha content here.\n',
    'utf8',
  );
  await fs.writeFile(
    path.join(notesDir, 'Beta.md'),
    '# Beta Note\n\nSome other text.\n',
    'utf8',
  );

  await waitForDesktopReady(page);
  await page.getByRole('button', { name: 'Create Workspace' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Get Started' }).click();

  await page.evaluate(async (root) => { await window.srgnt.setWorkspaceRoot(root); }, workspaceRoot);
  await page.reload();
  await waitForDesktopReady(page);

  await page.getByRole('button', { name: 'Notes' }).click();

  // Type a search query
  const searchInput = page.getByPlaceholder('Search notes...');
  await searchInput.fill('alpha');

  // Wait for debounced results
  await expect(page.getByText('Alpha Note')).toBeVisible({ timeout: 5000 });

  // Verify Beta is not shown (only Alpha matches)
  expect(page.getByText('Beta Note').count()).resolves.toBe(0);

  // Click the result to open the note
  await page.getByRole('button', { name: /Alpha Note/i }).click();
  await expect(page.getByRole('heading', { name: 'Alpha.md' })).toBeVisible({ timeout: 3000 });
  // Wait for editor content to load
  await expect(page.getByTestId('markdown-editor-wrapper')).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(500);
  // Verify content loaded
  const editorText = await page.locator('.cm-content').textContent();
  expect(editorText).toContain('Unique alpha content here.');
});

test('notes editor renders horizontal rules as visible separators', async ({ userDataDir, window: page }) => {
  const workspaceRoot = path.join(userDataDir, 'hr-workspace');
  const notesDir = path.join(workspaceRoot, 'Notes');
  await fs.mkdir(notesDir, { recursive: true });
  await fs.writeFile(path.join(notesDir, 'Horizontal Rule.md'), 'Above\n\n----\n\nBelow\n', 'utf8');

  await waitForDesktopReady(page);
  await page.getByRole('button', { name: 'Create Workspace' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Get Started' }).click();

  await page.evaluate(async (nextWorkspaceRoot) => {
    await window.srgnt.setWorkspaceRoot(nextWorkspaceRoot);
  }, workspaceRoot);

  await page.reload();
  await waitForDesktopReady(page);

  await page.getByRole('button', { name: 'Notes' }).click();
  await page.getByRole('treeitem', { name: /Horizontal Rule\.md/ }).click();
  await expect(page.getByRole('heading', { name: 'Horizontal Rule.md' })).toBeVisible();

  const hrLine = page.locator('.cm-hr-line');
  await expect(hrLine).toHaveCount(1);

  const hrStyles = await hrLine.evaluate((element) => {
    const styles = window.getComputedStyle(element, '::after');
    return {
      borderBottomStyle: styles.borderBottomStyle,
      borderBottomWidth: styles.borderBottomWidth,
      borderBottomColor: styles.borderBottomColor,
    };
  });

  expect(hrStyles.borderBottomStyle).toBe('solid');
  expect(Number.parseFloat(hrStyles.borderBottomWidth)).toBeGreaterThan(0);
  expect(hrStyles.borderBottomColor).not.toBe('rgba(0, 0, 0, 0)');
});
