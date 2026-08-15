import React from 'react';
import type { AuthMethod, ChatAuthRequired } from '@srgnt/contracts';

/**
 * The auth wall, rendered as guidance (PHASE-25, STEP-25-03).
 *
 * When an agent answers `session/new` with ACP's auth-required error, the raw
 * JSON-RPC failure is the first thing a new user of that harness would see. This
 * panel replaces it with what the harness itself advertised: its login methods,
 * the command to run when one carries a command, its docs, and a Retry.
 *
 * Two rules it exists to keep:
 *
 * - **Branch on `kind`, never on a harness id or method name.** `kind` is
 *   normalized in main from the method's own metadata, so a harness added in
 *   Phase 26 gets the right affordance with no change here.
 * - **srgnt never collects credentials.** It links, instructs and retries.
 *   Harness auth belongs to the harness — there is deliberately no input field
 *   in this component, and there must never be one.
 */

function CommandLine({ command }: { readonly command: NonNullable<AuthMethod['command']> }): React.ReactElement {
  // Built from the method's own `command`/`args` — never a hardcoded login line
  // for a harness srgnt happens to know about.
  const line = [command.command, ...command.args].join(' ');
  return (
    <div className="chat-auth-command">
      <code className="chat-auth-command-text" data-testid="auth-command">
        {line}
      </code>
      <button
        type="button"
        className="chat-button"
        data-testid="auth-copy"
        onClick={() => void navigator.clipboard?.writeText(line)}
      >
        Copy
      </button>
    </div>
  );
}

function Method({
  method,
  onAuthenticate,
}: {
  readonly method: AuthMethod;
  readonly onAuthenticate: ((methodId: string) => void) | undefined;
}): React.ReactElement {
  return (
    <li className="chat-auth-method" data-testid="auth-method" data-kind={method.kind} data-method-id={method.id}>
      <span className="chat-auth-method-name">{method.name}</span>
      {method.description !== undefined && (
        <span className="chat-auth-method-description">{method.description}</span>
      )}
      {method.kind === 'external-command' && method.command !== undefined && (
        <>
          <span className="chat-auth-method-hint">Run this in your terminal, then retry:</span>
          <CommandLine command={method.command} />
        </>
      )}
      {method.kind === 'rpc-authenticate' && (
        <button
          type="button"
          className="chat-button chat-button-primary"
          data-testid="auth-authenticate"
          disabled={onAuthenticate === undefined}
          title={
            onAuthenticate === undefined
              ? 'This build cannot authenticate over the protocol. Restart srgnt, or update it if the problem persists.'
              : undefined
          }
          onClick={() => onAuthenticate?.(method.id)}
        >
          Authenticate with srgnt
        </button>
      )}
      {method.kind === 'docs-only' && (
        // The honest render for a method that carries no command: opencode's
        // login line exists only inside its own description, and inventing
        // `opencode auth login` here is exactly what the no-hardcoding rule
        // forbids. The description above IS the instruction.
        <span className="chat-auth-method-hint" data-testid="auth-docs-only">
          srgnt cannot run this login for you — this harness describes it in words rather than as a command. Follow the
          description above (or its docs), then retry.
        </span>
      )}
    </li>
  );
}

export function AuthPanel({
  auth,
  onRetry,
  onAuthenticate,
  onDismiss,
}: {
  readonly auth: ChatAuthRequired;
  /** Re-attempts session creation after the user authenticated elsewhere. */
  readonly onRetry: () => void;
  /** Retries with `authenticate(methodId)` first. Absent hides the RPC affordance. */
  readonly onAuthenticate?: (methodId: string) => void;
  readonly onDismiss: () => void;
}): React.ReactElement {
  return (
    <div className="chat-auth" role="alert" data-testid="chat-auth-panel" data-harness-id={auth.harnessId}>
      <div className="chat-auth-header">
        <span className="chat-auth-title">{auth.harnessName} needs you to sign in</span>
        <button type="button" className="chat-error-dismiss" onClick={onDismiss} aria-label="Dismiss">
          ✕
        </button>
      </div>
      <p className="chat-auth-body">
        The agent refused to start a session until it is authenticated. srgnt never asks for or stores your credentials —
        sign in with the harness itself, then retry.
      </p>

      {auth.authMethods.length === 0 ? (
        // An agent may demand auth and advertise no method at all. Saying so is
        // better than rendering an empty list that looks like a loading state.
        <p className="chat-auth-body" data-testid="auth-no-methods">
          This agent did not say how to authenticate. Check its documentation, sign in with its own CLI, then retry.
        </p>
      ) : (
        <ul className="chat-auth-methods">
          {auth.authMethods.map((method) => (
            <Method key={method.id} method={method} onAuthenticate={onAuthenticate} />
          ))}
        </ul>
      )}

      <div className="chat-auth-actions">
        <button type="button" className="chat-button chat-button-primary" data-testid="auth-retry" onClick={onRetry}>
          Retry
        </button>
        {auth.docsUrl !== undefined && (
          <button
            type="button"
            className="chat-button"
            data-testid="auth-docs"
            onClick={() => void window.srgnt.openExternal(auth.docsUrl as string)}
          >
            Docs
          </button>
        )}
      </div>

      {/* The agent's own words, kept: when the guidance above does not fit the
          failure, this is the only thing that can explain it. */}
      <p className="chat-auth-detail" data-testid="auth-detail">
        {auth.detail}
      </p>
    </div>
  );
}
