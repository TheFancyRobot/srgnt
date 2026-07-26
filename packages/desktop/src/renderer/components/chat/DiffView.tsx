import React from 'react';
import { unifiedMergeView } from '@codemirror/merge';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

/**
 * Read-only diff for a tool call's `diff` content block (PHASE-23, STEP-23-02).
 *
 * Uses CodeMirror's unified merge view, which natively collapses long unchanged
 * stretches — important because agents happily send a whole 2000-line file as
 * `newText` for a three-line edit.
 *
 * **Read-only is a hard requirement, and it is enforced twice.** `readOnly`
 * blocks programmatic edits and `editable: false` removes the contenteditable
 * surface entirely, so the card can never become a sneaky code editor (an
 * explicit phase non-goal). `mergeControls: false` removes the accept/reject
 * buttons for the same reason: srgnt is showing what the agent did, not offering
 * to re-apply it.
 *
 * A new file (`oldText === null`) diffs against the empty document, which is
 * exactly right: every line reads as an addition.
 */

export interface DiffViewProps {
  readonly path: string;
  /** Previous revision; `null` for a newly created file. */
  readonly oldText: string | null;
  readonly newText: string;
}

export function DiffView({ path, oldText, newText }: DiffViewProps): React.ReactElement {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    const host = hostRef.current;
    if (host === null) return;
    let view: EditorView;
    try {
      view = new EditorView({
        parent: host,
        state: EditorState.create({
          doc: newText,
          extensions: [
            unifiedMergeView({
              original: oldText ?? '',
              mergeControls: false,
              gutter: true,
              collapseUnchanged: { margin: 2, minSize: 4 },
            }),
            EditorView.editable.of(false),
            EditorState.readOnly.of(true),
            EditorView.lineWrapping,
          ],
        }),
      });
    } catch {
      // A diff that fails to render must not take the whole card (and with it
      // every other piece of tool evidence) down with it — but it must not
      // silently hide the edit either: fall back to plain text below.
      setFailed(true);
      return;
    }
    return () => view.destroy();
  }, [oldText, newText]);

  const summary =
    oldText === null ? 'new file' : newText === '' ? 'file emptied' : `${countLines(oldText)} → ${countLines(newText)} lines`;

  return (
    <figure className="chat-diff" data-testid="chat-diff" data-path={path}>
      <figcaption className="chat-diff-head">
        <span className="chat-diff-path" title={path}>
          {path}
        </span>
        <span className="chat-diff-summary">{summary}</span>
      </figcaption>
      {failed ? (
        <pre className="chat-diff-fallback" data-testid="chat-diff-fallback">
          {oldText !== null ? `--- before\n${oldText}\n\n+++ after\n${newText}` : newText}
        </pre>
      ) : (
        <div ref={hostRef} className="chat-diff-body" data-testid="chat-diff-body" />
      )}
    </figure>
  );
}

function countLines(text: string): number {
  return text === '' ? 0 : text.split('\n').length;
}
