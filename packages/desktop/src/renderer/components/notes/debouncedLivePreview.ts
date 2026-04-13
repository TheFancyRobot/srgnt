/**
 * Wrapper around `livePreviewPlugin` from `codemirror-live-markdown`.
 *
 * BUG-0014 fix: Two-pronged defense against stack overflow from
 * `InlineCoordsScan.scan` infinite recursion in `@codemirror/view`:
 *
 * 1. **Prevention (this file)**: Skip decoration rebuilds on selection-only
 *    updates. Arrow keys fire `selectionSet` which previously triggered a
 *    full `syntaxTree().iterate()` rebuild + subsequent `coordsAtPos` calls
 *    that could recurse infinitely on widget DOM. By only rebuilding on
 *    actual content changes (docChanged, viewportChanged, mouse drag),
 *    we avoid triggering the problematic code path during arrow navigation.
 *
 * 2. **Safety net** (`getClientRectsGuard.ts`): Wraps `getClientRects()` with
 *    a recursion depth limit to prevent stack overflow even if the code path
 *    is somehow reached.
 *
 * Trade-off: On arrow key navigation, formatting marks (bold, italic, etc.)
 * won't toggle until the next content change or viewport scroll. This is
 * acceptable because formatting visibility is a visual hint, not functional.
 * Block formatting (headings, lists, quotes) still updates via CSS transitions.
 */

import { type Range } from '@codemirror/state';
import { type EditorView, ViewPlugin, type DecorationSet, Decoration, type ViewUpdate } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import {
  checkUpdateAction,
  mouseSelectingField,
  shouldShowSource,
} from 'codemirror-live-markdown';

const BLOCK_MARKS = new Set(['HeaderMark', 'ListMark', 'QuoteMark']);
const ALL_MARKS = [
  'EmphasisMark',
  'StrikethroughMark',
  'CodeMark',
  'HeaderMark',
  'ListMark',
  'QuoteMark',
];

const SKIP_PARENT_TYPES = new Set(['FencedCode', 'CodeBlock']);

function isInsideSkippedParent(node: { node: { parent: { name: string; parent: unknown } | null } }): boolean {
  let parent = node.node.parent;
  while (parent) {
    if (SKIP_PARENT_TYPES.has((parent as { name: string }).name)) {
      return true;
    }
    parent = (parent as { parent: { name: string; parent: unknown } | null }).parent;
  }
  return false;
}

/**
 * Build the decoration set for live preview.
 * Same logic as `livePreviewPlugin.build()` from the library.
 */
function buildDecorations(view: EditorView): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const { state } = view;
  const activeLines = new Set<number>();

  for (const range of state.selection.ranges) {
    const startLine = state.doc.lineAt(range.from).number;
    const endLine = state.doc.lineAt(range.to).number;
    for (let l = startLine; l <= endLine; l++) {
      activeLines.add(l);
    }
  }

  const isDrag = state.field(mouseSelectingField, false);

  syntaxTree(state).iterate({
    enter: (node) => {
      if (!ALL_MARKS.includes(node.name)) return;
      if (isInsideSkippedParent(node)) return;

      if (node.name === 'CodeMark') {
        const parent = node.node.parent;
        if (parent && (parent as { name: string }).name === 'InlineCode') {
          const text = state.doc.sliceString(parent.from, parent.to);
          if (text.startsWith('`$') && text.endsWith('$`')) return;
        }
      }

      const isBlock = BLOCK_MARKS.has(node.name);
      const lineNum = state.doc.lineAt(node.from).number;
      const isActiveLine = activeLines.has(lineNum);

      if (isBlock) {
        const cls = isActiveLine && !isDrag
          ? 'cm-formatting-block cm-formatting-block-visible'
          : 'cm-formatting-block';
        decorations.push(Decoration.mark({ class: cls }).range(node.from, node.to));
      } else {
        if (node.from >= node.to) return;
        const isTouched = shouldShowSource(state, node.from, node.to);
        const cls = isTouched && !isDrag
          ? 'cm-formatting-inline cm-formatting-inline-visible'
          : 'cm-formatting-inline';
        decorations.push(Decoration.mark({ class: cls }).range(node.from, node.to));
      }
    },
  });

  return Decoration.set(
    decorations.sort((a, b) => a.from - b.from),
    true,
  );
}

interface SafeLivePreview {
  decorations: DecorationSet;
  build(view: EditorView): DecorationSet;
}

/**
 * A drop-in replacement for `livePreviewPlugin` that skips
 * `selectionSet`-only rebuilds to prevent stack overflow.
 *
 * - `docChanged`, `viewportChanged`, reconfigured, mouse-drag release → immediate rebuild
 * - `selectionSet` only → **skipped** (no rebuild)
 */
export const debouncedLivePreviewPlugin = ViewPlugin.fromClass(
  class implements SafeLivePreview {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.build(view);
    }

    build(view: EditorView): DecorationSet {
      return buildDecorations(view);
    }

    update(update: ViewUpdate) {
      const action = checkUpdateAction(update as Parameters<typeof checkUpdateAction>[0]);

      if (action !== 'rebuild') return;

      // Check for mouse drag release — always rebuild immediately
      const isDragging = update.state.field(mouseSelectingField, false);
      const wasDragging = update.startState.field(mouseSelectingField, false);
      if (wasDragging && !isDragging) {
        this.decorations = this.build(update.view);
        return;
      }

      // Skip while actively dragging
      if (isDragging) return;

      // Determine if this is a selection-only change (arrow keys, click)
      const isSelectionOnly =
        !update.docChanged &&
        !update.viewportChanged &&
        !update.transactions.some((t: { reconfigured: boolean }) => t.reconfigured);

      if (isSelectionOnly) {
        // SKIP rebuild — prevents InlineCoordsScan.scan recursion
        // Decorations will update on next content change or viewport change
        return;
      }

      // docChanged / viewportChanged / reconfigured — immediate rebuild
      this.decorations = this.build(update.view);
    }
  },
  {
    decorations: (v: SafeLivePreview) => v.decorations,
  },
);
