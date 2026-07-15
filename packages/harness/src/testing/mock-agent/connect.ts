import {
  AgentSideConnection,
  type AnyMessage,
  type Stream as AcpStream,
} from '@agentclientprotocol/sdk';
import { Effect } from 'effect';
import {
  AcpAgentConnection,
  type ClientPorts,
  type ConnectOptions,
  type PermissionPort,
} from '../../acp/connection.js';
import { MockAgent, type RunnerHooks } from './runner.js';
import type { Scenario } from './scenario.js';

/**
 * In-process, message-level client↔agent pair (same pattern the STEP-22-01
 * `connection.test.ts` uses). Wires a {@link MockAgent} running `scenario` to a
 * live {@link AcpAgentConnection} without spawning a process — the fast path for
 * the scenario matrix. The stdio bin covers the byte-level/raw concerns
 * (`emit_malformed`) and real process death that a message-level pipe cannot
 * model faithfully.
 */

function messagePair(): { clientStream: AcpStream; agentStream: AcpStream } {
  const clientToAgent = new TransformStream<AnyMessage, AnyMessage>();
  const agentToClient = new TransformStream<AnyMessage, AnyMessage>();
  return {
    clientStream: { writable: clientToAgent.writable, readable: agentToClient.readable },
    agentStream: { writable: agentToClient.writable, readable: clientToAgent.readable },
  };
}

/** Auto-cancel permission port (used when a scenario has no permission directive). */
const cancelAllPermissions: PermissionPort = {
  requestPermission: () => Promise.resolve({ outcome: { outcome: 'cancelled' as const } }),
};

export interface ConnectMockOptions {
  /** Client-service ports exposed to the mock agent. Defaults to cancel-all permission. */
  readonly ports?: ClientPorts;
  /** Overrides forwarded to `AcpAgentConnection.connect` (e.g. capabilityOverrides). */
  readonly connect?: Partial<ConnectOptions>;
  /** Runner hook overrides; `onCrash` defaults to throwing (→ wrapper `TurnFailed`). */
  readonly hooks?: Partial<RunnerHooks>;
}

export interface ConnectedMock {
  readonly connection: AcpAgentConnection;
  readonly agent: MockAgent;
}

/** Connects a mock agent running `scenario` over an in-process message pipe. */
export async function connectMockAgent(
  scenario: Scenario,
  options: ConnectMockOptions = {},
): Promise<ConnectedMock> {
  const { clientStream, agentStream } = messagePair();
  const hooks: RunnerHooks = {
    onCrash: (exitCode) => {
      throw new Error(`mock-agent crash (exit ${exitCode})`);
    },
    ...options.hooks,
  };
  let agent: MockAgent | undefined;
  new AgentSideConnection((conn) => {
    agent = new MockAgent(conn, scenario, hooks);
    return agent;
  }, agentStream);

  const ports: ClientPorts = options.ports ?? { permission: cancelAllPermissions };
  const connection = await Effect.runPromise(
    AcpAgentConnection.connect({
      launch: { command: 'mock-agent', args: [], env: {} },
      spawn: () => ({ stream: clientStream }),
      ports,
      ...options.connect,
    }),
  );
  return { connection, agent: agent as MockAgent };
}
