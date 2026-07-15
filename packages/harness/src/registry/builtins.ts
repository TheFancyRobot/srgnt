import type { HarnessDefinition } from '@srgnt/contracts';

/**
 * Built-in harness definitions ship with srgnt as *data* (ARCH-0009): the only
 * integration surface is ACP, and everything we know about a specific agent
 * lives in one of these records — never in protocol code.
 *
 * Pi is the first entry and the reference shape every later harness (opencode,
 * custom, registry imports in Phases 25/26) reuses.
 */

/**
 * Pinned `pi-acp` adapter version. Verified locally on 2026-07-13
 * (`npm view pi-acp version` → 0.0.31; `pi --version` → 0.80.6). STEP-22-05's
 * spike measures capabilities against exactly this version, so bumping it is a
 * deliberate, revalidated change — not an automatic `@latest`.
 */
export const PI_ACP_VERSION = '0.0.31';

/** Canonical id for the built-in Pi harness. */
export const PI_HARNESS_ID = 'pi';

/**
 * Pi speaks ACP only through the community `pi-acp` adapter (`npx pi-acp`),
 * which wraps the `pi` CLI. Because it is adapter-mediated rather than native,
 * three quirks are declared up front so the UI degrades *visibly* instead of
 * silently mis-behaving:
 *
 * - `adapter-mediated`     — not a native ACP agent; a shim translates.
 * - `permission-routing-gaps` — `session/request_permission` may not fully
 *   round-trip through the adapter.
 * - `mcp-passthrough-gaps` — MCP servers injected via `session/new` may not
 *   reach the underlying agent, so `mcpServers` is force-disabled below.
 *
 * These are the *documented starting assumptions* from the ACP-pivot research;
 * STEP-22-05's live spike confirms or refines them against the captured
 * `initialize` payload.
 */
export const piDefinition: HarnessDefinition = {
  id: PI_HARNESS_ID,
  name: 'Pi',
  description:
    'Pi coding agent via the community pi-acp ACP adapter (npx pi-acp). Requires the `pi` CLI on PATH — install with `npm i -g @mariozechner/pi`.',
  source: 'builtin',
  launch: {
    command: 'npx',
    args: [`pi-acp@${PI_ACP_VERSION}`],
    env: {},
  },
  quirks: ['adapter-mediated', 'permission-routing-gaps', 'mcp-passthrough-gaps'],
  // The adapter cannot be trusted to forward injected MCP servers, so clamp the
  // protocol-baseline `mcpServers` capability off regardless of negotiation.
  capabilityOverrides: { mcpServers: false },
  docsUrl: 'https://github.com/mariozechner/pi',
};

/** All harness definitions srgnt ships with. Keyed by id downstream. */
export const BUILTIN_HARNESSES: readonly HarnessDefinition[] = [piDefinition];
