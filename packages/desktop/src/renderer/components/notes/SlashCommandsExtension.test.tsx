import { CompletionContext } from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { describe, expect, it } from 'vitest';
import { slashCommandSource, slashCommandsStyles } from './SlashCommandsExtension.js';

describe('slashCommandSource', () => {
  it('triggers after indentation even when letters are typed after the slash', async () => {
    const state = EditorState.create({ doc: '  /he' });
    const context = new CompletionContext(state, state.doc.length, false);

    const result = await slashCommandSource(context);

    expect(result).not.toBeNull();
    expect(result?.from).toBe(2);
    expect(result?.options.some((option) => option.label === '/heading1')).toBe(true);
    expect(result?.options.some((option) => option.label === '/heading2')).toBe(true);
    expect(result?.options.some((option) => option.label === '/heading3')).toBe(true);
  });

  it('does not trigger in the middle of non-whitespace text', async () => {
    const state = EditorState.create({ doc: 'text /he' });
    const context = new CompletionContext(state, state.doc.length, false);

    const result = await slashCommandSource(context);

    expect(result).toBeNull();
  });

  it('returns completions with validFor regex and info callback', async () => {
    const state = EditorState.create({ doc: '/code' });
    const context = new CompletionContext(state, state.doc.length, false);
    const result = await slashCommandSource(context);

    expect(result).not.toBeNull();
    expect(result!.validFor).toEqual(/^\/[a-z]*$/);

    // Test the info callback on a completion
    const codeOption = result!.options.find((o) => o.label === '/code');
    expect(codeOption).toBeDefined();
    expect(typeof codeOption!.info).toBe('function');

    const infoEl = codeOption!.info!(codeOption!);
    expect(infoEl).toBeInstanceOf(HTMLElement);
    expect(infoEl.className).toBe('cm-completion-info');
    expect(infoEl.textContent).toBe('Inserts: Code block');
  });

  it('returns null when no commands match the filter', async () => {
    const state = EditorState.create({ doc: '/zzzzz' });
    const context = new CompletionContext(state, state.doc.length, false);
    const result = await slashCommandSource(context);
    expect(result).toBeNull();
  });

  it('preserves leading indentation when applying a command', async () => {
    const state = EditorState.create({ doc: '  /todo' });
    const context = new CompletionContext(state, state.doc.length, false);
    const result = await slashCommandSource(context);

    expect(result).not.toBeNull();
    const todo = result?.options.find((option) => option.label === '/todo');
    expect(todo).toBeDefined();
    expect(typeof todo?.apply).toBe('function');

    const parent = document.createElement('div');
    document.body.appendChild(parent);
    const view = new EditorView({ state, parent });

    try {
      if (typeof todo?.apply !== 'function') {
        throw new Error('Expected todo completion to have an apply handler');
      }

      todo.apply(view, todo, result!.from, result!.to!);

      expect(view.state.doc.toString()).toBe('  - [ ] ');
      expect(view.state.selection.main.head).toBe(8);
    } finally {
      view.destroy();
      parent.remove();
    }
  });
});

describe('slashCommandsStyles', () => {
  it('exports a CodeMirror theme extension', () => {
    expect(slashCommandsStyles).toBeDefined();
    // EditorView.baseTheme returns an Extension (non-null object)
    expect(typeof slashCommandsStyles).toBe('object');
    expect(slashCommandsStyles).not.toBeNull();
  });
});
