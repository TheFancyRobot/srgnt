import React from 'react';
import { GhosttySurface } from '../terminal/GhosttySurface.js';
import { useChatTerminalOutput } from './ChatTerminalContext.js';
import { DiffView } from './DiffView.js';
import type { ToolCallContent, ToolCallSegment, ToolCallStatus, ToolKind } from './transcriptReducer.js';

/**
 * The tool-call card (PHASE-23, STEP-23-02).
 *
 * For Pi this is the ONLY window into agent activity: the STEP-22-05 spike
 * measured zero client `fs`/`terminal` delegation, so everything the user learns
 * about Pi's edits and commands comes from `tool_call` / `tool_call_update`
 * content. Rendering it faithfully — including the parts we cannot pretty-print
 * — is the honesty guarantee for the whole surface.
 *
 * Performance shape: one file write produced 24 updates in the spike, so the
 * card is memoized on its segment. Only the call whose segment object actually
 * changed re-renders; its 30 neighbours do not.
 *
 * Expansion state lives here, keyed by the segment's stable React key, so a card
 * the user opened stays open across every subsequent update.
 */

const KIND_LABELS: Record<ToolKind, string> = {
  read: 'Read',
  edit: 'Edit',
  delete: 'Delete',
  move: 'Move',
  search: 'Search',
  execute: 'Run',
  think: 'Think',
  fetch: 'Fetch',
  switch_mode: 'Mode',
  other: 'Tool',
};

/** Text glyphs, not an icon font: the transcript is copyable and screen-readable. */
const KIND_ICONS: Record<ToolKind, string> = {
  read: '◇',
  edit: '✎',
  delete: '␡',
  move: '⇄',
  search: '⌕',
  execute: '›_',
  think: '◌',
  fetch: '↓',
  switch_mode: '⇌',
  other: '⚙',
};

const STATUS_LABELS: Record<ToolCallStatus, string> = {
  pending: 'Pending',
  in_progress: 'Running',
  completed: 'Done',
  failed: 'Failed',
};

/** Chars of tool output rendered inline before the body is clamped and scrolled. */
const OUTPUT_CLAMP = 20_000;

function TextBlock({ text }: { readonly text: string }): React.ReactElement {
  // Deliberately not markdown: tool output is data, and rendering it as markdown
  // would let a file's contents restyle the transcript.
  const clamped = text.length > OUTPUT_CLAMP;
  return (
    <pre className="chat-tool-output" data-testid="chat-tool-output" data-clamped={clamped ? 'true' : 'false'}>
      {clamped ? `${text.slice(0, OUTPUT_CLAMP)}\n… ${text.length - OUTPUT_CLAMP} more characters` : text}
    </pre>
  );
}

function TerminalBlock({ terminalId }: { readonly terminalId: string }): React.ReactElement {
  const output = useChatTerminalOutput(terminalId);
  return (
    <div className="chat-tool-terminal" data-testid="chat-tool-terminal" data-terminal-id={terminalId}>
      <GhosttySurface output={output} label={`Output of terminal ${terminalId}`} />
    </div>
  );
}

function ContentBlock({ block }: { readonly block: ToolCallContent }): React.ReactElement {
  switch (block.type) {
    case 'text':
      return <TextBlock text={block.text} />;
    case 'diff':
      return <DiffView path={block.path} oldText={block.oldText} newText={block.newText} />;
    case 'terminal':
      return <TerminalBlock terminalId={block.terminalId} />;
    case 'unsupported':
      // Shown, never dropped: "the agent sent something we don't render" is
      // information; silently hiding it is how a UI starts lying.
      return (
        <details className="chat-tool-unsupported" data-testid="chat-tool-unsupported">
          <summary>Unrendered content block</summary>
          <pre>{safeJson(block.raw)}</pre>
        </details>
      );
    default:
      return <></>;
  }
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
}

/** Everything worth showing in the body — content blocks, else raw output. */
function bodyBlocks(segment: ToolCallSegment): readonly ToolCallContent[] {
  if (segment.content.length > 0) return segment.content;
  // Pi's reality: no content blocks at all, just `rawOutput` on the call. Render
  // it rather than showing an empty card that implies nothing happened.
  if (segment.rawOutput === null || segment.rawOutput === undefined) return [];
  return [{ type: 'text', text: typeof segment.rawOutput === 'string' ? segment.rawOutput : safeJson(segment.rawOutput) }];
}

export interface ToolCallCardProps {
  readonly segment: ToolCallSegment;
}

function ToolCallCardInner({ segment }: ToolCallCardProps): React.ReactElement {
  const blocks = bodyBlocks(segment);
  const hasBody = blocks.length > 0 || segment.locations.length > 0;
  const [expanded, setExpanded] = React.useState(false);
  const bodyId = `tool-body-${segment.id}`;

  return (
    <article
      className="chat-tool-call"
      data-testid="chat-tool-call"
      data-status={segment.status}
      data-kind={segment.toolKind}
      data-tool-call-id={segment.toolCallId}
    >
      <header className="chat-tool-call-head">
        <span className="chat-tool-call-icon" aria-hidden="true">
          {KIND_ICONS[segment.toolKind]}
        </span>
        <span className="chat-tool-call-kind">{KIND_LABELS[segment.toolKind]}</span>
        <span className="chat-tool-call-title" title={segment.title}>
          {segment.title}
        </span>
        <span
          className="chat-tool-call-status"
          data-testid="chat-tool-call-status"
          data-status={segment.status}
          role="status"
        >
          {STATUS_LABELS[segment.status]}
        </span>
        {hasBody && (
          <button
            type="button"
            className="chat-tool-call-toggle"
            data-testid="chat-tool-call-toggle"
            aria-expanded={expanded}
            aria-controls={bodyId}
            onClick={() => setExpanded((previous) => !previous)}
          >
            {expanded ? 'Hide details' : 'Show details'}
          </button>
        )}
      </header>

      {hasBody && expanded && (
        <div className="chat-tool-call-body" id={bodyId} data-testid="chat-tool-call-body">
          {segment.locations.length > 0 && (
            <ul className="chat-tool-locations" data-testid="chat-tool-locations">
              {segment.locations.map((location) => (
                <li key={`${location.path}:${location.line ?? ''}`} className="chat-tool-location">
                  {/* No link: this phase cannot open a file, and a dead link is
                      a promise we can't keep. */}
                  <span className="chat-tool-location-path">{location.path}</span>
                  {location.line !== null && <span className="chat-tool-location-line">:{location.line}</span>}
                </li>
              ))}
            </ul>
          )}
          {blocks.map((block, index) => (
            <ContentBlock key={`${segment.id}-block-${index}`} block={block} />
          ))}
        </div>
      )}
    </article>
  );
}

export const ToolCallCard = React.memo(ToolCallCardInner);
ToolCallCard.displayName = 'ToolCallCard';
