import React from 'react';
import { Markdown } from './Markdown.js';
import { ThoughtBlock } from './ThoughtBlock.js';
import type { Segment } from './transcriptReducer.js';

/**
 * The scrolling transcript (PHASE-23, STEP-23-01).
 *
 * Segments render in arrival order exactly as the reducer produced them — the
 * list never regroups or sorts. Auto-scroll sticks to the bottom only while the
 * user is already there, so scrolling up to read mid-turn is not fought by the
 * 20+ chunks a second a real turn produces.
 */

/** How far from the bottom still counts as "at the bottom" (px). */
const STICK_THRESHOLD = 48;

function MessageBubble({ segment }: { readonly segment: Segment }): React.ReactElement | null {
  switch (segment.kind) {
    case 'user_message':
      return (
        <article className="chat-message chat-message-user" data-testid="chat-message-user">
          <header className="chat-message-role">You</header>
          {/* The user's own text is shown verbatim: echoing their input back as
              rendered markdown would silently change what they think they sent. */}
          <p className="chat-message-plain">{segment.text}</p>
        </article>
      );
    case 'agent_message':
      return (
        <article
          className="chat-message chat-message-agent"
          data-testid="chat-message-agent"
          data-streaming={segment.open ? 'true' : 'false'}
        >
          <header className="chat-message-role">Agent</header>
          <Markdown source={segment.text} />
        </article>
      );
    case 'thought':
      return <ThoughtBlock segment={segment} />;
    case 'tool_call':
      // STEP-23-02 replaces this with the real card (diff + terminal embeds).
      // Until then it exists so ordering around tool calls is visibly correct.
      return (
        <article className="chat-tool-call" data-testid="chat-tool-call" data-status={segment.status}>
          <span className="chat-tool-call-kind">{segment.toolKind ?? 'tool'}</span>
          <span className="chat-tool-call-title">{segment.title}</span>
          <span className="chat-tool-call-status">{segment.status}</span>
        </article>
      );
    default:
      return null;
  }
}

export interface MessageListProps {
  readonly segments: readonly Segment[];
  /** Rendered when the transcript is empty (no session, or session with no turn). */
  readonly emptyState?: React.ReactNode;
}

export function MessageList({ segments, emptyState }: MessageListProps): React.ReactElement {
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const stickToBottom = React.useRef(true);

  const handleScroll = React.useCallback(() => {
    const element = scrollRef.current;
    if (element === null) return;
    const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
    stickToBottom.current = distance <= STICK_THRESHOLD;
  }, []);

  // Runs after every transcript change. jsdom reports zero-height elements, so
  // the guard below keeps this a no-op in tests rather than a scroll fight.
  React.useEffect(() => {
    const element = scrollRef.current;
    if (element === null || !stickToBottom.current) return;
    element.scrollTop = element.scrollHeight;
  }, [segments]);

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="chat-transcript"
      data-testid="chat-transcript"
      role="log"
      aria-label="Conversation"
      aria-live="polite"
    >
      {segments.length === 0 && emptyState !== undefined ? (
        <div className="chat-empty">{emptyState}</div>
      ) : (
        segments.map((segment) => <MessageBubble key={segment.id} segment={segment} />)
      )}
    </div>
  );
}
