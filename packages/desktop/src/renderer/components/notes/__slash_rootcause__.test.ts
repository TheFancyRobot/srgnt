import { CompletionContext } from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';
import { describe, expect, it } from 'vitest';
import { slashCommandSource } from './SlashCommandsExtension.js';
import { normalizeCompletionSources, wikilinkCompletionSource } from './WikilinkExtension.js';

describe('slash command integration root cause', () => {
  it('returns slash completions from the standalone synchronous source', async () => {
    const state = EditorState.create({ doc: '/todo' });
    const context = new CompletionContext(state, state.doc.length, true);

    const result = await slashCommandSource(context);

    expect(result).not.toBeNull();
    expect(result?.options.some((item) => item.label === '/todo')).toBe(true);
  });

  it('preserves slash completions when mixed with async wikilink completions', async () => {
    const sources = normalizeCompletionSources([
      wikilinkCompletionSource(async () => []),
      slashCommandSource,
    ]);
    const state = EditorState.create({ doc: '/todo' });
    const context = new CompletionContext(state, state.doc.length, true);

    const results = await Promise.all(sources.map((source) => source(context)));
    const slashResult = results.find((result) =>
      result?.options.some((item) => item.label === '/todo'),
    );

    expect(slashResult).toBeDefined();
    expect(slashResult?.options.some((item) => item.label === '/todo')).toBe(true);
  });
});
