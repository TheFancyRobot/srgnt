import React from 'react';
import { Compartment, EditorSelection, EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap, insertNewlineAndIndent } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { syntaxTree } from '@codemirror/language';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, keymap, placeholder } from '@codemirror/view';
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

const SAVE_DEBOUNCE_MS = 1000;
const collapseModeCompartment = new Compartment();
const renderedMarkdownStructureCompartment = new Compartment();
const MARKDOWN_INDENT = '    ';
const EDITOR_CSP_NONCE = 'srgnt-renderer';

function insertMarkdownIndent(view: EditorView): boolean {
  const changes: Array<{ from: number; to?: number; insert: string }> = [];
  const ranges = [];
  const touchedLines = new Set<number>();

  for (const range of view.state.selection.ranges) {
    const fromLine = view.state.doc.lineAt(range.from).number;
    const toLine = view.state.doc.lineAt(range.to).number;

    for (let lineNumber = fromLine; lineNumber <= toLine; lineNumber += 1) {
      if (touchedLines.has(lineNumber)) {
        continue;
      }

      touchedLines.add(lineNumber);
      const line = view.state.doc.line(lineNumber);
      changes.push({ from: line.from, insert: MARKDOWN_INDENT });
    }

    ranges.push(EditorSelection.range(range.anchor + MARKDOWN_INDENT.length, range.head + MARKDOWN_INDENT.length));
  }

  view.dispatch({
    changes,
    selection: EditorSelection.create(ranges),
    userEvent: 'input.indent',
  });

  return true;
}

function removeMarkdownIndent(view: EditorView): boolean {
  const changes: Array<{ from: number; to: number }> = [];
  const ranges = [];
  const touchedLines = new Set<number>();

  for (const range of view.state.selection.ranges) {
    const fromLine = view.state.doc.lineAt(range.from).number;
    const toLine = view.state.doc.lineAt(range.to).number;

    for (let lineNumber = fromLine; lineNumber <= toLine; lineNumber += 1) {
      if (touchedLines.has(lineNumber)) {
        continue;
      }

      touchedLines.add(lineNumber);
      const line = view.state.doc.line(lineNumber);
      const linePrefix = view.state.doc.sliceString(line.from, Math.min(line.to, line.from + MARKDOWN_INDENT.length));
      const dedentWidth = linePrefix.startsWith(MARKDOWN_INDENT)
        ? MARKDOWN_INDENT.length
        : linePrefix.startsWith('\t')
          ? 1
          : 0;

      if (dedentWidth > 0) {
        changes.push({ from: line.from, to: line.from + dedentWidth });
      }
    }

    const nextAnchor = Math.max(view.state.doc.lineAt(range.anchor).from, range.anchor - MARKDOWN_INDENT.length);
    const nextHead = Math.max(view.state.doc.lineAt(range.head).from, range.head - MARKDOWN_INDENT.length);
    ranges.push(EditorSelection.range(nextAnchor, nextHead));
  }

  if (changes.length === 0) {
    return false;
  }

  view.dispatch({
    changes,
    selection: EditorSelection.create(ranges),
    userEvent: 'delete.backward',
  });

  return true;
}

function handleEditorCommandKeydown(view: EditorView, event: KeyboardEvent): boolean {
  if (event.key === 'Tab') {
    event.preventDefault();
    event.stopPropagation();

    if (event.shiftKey) {
      return removeMarkdownIndent(view);
    }

    return insertMarkdownIndent(view);
  }

  if (event.key === 'Enter') {
    event.preventDefault();
    event.stopPropagation();
    return insertNewlineAndIndent(view);
  }

  return false;
}

function createRenderedMarkdownStructureExtension(displayMode: EditorDisplayMode) {
  return ViewPlugin.fromClass(class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.build(view);
    }

    update(update: { docChanged: boolean; selectionSet: boolean; viewportChanged: boolean; view: EditorView }) {
      if (update.docChanged || update.selectionSet || update.viewportChanged) {
        this.decorations = this.build(update.view);
      }
    }

    build(view: EditorView) {
      const activeLines = new Set<number>();
      for (const range of view.state.selection.ranges) {
        const fromLine = view.state.doc.lineAt(range.from).number;
        const toLine = view.state.doc.lineAt(range.to).number;
        for (let lineNumber = fromLine; lineNumber <= toLine; lineNumber += 1) {
          activeLines.add(lineNumber);
        }
      }

      const renderAllLines = displayMode === 'rendered';
      const renderedHeadingLines = new Set<number>();
      const renderedBulletListLines = new Set<number>();
      const decorations: Array<ReturnType<ReturnType<typeof Decoration.mark>['range']>> = [];

      syntaxTree(view.state).iterate({
        from: view.viewport.from,
        to: view.viewport.to,
        enter: (node) => {
          const line = view.state.doc.lineAt(node.from);
          const lineNumber = line.number;
          const isRenderedLine = renderAllLines || !activeLines.has(lineNumber);

          if (node.name === 'HeaderMark') {
            decorations.push(Decoration.mark({ class: 'cm-md-header-mark' }).range(node.from, node.to));
            if (isRenderedLine && !renderedHeadingLines.has(lineNumber)) {
              renderedHeadingLines.add(lineNumber);
              decorations.push(Decoration.line({ class: 'cm-rendered-heading-line' }).range(line.from));
            }
            return;
          }

          if (node.name === 'ListMark') {
            const marker = view.state.doc.sliceString(node.from, node.to).trim();
            decorations.push(Decoration.mark({ class: 'cm-md-list-mark' }).range(node.from, node.to));
            if (/^[*+-]$/.test(marker)) {
              decorations.push(Decoration.line({ class: 'cm-bullet-list-line' }).range(line.from));
            }
            if (isRenderedLine && /^[*+-]$/.test(marker) && !renderedBulletListLines.has(lineNumber)) {
              renderedBulletListLines.add(lineNumber);
              decorations.push(Decoration.line({ class: 'cm-rendered-bullet-list-line' }).range(line.from));
            }
          }
        },
      });

      decorations.sort((left, right) => left.from - right.from);
      return Decoration.set(decorations, true);
    }
  }, {
    decorations: (plugin) => plugin.decorations,
  });
}

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
          EditorView.lineWrapping,
          EditorView.cspNonce.of(EDITOR_CSP_NONCE),
          EditorState.tabSize.of(4),
          markdown(),
          history(),
          keymap.of([
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
          collapseModeCompartment.of(collapseOnSelectionFacet.of(displayMode === 'live-preview')),
          renderedMarkdownStructureCompartment.of(createRenderedMarkdownStructureExtension(displayMode)),
          mouseSelectingField,
          livePreviewPlugin,
          markdownStylePlugin,
          editorTheme,
        ],
      }),
      parent: mount,
    });

    const handleMouseDown = () => {
      view.focus();
      view.dispatch({ effects: setMouseSelecting.of(true) });
    };
    const handleEditorKeyDown = (event: KeyboardEvent) => handleEditorCommandKeydown(view, event);
    const handleDocumentKeyDown = (event: KeyboardEvent) => {
      if (document.activeElement !== view.contentDOM && document.activeElement !== view.scrollDOM) {
        const activeElement = document.activeElement;
        if (!(activeElement instanceof Node) || !view.dom.contains(activeElement)) {
          return;
        }
      }

      handleEditorCommandKeydown(view, event);
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
    view.dom.addEventListener('keydown', handleEditorKeyDown, true);
    document.addEventListener('keydown', handleDocumentKeyDown, true);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      view.contentDOM.removeEventListener('mousedown', handleMouseDown);
      view.dom.removeEventListener('keydown', handleEditorKeyDown, true);
      document.removeEventListener('keydown', handleDocumentKeyDown, true);
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

  React.useEffect(() => {
    const view = editorRef.current;
    if (!view) {
      return;
    }

    view.dispatch({
      effects: [
        collapseModeCompartment.reconfigure(
          collapseOnSelectionFacet.of(displayMode === 'live-preview'),
        ),
        renderedMarkdownStructureCompartment.reconfigure(
          createRenderedMarkdownStructureExtension(displayMode),
        ),
      ],
    });
  }, [displayMode]);

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
