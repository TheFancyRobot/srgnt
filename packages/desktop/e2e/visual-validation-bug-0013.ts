/**
 * BUG-0013 Visual Validation Script
 * 
 * Launches the packaged Electron app, opens a note with headings,
 * and takes screenshots to verify the whitespace fix.
 */
import { _electron as electron } from '@playwright/test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { getElectronLaunchArgs, getElectronLaunchEnv } from './fixtures';

async function validate() {
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'srgnt-visual-validation-'));
  const executablePath = path.join(process.cwd(), 'release', 'linux-unpacked', 'srgnt');
  
  const screenshotsDir = path.join(os.tmpdir(), 'srgnt-bug-0013-screenshots');
  await fs.mkdir(screenshotsDir, { recursive: true });
  
  const electronApp = await electron.launch({
    executablePath,
    args: getElectronLaunchArgs(),
    env: getElectronLaunchEnv(userDataDir),
  });

  try {
    const page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    
    // Wait for onboarding heading
    await page.waitForSelector('heading[name="Create Your Workspace"]', { timeout: 5000 }).catch(() => null);
    
    // Check if we're on onboarding or already in the app
    const createBtn = page.getByRole('button', { name: 'Create Workspace' });
    if (await createBtn.count() > 0) {
      console.log('Completing onboarding...');
      await createBtn.click();
      await page.getByRole('button', { name: 'Next' }).click();
      await page.getByRole('button', { name: 'Next' }).click();
      await page.getByRole('button', { name: 'Get Started' }).click();
    }
    
    await page.waitForSelector('button[name="Daily Dashboard"]', { timeout: 5000 });
    
    // Get workspace root
    const workspaceRoot = await page.evaluate(async () => {
      return await window.srgnt.getWorkspaceRoot();
    });
    
    // Copy test note to workspace
    const srcNote = path.join(os.homedir(), 'srgnt-workspace', 'Notes', 'Your mom.md');
    const notesDir = path.join(workspaceRoot, 'Notes');
    await fs.mkdir(notesDir, { recursive: true });
    await fs.copyFile(srcNote, path.join(notesDir, 'Your mom.md'));
    
    // Reload to pick up the new note
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    
    // Click Notes button
    await page.getByRole('button', { name: 'Notes' }).click();
    await page.waitForTimeout(500);
    
    // Click on the note
    await page.getByRole('treeitem', { name: /Your mom\.md/ }).click();
    await page.waitForTimeout(1000);
    
    // Screenshot 1: Note opened with headings visible
    await page.screenshot({ path: path.join(screenshotsDir, '01-note-opened.png') });
    console.log('Screenshot 1: Note opened');
    
    // Focus the editor and navigate to a heading (click on a heading line)
    await page.locator('.cm-content').click();
    
    // Navigate to first heading using keyboard
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(300);
    
    // Screenshot 2: Non-active heading (should have NO whitespace gap)
    await page.screenshot({ path: path.join(screenshotsDir, '02-non-active-heading.png') });
    console.log('Screenshot 2: Non-active heading (checking for whitespace gap)');
    
    // Click on the heading line to make it active
    const content = page.locator('.cm-content');
    const boundingBox = await content.boundingBox();
    if (boundingBox) {
      // Click near the top of the editor where headings likely are
      await page.mouse.click(boundingBox.x + 50, boundingBox.y + 100);
    }
    await page.waitForTimeout(300);
    
    // Screenshot 3: Active heading (should show # syntax)
    await page.screenshot({ path: path.join(screenshotsDir, '03-active-heading.png') });
    console.log('Screenshot 3: Active heading (checking # syntax visible)');
    
    // Navigate through document to test various formatting
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('ArrowDown');
    }
    await page.waitForTimeout(300);
    
    // Screenshot 4: Various formatting elements
    await page.screenshot({ path: path.join(screenshotsDir, '04-various-formatting.png') });
    console.log('Screenshot 4: Various formatting');
    
    console.log('\n✅ Screenshots saved to:', screenshotsDir);
    console.log('Please review screenshots to verify:');
    console.log('  - No whitespace gap before heading text on non-active lines');
    console.log('  - Active lines show # syntax correctly');
    console.log('  - No visual regressions in other formatting');
    
  } finally {
    await electronApp.close();
    await fs.rm(userDataDir, { recursive: true, force: true });
  }
}

validate().catch(console.error);
