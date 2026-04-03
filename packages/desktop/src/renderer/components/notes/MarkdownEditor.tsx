import React from 'react';
import { EditorState, type Range } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { syntaxTree } from '@codemirror/language';
import { markdown } from '@codemirror/lang-markdown';
import { Decoration, EditorView, keymap, placeholder, ViewPlugin, type DecorationSet } from '@codemirror/view';
import {
  collapseOnSelectionFacet,
  editorTheme,
  livePreviewPlugin,
  markdownStylePlugin,
  mouseSelectingField,
  setMouseSelecting,
} from 'codemirror-live-markdown';
import { parseFrontmatter, serializeWithFrontmatter } from './markdown-serializer.js';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';
export type EditorDisplayMode = 'live-preview' | 'rendered';

interface MarkdownEditorProps {
  rawContent: string;
  onContentChange: (markdown: string) => void;
  saveState: SaveState;
  displayMode: EditorDisplayMode;
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
          markdown(),
          history(),
          keymap.of([
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

    editorRef.current = view;
    view.contentDOM.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      view.contentDOM.removeEventListener('mousedown', handleMouseDown);
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
