import React from 'react';

/**
 * Flag-gated raw ACP dev console (STEP-22-05). Drives an ephemeral session
 * through the main-process supervisor + `@srgnt/harness` wrapper: pick a target
 * (deterministic mock or real Pi), open a session, send a raw prompt, watch the
 * live `session/update` stream, and cancel/dispose. Deliberately unstyled and
 * developer-facing — the product chat UI is Phase 23.
 *
 * This component is only mounted when `window.srgnt.devConsoleEnabled()` resolves
 * true (see main.tsx). With the flag off it never renders, so `data-testid`
 * `dev-console` is absent from the default app (asserted in e2e).
 */

type Target = 'mock' | 'pi';
type Status = 'idle' | 'connecting' | 'ready' | 'prompting' | 'error';

interface LogEntry {
  readonly id: number;
  readonly kind: 'update' | 'info' | 'error';
  readonly text: string;
}

function summarizeUpdate(update: unknown): string {
  const kind = (update as { update?: { sessionUpdate?: string } } | null)?.update?.sessionUpdate;
  const label = typeof kind === 'string' ? kind : 'update';
  return `${label}  ${JSON.stringify(update)}`;
}

/**
 * Renders {@link DevConsole} in a bottom-docked panel ONLY when the main process
 * reports the flag is on. Until the query resolves (and forever, when off) it
 * renders nothing — so the console is invisible in the default app and the
 * `dev-console` test id is absent (asserted in e2e).
 */
export function DevConsoleGate(): React.ReactElement | null {
  const [enabled, setEnabled] = React.useState(false);
  const [open, setOpen] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    window.srgnt
      .devConsoleEnabled()
      .then((value) => {
        if (!cancelled) setEnabled(value);
      })
      .catch(() => {
        /* flag off / handler absent → stay hidden */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!enabled) return null;

  return (
    <div
      data-testid="dev-console-gate"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        height: open ? '45vh' : 32,
        background: 'var(--surface-primary, #fff)',
        borderTop: '2px solid #888',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 -4px 12px rgba(0,0,0,0.15)',
      }}
    >
      <button
        type="button"
        data-testid="dev-console-toggle"
        onClick={() => setOpen((value) => !value)}
        style={{ alignSelf: 'flex-start', fontSize: 11, padding: '2px 8px', fontFamily: 'monospace' }}
      >
        {open ? '▼ hide dev console' : '▲ show dev console'}
      </button>
      {/* Keep DevConsole mounted when collapsed (hidden, not unmounted) so an
          active mock/Pi session — and its update subscription — survives a
          hide/show cycle. Unmounting here would drop the sessionId without
          disposing it, leaving the main-process ACP session running with no
          handle to cancel or dispose it. */}
      <div style={{ flex: 1, overflow: 'hidden', display: open ? 'block' : 'none' }}>
        <DevConsole />
      </div>
    </div>
  );
}

export function DevConsole(): React.ReactElement {
  const [target, setTarget] = React.useState<Target>('mock');
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<Status>('idle');
  const [capabilities, setCapabilities] = React.useState<Record<string, unknown> | null>(null);
  const [promptText, setPromptText] = React.useState('Say hello.');
  const [log, setLog] = React.useState<LogEntry[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const logSeq = React.useRef(0);
  const sessionIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  const append = React.useCallback((kind: LogEntry['kind'], text: string) => {
    setLog((entries) => [...entries.slice(-199), { id: logSeq.current++, kind, text }]);
  }, []);

  React.useEffect(() => {
    const unsubscribe = window.srgnt.onDevSessionUpdate((event) => {
      if (event.sessionId !== sessionIdRef.current) return;
      append('update', summarizeUpdate(event.update));
    });
    return unsubscribe;
  }, [append]);

  const handleNewSession = React.useCallback(async () => {
    setError(null);
    setStatus('connecting');
    append('info', `Connecting to ${target}...`);
    try {
      const result = await window.srgnt.devSessionNew(target);
      setSessionId(result.sessionId);
      setCapabilities(result.capabilities);
      setStatus('ready');
      append('info', `Session ${result.sessionId} ready (${result.target}).`);
    } catch (cause) {
      setStatus('error');
      setError(cause instanceof Error ? cause.message : String(cause));
      append('error', `newSession failed: ${cause instanceof Error ? cause.message : String(cause)}`);
    }
  }, [append, target]);

  const handleSend = React.useCallback(async () => {
    if (sessionId === null) return;
    setError(null);
    setStatus('prompting');
    append('info', `prompt → ${JSON.stringify(promptText)}`);
    try {
      const result = await window.srgnt.devSessionPrompt(sessionId, promptText);
      setStatus('ready');
      append('info', `turn complete: stopReason=${result.stopReason}`);
    } catch (cause) {
      setStatus('error');
      setError(cause instanceof Error ? cause.message : String(cause));
      append('error', `prompt failed: ${cause instanceof Error ? cause.message : String(cause)}`);
    }
  }, [append, promptText, sessionId]);

  const handleCancel = React.useCallback(async () => {
    if (sessionId === null) return;
    append('info', 'cancel requested');
    try {
      await window.srgnt.devSessionCancel(sessionId);
      setStatus('ready');
    } catch (cause) {
      setStatus('error');
      setError(cause instanceof Error ? cause.message : String(cause));
      append('error', `cancel failed: ${cause instanceof Error ? cause.message : String(cause)}`);
    }
  }, [append, sessionId]);

  const handleDispose = React.useCallback(async () => {
    if (sessionId === null) return;
    try {
      await window.srgnt.devSessionDispose(sessionId);
      append('info', `session ${sessionId} disposed`);
      setSessionId(null);
      setCapabilities(null);
      setStatus('idle');
    } catch (cause) {
      // Keep the session handle so the user can retry; just surface the failure.
      setStatus('error');
      setError(cause instanceof Error ? cause.message : String(cause));
      append('error', `dispose failed: ${cause instanceof Error ? cause.message : String(cause)}`);
    }
  }, [append, sessionId]);

  const hasSession = sessionId !== null;

  return (
    <div
      data-testid="dev-console"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: 16,
        height: '100%',
        boxSizing: 'border-box',
        fontFamily: 'monospace',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <strong data-testid="dev-console-title">ACP Dev Console</strong>
        <label>
          Target:{' '}
          <select
            data-testid="dev-console-target"
            value={target}
            disabled={hasSession}
            onChange={(event) => setTarget(event.target.value as Target)}
          >
            <option value="mock">mock</option>
            <option value="pi">pi (real)</option>
          </select>
        </label>
        <button type="button" data-testid="dev-console-new" onClick={handleNewSession} disabled={hasSession || status === 'connecting'}>
          New Session
        </button>
        <button type="button" data-testid="dev-console-cancel" onClick={handleCancel} disabled={!hasSession}>
          Cancel
        </button>
        <button type="button" data-testid="dev-console-dispose" onClick={handleDispose} disabled={!hasSession}>
          Dispose
        </button>
        <span data-testid="dev-console-status">state: {status}{sessionId !== null ? ` · ${sessionId}` : ''}</span>
      </div>

      {error !== null && (
        <div data-testid="dev-console-error" style={{ color: '#c0392b' }}>
          {error}
        </div>
      )}

      {capabilities !== null && (
        <details data-testid="dev-console-capabilities">
          <summary>capabilities</summary>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(capabilities, null, 2)}</pre>
        </details>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <textarea
          data-testid="dev-console-prompt"
          value={promptText}
          onChange={(event) => setPromptText(event.target.value)}
          rows={2}
          style={{ flex: 1, fontFamily: 'monospace' }}
          placeholder="Raw prompt text"
        />
        <button
          type="button"
          data-testid="dev-console-send"
          onClick={handleSend}
          disabled={!hasSession || status === 'prompting'}
        >
          Send
        </button>
      </div>

      <div
        data-testid="dev-console-log"
        style={{
          flex: 1,
          overflow: 'auto',
          border: '1px solid #ccc',
          padding: 8,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          minHeight: 120,
        }}
      >
        {log.map((entry) => (
          <div key={entry.id} data-log-kind={entry.kind} style={{ color: entry.kind === 'error' ? '#c0392b' : entry.kind === 'info' ? '#2980b9' : 'inherit' }}>
            {entry.text}
          </div>
        ))}
      </div>
    </div>
  );
}
