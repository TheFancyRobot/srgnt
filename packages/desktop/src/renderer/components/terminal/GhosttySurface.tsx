import React from 'react';
import { ensureGhosttyRuntime, ghosttyFontFamily, ghosttyTheme, stripAnsi, type GhosttyTerminal } from './ghostty.js';

/**
 * A **read-only** ghostty surface (PHASE-23, STEP-23-02).
 *
 * Unlike `TerminalPanel`, this one has no pty, no keyboard, and no tabs: it
 * renders an append-only output buffer someone else owns. That is exactly what a
 * tool card needs — a faithful view of what the agent's command printed, with
 * nothing the user could accidentally type into (phase non-goal: this is not a
 * second terminal).
 *
 * `output` is the *whole* buffer received so far, not a delta. The component
 * tracks how much of it has been written and appends only the new tail, so a
 * chatty command does not repaint the screen on every chunk. If the buffer ever
 * shrinks (the client truncated it to its byte cap) the screen is cleared and
 * rewritten, which is the only honest thing to do with a buffer that lost data.
 *
 * When the WASM runtime is unavailable — jsdom under test, or a genuine load
 * failure — the surface degrades to an ANSI-stripped `<pre>` rather than
 * rendering nothing. Terminal output is evidence of what the agent did; failing
 * to load a renderer is not a reason to hide it.
 */

export interface GhosttySurfaceProps {
  /** Full accumulated output. Append-only except on truncation. */
  readonly output: string;
  /** Visible rows. The surface never grows past this; it scrolls instead. */
  readonly rows?: number;
  readonly label?: string;
}

type SurfaceMode = 'loading' | 'ghostty' | 'fallback';

export function GhosttySurface({ output, rows = 12, label }: GhosttySurfaceProps): React.ReactElement {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const termRef = React.useRef<GhosttyTerminal | null>(null);
  const writtenRef = React.useRef(0);
  const [mode, setMode] = React.useState<SurfaceMode>('loading');

  React.useEffect(() => {
    const host = hostRef.current;
    if (host === null) return;
    let disposed = false;

    void (async () => {
      let term: GhosttyTerminal;
      try {
        const { ghostty, Terminal } = await ensureGhosttyRuntime();
        if (disposed) return;
        term = new Terminal({
          ghostty,
          cursorBlink: false,
          fontSize: 12,
          fontFamily: ghosttyFontFamily,
          theme: { ...ghosttyTheme },
          rows,
          cols: 100,
        });
      } catch {
        if (!disposed) setMode('fallback');
        return;
      }
      if (disposed) return;
      host.replaceChildren();
      term.open(host);
      // The WASM instance is shared with the main terminal panel; clear the
      // framebuffer so another surface's pixels never bleed into this card.
      term.write('\u001B[2J\u001B[H');
      termRef.current = term;
      writtenRef.current = 0;
      setMode('ghostty');
    })();

    return () => {
      disposed = true;
      termRef.current?.dispose();
      termRef.current = null;
      writtenRef.current = 0;
      host.replaceChildren();
    };
    // `rows` is a mount-time sizing choice; changing it would need a new terminal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const term = termRef.current;
    if (term === null) return;
    if (output.length < writtenRef.current) {
      term.write('\u001B[2J\u001B[H');
      writtenRef.current = 0;
    }
    if (output.length > writtenRef.current) {
      term.write(output.slice(writtenRef.current));
      writtenRef.current = output.length;
    }
  }, [output, mode]);

  return (
    <div className="chat-terminal-surface" data-testid="chat-terminal-surface" data-mode={mode}>
      <div ref={hostRef} className="chat-terminal-host" hidden={mode !== 'ghostty'} aria-hidden={mode !== 'ghostty'} />
      {mode !== 'ghostty' && (
        <pre className="chat-terminal-fallback" data-testid="chat-terminal-fallback" aria-label={label}>
          {stripAnsi(output)}
        </pre>
      )}
    </div>
  );
}
