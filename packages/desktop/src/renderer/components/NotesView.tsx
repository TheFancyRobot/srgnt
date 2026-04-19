import React from 'react';
import { useNotes } from './notes/NotesContext.js';
import { MarkdownEditor } from './notes/MarkdownEditor.js';
import type { EditorDisplayMode, SaveState } from './notes/MarkdownEditor.js';

const EDITOR_DISPLAY_MODE_STORAGE_KEY = 'srgnt:notes:editor-display-mode';
const SAVE_DEBOUNCE_MS = 1000;
const RETRY_DELAYS = [1000, 2000, 4000]; // exponential backoff
const MTIME_POLL_INTERVAL_MS = 5000;

type BannerType = 'save-error' | 'file-deleted' | 'external-modified' | null;

function loadInitialDisplayMode(): EditorDisplayMode {
  if (typeof window === 'undefined') {
    return 'live-preview';
  }
  return window.localStorage.getItem(EDITOR_DISPLAY_MODE_STORAGE_KEY) === 'rendered'
    ? 'rendered'
    : 'live-preview';
}

export function NotesView(): React.ReactElement {
  const {
    selectedPath,
    activeContent,
    activeContentLoading,
    activeModifiedAt,
    clearSelection,
    writeActiveContent,
    selectNote,
    createNote,
    error,
  } = useNotes();
  const [saveState, setSaveState] = React.useState<SaveState>('idle');
  const [displayMode, setDisplayMode] = React.useState<EditorDisplayMode>(() => loadInitialDisplayMode());
  const [banner, setBanner] = React.useState<BannerType>(null);
  const [lastSaveError, setLastSaveError] = React.useState<string | null>(null);

  const savedResetTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const mtimePollRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const latestContentRef = React.useRef<string | null>(null);
  const savedContentRef = React.useRef<string | null>(null);
  const knownModifiedAtRef = React.useRef<string | null>(null);
  const retryCountRef = React.useRef(0);
  const retryContentRef = React.useRef<string | null>(null);
  const hasUnsavedEditsRef = React.useRef(false);

  // Sync knownModifiedAt with context value
  React.useEffect(() => {
    knownModifiedAtRef.current = activeModifiedAt;
  }, [activeModifiedAt]);

  // Reset all state when switching files
  React.useEffect(() => {
    setSaveState('idle');
    setBanner(null);
    setLastSaveError(null);
    if (savedResetTimerRef.current) {
      clearTimeout(savedResetTimerRef.current);
      savedResetTimerRef.current = null;
    }
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    latestContentRef.current = null;
    savedContentRef.current = null;
    retryCountRef.current = 0;
    retryContentRef.current = null;
    hasUnsavedEditsRef.current = false;
  }, [selectedPath]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (savedResetTimerRef.current) clearTimeout(savedResetTimerRef.current);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (mtimePollRef.current) clearInterval(mtimePollRef.current);
    };
  }, []);

  React.useEffect(() => {
    window.localStorage.setItem(EDITOR_DISPLAY_MODE_STORAGE_KEY, displayMode);
  }, [displayMode]);

  // Mtime polling for external modification detection
  React.useEffect(() => {
    if (!selectedPath || activeContentLoading) {
      if (mtimePollRef.current) {
        clearInterval(mtimePollRef.current);
        mtimePollRef.current = null;
      }
      return;
    }

    const checkMtime = async () => {
      const path = selectedPath;
      if (!path) return;

      try {
        const response = await window.srgnt.notesReadFile(path);
        const newMtime = response.modifiedAt;

        if (newMtime !== knownModifiedAtRef.current) {
          // File was modified externally
          if (hasUnsavedEditsRef.current) {
            setBanner('external-modified');
          } else {
            // No unsaved edits — silently reload
            knownModifiedAtRef.current = newMtime;
            // The context handles reload via activeContent change
            await selectNote(path);
          }
        }
      } catch {
        // File was deleted externally
        if (hasUnsavedEditsRef.current) {
          setBanner('file-deleted');
        } else {
          clearSelection();
        }
      }
    };

    // Also check on window focus
    const handleFocus = () => {
      void checkMtime();
    };

    mtimePollRef.current = setInterval(checkMtime, MTIME_POLL_INTERVAL_MS);
    window.addEventListener('focus', handleFocus);

    return () => {
      if (mtimePollRef.current) {
        clearInterval(mtimePollRef.current);
        mtimePollRef.current = null;
      }
      window.removeEventListener('focus', handleFocus);
    };
  }, [selectedPath, activeContentLoading, selectNote, clearSelection]);

  // Perform the actual save with retry logic
  const performSave = React.useCallback(async (content: string, attempt: number) => {
    try {
      await writeActiveContent(content);
      savedContentRef.current = content;
      hasUnsavedEditsRef.current = false;
      retryCountRef.current = 0;
      retryContentRef.current = null;

      if (latestContentRef.current === content) {
        setSaveState('saved');
        setBanner(null);
        setLastSaveError(null);
        if (savedResetTimerRef.current) clearTimeout(savedResetTimerRef.current);
        savedResetTimerRef.current = setTimeout(() => {
          setSaveState('idle');
          savedResetTimerRef.current = null;
        }, 2000);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      setLastSaveError(msg);

      if (attempt < RETRY_DELAYS.length) {
        // Auto-retry with exponential backoff
        setSaveState('saving');
        retryCountRef.current = attempt + 1;
        retryContentRef.current = content;
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        retryTimerRef.current = setTimeout(() => {
          void performSave(content, attempt + 1);
        }, RETRY_DELAYS[attempt]);
      } else {
        // Max retries reached — show error banner
        setSaveState('error');
        setBanner('save-error');
      }
    }
  }, [writeActiveContent]);

  // Handle content change — debounced with 1s delay
  const handleContentChange = React.useCallback((markdown: string) => {
    latestContentRef.current = markdown;
    hasUnsavedEditsRef.current = true;

    // Clear any pending retry if user is still editing
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    setSaveState('idle');
    setBanner(null);

    saveTimerRef.current = setTimeout(() => {
      const content = latestContentRef.current;
      if (content === null) return;
      if (savedResetTimerRef.current) {
        clearTimeout(savedResetTimerRef.current);
        savedResetTimerRef.current = null;
      }
      setSaveState('saving');
      retryCountRef.current = 0;
      void performSave(content, 0);
    }, SAVE_DEBOUNCE_MS);
  }, [performSave]);

  // Manual retry save
  const handleRetrySave = React.useCallback(() => {
    const content = retryContentRef.current ?? latestContentRef.current;
    if (content === null) return;
    setBanner(null);
    setSaveState('saving');
    retryCountRef.current = 0;
    void performSave(content, 0);
  }, [performSave]);

  // Copy unsaved content to clipboard
  const handleCopyToClipboard = React.useCallback(async () => {
    const content = latestContentRef.current ?? savedContentRef.current;
    if (content === null) return;
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      // Fallback: textarea copy
      const textarea = document.createElement('textarea');
      textarea.value = content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  }, []);

  // Save deleted file as new note
  const handleSaveAsNewNote = React.useCallback(async () => {
    const content = latestContentRef.current;
    if (!content) {
      clearSelection();
      return;
    }
    const fileName = selectedPath?.split('/').pop() ?? 'Untitled';
    const title = fileName.replace(/\.md$/, '');
    const dirPath = selectedPath ? selectedPath.substring(0, selectedPath.lastIndexOf('/')) : '';

    try {
      setBanner(null);
      setSaveState('saving');
      const nextPath = await createNote(dirPath, title);
      if (!nextPath) {
        setSaveState('error');
        setBanner('save-error');
        setLastSaveError('Failed to create replacement note');
        return;
      }

      const response = await window.srgnt.notesWriteFile(nextPath, content);
      latestContentRef.current = content;
      savedContentRef.current = content;
      retryContentRef.current = null;
      retryCountRef.current = 0;
      hasUnsavedEditsRef.current = false;
      knownModifiedAtRef.current = response.modifiedAt;
      await selectNote(nextPath);
      setSaveState('saved');
      setLastSaveError(null);
      if (savedResetTimerRef.current) {
        clearTimeout(savedResetTimerRef.current);
      }
      savedResetTimerRef.current = setTimeout(() => {
        setSaveState('idle');
        savedResetTimerRef.current = null;
      }, 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save replacement note';
      setSaveState('error');
      setBanner('save-error');
      setLastSaveError(msg);
    }
  }, [selectedPath, createNote, clearSelection, selectNote]);

  // Keep mine (overwrite disk with editor content)
  const handleKeepMine = React.useCallback(() => {
    const content = latestContentRef.current;
    if (content === null) return;
    setBanner(null);
    // Force save the current editor content
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    retryCountRef.current = 0;
    setSaveState('saving');
    void performSave(content, 0);
  }, [performSave]);

  // Reload from disk
  const handleReloadFromDisk = React.useCallback(async () => {
    if (!selectedPath) return;
    setBanner(null);
    hasUnsavedEditsRef.current = false;
    latestContentRef.current = null;
    await selectNote(selectedPath);
  }, [selectedPath, selectNote]);

  // Discard (clear selection)
  const handleDiscard = React.useCallback(() => {
    setBanner(null);
    clearSelection();
  }, [clearSelection]);

  // Handle wikilink click
  const handleWikilinkClick = React.useCallback(
    async (wikilink: string) => {
      try {
        const response = await window.srgnt.notesResolveWikilink(wikilink, selectedPath ?? undefined);

        if (response.resolved) {
          await selectNote(response.path);
          return;
        }

        const path = response.path;
        if (!path.startsWith('Notes/')) {
          console.warn(`Cannot create file outside Notes/: ${path}`);
          return;
        }

        const inner = wikilink.slice(2, -2);
        const pipeIndex = inner.indexOf('|');
        const title = pipeIndex !== -1 ? inner.slice(0, pipeIndex).trim() : inner.trim();

        const relativePath = path.replace('Notes/', '');
        const lastSlash = relativePath.lastIndexOf('/');
        const dirPath = lastSlash !== -1 ? relativePath.substring(0, lastSlash) : '';
        await createNote(dirPath, title);
      } catch (err) {
        console.error('Failed to handle wikilink click:', err);
      }
    },
    [selectedPath, selectNote, createNote]
  );

  if (!selectedPath) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-3 animate-fade-in">
        <svg
          className="w-12 h-12 text-text-tertiary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
          />
        </svg>
        <h2 className="text-lg font-medium text-text-primary">Notes</h2>
        <p className="text-sm text-text-secondary max-w-sm">
          Select a note from the Explorer panel, or create a new one to get started.
        </p>
      </div>
    );
  }

  const fileName = selectedPath.split('/').pop() ?? selectedPath;

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border-default">
        <h1 className="text-lg font-medium text-text-primary">{fileName}</h1>
        <div className="flex items-center gap-3">
          {error && <span className="text-xs text-error-500">{error}</span>}
          <button
            type="button"
            className="btn btn-ghost text-xs"
            aria-label="Toggle fully rendered mode"
            aria-pressed={displayMode === 'rendered'}
            title={
              displayMode === 'live-preview'
                ? 'Disable syntax on the active line'
                : 'Enable active-line markdown editing'
            }
            onClick={() =>
              setDisplayMode((current) =>
                current === 'live-preview' ? 'rendered' : 'live-preview'
              )
            }
          >
            {displayMode === 'live-preview' ? 'Rendered only' : 'Active-line edit'}
          </button>
          <button type="button" className="btn btn-ghost text-xs" onClick={clearSelection}>
            Close
          </button>
        </div>
      </div>

      {/* Banners */}
      {banner === 'save-error' && (
        <div className="flex items-center gap-2 px-4 py-2 bg-error-500/10 border-b border-error-500/30 text-xs">
          <span className="text-error-500 flex-1">
            Save failed after {RETRY_DELAYS.length + 1} attempts{lastSaveError ? `: ${lastSaveError}` : ''}.
            Your content is preserved in the editor.
          </span>
          <button
            type="button"
            className="btn btn-ghost text-xs text-error-500"
            onClick={handleRetrySave}
          >
            Retry Save
          </button>
          <button
            type="button"
            className="btn btn-ghost text-xs text-text-secondary"
            onClick={handleCopyToClipboard}
          >
            Copy to Clipboard
          </button>
        </div>
      )}

      {banner === 'file-deleted' && (
        <div className="flex items-center gap-2 px-4 py-2 bg-warning-500/10 border-b border-warning-500/30 text-xs">
          <span className="text-warning-500 flex-1">
            This file was deleted. Your unsaved edits are preserved.
          </span>
          <button
            type="button"
            className="btn btn-ghost text-xs text-warning-500"
            onClick={handleSaveAsNewNote}
          >
            Save as New Note
          </button>
          <button
            type="button"
            className="btn btn-ghost text-xs text-text-secondary"
            onClick={handleDiscard}
          >
            Discard
          </button>
        </div>
      )}

      {banner === 'external-modified' && (
        <div className="flex items-center gap-2 px-4 py-2 bg-warning-500/10 border-b border-warning-500/30 text-xs">
          <span className="text-warning-500 flex-1">
            This file was modified externally. You have unsaved edits.
          </span>
          <button
            type="button"
            className="btn btn-ghost text-xs text-warning-500"
            onClick={handleKeepMine}
          >
            Keep Mine
          </button>
          <button
            type="button"
            className="btn btn-ghost text-xs text-text-secondary"
            onClick={handleReloadFromDisk}
          >
            Reload from Disk
          </button>
        </div>
      )}

      {activeContentLoading ? (
        <div className="flex-1 py-8 text-center text-xs text-text-tertiary animate-pulse">
          Loading note...
        </div>
      ) : activeContent != null ? (
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <MarkdownEditor
            rawContent={activeContent}
            onContentChange={handleContentChange}
            saveState={saveState}
            displayMode={displayMode}
            currentFilePath={selectedPath}
            onWikilinkClick={handleWikilinkClick}
          />
        </div>
      ) : (
        <div className="flex-1 py-8 text-center text-xs text-text-tertiary">No content</div>
      )}
    </div>
  );
}
