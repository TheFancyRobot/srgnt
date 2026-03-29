import React, { useEffect, useRef, useState, useCallback } from 'react';
import { init, Terminal } from 'ghostty-web';
import type { LaunchContext } from '@srgnt/contracts';

interface TerminalPanelProps {
  className?: string;
  launchContext?: LaunchContext | null;
}

let wasmReady: Promise<void> | null = null;

function ensureWasmInit(): Promise<void> {
  if (!wasmReady) {
    wasmReady = init();
  }
  return wasmReady;
}

export function TerminalPanel({ className = '', launchContext = null }: TerminalPanelProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const cleanupRef = useRef<(() => void)[]>([]);
  const sessionIdRef = useRef<string | null>(null);

  const measureTerminal = useCallback((term: Terminal, container: HTMLDivElement) => {
    const style = window.getComputedStyle(container);
    const paddingLeft = parseFloat(style.paddingLeft) || 0;
    const paddingRight = parseFloat(style.paddingRight) || 0;
    const paddingTop = parseFloat(style.paddingTop) || 0;
    const paddingBottom = parseFloat(style.paddingBottom) || 0;
    const availableWidth = container.clientWidth - paddingLeft - paddingRight;
    const availableHeight = container.clientHeight - paddingTop - paddingBottom;
    if (availableWidth <= 0 || availableHeight <= 0) return;

    const testChar = 'M';
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.font = `${term.options.fontSize}px ${term.options.fontFamily}`;
    const charWidth = ctx.measureText(testChar).width;
    const charHeight = term.options.fontSize * 1.4;

    const cols = Math.max(1, Math.floor(availableWidth / charWidth));
    const rows = Math.max(1, Math.floor(availableHeight / charHeight));

    if (cols !== term.cols || rows !== term.rows) {
      term.resize(cols, rows);
      const sid = sessionIdRef.current;
      if (sid && isConnected) {
        window.srgnt.terminalResize(sid, rows, cols).catch(() => {});
      }
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let term: Terminal;
    let disposed = false;

    const setup = async () => {
      try {
        await ensureWasmInit();
      } catch (err) {
        if (!disposed) setInitError(`Failed to initialize terminal engine: ${String(err)}`);
        return;
      }

      if (disposed) return;

      term = new Terminal({
        cursorBlink: true,
        fontSize: 13,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        theme: {
          background: '#1a1a1a',
          foreground: '#e5e5e5',
          cursor: '#e5e5e5',
          selectionBackground: '#404040',
        },
        rows: 24,
        cols: 80,
      });

      term.open(container);
      termRef.current = term;

      term.onData((data: string) => {
        const sid = sessionIdRef.current;
        if (sid) {
          window.srgnt.terminalWrite(sid, data).catch(() => {});
        }
      });

      try {
        const result = launchContext
          ? await window.srgnt.terminalLaunchWithContext({
              launchContext,
              rows: term.rows,
              cols: term.cols,
            })
          : await window.srgnt.terminalSpawn({ rows: term.rows, cols: term.cols });
        if (disposed) {
          window.srgnt.terminalClose(result.sessionId).catch(() => {});
          return;
        }

        sessionIdRef.current = result.sessionId;
        setSessionId(result.sessionId);
        setIsConnected(true);

        const cleanupData = window.srgnt.onTerminalData((sid, data) => {
          if (sid === result.sessionId && term && !disposed) {
            term.write(data);
          }
        });

        const cleanupExit = window.srgnt.onTerminalExit((sid, exitCode) => {
          if (sid === result.sessionId && !disposed) {
            term?.write(`\r\n\x1b[33m[Process exited with code ${exitCode}]\x1b[0m\r\n`);
            setIsConnected(false);
            setSessionId(null);
            sessionIdRef.current = null;
          }
        });

        cleanupRef.current = [cleanupData, cleanupExit];

        requestAnimationFrame(() => {
          if (!disposed && container) {
            measureTerminal(term, container);
          }
        });
      } catch (error) {
        if (!disposed) {
          term.write(`\x1b[31mFailed to spawn terminal: ${String(error)}\x1b[0m\r\n`);
        }
      }
    };

    setup();

    const resizeObserver = new ResizeObserver(() => {
      if (termRef.current && container && !disposed) {
        measureTerminal(termRef.current, container);
      }
    });
    resizeObserver.observe(container);

    return () => {
      disposed = true;
      resizeObserver.disconnect();
      cleanupRef.current.forEach((fn) => fn());
      const activeSessionId = sessionIdRef.current;
      if (activeSessionId) {
        window.srgnt.terminalClose(activeSessionId).catch(() => {});
      }
      if (termRef.current) {
        termRef.current.dispose();
        termRef.current = null;
      }
      sessionIdRef.current = null;
    };
  }, [launchContext, measureTerminal]);

  const handleClose = () => {
    if (!sessionId) return;
    window.srgnt.terminalClose(sessionId).catch(() => {});
    setSessionId(null);
    setIsConnected(false);
    sessionIdRef.current = null;
  };

  return (
    <div className={`flex flex-col bg-neutral-900 rounded-lg overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-3 py-2 bg-neutral-800 border-b border-neutral-700">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs text-neutral-400 font-mono">
            {isConnected ? `Session: ${sessionId?.slice(0, 12)}...` : 'Disconnected'}
          </span>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="text-neutral-400 hover:text-white text-sm px-2 py-1 rounded hover:bg-neutral-700 transition-colors"
          disabled={!sessionId}
        >
          Close
        </button>
      </div>
      {launchContext && (
        <div className="px-3 py-2 bg-neutral-800 border-b border-neutral-700 text-xs text-neutral-300">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>Workflow: {launchContext.sourceWorkflow}</span>
            <span>Directory: {launchContext.workingDirectory}</span>
            {launchContext.sourceArtifactId && <span>Artifact: {launchContext.sourceArtifactId}</span>}
            {launchContext.labels && launchContext.labels.length > 0 && (
              <span>Labels: {launchContext.labels.join(', ')}</span>
            )}
          </div>
        </div>
      )}
      <div
        ref={containerRef}
        className="flex-1 p-2 overflow-hidden min-h-[200px]"
      />
      {initError && (
        <div className="p-2 text-sm text-red-400 bg-red-950/50 border-t border-red-800">
          {initError}
        </div>
      )}
    </div>
  );
}
