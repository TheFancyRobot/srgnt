import React from 'react';

/**
 * Honest per-harness trust badge (PHASE-23, STEP-23-03).
 *
 * The STEP-22-05 spike measured it (DEC-0018, probe 1): pi-acp approves its own
 * tool use inside its own process and sends `session/request_permission` zero
 * times. srgnt's permission engine is therefore not in that loop at all, and the
 * user has to be told — a chat surface that looks identical for a gated agent
 * and an ungated one is the dishonest outcome this badge exists to prevent.
 *
 * Driven ONLY by declared quirks, never by harness id: Phase 25/26 add harnesses
 * whose definitions must light this up (or not) with zero changes here.
 */

/** Quirk that means: this harness does not route permissions through the client. */
const SELF_APPROVING_QUIRK = 'permission-routing-gaps';

export function TrustBadge({ quirks }: { readonly quirks: readonly string[] }): React.ReactElement | null {
  if (!quirks.includes(SELF_APPROVING_QUIRK)) return null;
  return (
    <span
      className="chat-trust-badge"
      data-testid="chat-trust-badge"
      // Informational, not a warning of *our* doing — the copy must not imply
      // srgnt is protecting the user here, because it cannot.
      title="This agent approves its own tool use inside its own process. srgnt cannot gate it, and no permission prompts will appear for this session."
    >
      Self-approving — srgnt cannot gate this agent&apos;s tool use
    </span>
  );
}
