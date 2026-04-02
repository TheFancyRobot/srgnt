import React from 'react';
import { useNotes } from './notes/NotesContext.js';
import { MarkdownEditor } from './notes/MarkdownEditor.js';
import type { SaveState } from './notes/MarkdownEditor.js';

export function NotesView(): React.ReactElement {
  const { selectedPath, activeContent, activeContentLoading, clearSelection, writeActiveContent, error } = useNotes();
  const [saveState, setSaveState] = React.useState<SaveState>('idle');

  React.useEffect(() => {
    setSaveState('idle');
  }, [selectedPath]);

  if (!selectedPath) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-3 animate-fade-in">
        <svg className="w-12 h-12 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
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
          />
        </div>
      ) : (
        <div className="flex-1 py-8 text-center text-xs text-text-tertiary">No content</div>
      )}
    </div>
  );
}
