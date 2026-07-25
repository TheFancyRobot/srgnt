import React from 'react';
import type { TextSegment } from './transcriptReducer.js';

/**
 * A collapsible agent-reasoning block (PHASE-23, STEP-23-01).
 *
 * Behavior (the assumption recorded in the step's Execution Brief): expanded
 * while chunks are still streaming so the user sees progress, then collapsed
 * once the thought finishes — unless the user has toggled it themselves, in
 * which case their choice wins and the block never moves under them.
 *
 * Copy is deliberately hedged: thoughts are what the agent *reports* thinking,
 * not a verified trace of what it did.
 */
export function ThoughtBlock({ segment }: { readonly segment: TextSegment }): React.ReactElement {
  const streaming = segment.open;
  const [userChoice, setUserChoice] = React.useState<boolean | null>(null);
  const expanded = userChoice ?? streaming;

  const label = streaming ? 'Thinking…' : 'Thought process';

  return (
    <section
      className="chat-thought"
      data-testid="chat-thought"
      data-streaming={streaming ? 'true' : 'false'}
      data-expanded={expanded ? 'true' : 'false'}
      aria-label="Agent reasoning"
    >
      <button
        type="button"
        className="chat-thought-toggle"
        aria-expanded={expanded}
        onClick={() => setUserChoice(!expanded)}
      >
        <span className={streaming ? 'chat-thought-pulse' : 'chat-thought-dot'} aria-hidden="true" />
        <span className="chat-thought-label">{label}</span>
        <span className="chat-thought-chevron" aria-hidden="true">
          {expanded ? '▾' : '▸'}
        </span>
      </button>
      {expanded && (
        <div className="chat-thought-body">
          {/* Reasoning is plain text, not markdown: it is a self-report, and
              rendering it as rich content would give it more authority than it
              has earned. */}
          <p className="chat-thought-text">{segment.text}</p>
          <p className="chat-thought-caveat">Reported by the agent; not a verified record of its actions.</p>
        </div>
      )}
    </section>
  );
}
