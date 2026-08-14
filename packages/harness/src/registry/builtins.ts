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
  // `npx` is always present; the prerequisite the user must install is `pi`.
  detectCommand: 'pi',
  quirks: ['adapter-mediated', 'permission-routing-gaps', 'mcp-passthrough-gaps'],
  // The adapter cannot be trusted to forward injected MCP servers, so clamp the
  // protocol-baseline `mcpServers` capability off regardless of negotiation.
  capabilityOverrides: { mcpServers: false },
  docsUrl: 'https://github.com/mariozechner/pi',
};

/** Canonical id for the built-in opencode harness. */
export const OPENCODE_HARNESS_ID = 'opencode';

/**
 * opencode version every STEP-25-01 capture was measured against
 * (`opencode --version` → `1.18.18`, 2026-08-13). Unlike Pi's pinned adapter,
 * opencode is a user-installed binary, so srgnt cannot pin the launch — this
 * constant is documentation and test evidence, never a launch input.
 */
export const OPENCODE_TESTED_VERSION = '1.18.18';

/**
 * opencode speaks ACP **natively** (`opencode acp`), with no adapter in
 * between — the contrast that makes it the reality check on the ARCH-0009
 * data-not-code invariant.
 *
 * Deliberately zero quirks and zero overrides: capabilities come exclusively
 * from runtime observation (the live `initialize` response, plus fields the
 * protocol only reveals mid-session). Pi's quirks were pre-declared from
 * research; opencode earns any of its own only from a measured probe, because
 * an unearned clamp is the mirror image of a silent gap.
 */
export const opencodeDefinition: HarnessDefinition = {
  id: OPENCODE_HARNESS_ID,
  name: 'opencode',
  description:
    'opencode coding agent over its native ACP mode (`opencode acp`). Requires the `opencode` CLI on PATH — install with `npm i -g opencode-ai` or see the docs.',
  source: 'builtin',
  launch: {
    command: 'opencode',
    args: ['acp'],
    env: {},
  },
  quirks: [],
  capabilityOverrides: {},
  docsUrl: 'https://opencode.ai/docs/acp',
};

/** All harness definitions srgnt ships with. Keyed by id downstream. */
export const BUILTIN_HARNESSES: readonly HarnessDefinition[] = [piDefinition, opencodeDefinition];
