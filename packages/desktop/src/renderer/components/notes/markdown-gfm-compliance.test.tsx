import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { EditorView } from '@codemirror/view';
import { MarkdownEditor } from './MarkdownEditor.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderEditor(content: string, options?: { displayMode?: 'live-preview' | 'rendered' }) {
  const onContentChange = vi.fn();
  const result = render(
    <MarkdownEditor
      rawContent={content}
      onContentChange={onContentChange}
      saveState="idle"
      displayMode={options?.displayMode ?? 'live-preview'}
      currentFilePath="test.md"
    />,
  );
  return { ...result, onContentChange };
}

/** Get the CodeMirror EditorView from the rendered component. */
function getView(): EditorView {
  const el = screen.getByLabelText('Markdown editor');
  const view = EditorView.findFromDOM(el);
  if (!view) throw new Error('Expected CodeMirror EditorView');
  return view;
}

/** Read the current document text from the CodeMirror view. */
function readDocText(): string {
  return getView().state.doc.toString();
}

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  window.srgnt = {
    notesListWorkspaceMarkdown: vi.fn(async () => ({ files: [] })),
    openExternal: vi.fn(async () => {}),
  } as unknown as typeof window.srgnt;
});

afterEach(() => {
  vi.useRealTimers();
});

// ===========================================================================
// Round-Trip Tests (JSDOM-safe)
//
// Visual/interaction tests (CSS class assertions, computed styles, click
// interactions) live in e2e/gfm-compliance.spec.ts.
// ===========================================================================

// --- Headings ---

describe('GFM Compliance: Headings (round-trip)', () => {
  it('round-trips ATX headings h1-h6 without data loss', () => {
    renderEditor('# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6');
    expect(readDocText()).toBe('# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6');
  });

  it('round-trips Setext h1 with ===', () => {
    renderEditor('Setext H1\n===');
    expect(readDocText()).toBe('Setext H1\n===');
  });

  it('round-trips Setext h2 with ---', () => {
    renderEditor('Setext H2\n---');
    expect(readDocText()).toBe('Setext H2\n---');
  });
});

// --- Paragraphs ---

describe('GFM Compliance: Paragraphs (round-trip)', () => {
  it('round-trips a basic paragraph', () => {
    renderEditor('Hello world');
    expect(readDocText()).toBe('Hello world');
  });

  it('round-trips multiple paragraphs preserving blank line separation', () => {
    renderEditor('Alpha\n\nBeta');
    expect(readDocText()).toBe('Alpha\n\nBeta');
  });
});

// --- Blockquotes ---

describe('GFM Compliance: Blockquotes (round-trip)', () => {
  it('round-trips single-level blockquote', () => {
    renderEditor('> quoted text');
    expect(readDocText()).toBe('> quoted text');
  });

  it('round-trips nested blockquotes', () => {
    renderEditor('> outer\n> > inner');
    expect(readDocText()).toBe('> outer\n> > inner');
  });

  it('round-trips blockquote containing other block elements', () => {
    renderEditor('> # Heading in quote\n>\n> - list item');
    expect(readDocText()).toBe('> # Heading in quote\n>\n> - list item');
  });
});

// --- Fenced Code Blocks ---

describe('GFM Compliance: Fenced Code Blocks (round-trip)', () => {
  it('round-trips fenced code with info string', () => {
    renderEditor('```js\nconsole.log("hi")\n```');
    expect(readDocText()).toBe('```js\nconsole.log("hi")\n```');
  });

  it('round-trips fenced code without info string', () => {
    renderEditor('```\nplain code\n```');
    expect(readDocText()).toBe('```\nplain code\n```');
  });

  it('round-trips empty fenced code block', () => {
    renderEditor('```\n```');
    expect(readDocText()).toBe('```\n```');
  });
});

// --- Indented Code Blocks ---

describe('GFM Compliance: Indented Code Blocks (round-trip)', () => {
  it('round-trips 4-space indented code', () => {
    renderEditor('    indented code line');
    expect(readDocText()).toBe('    indented code line');
  });
});

// --- Horizontal Rules ---

describe('GFM Compliance: Horizontal Rules (round-trip)', () => {
  it.each(['---', '***', '___'])('round-trips %s', (syntax) => {
    renderEditor(syntax);
    expect(readDocText()).toBe(syntax);
  });
});

// --- Bullet Lists ---

describe('GFM Compliance: Bullet Lists (round-trip)', () => {
  it('round-trips single-level bullet list', () => {
    renderEditor('- one\n- two\n- three');
    expect(readDocText()).toBe('- one\n- two\n- three');
  });

  it('round-trips nested bullet list', () => {
    renderEditor('- top\n  - nested');
    expect(readDocText()).toBe('- top\n  - nested');
  });

  it('round-trips bullet list with paragraph', () => {
    renderEditor('- item one\n\n  continued paragraph');
    expect(readDocText()).toBe('- item one\n\n  continued paragraph');
  });
});

// --- Ordered Lists ---

describe('GFM Compliance: Ordered Lists (round-trip)', () => {
  it('round-trips single-level ordered list', () => {
    renderEditor('1. first\n2. second\n3. third');
    expect(readDocText()).toBe('1. first\n2. second\n3. third');
  });

  it('round-trips nested ordered list', () => {
    renderEditor('1. top\n   1. nested');
    expect(readDocText()).toBe('1. top\n   1. nested');
  });

  it('round-trips mixed bullet and ordered lists', () => {
    renderEditor('1. ordered\n   - bullet nested');
    expect(readDocText()).toBe('1. ordered\n   - bullet nested');
  });
});

// --- Task Lists ---

describe('GFM Compliance: Task Lists (round-trip)', () => {
  it('round-trips unchecked and checked task items', () => {
    renderEditor('- [ ] pending\n- [x] completed');
    expect(readDocText()).toBe('- [ ] pending\n- [x] completed');
  });

  it('round-trips nested task items', () => {
    renderEditor('- [ ] parent\n  - [x] child');
    expect(readDocText()).toBe('- [ ] parent\n  - [x] child');
  });

  it('toggles checkbox via dispatch and round-trips', () => {
    const onContentChange = vi.fn();
    render(
      <MarkdownEditor
        rawContent="- [ ] toggle me"
        onContentChange={onContentChange}
        saveState="idle"
        displayMode="live-preview"
        currentFilePath="test.md"
      />,
    );

    const view = getView();
    const line = view.state.doc.line(1);
    const match = line.text.match(/^(\s*(?:[-*+]|\d+[.)])\s+\[)( |x|X)(\].*)$/);
    expect(match).not.toBeNull();

    const markerPos = line.from + match![1].length;
    act(() => {
      view.dispatch({
        changes: { from: markerPos, to: markerPos + 1, insert: 'x' },
      });
    });

    expect(readDocText()).toBe('- [x] toggle me');
  });
});

// --- Inline Elements ---

describe('GFM Compliance: Inline Elements (round-trip)', () => {
  it('round-trips *italic* emphasis', () => {
    renderEditor('This is *italic* text');
    expect(readDocText()).toBe('This is *italic* text');
  });

  it('round-trips _italic_ emphasis', () => {
    renderEditor('This is _italic_ text');
    expect(readDocText()).toBe('This is _italic_ text');
  });

  it('round-trips **bold** strong', () => {
    renderEditor('This is **bold** text');
    expect(readDocText()).toBe('This is **bold** text');
  });

  it('round-trips __bold__ strong', () => {
    renderEditor('This is __bold__ text');
    expect(readDocText()).toBe('This is __bold__ text');
  });

  it('round-trips ~~strikethrough~~', () => {
    renderEditor('This is ~~deleted~~ text');
    expect(readDocText()).toBe('This is ~~deleted~~ text');
  });

  it('round-trips `inline code`', () => {
    renderEditor('Use `console.log` here');
    expect(readDocText()).toBe('Use `console.log` here');
  });

  it('round-trips [text](url) link', () => {
    renderEditor('[click](https://example.com)');
    expect(readDocText()).toBe('[click](https://example.com)');
  });

  it('round-trips [text](url "title") link with title', () => {
    renderEditor('[click](https://example.com "Title")');
    expect(readDocText()).toBe('[click](https://example.com "Title")');
  });

  it('round-trips ![alt](url) image', () => {
    renderEditor('![alt](https://example.com/img.png)');
    expect(readDocText()).toBe('![alt](https://example.com/img.png)');
  });

  it('round-trips bare autolink', () => {
    renderEditor('Visit https://example.com for more');
    expect(readDocText()).toBe('Visit https://example.com for more');
  });

  it('round-trips email autolink', () => {
    renderEditor('<user@example.com>');
    expect(readDocText()).toBe('<user@example.com>');
  });

  it('round-trips HTML entities without mangling', () => {
    renderEditor('&amp; &lt; &gt;');
    expect(readDocText()).toBe('&amp; &lt; &gt;');
  });
});

// --- Tables ---

describe('GFM Compliance: Tables (round-trip)', () => {
  it('round-trips basic table', () => {
    renderEditor('| A | B |\n| --- | --- |\n| 1 | 2 |');
    expect(readDocText()).toBe('| A | B |\n| --- | --- |\n| 1 | 2 |');
  });

  it('round-trips left-aligned table', () => {
    renderEditor('| Left |\n| :--- |\n| val |');
    expect(readDocText()).toBe('| Left |\n| :--- |\n| val |');
  });

  it('round-trips center-aligned table', () => {
    renderEditor('| Center |\n| :---: |\n| val |');
    expect(readDocText()).toBe('| Center |\n| :---: |\n| val |');
  });

  it('round-trips right-aligned table', () => {
    renderEditor('| Right |\n| ---: |\n| val |');
    expect(readDocText()).toBe('| Right |\n| ---: |\n| val |');
  });

  it('round-trips table with empty cells', () => {
    renderEditor('| A | B |\n| --- | --- |\n|  | val |');
    expect(readDocText()).toBe('| A | B |\n| --- | --- |\n|  | val |');
  });

  it('round-trips table with inline formatting in cells', () => {
    renderEditor('| Text |\n| --- |\n| **bold** |');
    expect(readDocText()).toBe('| Text |\n| --- |\n| **bold** |');
  });
});

// --- Edge Cases ---

describe('GFM Compliance: Escaped Characters (round-trip)', () => {
  it('round-trips escaped asterisk', () => {
    renderEditor('\\*not italic\\*');
    expect(readDocText()).toBe('\\*not italic\\*');
  });

  it('round-trips escaped hash', () => {
    renderEditor('\\# not a heading');
    expect(readDocText()).toBe('\\# not a heading');
  });

  it('round-trips escaped bracket', () => {
    renderEditor('\\[not a link\\]');
    expect(readDocText()).toBe('\\[not a link\\]');
  });
});

describe('GFM Compliance: Nested Inline (round-trip)', () => {
  it('round-trips **bold *italic* bold** nesting', () => {
    renderEditor('**bold *italic* bold**');
    expect(readDocText()).toBe('**bold *italic* bold**');
  });
});

describe('GFM Compliance: Mixed Blockquotes and Lists (round-trip)', () => {
  it('round-trips blockquote containing a list', () => {
    renderEditor('> - item one\n> - item two');
    expect(readDocText()).toBe('> - item one\n> - item two');
  });

  it('round-trips list containing a blockquote', () => {
    renderEditor('- item\n  > quoted in list');
    expect(readDocText()).toBe('- item\n  > quoted in list');
  });
});

describe('GFM Compliance: Code Blocks Inside Lists (round-trip)', () => {
  it('round-trips fenced code inside a list item', () => {
    renderEditor('- item\n  ```\n  code\n  ```');
    expect(readDocText()).toBe('- item\n  ```\n  code\n  ```');
  });
});

// ===========================================================================
// Editing Preservation (JSDOM-safe)
// ===========================================================================

describe('GFM Compliance: Editing Preserves Structure', () => {
  it('preserves heading text when editing', () => {
    renderEditor('## Original');
    const view = getView();

    act(() => {
      const line = view.state.doc.line(1);
      const from = line.from + 3;
      view.dispatch({
        changes: { from, to: from + 'Original'.length, insert: 'Updated' },
      });
    });

    expect(readDocText()).toBe('## Updated');
  });

  it('preserves code block when editing code content', () => {
    renderEditor('```js\nhello\n```');
    const view = getView();

    act(() => {
      const line = view.state.doc.line(2);
      view.dispatch({
        changes: { from: line.from, to: line.to, insert: 'world' },
      });
    });

    expect(readDocText()).toBe('```js\nworld\n```');
  });

  it('preserves list structure when editing list content', () => {
    renderEditor('- alpha\n- beta');
    const view = getView();

    act(() => {
      const line = view.state.doc.line(1);
      const from = line.from + 2;
      view.dispatch({
        changes: { from, to: from + 'alpha'.length, insert: 'gamma' },
      });
    });

    expect(readDocText()).toBe('- gamma\n- beta');
  });
});
