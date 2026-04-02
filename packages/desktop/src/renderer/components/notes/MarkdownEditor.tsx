import React from 'react';
import { Compartment, EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { EditorView, keymap, placeholder } from '@codemirror/view';
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
          collapseModeCompartment.of(collapseOnSelectionFacet.of(displayMode === 'live-preview')),
          mouseSelectingField,
          livePreviewPlugin,
          markdownStylePlugin,
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

  React.useEffect(() => {
    const view = editorRef.current;
    if (!view) {
      return;
    }

    view.dispatch({
      effects: collapseModeCompartment.reconfigure(
        collapseOnSelectionFacet.of(displayMode === 'live-preview'),
      ),
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
