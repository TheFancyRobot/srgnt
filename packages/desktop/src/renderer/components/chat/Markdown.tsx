import React from 'react';
import { GFM, parser } from '@lezer/markdown';

/**
 * GFM markdown renderer for streamed agent messages (PHASE-23, STEP-23-01).
 *
 * The repo has no markdown→HTML renderer: the notes "markdown machinery" is a
 * CodeMirror *editing* stack. STEP-23-01's brief assumed a read-only
 * `EditorView` per message; this renders the same parse instead. `@lezer/markdown`
 * is already a direct dependency and is exactly the parser `@codemirror/lang-markdown`
 * drives, so a chat message and the notes editor agree on what the markdown means —
 * without paying for a CodeMirror instance per message. That matters here: the
 * STEP-22-05 spike measured 23 message chunks in one trivial turn, and this
 * component re-renders on every one of them while a message streams.
 *
 * Security: agent output is untrusted. Raw HTML is rendered as literal text
 * (never `dangerouslySetInnerHTML`), link targets are scheme-checked, and images
 * render as their alt text rather than fetching a remote URL from the renderer.
 */

const gfmParser = parser.configure(GFM);

/**
 * Tree types are derived from the parser rather than imported from
 * `@lezer/common`: that package is only a transitive dependency here (pnpm's
 * strict layout keeps it out of this package's `node_modules`), so importing it
 * directly would be an undeclared dependency. Inference through
 * `@lezer/markdown`'s own declarations is exact and needs no new dependency.
 */
type Tree = ReturnType<typeof gfmParser.parse>;
type SyntaxNode = Tree['topNode'];

/** Only schemes safe to hand to the OS. Everything else renders unlinked. */
const SAFE_LINK_SCHEME = /^(https?|mailto):/i;

function isSafeHref(url: string): boolean {
  return SAFE_LINK_SCHEME.test(url.trim());
}

/** Opens external links through the main process; never navigates the renderer. */
function handleLinkClick(event: React.MouseEvent<HTMLAnchorElement>, url: string): void {
  event.preventDefault();
  window.srgnt?.openExternal(url).catch(() => {
    /* the main process logs the failure; a dead link must not break the chat */
  });
}

const HEADING_LEVELS: Record<string, number> = {
  ATXHeading1: 1,
  ATXHeading2: 2,
  ATXHeading3: 3,
  ATXHeading4: 4,
  ATXHeading5: 5,
  ATXHeading6: 6,
  SetextHeading1: 1,
  SetextHeading2: 2,
};

/** Syntax marks that exist for the editor, not the reader. Never rendered. */
const MARK_NODES = new Set([
  'HeaderMark',
  'QuoteMark',
  'ListMark',
  'LinkMark',
  'EmphasisMark',
  'StrikethroughMark',
  'CodeMark',
  'CodeInfo',
  'TableDelimiter',
  'URL',
  'LinkTitle',
]);

function childrenOf(node: SyntaxNode): SyntaxNode[] {
  const result: SyntaxNode[] = [];
  for (let child = node.firstChild; child !== null; child = child.nextSibling) {
    result.push(child);
  }
  return result;
}

function textOf(source: string, node: SyntaxNode): string {
  return source.slice(node.from, node.to);
}

/** Concatenates a node's source minus its syntax marks (used for code + labels). */
function textWithoutMarks(source: string, node: SyntaxNode): string {
  const children = childrenOf(node).filter((child) => MARK_NODES.has(child.name));
  if (children.length === 0) return textOf(source, node);
  let result = '';
  let cursor = node.from;
  for (const mark of children) {
    result += source.slice(cursor, mark.from);
    cursor = mark.to;
  }
  return result + source.slice(cursor, node.to);
}

/**
 * Renders a node's inline content: recurses into child nodes and emits the raw
 * source that falls in the gaps between them, so plain text is never lost.
 */
function renderInline(source: string, node: SyntaxNode, keyPrefix: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let cursor = node.from;
  let index = 0;

  for (const child of childrenOf(node)) {
    if (child.from > cursor) {
      out.push(source.slice(cursor, child.from));
    }
    cursor = Math.max(cursor, child.to);
    if (!MARK_NODES.has(child.name)) {
      out.push(renderInlineNode(source, child, `${keyPrefix}-${index}`));
    }
    index += 1;
  }

  if (cursor < node.to) {
    out.push(source.slice(cursor, node.to));
  }
  return out;
}

function renderInlineNode(source: string, node: SyntaxNode, key: string): React.ReactNode {
  switch (node.name) {
    case 'Emphasis':
      return <em key={key}>{renderInline(source, node, key)}</em>;
    case 'StrongEmphasis':
      return <strong key={key}>{renderInline(source, node, key)}</strong>;
    case 'Strikethrough':
      return <del key={key}>{renderInline(source, node, key)}</del>;
    case 'InlineCode':
      return (
        <code key={key} className="chat-md-code-inline">
          {textWithoutMarks(source, node)}
        </code>
      );
    case 'Link':
    case 'Autolink':
    case 'URL': {
      const urlNode = childrenOf(node).find((child) => child.name === 'URL');
      const raw = urlNode !== undefined ? textOf(source, urlNode) : textWithoutMarks(source, node);
      const href = raw.replace(/^<|>$/g, '').trim();
      const label = node.name === 'Link' ? renderInline(source, node, key) : href;
      if (!isSafeHref(href)) {
        // An unsupported scheme (javascript:, file:, …) renders as inert text.
        return <span key={key}>{label}</span>;
      }
      return (
        <a
          key={key}
          href={href}
          className="chat-md-link"
          onClick={(event) => handleLinkClick(event, href)}
        >
          {label}
        </a>
      );
    }
    case 'Image': {
      // Deliberately not an <img>: rendering an agent-supplied remote URL would
      // let agent output phone home from inside the app. Show the alt text.
      const alt = textWithoutMarks(source, node).replace(/^!\[|\]$/g, '');
      return (
        <span key={key} className="chat-md-image-placeholder">
          {alt.length > 0 ? alt : 'image'}
        </span>
      );
    }
    case 'HardBreak':
      return <br key={key} />;
    case 'Escape':
      return textOf(source, node).slice(1);
    case 'HTMLTag':
      // Untrusted markup renders as literal text, never as HTML.
      return textOf(source, node);
    default:
      return renderInline(source, node, key);
  }
}

function renderListItem(source: string, node: SyntaxNode, key: string): React.ReactNode {
  const task = childrenOf(node).find((child) => child.name === 'Task');
  const target = task ?? node;
  const marker = childrenOf(target).find((child) => child.name === 'TaskMarker');
  const checked = marker !== undefined && /x/i.test(textOf(source, marker));
  const blocks = childrenOf(target).filter(
    (child) => !MARK_NODES.has(child.name) && child.name !== 'TaskMarker',
  );

  const body =
    blocks.length === 0
      ? renderInline(source, target, key)
      : blocks.map((child, index) =>
          child.name === 'Paragraph'
            ? // A list item's own paragraph must not become a <p> block, or every
              // list gets loose spacing that the source did not ask for.
              <React.Fragment key={`${key}-${index}`}>{renderInline(source, child, `${key}-${index}`)}</React.Fragment>
            : renderBlock(source, child, `${key}-${index}`),
        );

  if (marker === undefined) return <li key={key}>{body}</li>;
  return (
    <li key={key} className="chat-md-task">
      <input type="checkbox" checked={checked} readOnly aria-hidden="true" tabIndex={-1} />
      <span>{body}</span>
    </li>
  );
}

function renderTable(source: string, node: SyntaxNode, key: string): React.ReactNode {
  const rows = childrenOf(node).filter((child) => child.name === 'TableHeader' || child.name === 'TableRow');
  const header = rows.filter((row) => row.name === 'TableHeader');
  const body = rows.filter((row) => row.name === 'TableRow');

  const renderRow = (row: SyntaxNode, rowKey: string, cellTag: 'th' | 'td'): React.ReactNode => {
    const cells = childrenOf(row).filter((child) => child.name === 'TableCell');
    const Cell = cellTag;
    return (
      <tr key={rowKey}>
        {cells.map((cell, index) => (
          <Cell key={`${rowKey}-${index}`}>{renderInline(source, cell, `${rowKey}-${index}`)}</Cell>
        ))}
      </tr>
    );
  };

  return (
    <div key={key} className="chat-md-table-scroll">
      <table className="chat-md-table">
        {header.length > 0 && <thead>{header.map((row, index) => renderRow(row, `${key}-h${index}`, 'th'))}</thead>}
        {body.length > 0 && <tbody>{body.map((row, index) => renderRow(row, `${key}-r${index}`, 'td'))}</tbody>}
      </table>
    </div>
  );
}

function renderBlock(source: string, node: SyntaxNode, key: string): React.ReactNode {
  const headingLevel = HEADING_LEVELS[node.name];
  if (headingLevel !== undefined) {
    const Tag = `h${headingLevel}` as 'h1';
    return (
      <Tag key={key} className={`chat-md-heading chat-md-h${headingLevel}`}>
        {renderInline(source, node, key)}
      </Tag>
    );
  }

  switch (node.name) {
    case 'Paragraph':
      return (
        <p key={key} className="chat-md-paragraph">
          {renderInline(source, node, key)}
        </p>
      );
    case 'FencedCode':
    case 'CodeBlock': {
      const info = childrenOf(node).find((child) => child.name === 'CodeInfo');
      const textNode = childrenOf(node).find((child) => child.name === 'CodeText');
      const code = textNode !== undefined ? textOf(source, textNode) : textWithoutMarks(source, node);
      return (
        <pre key={key} className="chat-md-code-block" data-language={info !== undefined ? textOf(source, info) : undefined}>
          <code>{code}</code>
        </pre>
      );
    }
    case 'Blockquote':
      return (
        <blockquote key={key} className="chat-md-blockquote">
          {renderBlocks(source, node, key)}
        </blockquote>
      );
    case 'BulletList':
      return (
        <ul key={key} className="chat-md-list">
          {childrenOf(node)
            .filter((child) => child.name === 'ListItem')
            .map((child, index) => renderListItem(source, child, `${key}-${index}`))}
        </ul>
      );
    case 'OrderedList':
      return (
        <ol key={key} className="chat-md-list">
          {childrenOf(node)
            .filter((child) => child.name === 'ListItem')
            .map((child, index) => renderListItem(source, child, `${key}-${index}`))}
        </ol>
      );
    case 'Table':
      return renderTable(source, node, key);
    case 'HorizontalRule':
      return <hr key={key} className="chat-md-rule" />;
    case 'HTMLBlock':
      // Untrusted markup renders as literal text, never as HTML.
      return (
        <pre key={key} className="chat-md-code-block">
          <code>{textOf(source, node)}</code>
        </pre>
      );
    default:
      return (
        <p key={key} className="chat-md-paragraph">
          {renderInline(source, node, key)}
        </p>
      );
  }
}

function renderBlocks(source: string, node: SyntaxNode, keyPrefix: string): React.ReactNode[] {
  return childrenOf(node)
    .filter((child) => !MARK_NODES.has(child.name))
    .map((child, index) => renderBlock(source, child, `${keyPrefix}-${index}`));
}

/** Parses and renders GFM markdown. Exported for tests; use {@link Markdown} in views. */
export function renderMarkdown(source: string): React.ReactNode[] {
  const tree: Tree = gfmParser.parse(source);
  return renderBlocks(source, tree.topNode, 'md');
}

export interface MarkdownProps {
  /** Raw markdown. Re-parsed on change — memoized because streaming is chunky. */
  readonly source: string;
  readonly className?: string;
}

/**
 * Renders a markdown body. Memoized on `source` so a chat re-render triggered by
 * a *different* message's chunk does not re-parse every settled message.
 */
export const Markdown = React.memo(function Markdown({ source, className }: MarkdownProps): React.ReactElement {
  const content = React.useMemo(() => renderMarkdown(source), [source]);
  return (
    <div className={className !== undefined ? `chat-markdown ${className}` : 'chat-markdown'}>{content}</div>
  );
});
