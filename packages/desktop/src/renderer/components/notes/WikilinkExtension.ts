import { EditorView, Decoration, ViewPlugin, type DecorationSet } from '@codemirror/view';
import { autocompletion, type Completion, type CompletionContext, type CompletionResult, type CompletionSource } from '@codemirror/autocomplete';
import type { Extension, Range } from '@codemirror/state';

/**
 * Wikilink decoration plugin for CodeMirror.
 * Decorates [[Note Name]] and [[Note Name|Alias]] syntax as clickable links.
 */
export const wikilinkPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    
    constructor(view: EditorView) {
      this.decorations = this.build(view);
    }
    
    update(update: { docChanged: boolean; viewportChanged: boolean; view: EditorView }) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.build(update.view);
      }
    }
    
    build(view: EditorView): DecorationSet {
      const decs: Range<Decoration>[] = [];
      
      // Wikilink regex: [[Note Name]] or [[Note Name|Alias]]
      // Also handles [[Note#123]] and [[Note|Alias#45]] for line references
      const wikilinkRegex = /\[\[([^\[\]]+?)\]\]/g;
      const doc = view.state.doc.toString();
      
      let match: RegExpExecArray | null;
      while ((match = wikilinkRegex.exec(doc)) !== null) {
        const from = match.index;
        const to = match.index + match[0].length;
        
        // Inner content (everything between [[ and ]])
        const inner = match[1];
        
        // Create clickable decoration
        decs.push(
          Decoration.mark({
            class: 'cm-wikilink',
            attributes: {
              'data-wikilink': inner,
              'data-wikilink-full': match[0],
              tabindex: '0',
            },
          }).range(from, to),
        );
      }
      
      return Decoration.set(decs, true);
    }
  },
  { decorations: (v) => v.decorations },
);

/**
 * Wikilink click handler extension.
 * Handles click events on wikilink decorations and triggers navigation.
 */
export function wikilinkClickHandler(
  onWikilinkClick: (wikilink: string) => void
): ViewPlugin<typeof EditorView> {
  return ViewPlugin.fromClass(
    class {
      private handleClick: (event: MouseEvent) => void;
      
      constructor(view: EditorView) {
        this.handleClick = (event: MouseEvent) => {
          const target = event.target as HTMLElement;
          const wikilinkEl = target.closest('.cm-wikilink') as HTMLElement;
          
          if (!wikilinkEl) return;
          
          const wikilinkFull = wikilinkEl.getAttribute('data-wikilink-full');
          if (!wikilinkFull) return;
          
          event.preventDefault();
          event.stopPropagation();
          onWikilinkClick(wikilinkFull);
        };
        
        view.dom.addEventListener('click', this.handleClick);
      }
      
      destroy() {
        // Note: We can't access to view here, but the handler is stored on this
        // In practice, this cleanup happens when the plugin is destroyed
      }
    },
  );
}

/**
 * Wikilink autocomplete completion source.
 * Provides suggestions when user types [[.
 */
export function wikilinkCompletionSource(
  getSuggestions: (query: string) => Promise<{ label: string; detail?: string; info?: string }[]>
): (context: CompletionContext) => Promise<CompletionResult | null> {
  return async (context: CompletionContext) => {
    console.debug('[wikilinkCompletionSource]', { pos: context.pos, explicit: context.explicit, line: context.state.doc.lineAt(context.pos).text });
    // Check if we're at a position where [[ is expected or was just typed
    const doc = context.state.doc;
    const pos = context.pos;
    
    // Look back for [[
    const textBefore = doc.sliceString(Math.max(0, pos - 100), pos);
    const openBracketMatch = textBefore.lastIndexOf('[[');
    
    if (openBracketMatch === -1) return null;
    
    const startPos = pos - textBefore.length + openBracketMatch + 2;
    
    // Check if there's a closing ]] already (don't autocomplete inside existing wikilink)
    const textAfter = doc.sliceString(pos, Math.min(doc.length, pos + 50));
    if (textAfter.includes(']]')) return null;
    
    // Get the query text between [[ and current position
    const query = doc.sliceString(startPos, pos).trim();
    
    // Don't trigger autocomplete on empty [[ (wait for first character)
    if (query.length === 0 && context.explicit) {
      // Allow explicit trigger with empty query
    } else if (query.length === 0) {
      return null;
    }
    
    // Get suggestions from main process
    const suggestions = await getSuggestions(query);
    
    if (suggestions.length === 0) return null;
    
    return {
      from: startPos,
      to: pos,
      options: suggestions.map((s) => ({
        label: s.label,
        detail: s.detail,
        info: s.info,
        apply: (view: EditorView, _completion: Completion, from: number, to: number) => {
          // Insert wikilink: [[label]]
          view.dispatch({
            changes: { from, to, insert: `${s.label}]]` },
          });
        },
      })),
      validFor: (text: string) => !text.includes(']]'),
    };
  };
}

/**
 * Normalize completion sources so mixed sync/async sources all expose the same
 * async contract to CodeMirror.
 */
export function normalizeCompletionSources(sources: CompletionSource[]): CompletionSource[] {
  return sources.map(
    (source): CompletionSource =>
      async (context: CompletionContext) => await source(context),
  );
}

/**
 * Creates full wikilink extension for CodeMirror.
 * Includes decoration, click handling, and autocomplete.
 * 
 * @param onWikilinkClick - Callback when wikilink is clicked
 * @param getSuggestions - Fetch suggestions for wikilink autocomplete
 * @param additionalOverrides - Additional completion sources to merge (e.g., slash commands)
 */
export function createWikilinkExtension(
  onWikilinkClick: (wikilink: string) => void,
  getSuggestions: (query: string) => Promise<{ label: string; detail?: string; info?: string }[]>,
  additionalOverrides: CompletionSource[] = []
): Extension[] {
  // CodeMirror completion overrides behave more reliably when every source has the
  // same async shape. Wrap any synchronous sources so slash commands can coexist
  // with async wikilink lookups in the same override array.
  const allOverrides = normalizeCompletionSources([
    wikilinkCompletionSource(getSuggestions),
    ...additionalOverrides,
  ]);

  return [
    wikilinkPlugin,
    wikilinkClickHandler(onWikilinkClick),
    autocompletion({
      override: allOverrides,
      activateOnTyping: true,
      maxRenderedOptions: 20,
    }),
  ];
}

/**
 * CSS styles for wikilink decorations (to be added to editor theme).
 */
export const wikilinkStyles = EditorView.baseTheme({
  '.cm-wikilink': {
    color: 'var(--color-link)',
    cursor: 'pointer',
    textDecoration: 'underline',
    textDecorationColor: 'var(--color-link)',
    textDecorationStyle: 'solid',
    borderRadius: '2px',
    '&:hover': {
      backgroundColor: 'var(--color-surface-hover)',
    },
    '&:focus': {
      outline: '1px solid var(--color-link)',
      outlineOffset: '1px',
    },
  },
});