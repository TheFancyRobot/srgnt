/**
 * Shared ghostty-web runtime, extracted from `TerminalPanel.tsx` (PHASE-23,
 * STEP-23-02) so a chat tool card can embed terminal output without importing
 * the whole 583-line interactive panel — tabs, pty IPC, launch approvals and all.
 *
 * The WASM module is loaded once per renderer and shared by every surface; the
 * promise is memoized because `Ghostty.load` is expensive and re-entrant callers
 * (a panel plus several embedded cards) must not each pay for it.
 */

export type GhosttyModule = typeof import('ghostty-web');
export type GhosttyTerminal = InstanceType<GhosttyModule['Terminal']>;
export type GhosttyFitAddon = InstanceType<GhosttyModule['FitAddon']>;

export interface GhosttyRuntime {
  ghostty: InstanceType<GhosttyModule['Ghostty']>;
  Terminal: GhosttyModule['Terminal'];
  FitAddon: GhosttyModule['FitAddon'];
}

let ghosttyRuntimeReady: Promise<GhosttyRuntime> | null = null;

export function ensureGhosttyRuntime(): Promise<GhosttyRuntime> {
  if (!ghosttyRuntimeReady) {
    ghosttyRuntimeReady = Promise.all([
      import('ghostty-web'),
      import('ghostty-web/ghostty-vt.wasm?url'),
    ]).then(async ([ghosttyModule, ghosttyWasm]) => ({
      ghostty: await ghosttyModule.Ghostty.load(ghosttyWasm.default),
      Terminal: ghosttyModule.Terminal,
      FitAddon: ghosttyModule.FitAddon,
    }));
  }

  return ghosttyRuntimeReady;
}

/** srgnt's terminal palette. Shared so an embedded card matches the real panel. */
export const ghosttyTheme = {
  background: '#131318',
  foreground: '#e2e0db',
  cursor: '#b794f6',
  selectionBackground: '#2a2a34',
  black: '#0c0c10',
  brightBlack: '#3a3a46',
  red: '#ec8e84',
  brightRed: '#f0a49c',
  green: '#7bb88e',
  brightGreen: '#96cca5',
  yellow: '#e0b45e',
  brightYellow: '#e8c87a',
  blue: '#85acc6',
  brightBlue: '#9ec0d6',
  magenta: '#b794f6',
  brightMagenta: '#c4a5f8',
  cyan: '#00B7FF',
  brightCyan: '#5ccfff',
  white: '#e2e0db',
  brightWhite: '#f0efec',
} as const;

export const ghosttyFontFamily = "'JetBrains Mono', ui-monospace, 'SF Mono', 'Fira Code', monospace";

/**
 * Strips ANSI/VT control sequences. Used only by the non-ghostty fallback path:
 * when the WASM runtime is unavailable (jsdom under test, or a load failure) the
 * raw bytes still have to be readable rather than a wall of escape codes.
 */
// eslint-disable-next-line no-control-regex
const ANSI_PATTERN = /\u001B\[[0-9;?]*[ -\/]*[@-~]|\u001B\][\s\S]*?(?:\u0007|\u001B\\)|\u001B[@-Z\\-_]/g;

export function stripAnsi(text: string): string {
  // Bare CR (pty line rewrites) becomes a newline so a fallback <pre> does not
  // collapse overwritten lines on top of each other.
  return text.replace(ANSI_PATTERN, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}
