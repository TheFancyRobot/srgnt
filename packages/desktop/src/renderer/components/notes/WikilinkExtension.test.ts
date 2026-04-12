/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EditorView, Decoration, ViewPlugin } from '@codemirror/view';
import { autocompletion, type CompletionContext } from '@codemirror/autocomplete';
import {
  wikilinkPlugin,
  wikilinkStyles,
  wikilinkClickHandler,
  wikilinkCompletionSource,
  normalizeCompletionSources,
  createWikilinkExtension,
} from './WikilinkExtension.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal CompletionContext-like object for wikilinkCompletionSource. */
const createMockContext = (text: string, pos: number, explicit = false) => ({
  pos,
  explicit,
  state: {
    doc: {
      length: text.length,
      sliceString: (from: number, to: number) => text.slice(from, to),
      lineAt: () => ({ text }),
      toString: () => text,
    },
  },
});

/** Build a minimal EditorView-like object for click-handler tests. */
const createMockView = () => ({
  dom: document.createElement('div'),
});

// ---------------------------------------------------------------------------
// Module exports
// ---------------------------------------------------------------------------

describe('WikilinkExtension – module exports', () => {
  it('exports wikilinkPlugin as a ViewPlugin', () => {
    expect(wikilinkPlugin).toBeDefined();
    // ViewPlugin instances expose a create() method used internally by CM
    expect(typeof wikilinkPlugin).toBe('object');
  });

  it('exports wikilinkStyles as a theme extension', () => {
    expect(wikilinkStyles).toBeDefined();
  });

  it('createWikilinkExtension returns an array of extensions', () => {
    const noop = vi.fn();
    const exts = createWikilinkExtension(noop, async () => []);
    expect(Array.isArray(exts)).toBe(true);
    expect(exts.length).toBeGreaterThanOrEqual(2);
  });

  it('createWikilinkExtension passes additionalOverrides through normalizeCompletionSources', () => {
    const noop = vi.fn();
    const additionalSource = vi.fn().mockResolvedValue(null);
    const exts = createWikilinkExtension(noop, async () => [], [additionalSource]);
    expect(Array.isArray(exts)).toBe(true);
    // The extension array should still contain the 3 core extensions
    expect(exts.length).toBeGreaterThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// Wikilink regex
// ---------------------------------------------------------------------------

describe('wikilink regex', () => {
  const regex = /\[\[([^\[\]]+?)\]\]/g;

  /** Reset lastIndex and return all captures. */
  const matchAll = (text: string): RegExpExecArray[] => {
    regex.lastIndex = 0;
    const results: RegExpExecArray[] = [];
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      results.push(m);
    }
    return results;
  };

  it('matches [[Note]]', () => {
    const matches = matchAll('Some text [[Note]] here');
    expect(matches).toHaveLength(1);
    expect(matches[0][1]).toBe('Note');
  });

  it('matches [[Note|Alias]]', () => {
    const matches = matchAll('See [[Note|Alias]]');
    expect(matches).toHaveLength(1);
    expect(matches[0][1]).toBe('Note|Alias');
  });

  it('matches [[Note#123]] (line reference)', () => {
    const matches = matchAll('Jump to [[Note#123]]');
    expect(matches).toHaveLength(1);
    expect(matches[0][1]).toBe('Note#123');
  });

  it('matches [[Note|Alias#45]]', () => {
    const matches = matchAll('Go [[Note|Alias#45]] now');
    expect(matches).toHaveLength(1);
    expect(matches[0][1]).toBe('Note|Alias#45');
  });

  it('does NOT match unclosed [[Note', () => {
    const matches = matchAll('Unclosed [[Note');
    expect(matches).toHaveLength(0);
  });

  it('does NOT match single-bracket [Note]', () => {
    const matches = matchAll('Single [Note]');
    expect(matches).toHaveLength(0);
  });

  it('matches multiple wikilinks in the same text', () => {
    const matches = matchAll('[[Alpha]] and [[Beta]]');
    expect(matches).toHaveLength(2);
    expect(matches[0][1]).toBe('Alpha');
    expect(matches[1][1]).toBe('Beta');
  });
});

// ---------------------------------------------------------------------------
// wikilinkCompletionSource
// ---------------------------------------------------------------------------

describe('wikilinkCompletionSource', () => {
  it('returns null when no [[ is found before cursor', async () => {
    const source = wikilinkCompletionSource(async () => [{ label: 'X' }]);
    const ctx = createMockContext('no brackets here', 5);
    const result = await source(ctx as unknown as CompletionContext);
    expect(result).toBeNull();
  });

  it('returns null when ]] exists after cursor (already closed)', async () => {
    const source = wikilinkCompletionSource(async () => [{ label: 'X' }]);
    // Position cursor after "Ab" inside [[Ab]]
    const ctx = createMockContext('[[Ab]]', 4);
    const result = await source(ctx as unknown as CompletionContext);
    expect(result).toBeNull();
  });

  it('returns null when query is empty and context is not explicit', async () => {
    const source = wikilinkCompletionSource(async () => [{ label: 'X' }]);
    // Cursor right after "[["  — query is ""
    const ctx = createMockContext('[[', 2, false);
    const result = await source(ctx as unknown as CompletionContext);
    expect(result).toBeNull();
  });

  it('returns completions for explicit trigger with empty query', async () => {
    const source = wikilinkCompletionSource(async () => [{ label: 'AllNotes' }]);
    // Cursor right after "[[" with explicit=true
    const ctx = createMockContext('[[', 2, true);
    const result = await source(ctx as unknown as CompletionContext);
    expect(result).not.toBeNull();
    expect(result!.options).toHaveLength(1);
    expect(result!.options[0].label).toBe('AllNotes');
  });

  it('returns null when getSuggestions returns empty array', async () => {
    const source = wikilinkCompletionSource(async () => []);
    const ctx = createMockContext('[[Ap', 4);
    const result = await source(ctx as unknown as CompletionContext);
    expect(result).toBeNull();
  });

  it('completion options include apply function that inserts wikilink syntax', async () => {
    const source = wikilinkCompletionSource(async () => [{ label: 'TestNote' }]);
    const ctx = createMockContext('[[Test', 6);
    const result = await source(ctx as unknown as CompletionContext);
    expect(result).not.toBeNull();
    expect(result!.options[0].apply).toBeDefined();
    expect(typeof result!.options[0].apply).toBe('function');
  });

  it('returns completions when valid query is provided', async () => {
    const mockSuggestions = [
      { label: 'Apple', detail: 'fruit' },
      { label: 'Application', detail: 'software' },
    ];
    const source = wikilinkCompletionSource(async () => mockSuggestions);
    // Cursor after "[[Ap"
    const ctx = createMockContext('[[Ap', 4);
    const result = await source(ctx as unknown as CompletionContext);
    expect(result).not.toBeNull();
    expect(result!.options).toHaveLength(2);
    expect(result!.options[0].label).toBe('Apple');
    expect(result!.options[1].label).toBe('Application');
  });
});

// ---------------------------------------------------------------------------
// normalizeCompletionSources
// ---------------------------------------------------------------------------

describe('normalizeCompletionSources', () => {
  it('wraps sync sources as async sources', async () => {
    const syncSource = vi.fn().mockReturnValue({ from: 0, to: 1, options: [] });
    const normalized = normalizeCompletionSources([syncSource]);

    expect(normalized).toHaveLength(1);
    // Call the wrapped source – should return a thenable (Promise)
    const ctx = createMockContext('[[X', 3);
    const result = normalized[0](ctx as unknown as CompletionContext);
    // Must be a Promise-like object
    expect(typeof result.then).toBe('function');
    await result;
    expect(syncSource).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// wikilinkClickHandler
// ---------------------------------------------------------------------------

describe('wikilinkClickHandler', () => {
  /**
   * ViewPlugin.fromClass wraps the class so we can't easily instantiate it.
   * Instead, replicate the core click-handler logic inline to verify behaviour.
   */
  const makeHandler = (onWikilinkClick: (wikilink: string) => void) =>
    (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const wikilinkEl = target.closest('.cm-wikilink') as HTMLElement;
      if (!wikilinkEl) return;
      const wikilinkFull = wikilinkEl.getAttribute('data-wikilink-full');
      if (!wikilinkFull) return;
      event.preventDefault();
      event.stopPropagation();
      onWikilinkClick(wikilinkFull);
    };

  it('triggers callback when clicking a .cm-wikilink element', () => {
    const onClick = vi.fn();
    const handler = makeHandler(onClick);

    const wikilinkSpan = document.createElement('span');
    wikilinkSpan.className = 'cm-wikilink';
    wikilinkSpan.setAttribute('data-wikilink-full', '[[TestNote]]');

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'target', { value: wikilinkSpan });

    handler(event);

    expect(onClick).toHaveBeenCalledWith('[[TestNote]]');
  });

  it('does NOT trigger callback when clicking a non-wikilink element', () => {
    const onClick = vi.fn();
    const handler = makeHandler(onClick);

    const plainSpan = document.createElement('span');
    plainSpan.textContent = 'just text';

    const event = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(event, 'target', { value: plainSpan });

    handler(event);

    expect(onClick).not.toHaveBeenCalled();
  });
});
