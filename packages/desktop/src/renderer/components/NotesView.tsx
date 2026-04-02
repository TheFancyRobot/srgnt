import React from 'react';
import { useNotes } from './notes/NotesContext.js';
import { MarkdownEditor } from './notes/MarkdownEditor.js';
import type { EditorDisplayMode, SaveState } from './notes/MarkdownEditor.js';

const EDITOR_DISPLAY_MODE_STORAGE_KEY = 'srgnt:notes:editor-display-mode';

function loadInitialDisplayMode(): EditorDisplayMode {
  if (typeof window === 'undefined') {
    return 'live-preview';
  }

  return window.localStorage.getItem(EDITOR_DISPLAY_MODE_STORAGE_KEY) === 'rendered'
    ? 'rendered'
    : 'live-preview';
}

export function NotesView(): React.ReactElement {
  const { selectedPath, activeContent, activeContentLoading, clearSelection, writeActiveContent, error } = useNotes();
  const [saveState, setSaveState] = React.useState<SaveState>('idle');
  const [displayMode, setDisplayMode] = React.useState<EditorDisplayMode>(() => loadInitialDisplayMode());

  React.useEffect(() => {
    setSaveState('idle');
  }, [selectedPath]);

  React.useEffect(() => {
    window.localStorage.setItem(EDITOR_DISPLAY_MODE_STORAGE_KEY, displayMode);
  }, [displayMode]);
  if (!selectedPath) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-3 animate-fade-in">
        <svg className="w-12 h-12 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <h2 className="text-lg font-medium text-text-primary">Notes</h2>
        <p className="text-sm text-text-secondary max-w-sm">
          Select a note from the Explorer panel, or create a new one to get started.
        </p>
      </div>
    );
  }

  const fileName = selectedPath.split('/').pop() ?? selectedPath;

  const handleContentChange = async (markdown: string) => {
    setSaveState('saving');
    try {
      await writeActiveContent(markdown);
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border-default">
        <h1 className="text-lg font-medium text-text-primary">{fileName}</h1>
        <div className="flex items-center gap-3">
          {error && (
            <span className="text-xs text-error-500">{error}</span>
          )}
          <button
            type="button"
            className="btn btn-ghost text-xs"
            aria-label="Toggle fully rendered mode"
            aria-pressed={displayMode === 'rendered'}
            title={displayMode === 'live-preview' ? 'Disable syntax on the active line' : 'Enable active-line markdown editing'}
            onClick={() => setDisplayMode((current) => (current === 'live-preview' ? 'rendered' : 'live-preview'))}
          >
            {displayMode === 'live-preview' ? 'Rendered only' : 'Active-line edit'}
          </button>
          <button
            type="button"
            className="btn btn-ghost text-xs"
            onClick={clearSelection}
          >
            Close
          </button>
        </div>
      </div>

      {activeContentLoading ? (
        <div className="flex-1 py-8 text-center text-xs text-text-tertiary animate-pulse">Loading note...</div>
      ) : activeContent != null ? (
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <MarkdownEditor
            rawContent={activeContent}
            onContentChange={handleContentChange}
            saveState={saveState}
            displayMode={displayMode}
          />
        </div>
      ) : (
        <div className="flex-1 py-8 text-center text-xs text-text-tertiary">No content</div>
      )}
    </div>
  );
}
