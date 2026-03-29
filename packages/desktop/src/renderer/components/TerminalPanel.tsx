import React, { useEffect, useRef, useState, useCallback } from 'react';
import ghosttyWasmUrl from 'ghostty-web/ghostty-vt.wasm?url';
import { Ghostty, Terminal, FitAddon } from 'ghostty-web';
import type { LaunchContext } from '@srgnt/contracts';
import { TerminalIpc, runSafe, runUnsafe } from '../effects/terminal-ipc.js';

interface ApprovalPreviewState {
  approvalId: string;
  launchContext: LaunchContext;
  command: string;
  riskLevel: string;
}

export interface TabInfo {
  id: string;
  sessionId: string | null;
  isConnected: boolean;
  label: string;
  launchContext?: LaunchContext | null;
  approvalPending: ApprovalPreviewState | null;
  denied: boolean;
}

let ghosttyReady: Promise<Ghostty> | null = null;

function ensureGhosttyInit(): Promise<Ghostty> {
  if (!ghosttyReady) {
    ghosttyReady = Ghostty.load(ghosttyWasmUrl);
  }
  return ghosttyReady;
}

function ApprovalPreview({
  approval,
  onApprove,
  onDeny,
}: {
  approval: ApprovalPreviewState;
  onApprove: () => void;
  onDeny: () => void;
}): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-neutral-900 text-white p-6">
      <div className="max-w-md w-full bg-neutral-800 rounded-lg border border-neutral-700 p-6">
        <h3 className="text-lg font-semibold mb-4 text-yellow-400">Approval Required</h3>
        <div className="space-y-3 text-sm">
          <div>
            <span className="text-neutral-400">Command:</span>
            <code className="ml-2 text-neutral-200 bg-neutral-900 px-2 py-1 rounded">
              {approval.command || 'bash'}
            </code>
          </div>
          <div>
            <span className="text-neutral-400">Risk Level:</span>
            <span
              className={`ml-2 font-medium ${
                approval.riskLevel === 'high'
                  ? 'text-red-400'
                  : approval.riskLevel === 'medium'
                  ? 'text-yellow-400'
                  : 'text-green-400'
              }`}
            >
              {approval.riskLevel.toUpperCase()}
            </span>
          </div>
          <div>
            <span className="text-neutral-400">Workflow:</span>
            <span className="ml-2 text-neutral-200">{approval.launchContext.sourceWorkflow}</span>
          </div>
          <div>
            <span className="text-neutral-400">Directory:</span>
            <span className="ml-2 text-neutral-200">{approval.launchContext.workingDirectory}</span>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onDeny}
            className="flex-1 px-4 py-2 bg-neutral-700 hover:bg-neutral-600 rounded text-sm transition-colors"
          >
            Deny
          </button>
          <button
            type="button"
            onClick={onApprove}
            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 rounded text-sm font-medium transition-colors"
          >
            Approve
          </button>
        </div>
      </div>
    </div>
  );
}


interface TerminalTabContentProps {
  tabId: string;
  launchContext?: LaunchContext | null;
  onConnected: (tabId: string, sessionId: string) => void;
  onExited: (tabId: string) => void;
  onApprovalRequired: (tabId: string, approval: ApprovalPreviewState, resolve: (approved: boolean) => void) => void;
  onDenied: (tabId: string) => void;
}

function TerminalTabContent({
  tabId,
  launchContext,
  onConnected,
  onExited,
  onApprovalRequired,
  onDenied,
}: TerminalTabContentProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const cleanupRef = useRef<(() => void)[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let term: Terminal;
    let fitAddon: FitAddon;
    let disposed = false;

    const setup = async () => {
      try {
        const ghostty = await ensureGhosttyInit();
        if (disposed) return;

        term = new Terminal({
          ghostty,
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
      } catch {
        return;
      }

      if (disposed) return;

      container.replaceChildren();
      term.open(container);
      // Clear stale framebuffer pixels from shared Ghostty WASM instance
      term.write('\x1b[2J\x1b[H');
      termRef.current = term;

      // Use Ghostty's FitAddon for proper sizing with real font metrics
      fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      fitAddonRef.current = fitAddon;
      fitAddon.fit();

      const cleanupApprovalEvent = window.srgnt.onLaunchApprovalRequired((payload) => {
        if (disposed) return;
        const resolveFn = (approved: boolean) => {
          runSafe(TerminalIpc.resolveLaunchApproval(payload.approvalId, approved));
          if (!approved) {
            onDenied(tabId);
          }
        };
        onApprovalRequired(tabId, {
          approvalId: payload.approvalId,
          launchContext: payload.launchContext,
          command: payload.command,
          riskLevel: payload.riskLevel,
        }, resolveFn);
      });

      try {
        let sessionId: string;
        if (launchContext) {
          const launchResult = await runUnsafe(
            TerminalIpc.launchWithContext({
              launchContext,
              rows: term.rows,
              cols: term.cols,
            }),
          );
          if (disposed) {
            if (launchResult.sessionId) {
              runSafe(TerminalIpc.close(launchResult.sessionId));
            }
            return;
          }
          if (launchResult.status === 'denied') {
            onDenied(tabId);
            return;
          }
          if (!launchResult.sessionId) {
            return;
          }
          sessionId = launchResult.sessionId;
        } else {
          const spawnResult = await runUnsafe(
            TerminalIpc.spawn({ rows: term.rows, cols: term.cols }),
          );
          if (disposed) {
            if (spawnResult.sessionId) {
              runSafe(TerminalIpc.close(spawnResult.sessionId));
            }
            return;
          }
          sessionId = spawnResult.sessionId;
        }

        if (disposed) return;

        sessionIdRef.current = sessionId;
        onConnected(tabId, sessionId);

        // Register onData AFTER session is established so any spurious
        // input from Ghostty WASM during init is ignored. Use captured
        // sessionId so this handler can only write to its own session.
        term.onData((data: string) => {
          if (disposed || !sessionIdRef.current) return;
          runSafe(TerminalIpc.write(sessionId, data));
        });

        const cleanupData = window.srgnt.onTerminalData((sid, data) => {
          if (sid === sessionId && term && !disposed) {
            term.write(data);
          }
        });

        const cleanupExit = window.srgnt.onTerminalExit((sid, exitCode) => {
          if (sid === sessionId && !disposed) {
            term?.write(`\r\n\x1b[33m[Process exited with code ${exitCode}]\x1b[0m\r\n`);
            sessionIdRef.current = null;
            onExited(tabId);
          }
        });

        cleanupRef.current = [cleanupData, cleanupExit, cleanupApprovalEvent];

        // Fit terminal to container using real font metrics, sync PTY
        requestAnimationFrame(() => {
          if (!disposed && fitAddon) {
            fitAddon.fit();
            runSafe(TerminalIpc.resize(sessionId, term.rows, term.cols));
            term.focus();
          }
        });

        // Auto-fit on container resize and sync PTY dimensions
        fitAddon.observeResize();
        term.onResize(({ cols: c, rows: r }) => {
          if (!disposed && sessionIdRef.current) {
            runSafe(TerminalIpc.resize(sessionId, r, c));
          }
        });
      } catch (error) {
        if (!disposed) {
          term.write(`\x1b[31mFailed to spawn terminal: ${String(error)}\x1b[0m\r\n`);
        }
      }
    };

    setup();

    return () => {
      disposed = true;
      cleanupRef.current.forEach((fn) => fn());
      const activeSessionId = sessionIdRef.current;
      if (activeSessionId) {
        runSafe(TerminalIpc.close(activeSessionId));
      }
      if (fitAddonRef.current) {
        fitAddonRef.current.dispose();
        fitAddonRef.current = null;
      }
      if (termRef.current) {
        termRef.current.dispose();
        termRef.current = null;
      }
      container.replaceChildren();
      sessionIdRef.current = null;
    };
  }, [tabId, launchContext, onConnected, onExited, onApprovalRequired, onDenied]);

  return (
    <div
      ref={containerRef}
      data-testid="terminal-host"
      style={{ caretColor: 'transparent' }}
      className="flex-1 overflow-hidden min-h-0 p-2"
    />
  );
}

let tabCounter = 0;

export interface TerminalPanelProps {
  className?: string;
  launchContext?: LaunchContext | null;
}

export function TerminalPanel({ className = '', launchContext = null }: TerminalPanelProps): React.ReactElement {
  const [tabs, setTabs] = useState<TabInfo[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const approvalResolvers = useRef<Map<string, (approved: boolean) => void>>(new Map());
  const pendingLaunchRef = useRef<LaunchContext | null>(null);

  const addTab = useCallback((context?: LaunchContext | null) => {
    const id = `tab-${++tabCounter}-${Date.now()}`;
    const label = context
      ? `${context.sourceWorkflow}${context.sourceArtifactId ? `: ${context.sourceArtifactId}` : ''}`
      : `Terminal ${tabCounter}`;
    const newTab: TabInfo = {
      id,
      sessionId: null,
      isConnected: false,
      label,
      launchContext: context,
      approvalPending: null,
      denied: false,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(id);
    return id;
  }, []);

  const closeTab = useCallback((tabId: string) => {
    setTabs((prev) => {
      const tab = prev.find((t) => t.id === tabId);
      if (tab?.sessionId) {
        runSafe(TerminalIpc.close(tab.sessionId));
      }
      approvalResolvers.current.delete(tabId);
      const remaining = prev.filter((t) => t.id !== tabId);

      const closedIdx = prev.findIndex((t) => t.id === tabId);
      if (remaining.length > 0 && closedIdx >= 0) {
        const nextIdx = Math.min(closedIdx, remaining.length - 1);
        const nextTab = remaining[nextIdx];
        if (nextTab) {
          setActiveTabId(nextTab.id);
        }
      } else {
        setActiveTabId(null);
      }

      return remaining;
    });
  }, []);

  useEffect(() => {
    if (launchContext && launchContext !== pendingLaunchRef.current) {
      pendingLaunchRef.current = launchContext;
      addTab(launchContext);
    }
  }, [launchContext, addTab]);

  useEffect(() => {
    if (tabs.length === 0 && !launchContext) {
      addTab(null);
    }
  }, []);

  useEffect(() => {
    if (tabs.length === 0) {
      if (activeTabId !== null) setActiveTabId(null);
      return;
    }
    const activeExists = tabs.some((t) => t.id === activeTabId);
    if (!activeExists) {
      setActiveTabId(tabs[tabs.length - 1].id);
    }
  }, [tabs]);

  const handleConnected = useCallback((tabId: string, sessionId: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, sessionId, isConnected: true } : t))
    );
  }, []);

  const handleExited = useCallback((tabId: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, isConnected: false, sessionId: null } : t))
    );
  }, []);

  const handleApprovalRequired = useCallback(
    (tabId: string, approval: ApprovalPreviewState, resolve: (approved: boolean) => void) => {
      approvalResolvers.current.set(tabId, resolve);
      setTabs((prev) =>
        prev.map((t) => (t.id === tabId ? { ...t, approvalPending: approval } : t))
      );
    },
    [],
  );

  const handleApprove = useCallback((tabId: string) => {
    const resolve = approvalResolvers.current.get(tabId);
    if (resolve) {
      resolve(true);
      approvalResolvers.current.delete(tabId);
    }
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, approvalPending: null } : t))
    );
  }, []);

  const handleDeny = useCallback((tabId: string) => {
    const resolve = approvalResolvers.current.get(tabId);
    if (resolve) {
      resolve(false);
      approvalResolvers.current.delete(tabId);
    }
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, approvalPending: null, denied: true } : t))
    );
  }, []);

  const handleDenied = useCallback((tabId: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, denied: true } : t))
    );
  }, []);

  return (
    <div className={`flex flex-col bg-neutral-900 overflow-hidden ${className}`}>
      <div className="flex items-center bg-neutral-800 border-b border-neutral-700 min-h-[36px]">
        <div className="flex items-center flex-1 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`group flex items-center gap-2 px-3 py-1.5 text-xs font-mono cursor-pointer border-r border-neutral-700 min-w-0 max-w-[180px] ${
                tab.id === activeTabId
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-750'
              }`}
              onClick={() => setActiveTabId(tab.id)}
              role="tab"
              aria-selected={tab.id === activeTabId}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  tab.approvalPending
                    ? 'bg-yellow-500'
                    : tab.isConnected
                    ? 'bg-green-500'
                    : 'bg-red-500'
                }`}
              />
              <span className="truncate">{tab.label}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                className="shrink-0 ml-1 w-4 h-4 flex items-center justify-center rounded text-neutral-500 hover:text-white hover:bg-neutral-600 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label={`Close ${tab.label}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => addTab(null)}
          className="flex items-center justify-center w-8 h-8 text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors shrink-0"
          aria-label="Open new terminal tab"
        >
          +
        </button>
      </div>

      <div className="flex-1 min-h-0 relative">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`absolute inset-0 flex flex-col ${
              tab.id === activeTabId ? '' : 'invisible pointer-events-none'
            }`}
            role="tabpanel"
            aria-hidden={tab.id !== activeTabId}
          >
            {tab.denied ? (
              <div className="flex items-center justify-center h-full text-neutral-400">
                <div className="text-center">
                  <div className="text-red-400 text-lg mb-2">Launch Denied</div>
                  <div className="text-sm text-neutral-500">This terminal launch was denied.</div>
                </div>
              </div>
            ) : (
              <>
                <TerminalTabContent
                  tabId={tab.id}
                  launchContext={tab.launchContext}
                  onConnected={handleConnected}
                  onExited={handleExited}
                  onApprovalRequired={handleApprovalRequired}
                  onDenied={handleDenied}
                />
                {tab.approvalPending && (
                  <div className="absolute inset-0 z-10 flex flex-col bg-neutral-900/92 backdrop-blur-sm">
                    <div className="h-[36px] shrink-0" />
                    <ApprovalPreview
                      approval={tab.approvalPending}
                      onApprove={() => handleApprove(tab.id)}
                      onDeny={() => handleDeny(tab.id)}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        ))}

        {tabs.length === 0 && (
          <div className="flex items-center justify-center h-full text-neutral-500 text-sm">
            No terminal sessions. Click + to open one.
          </div>
        )}
      </div>
    </div>
  );
}
