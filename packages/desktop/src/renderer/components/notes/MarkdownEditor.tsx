import React from 'react';
import { EditorState, type Range } from '@codemirror/state';
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from '@codemirror/commands';
import { syntaxTree } from '@codemirror/language';
import { markdown } from '@codemirror/lang-markdown';
import { GFM } from '@lezer/markdown';
import { Decoration, EditorView, WidgetType, keymap, placeholder, ViewPlugin, type DecorationSet } from '@codemirror/view';
import { completionKeymap, acceptCompletion } from '@codemirror/autocomplete';
import {
  collapseOnSelectionFacet,
  editorTheme,
  imageField,
  linkPlugin,
  livePreviewPlugin,
  markdownStylePlugin,
  mouseSelectingField,
  setMouseSelecting,
  shouldShowSource,
  tableEditorPlugin,

} from 'codemirror-live-markdown';
import { parseFrontmatter, serializeWithFrontmatter } from './markdown-serializer.js';
import { createWikilinkExtension, wikilinkStyles } from './WikilinkExtension.js';
import { slashCommandSource, slashCommandsStyles } from './SlashCommandsExtension.js';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';
export type EditorDisplayMode = 'live-preview' | 'rendered';

interface MarkdownEditorProps {
  rawContent: string;
  onContentChange: (markdown: string) => void;
  saveState: SaveState;
  displayMode: EditorDisplayMode;
  currentFilePath?: string;
  onWikilinkClick?: (wikilink: string) => void;
}

/** Decorate lines that contain list items so CSS can render bullets/numbers. */
const listLinePlugin = ViewPlugin.fromClass(
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
      const seen = new Set<number>();
      syntaxTree(view.state).iterate({
        enter: (node) => {
          if (node.name !== 'ListItem') return;
          const line = view.state.doc.lineAt(node.from);
          if (seen.has(line.number)) return;
          seen.add(line.number);
          const parent = node.node.parent;
          if (parent?.name === 'OrderedList') {
            // Extract the actual number from the ListMark child (e.g. "1.")
            let mark = '';
            node.node.cursor().iterate((child) => {
              if (child.name === 'ListMark') {
                mark = view.state.doc.sliceString(child.from, child.to);
              }
            });
            decs.push(
              Decoration.line({
                class: 'cm-list-ordered-line',
                attributes: { 'data-list-num': mark || '1.' },
              }).range(line.from),
            );
          } else {
            decs.push(Decoration.line({ class: 'cm-list-bullet-line' }).range(line.from));
          }
        },
      });
      return Decoration.set(decs, true);
    }
  },
  { decorations: (v) => v.decorations },
);

/** Decorate blockquote lines so CSS can restore visual quote styling. */
const blockquoteLinePlugin = ViewPlugin.fromClass(
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
      const seen = new Map<number, number>();
      syntaxTree(view.state).iterate({
        enter: (node) => {
          if (node.name !== 'Blockquote') return;

          let depth = 0;
          let parent: typeof node.node | null = node.node;
          while (parent) {
            if (parent.name === 'Blockquote') {
              depth += 1;
            }
            parent = parent.parent;
          }

          const fromLine = view.state.doc.lineAt(node.from).number;
          const toLine = view.state.doc.lineAt(node.to).number;
          for (let lineNumber = fromLine; lineNumber <= toLine; lineNumber += 1) {
            const currentDepth = seen.get(lineNumber) ?? 0;
            if (depth <= currentDepth) continue;
            seen.set(lineNumber, depth);
          }
        },
      });

      for (const [lineNumber, depth] of seen) {
        const line = view.state.doc.line(lineNumber);
        decs.push(
          Decoration.line({
            class: 'cm-blockquote-line',
            attributes: { 'data-blockquote-depth': String(depth) },
          }).range(line.from),
        );
      }

      return Decoration.set(decs, true);
    }
  },
  { decorations: (v) => v.decorations },
);

/** Decorate block code lines so CSS can render a shared code container. */
const codeBlockLinePlugin = ViewPlugin.fromClass(
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
      const seen = new Set<number>();

      syntaxTree(view.state).iterate({
        enter: (node) => {
          if (node.name !== 'CodeBlock' && node.name !== 'FencedCode') {
            return;
          }

          const firstLine = view.state.doc.lineAt(node.from).number;
          const lastPos = Math.max(node.from, node.to - 1);
          const lastLine = view.state.doc.lineAt(lastPos).number;

          for (let lineNumber = firstLine; lineNumber <= lastLine; lineNumber += 1) {
            if (seen.has(lineNumber)) {
              continue;
            }

            seen.add(lineNumber);
            const line = view.state.doc.line(lineNumber);
            const classes = ['cm-codeblock-line'];

            if (lineNumber === firstLine) {
              classes.push('cm-codeblock-first');
            }
            if (lineNumber === lastLine) {
              classes.push('cm-codeblock-last');
            }

            decs.push(Decoration.line({ class: classes.join(' ') }).range(line.from));
          }
        },
      });

      return Decoration.set(decs, true);
    }
  },
  { decorations: (v) => v.decorations },
);

const blockFormattingRevealPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = this.build(view);
    }
    update(update: { docChanged: boolean; viewportChanged: boolean; selectionSet: boolean; view: EditorView }) {
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        this.decorations = this.build(update.view);
      }
    }
    build(view: EditorView): DecorationSet {
      const decs: Range<Decoration>[] = [];
      const activeLines = new Set<number>();

      for (const range of view.state.selection.ranges) {
        const startLine = view.state.doc.lineAt(range.from).number;
        const endLine = view.state.doc.lineAt(range.to).number;
        for (let lineNumber = startLine; lineNumber <= endLine; lineNumber += 1) {
          activeLines.add(lineNumber);
        }
      }

      syntaxTree(view.state).iterate({
        enter: (node) => {
          const isFencedCodeMark =
            node.name === 'CodeMark' && node.node.parent?.name === 'FencedCode';
          const isBlockFormattingMark =
            node.name === 'HeaderMark' ||
            node.name === 'ListMark' ||
            node.name === 'QuoteMark' ||
            node.name === 'TaskMarker';

          if (!isFencedCodeMark && !isBlockFormattingMark) {
            return;
          }

          const lineNumber = view.state.doc.lineAt(node.from).number;
          const className = activeLines.has(lineNumber)
            ? 'cm-formatting-block cm-formatting-block-visible'
            : 'cm-formatting-block';

          let from = node.from;
          let to = node.to;

          if (node.name === 'TaskMarker') {
            const line = view.state.doc.lineAt(node.from);
            if (to < line.to && view.state.doc.sliceString(to, to + 1) === ' ') {
              to += 1;
            }
          }

          decs.push(Decoration.mark({ class: className }).range(from, to));

          if (node.name === 'HeaderMark') {
            const line = view.state.doc.lineAt(node.from);
            if (to < line.to && view.state.doc.sliceString(to, to + 1) === ' ') {
              decs.push(Decoration.mark({ class: className }).range(to, to + 1));
            }
          }
        },
      });

      return Decoration.set(decs, true);
    }
  },
  { decorations: (v) => v.decorations },
);

/** Decorate checkbox list items so CSS can render interactive checkboxes. */
const checkboxLinePlugin = ViewPlugin.fromClass(
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
      const seen = new Set<number>();
      
      // GFM task lists are parsed as Task nodes with a TaskMarker child.
      syntaxTree(view.state).iterate({
        enter: (node) => {
          if (node.name !== 'Task') return;

          const line = view.state.doc.lineAt(node.from);
          if (seen.has(line.number)) return;
          seen.add(line.number);

          const taskText = view.state.doc.sliceString(node.from, Math.min(node.to, line.to));
          const isChecked = /^\[(?:x|X)\]/.test(taskText);

          decs.push(
            Decoration.line({
              class: isChecked ? 'cm-checkbox-checked-line' : 'cm-checkbox-unchecked-line',
            }).range(line.from),
          );
        },
      });
      
      return Decoration.set(decs, true);
    }
  },
  { decorations: (v) => v.decorations },
);

class AutolinkWidget extends WidgetType {
  constructor(private readonly href: string) {
    super();
  }

  eq(other: AutolinkWidget): boolean {
    return other.href === this.href;
  }

  toDOM(): HTMLElement {
    const anchor = document.createElement('a');
    anchor.setAttribute('href', this.href);
    anchor.textContent = this.href;
    anchor.className = 'cm-link-widget';
    return anchor;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

/** Render bare GFM autolinks as clickable anchors when the cursor is outside the URL. */
const autolinkPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = this.build(view);
    }
    update(update: { docChanged: boolean; viewportChanged: boolean; selectionSet: boolean; view: EditorView }) {
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        this.decorations = this.build(update.view);
      }
    }
    build(view: EditorView): DecorationSet {
      const decs: Range<Decoration>[] = [];
      const isDrag = view.state.field(mouseSelectingField, false);

      syntaxTree(view.state).iterate({
        enter: (node) => {
          if (node.name !== 'URL' && node.name !== 'Autolink') return;

          const href = view.state.doc.sliceString(node.from, node.to);
          if (!/^(https?:\/\/|mailto:)/i.test(href)) return;
          if (shouldShowSource(view.state, node.from, node.to) || isDrag) return;

          decs.push(
            Decoration.replace({ widget: new AutolinkWidget(href) }).range(node.from, node.to),
          );
        },
      });

      return Decoration.set(decs, true);
    }
  },
  { decorations: (v) => v.decorations },
);

/** Decorate callout blockquotes so CSS can render styled callout boxes. */
const calloutLinePlugin = ViewPlugin.fromClass(
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
      const seen = new Map<number, string>(); // line number -> callout type

      syntaxTree(view.state).iterate({
        enter: (node) => {
          if (node.name !== 'Blockquote') return;

          const fromLine = view.state.doc.lineAt(node.from).number;
          const toLine = view.state.doc.lineAt(Math.max(node.from, node.to - 1)).number;

          // Check the first line of the blockquote for callout syntax
          const firstLine = view.state.doc.line(fromLine);
          const lineText = view.state.doc.sliceString(firstLine.from, firstLine.to);
          
          // Match > [!type] pattern
          const calloutMatch = lineText.match(/^> \s*\[!([a-zA-Z]+)\]/);
          if (!calloutMatch) return;
          
          const calloutType = calloutMatch[1].toLowerCase();
          
          // Mark all lines in this blockquote as callout
          for (let lineNumber = fromLine; lineNumber <= toLine; lineNumber += 1) {
            // Only set if not already set or if this is a deeper/nested callout
            if (!seen.has(lineNumber)) {
              seen.set(lineNumber, calloutType);
            }
          }
        },
      });

      for (const [lineNumber, calloutType] of seen) {
        const line = view.state.doc.line(lineNumber);
        decs.push(
          Decoration.line({
            class: `cm-callout-line cm-callout-${calloutType}`,
            attributes: { 'data-callout-type': calloutType },
          }).range(line.from),
        );
      }

      return Decoration.set(decs, true);
    }
  },
  { decorations: (v) => v.decorations },
);

/** Decorate thematic break lines so hidden markdown markers still render a visible rule. */
const horizontalRulePlugin = ViewPlugin.fromClass(
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
      const seen = new Set<number>();

      syntaxTree(view.state).iterate({
        enter: (node) => {
          if (node.name !== 'HorizontalRule' && node.name !== 'ThematicBreak') return;

          const line = view.state.doc.lineAt(node.from);
          if (seen.has(line.number)) return;
          seen.add(line.number);

          decs.push(Decoration.line({ class: 'cm-hr-line' }).range(line.from));
        },
      });

      return Decoration.set(decs, true);
    }
  },
  { decorations: (v) => v.decorations },
);

// Arrow key navigation is handled by CodeMirror's defaultKeymap (cursorLineUp/cursorLineDown).

const SAVE_DEBOUNCE_MS = 1000;
const SAVE_STATE_LABELS: Record<SaveState, string | null> = {
  idle: null,
  saving: 'Saving...',
  saved: 'Saved',
  error: 'Save failed',
};

export function MarkdownEditor({
  rawContent,
  onContentChange,
  saveState,
  displayMode,
  currentFilePath: _currentFilePath,
  onWikilinkClick,
}: MarkdownEditorProps): React.ReactElement {
  const parsed = React.useMemo(() => parseFrontmatter(rawContent), [rawContent]);
  const editorMountRef = React.useRef<HTMLDivElement | null>(null);
  const editorRef = React.useRef<EditorView | null>(null);
  const frontmatterRef = React.useRef<string | null>(parsed.frontmatter);
  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const isExternalUpdateRef = React.useRef(false);
  const onContentChangeRef = React.useRef(onContentChange);

  frontmatterRef.current = parsed.frontmatter;
  onContentChangeRef.current = onContentChange;

  // Wikilink click handler
  const handleWikilinkClick = React.useCallback((wikilink: string) => {
    if (onWikilinkClick) {
      onWikilinkClick(wikilink);
    }
  }, [onWikilinkClick]);

  // Wikilink suggestions fetcher
  const fetchWikilinkSuggestions = React.useCallback(async (query: string) => {
    try {
      const response = await window.srgnt.notesListWorkspaceMarkdown(query, 20);
      return response.files.map((file) => ({
        label: file.path.replace(/\.md$/, ''),
        detail: file.path,
        info: file.title,
      }));
    } catch {
      return [];
    }
  }, []);

  React.useEffect(() => {
    const mount = editorMountRef.current;
    if (!mount) {
      return;
    }

    const view = new EditorView({
      state: EditorState.create({
        doc: parsed.body,
        extensions: [
          EditorView.cspNonce.of('srgnt-renderer'),
          EditorView.lineWrapping,
          markdown({ extensions: [GFM] }),
          history(),
          keymap.of([
            // Completion keymap with explicit Tab support
            ...completionKeymap,
            { key: 'Tab', run: acceptCompletion },
            indentWithTab,
            ...historyKeymap,
            ...defaultKeymap,
          ]),
          placeholder('Start writing...'),
          EditorView.contentAttributes.of({
            class: 'markdown-editor-body',
            'aria-label': 'Markdown editor',
            spellcheck: 'false',
            'data-testid': 'markdown-editor-content',
          }),
          EditorView.updateListener.of((update) => {
            if (!update.docChanged) {
              return;
            }
            if (isExternalUpdateRef.current) {
              isExternalUpdateRef.current = false;
              return;
            }

            const fullContent = serializeWithFrontmatter(frontmatterRef.current, update.state.doc.toString());

            if (saveTimerRef.current) {
              clearTimeout(saveTimerRef.current);
            }
            saveTimerRef.current = setTimeout(() => {
              onContentChangeRef.current(fullContent);
            }, SAVE_DEBOUNCE_MS);
          }),
          collapseOnSelectionFacet.of(true),
          mouseSelectingField,
          livePreviewPlugin,
          markdownStylePlugin,
          listLinePlugin,
          blockquoteLinePlugin,
          codeBlockLinePlugin,
          blockFormattingRevealPlugin,
          horizontalRulePlugin,
          checkboxLinePlugin,
          imageField(),
          calloutLinePlugin,
          tableEditorPlugin(),
          linkPlugin({ openInNewTab: false }),
          autolinkPlugin,
          // Wikilink extension (decoration, click handling, autocomplete)
          // Pass slash command source to merge with wikilink autocomplete to avoid override conflict
          ...createWikilinkExtension(handleWikilinkClick, fetchWikilinkSuggestions, [slashCommandSource]),
          wikilinkStyles,
          slashCommandsStyles,
          editorTheme,
        ],
      }),
      parent: mount,
    });

    const handleMouseDown = () => {
      view.dispatch({ effects: setMouseSelecting.of(true) });
    };
    const handleMouseUp = () => {
      requestAnimationFrame(() => {
        if (editorRef.current === view) {
          view.dispatch({ effects: setMouseSelecting.of(false) });
        }
      });
    };

    const handleEditorClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      const anchor = target.closest('a');
      if (anchor) {
        const href = anchor.getAttribute('href');
        if (!href) return;
        if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:')) {
          event.preventDefault();
          event.stopPropagation();
          window.srgnt.openExternal(href).catch(() => {
            /* silently handle rejected open-external calls */
          });
        }
        return;
      }

      const checkboxLine = target.closest(
        '.cm-checkbox-unchecked-line, .cm-checkbox-checked-line',
      ) as HTMLElement | null;
      if (!checkboxLine) {
        return;
      }

      const rect = checkboxLine.getBoundingClientRect();
      const offsetX = event.clientX - rect.left;
      if (offsetX < 0 || offsetX > 24) {
        return;
      }

      const lineStart = view.posAtDOM(checkboxLine, 0);
      const line = view.state.doc.lineAt(lineStart);
      const match = line.text.match(/^(\s*(?:[-*+]|\d+[.)])\s+\[)( |x|X)(\].*)$/);
      if (!match) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const markerPos = line.from + match[1].length;
      const nextMarker = match[2] === ' ' ? 'x' : ' ';
      view.dispatch({
        changes: { from: markerPos, to: markerPos + 1, insert: nextMarker },
        selection: view.state.selection.main,
        userEvent: 'input',
      });
    };

    editorRef.current = view;
    view.contentDOM.addEventListener('mousedown', handleMouseDown);
    mount.addEventListener('click', handleEditorClick);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      view.contentDOM.removeEventListener('mousedown', handleMouseDown);
      mount.removeEventListener('click', handleEditorClick);
      document.removeEventListener('mouseup', handleMouseUp);
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      if (editorRef.current === view) {
        editorRef.current = null;
      }
      view.destroy();
    };
  }, []);

  React.useEffect(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
  }, [rawContent]);

  React.useEffect(() => {
    const view = editorRef.current;
    if (!view) {
      return;
    }

    const currentBody = view.state.doc.toString();
    if (currentBody === parsed.body) {
      return;
    }

    isExternalUpdateRef.current = true;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: parsed.body },
    });
  }, [parsed.body]);

  const saveLabel = SAVE_STATE_LABELS[saveState];

  return (
    <div className="markdown-editor-wrapper" data-display-mode={displayMode} data-testid="markdown-editor-wrapper">
      {parsed.frontmatter && (
        <div className="markdown-frontmatter" data-testid="frontmatter-block">
          <pre className="markdown-frontmatter-content">{parsed.frontmatter}</pre>
        </div>
      )}
      <div className="markdown-save-indicator">
        {saveLabel && <span className={`markdown-save-${saveState}`}>{saveLabel}</span>}
      </div>
      <div className="markdown-editor-codemirror" data-testid="markdown-editor-root" ref={editorMountRef} />
    </div>
  );
}
