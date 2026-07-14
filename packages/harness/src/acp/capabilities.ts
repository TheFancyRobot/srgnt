import type { InitializeResponse } from '@agentclientprotocol/sdk';
import type { HarnessCapabilityOverrides } from '@srgnt/contracts';

/**
 * Normalized view of what one connected agent can do, derived from the live
 * `initialize` response. This is the capability model the harness registry
 * (STEP-22-03) layers `HarnessCapabilityOverrides` on top of: absent override
 * fields mean "trust the negotiated value"; booleans force on/off.
 */
export interface NegotiatedCapabilities {
  /** Protocol version the agent settled on. */
  readonly protocolVersion: number;
  /** Agent implementation info advertised during initialize, when present. */
  readonly agentName?: string;
  readonly agentVersion?: string;
  /** `session/load` replay support. */
  readonly loadSession: boolean;
  /** `session/resume` (continue without replay) support. */
  readonly resumeSession: boolean;
  /**
   * Session modes. Not advertised at initialize time — agents reveal modes via
   * `session/new`'s `modes` field — so the negotiated default is false until a
   * definition override or session response says otherwise.
   */
  readonly modes: boolean;
  /**
   * Slash commands. Discovered per-session via `available_commands_update`
   * notifications, so the negotiated default is false (override to force).
   */
  readonly slashCommands: boolean;
  /** Prompt may contain image content blocks. */
  readonly images: boolean;
  /** Prompt may contain audio content blocks. */
  readonly audio: boolean;
  /** Prompt may contain embedded resource context blocks. */
  readonly embeddedContext: boolean;
  /**
   * MCP server injection via `session/new`. Stdio MCP servers are protocol
   * baseline, so this defaults to true; overrides (e.g. the pi-acp
   * `mcp-passthrough-gaps` quirk) force it off.
   */
  readonly mcpServers: boolean;
  /** HTTP-transport MCP servers accepted. */
  readonly mcpHttp: boolean;
  /** SSE-transport MCP servers accepted. */
  readonly mcpSse: boolean;
}

/** `{}` means supported; `null`/`undefined` mean unsupported (ACP convention). */
const advertised = (value: unknown): boolean => value !== null && value !== undefined;

/** Derives the normalized capability model from a live `initialize` response. */
export function negotiateCapabilities(init: InitializeResponse): NegotiatedCapabilities {
  const agent = init.agentCapabilities ?? {};
  const prompt = agent.promptCapabilities ?? {};
  const mcp = agent.mcpCapabilities ?? {};
  const session = agent.sessionCapabilities ?? {};
  return {
    protocolVersion: init.protocolVersion,
    ...(init.agentInfo ? { agentName: init.agentInfo.name, agentVersion: init.agentInfo.version } : {}),
    loadSession: agent.loadSession === true,
    resumeSession: advertised(session.resume),
    modes: false,
    slashCommands: false,
    images: prompt.image === true,
    audio: prompt.audio === true,
    embeddedContext: prompt.embeddedContext === true,
    mcpServers: true,
    mcpHttp: mcp.http === true,
    mcpSse: mcp.sse === true,
  };
}

/**
 * Applies per-definition overrides (contracts `HarnessCapabilityOverrides`) on
 * top of negotiated capabilities. Absent fields trust negotiation; booleans win.
 */
export function applyCapabilityOverrides(
  negotiated: NegotiatedCapabilities,
  overrides: HarnessCapabilityOverrides,
): NegotiatedCapabilities {
  return {
    ...negotiated,
    loadSession: overrides.loadSession ?? negotiated.loadSession,
    resumeSession: overrides.resumeSession ?? negotiated.resumeSession,
    modes: overrides.modes ?? negotiated.modes,
    slashCommands: overrides.slashCommands ?? negotiated.slashCommands,
    images: overrides.images ?? negotiated.images,
    mcpServers: overrides.mcpServers ?? negotiated.mcpServers,
  };
}
