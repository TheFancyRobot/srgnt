import React from 'react';

/**
 * The default-ask permission prompt (PHASE-23, STEP-23-03).
 *
 * The agent's turn is genuinely blocked on this — the main process is holding
 * the JSON-RPC response open — so the prompt shows what the user needs to judge
 * the request (tool kind, title, the paths or command it declared) and nothing
 * that could be mistaken for it. Option labels come from the *agent*; the `kind`
 * hint only groups them, so an unknown kind still renders as a working button
 * rather than disappearing.
 *
 * Concurrent requests queue: the agent may fire a second before the first is
 * answered, and each is answerable independently by `requestId`.
 */

export interface PendingPermission {
  readonly requestId: string;
  readonly kind: string;
  readonly title: string;
  readonly paths: readonly string[];
  readonly command?: string;
  readonly options: readonly { optionId: string; name: string; kind: string }[];
}

/** Allow options first — they are what the user is being asked to grant. */
function isAllow(optionKind: string): boolean {
  return optionKind.startsWith('allow');
}

function OptionButton({
  option,
  onChoose,
}: {
  readonly option: { optionId: string; name: string; kind: string };
  readonly onChoose: (optionId: string) => void;
}): React.ReactElement {
  const allow = isAllow(option.kind);
  return (
    <button
      type="button"
      className={`chat-button ${allow ? 'chat-button-primary' : ''}`}
      data-testid={`chat-permission-option-${option.optionId}`}
      data-option-kind={option.kind}
      onClick={() => onChoose(option.optionId)}
    >
      {option.name}
    </button>
  );
}

function PromptCard({
  request,
  onRespond,
}: {
  readonly request: PendingPermission;
  readonly onRespond: (requestId: string, optionId: string | undefined) => void;
}): React.ReactElement {
  const detail = request.command ?? (request.paths.length > 0 ? request.paths.join('\n') : null);
  return (
    <section
      className="chat-permission"
      // `alertdialog`, not `alert`: this is a blocking decision, and assistive
      // tech should announce it as something the user must answer.
      role="alertdialog"
      aria-labelledby={`chat-permission-title-${request.requestId}`}
      data-testid="chat-permission-prompt"
      data-request-id={request.requestId}
    >
      <div className="chat-permission-head">
        <span className="chat-permission-kind" data-testid="chat-permission-kind">
          {request.kind}
        </span>
        <span className="chat-permission-title" id={`chat-permission-title-${request.requestId}`}>
          {request.title}
        </span>
      </div>
      {detail !== null && (
        // Never markdown: the affected path is the security-relevant fact and
        // must not be restylable by whatever the agent put in it.
        <pre className="chat-permission-detail" data-testid="chat-permission-detail">
          {detail}
        </pre>
      )}
      <div className="chat-permission-actions">
        {[...request.options].sort((a, b) => Number(isAllow(b.kind)) - Number(isAllow(a.kind))).map((option) => (
          <OptionButton
            key={option.optionId}
            option={option}
            onChoose={(optionId) => onRespond(request.requestId, optionId)}
          />
        ))}
        <button
          type="button"
          className="chat-button chat-permission-cancel"
          data-testid="chat-permission-cancel"
          onClick={() => onRespond(request.requestId, undefined)}
        >
          Cancel
        </button>
      </div>
    </section>
  );
}

export function PermissionPrompt({
  requests,
  onRespond,
}: {
  readonly requests: readonly PendingPermission[];
  readonly onRespond: (requestId: string, optionId: string | undefined) => void;
}): React.ReactElement | null {
  if (requests.length === 0) return null;
  return (
    <div className="chat-permissions" data-testid="chat-permissions">
      {requests.map((request) => (
        <PromptCard key={request.requestId} request={request} onRespond={onRespond} />
      ))}
    </div>
  );
}
