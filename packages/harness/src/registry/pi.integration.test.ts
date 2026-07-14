import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import { AcpAgentConnection, childProcessSpawner, type PermissionPort } from '../acp/connection.js';
import { piDefinition } from './builtins.js';
import { effectiveCapabilities } from './registry.js';

/**
 * End-to-end check that the built-in Pi definition actually launches, completes
 * ACP `initialize`, and yields a capability payload.
 *
 * Gated behind `SRGNT_IT_PI=1` because it needs the real `pi` CLI on PATH and a
 * live `npx pi-acp` download — CI without pi installed skips it cleanly. Run
 * locally with:  `SRGNT_IT_PI=1 pnpm --filter @srgnt/harness test`
 *
 * STEP-22-05's adapter spike compares its captured payload against whatever this
 * test prints, so the console line below is intentional evidence, not debug noise.
 */
const RUN_PI_IT = process.env.SRGNT_IT_PI === '1';
const describePi = RUN_PI_IT ? describe : describe.skip;

// The adapter is fetched via `npx` on first run; allow a generous cold-cache budget.
const IT_TIMEOUT_MS = 120_000;

// Pi may ask for permission during initialize/session setup; auto-deny so the
// probe never blocks on human input.
const denyAllPermissions: PermissionPort = {
  requestPermission: () => Promise.resolve({ outcome: { outcome: 'cancelled' as const } }),
};

describePi('Pi definition (integration, SRGNT_IT_PI=1)', () => {
  it(
    'launches pi-acp, completes initialize, and captures negotiated capabilities',
    async () => {
      const connection = await Effect.runPromise(
        AcpAgentConnection.connect({
          launch: piDefinition.launch,
          spawn: childProcessSpawner,
          ports: { permission: denyAllPermissions },
        }),
      );

      const negotiated = connection.capabilities;
      const effective = effectiveCapabilities(piDefinition, negotiated);

      // eslint-disable-next-line no-console -- intentional evidence for STEP-22-05.
      console.log('[SRGNT_IT_PI] pi-acp negotiated capabilities:', JSON.stringify(negotiated, null, 2));

      expect(negotiated.protocolVersion).toBeGreaterThan(0);
      // The definition's mcp-passthrough-gaps override must clamp mcpServers off
      // in the effective view regardless of what the adapter advertised.
      expect(effective.mcpServers).toBe(false);

      connection.close();
    },
    IT_TIMEOUT_MS,
  );
});
