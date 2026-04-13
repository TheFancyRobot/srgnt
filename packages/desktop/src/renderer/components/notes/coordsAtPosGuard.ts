/**
 * Guards against stack overflow from `InlineCoordsScan.scan` infinite recursion
 * in `@codemirror/view@6.41.0`.
 *
 * BUG-0014: `InlineCoordsScan.scan` uses a binary-search-like algorithm that
 * recurses on itself when adjusting the y-axis coordinate. On pathological
 * widget/DOM arrangements from `codemirror-live-markdown`, the `above`/`below`
 * rects oscillate and the method recurses until the call stack is exhausted,
 * throwing a `RangeError: Maximum call stack size exceeded`.
 *
 * Since `InlineCoordsScan` is an internal class (not exported), we intercept
 * the error at the public API boundary: `EditorView.prototype.coordsAtPos`.
 * All callers of `coordsAtPos` already handle `null` gracefully (e.g.,
 * `moveVertically` falls back to line-level positioning).
 *
 * Install once at app startup, before any EditorView is created.
 */

import { EditorView } from '@codemirror/view';

const GUARD_MARKER = '__coordsAtPosGuardInstalled';

export function installCoordsAtPosGuard(): void {
  const proto = EditorView.prototype as typeof EditorView.prototype & Record<string, unknown>;
  if (proto[GUARD_MARKER]) return;

  const originalCoordsAtPos = EditorView.prototype.coordsAtPos;

  EditorView.prototype.coordsAtPos = function (pos: number, side?: 1 | -1) {
    try {
      return originalCoordsAtPos.call(this, pos, side);
    } catch (e) {
      if (e instanceof RangeError && e.message.includes('Maximum call stack')) {
        // InlineCoordsScan.scan infinite recursion caught — return null.
        // Callers like moveVertically already handle null gracefully.
        return null;
      }
      throw e;
    }
  };

  proto[GUARD_MARKER] = true;
}
