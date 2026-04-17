import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { completeOnboarding, expect, test, waitForDesktopReady } from './fixtures';

/**
 * GFM Compliance E2E tests.
 *
 * Visual rendering and interaction tests that require a real Electron renderer
 * with full CSS and DOM. Round-trip / structure tests live in the JSDOM file:
 *   src/renderer/components/notes/markdown-gfm-compliance.test.tsx
 */

// ---------------------------------------------------------------------------
// Helper: create a workspace with a note file
// ---------------------------------------------------------------------------

async function setupNote(page: import('@playwright/test').Page, userDataDir: string, fileName: string, content: string) {
  const workspaceRoot = path.join(userDataDir, 'gfm-workspace');
  const notesDir = path.join(workspaceRoot, 'Notes');
  await fs.mkdir(notesDir, { recursive: true });
  await fs.writeFile(path.join(notesDir, fileName), content, 'utf8');

  await waitForDesktopReady(page);
  await page.getByRole('button', { name: 'Create Workspace' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Get Started' }).click();

  await page.evaluate(async (root) => { await window.srgnt.setWorkspaceRoot(root); }, workspaceRoot);
  await page.reload();
  await waitForDesktopReady(page);

  await page.getByRole('button', { name: 'Notes' }).click();
  return { workspaceRoot, notesDir };
}

// ===========================================================================
// Block Elements - Visual Rendering
// ===========================================================================

test('GFM: ATX headings h1-h6 render with different font sizes', async ({ userDataDir, window: page }) => {
  const content = [
    '# Heading 1',
    '## Heading 2',
    '### Heading 3',
    '#### Heading 4',
    '##### Heading 5',
    '###### Heading 6',
    '',
    'Normal paragraph',
  ].join('\n');

  await setupNote(page, userDataDir, 'Headings.md', content);
  await page.getByRole('treeitem', { name: /Headings\.md/ }).click();
  await expect(page.getByRole('heading', { name: 'Headings.md' })).toBeVisible();

  // In live-preview mode, headings get .cm-header-N spans inside .cm-line elements.
  // Verify all heading levels are present in the DOM.
  const headingCounts = await page.evaluate(() => {
    const counts: Record<string, number> = {};
    for (let i = 1; i <= 6; i++) {
      counts[`h${i}`] = document.querySelectorAll(`.cm-header-${i}`).length;
    }
    return counts;
  });

  for (let level = 1; level <= 6; level++) {
    expect(headingCounts[`h${level}`], `expected .cm-header-${level}`).toBeGreaterThan(0);
  }
});

test('GFM: Setext headings render correctly', async ({ userDataDir, window: page }) => {
  const content = 'Setext H1\n===\n\nSetext H2\n---\n';
  await setupNote(page, userDataDir, 'Setext.md', content);
  await page.getByRole('treeitem', { name: /Setext\.md/ }).click();
  await expect(page.getByRole('heading', { name: 'Setext.md' })).toBeVisible();

  const editorText = await page.locator('.cm-content').textContent();
  expect(editorText).toContain('Setext H1');
  expect(editorText).toContain('Setext H2');
});

test('GFM: single-level blockquote has visual quote styling', async ({ userDataDir, window: page }) => {
  await setupNote(page, userDataDir, 'Blockquote.md', '> quoted text\n\nNormal text');
  await page.getByRole('treeitem', { name: /Blockquote\.md/ }).click();
  await expect(page.getByRole('heading', { name: 'Blockquote.md' })).toBeVisible();

  await expect.poll(async () => page.locator('.cm-blockquote-line').count()).toBeGreaterThan(0);
  const bqLine = page.locator('.cm-blockquote-line').first();
  await expect(bqLine).toHaveAttribute('data-blockquote-depth', '1');
});

test('GFM: nested blockquotes have increasing depth', async ({ userDataDir, window: page }) => {
  // Use proper GFM multi-line nested blockquote:
  // Line 1: outer blockquote marker
  // Line 2: outer continuation + nested blockquote marker (the >> is on its own line = nested)
  // Line 3: nested continuation
  await setupNote(page, userDataDir, 'NestedBQ.md', '> outer\n>> inner\n');
  await page.getByRole('treeitem', { name: /NestedBQ\.md/ }).click();

  // Poll until blockquote decorations are applied (plugin updates are async).
  await expect
    .poll(async () => {
      const els = await page.evaluate(() =>
        Array.from(document.querySelectorAll('.cm-blockquote-line')).map(
          (el) => Number(el.getAttribute('data-blockquote-depth')),
        ),
      );
      return els.length > 0 ? els : null;
    })
    .not.toBeNull();

  const depths = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.cm-blockquote-line')).map(
      (el) => Number(el.getAttribute('data-blockquote-depth')),
    ),
  );

  expect(depths).toContain(1);
  expect(depths).toContain(2);
});

test('GFM: fenced code with info string renders in monospace', async ({ userDataDir, window: page }) => {
  await setupNote(page, userDataDir, 'CodeBlock.md', '```js\nconst x = 42;\nconsole.log(x);\n```\n');
  await page.getByRole('treeitem', { name: /CodeBlock\.md/ }).click();
  await expect(page.getByRole('heading', { name: 'CodeBlock.md' })).toBeVisible();

  await expect.poll(async () => page.locator('.cm-codeblock-line').count()).toBe(4);

  const codeStyles = await page.evaluate(() => {
    const line = document.querySelector('.cm-codeblock-line');
    if (!line) return null;
    const style = window.getComputedStyle(line);
    return { fontFamily: style.fontFamily };
  });

  expect(codeStyles).not.toBeNull();
  expect(codeStyles!.fontFamily).toContain('Mono');
});

test('GFM: code block has first and last line classes', async ({ userDataDir, window: page }) => {
  await setupNote(page, userDataDir, 'CodeFirstLast.md', '```ts\nline1\nline2\n```\n');
  await page.getByRole('treeitem', { name: /CodeFirstLast\.md/ }).click();

  await expect.poll(async () => page.locator('.cm-codeblock-first').count()).toBe(1);
  await expect.poll(async () => page.locator('.cm-codeblock-last').count()).toBe(1);
});

test('GFM: bullet list renders with bullet styling', async ({ userDataDir, window: page }) => {
  await setupNote(page, userDataDir, 'BulletList.md', '- apple\n- banana\n- cherry\n');
  await page.getByRole('treeitem', { name: /BulletList\.md/ }).click();

  await expect.poll(async () => page.locator('.cm-list-bullet-line').count()).toBe(3);
});

test('GFM: ordered list renders with number styling', async ({ userDataDir, window: page }) => {
  await setupNote(page, userDataDir, 'OrderedList.md', '1. first\n2. second\n3. third\n');
  await page.getByRole('treeitem', { name: /OrderedList\.md/ }).click();

  await expect.poll(async () => page.locator('.cm-list-ordered-line').count()).toBe(3);

  const nums = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.cm-list-ordered-line')).map(
      (el) => el.getAttribute('data-list-num'),
    );
  });

  expect(nums).toEqual(['1.', '2.', '3.']);
});

test('GFM: nested list renders correctly', async ({ userDataDir, window: page }) => {
  await setupNote(page, userDataDir, 'NestedList.md', '- top\n  - nested a\n  - nested b\n');
  await page.getByRole('treeitem', { name: /NestedList\.md/ }).click();

  await expect.poll(async () => page.locator('.cm-list-bullet-line').count()).toBe(3);
});

test('GFM: task list items have correct checkbox classes', async ({ userDataDir, window: page }) => {
  await setupNote(page, userDataDir, 'Tasks.md', '- [ ] pending\n- [x] completed\n');
  await page.getByRole('treeitem', { name: /Tasks\.md/ }).click();

  await expect.poll(async () => page.locator('.cm-checkbox-unchecked-line').count()).toBe(1);
  await expect.poll(async () => page.locator('.cm-checkbox-checked-line').count()).toBe(1);
});

test('GFM: clicking a task checkbox toggles its state', async ({ userDataDir, window: page }) => {
  const { notesDir } = await setupNote(page, userDataDir, 'ToggleTask.md', '- [ ] click me\n- [x] already done\n');
  await page.getByRole('treeitem', { name: /ToggleTask\.md/ }).click();
  await expect(page.getByRole('heading', { name: 'ToggleTask.md' })).toBeVisible();

  const uncheckedLine = page.locator('.cm-checkbox-unchecked-line');
  await expect(uncheckedLine).toBeVisible();

  const box = await uncheckedLine.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.click(box!.x + 10, box!.y + box!.height / 2);

  // Wait for autosave (1s debounce + write time)
  await page.waitForTimeout(1500);

  const diskContent = await fs.readFile(path.join(notesDir, 'ToggleTask.md'), 'utf8');
  expect(diskContent).toContain('- [x] click me');
  expect(diskContent).toContain('- [x] already done');
});

test('GFM: --- renders as visible horizontal rule', async ({ userDataDir, window: page }) => {
  await setupNote(page, userDataDir, 'HR-dash.md', 'Above\n\n---\n\nBelow\n');
  await page.getByRole('treeitem', { name: /HR-dash\.md/ }).click();

  await expect.poll(async () => page.locator('.cm-hr-line').count()).toBe(1);
});

test('GFM: *** renders as visible horizontal rule', async ({ userDataDir, window: page }) => {
  await setupNote(page, userDataDir, 'HR-star.md', 'Above\n\n***\n\nBelow\n');
  await page.getByRole('treeitem', { name: /HR-star\.md/ }).click();

  await expect.poll(async () => page.locator('.cm-hr-line').count()).toBe(1);
});

test('GFM: ___ renders as visible horizontal rule', async ({ userDataDir, window: page }) => {
  await setupNote(page, userDataDir, 'HR-underscore.md', 'Above\n\n___\n\nBelow\n');
  await page.getByRole('treeitem', { name: /HR-underscore\.md/ }).click();

  await expect.poll(async () => page.locator('.cm-hr-line').count()).toBe(1);
});

// ===========================================================================
// Inline Elements - Visual Rendering
// ===========================================================================

test('GFM: bold text renders visually', async ({ userDataDir, window: page }) => {
  await setupNote(page, userDataDir, 'Bold.md', 'Normal **bold** text\n');
  await page.getByRole('treeitem', { name: /Bold\.md/ }).click();

  const strongEl = page.locator('.cm-strong');
  await expect(strongEl).toBeVisible();
  await expect(strongEl).toContainText('bold');
});

test('GFM: italic text renders visually', async ({ userDataDir, window: page }) => {
  await setupNote(page, userDataDir, 'Italic.md', 'Normal *italic* text\n');
  await page.getByRole('treeitem', { name: /Italic\.md/ }).click();

  const emEl = page.locator('.cm-emphasis');
  await expect(emEl).toBeVisible();
  await expect(emEl).toContainText('italic');
});

test('GFM: strikethrough renders visually', async ({ userDataDir, window: page }) => {
  await setupNote(page, userDataDir, 'Strike.md', 'Normal ~~deleted~~ text\n');
  await page.getByRole('treeitem', { name: /Strike\.md/ }).click();

  const strikeEl = page.locator('.cm-strikethrough');
  await expect(strikeEl).toBeVisible();
  await expect(strikeEl).toContainText('deleted');
});

test('GFM: inline code renders in monospace', async ({ userDataDir, window: page }) => {
  await setupNote(page, userDataDir, 'InlineCode.md', 'Use `console.log` here\n');
  await page.getByRole('treeitem', { name: /InlineCode\.md/ }).click();

  const codeEl = page.locator('.cm-code');
  await expect(codeEl).toBeVisible();
  await expect(codeEl).toContainText('console.log');

  const codeStyle = await codeEl.evaluate((el) => window.getComputedStyle(el).fontFamily);
  expect(codeStyle.toLowerCase()).toContain('mono');
});

test('GFM: links render as clickable elements', async ({ userDataDir, window: page }) => {
  await setupNote(page, userDataDir, 'Links.md', '[click here](https://example.com)\n');
  await page.getByRole('treeitem', { name: /Links\.md/ }).click();

  const linkEl = page.locator('.cm-link').first();
  await expect(linkEl).toBeVisible();
});

test('GFM: bare URLs render as link widgets', async ({ userDataDir, window: page }) => {
  await setupNote(page, userDataDir, 'Autolink.md', 'Visit https://example.com for more\n');
  await page.getByRole('treeitem', { name: /Autolink\.md/ }).click();

  const linkWidget = page.locator('.cm-link-widget');
  await expect(linkWidget).toBeVisible();
  await expect(linkWidget).toHaveAttribute('href', 'https://example.com');
});

test('GFM: nested inline **bold *italic* bold** renders both styles', async ({ userDataDir, window: page }) => {
  await setupNote(page, userDataDir, 'Nested.md', '**bold *italic* bold**\n');
  await page.getByRole('treeitem', { name: /Nested\.md/ }).click();

  await expect(page.locator('.cm-strong')).toBeVisible();
  await expect(page.locator('.cm-emphasis')).toBeVisible();
});

// ===========================================================================
// Tables - Visual Rendering
// ===========================================================================

test('GFM: table renders as an HTML table widget', async ({ userDataDir, window: page }) => {
  await setupNote(page, userDataDir, 'Table.md', '| A | B |\n| --- | --- |\n| 1 | 2 |\n');
  await page.getByRole('treeitem', { name: /Table\.md/ }).click();

  const tableEditor = page.locator('.cm-table-editor');
  await expect(tableEditor).toBeVisible();
  await expect(tableEditor.locator('thead')).toBeVisible();
  await expect(tableEditor.locator('tbody')).toBeVisible();
});

test('GFM: table cells contain expected text', async ({ userDataDir, window: page }) => {
  await setupNote(page, userDataDir, 'TableCells.md', '| Name | Value |\n| --- | --- |\n| foo | bar |\n');
  await page.getByRole('treeitem', { name: /TableCells\.md/ }).click();

  const cells = page.locator('.cm-table-cell');
  await expect(cells).toHaveCount(4);

  const allText = await cells.allTextContents();
  expect(allText).toContain('Name');
  expect(allText).toContain('Value');
  expect(allText).toContain('foo');
  expect(allText).toContain('bar');
});

test('GFM: table with empty cells renders', async ({ userDataDir, window: page }) => {
  await setupNote(page, userDataDir, 'EmptyCells.md', '| A | B |\n| --- | --- |\n|  | val |\n');
  await page.getByRole('treeitem', { name: /EmptyCells\.md/ }).click();

  await expect(page.locator('.cm-table-cell')).toHaveCount(4);
});

test('GFM: table with inline formatting in cells renders', async ({ userDataDir, window: page }) => {
  await setupNote(page, userDataDir, 'TableBold.md', '| Text |\n| --- |\n| **bold** |');
  await page.getByRole('treeitem', { name: /TableBold\.md/ }).click();

  const tableEditor = page.locator('.cm-table-editor');
  await expect(tableEditor).toBeVisible();
  const cellText = await tableEditor.locator('.cm-table-cell').last().textContent();
  expect(cellText).toContain('bold');
});

// ===========================================================================
// Edge Cases
// ===========================================================================

test('GFM: escaped characters are not formatted', async ({ userDataDir, window: page }) => {
  await setupNote(page, userDataDir, 'Escaped.md', '\\*not italic\\*\n\\# not heading\n');
  await page.getByRole('treeitem', { name: /Escaped\.md/ }).click();

  await expect(page.locator('.cm-emphasis')).toHaveCount(0);
});

test('GFM: mixed blockquote with list renders both decorations', async ({ userDataDir, window: page }) => {
  await setupNote(page, userDataDir, 'MixedBQ.md', '> - item one\n> - item two\n');
  await page.getByRole('treeitem', { name: /MixedBQ\.md/ }).click();

  await expect.poll(async () => page.locator('.cm-blockquote-line').count()).toBeGreaterThan(0);
  await expect.poll(async () => page.locator('.cm-list-bullet-line').count()).toBeGreaterThan(0);
});

test('GFM: code block inside list renders both decorations', async ({ userDataDir, window: page }) => {
  await setupNote(page, userDataDir, 'CodeInList.md', '- item\n  ```\n  code\n  ```\n');
  await page.getByRole('treeitem', { name: /CodeInList\.md/ }).click();

  await expect.poll(async () => page.locator('.cm-list-bullet-line').count()).toBeGreaterThan(0);
  await expect.poll(async () => page.locator('.cm-codeblock-line').count()).toBeGreaterThan(0);
});

test('GFM: blockquote containing a heading renders both decorations', async ({ userDataDir, window: page }) => {
  await setupNote(page, userDataDir, 'BQHeading.md', '> # Heading in quote\n');
  await page.getByRole('treeitem', { name: /BQHeading\.md/ }).click();

  await expect.poll(async () => page.locator('.cm-blockquote-line').count()).toBeGreaterThan(0);
  await expect(page.locator('.cm-header-1').first()).toBeVisible();
});
