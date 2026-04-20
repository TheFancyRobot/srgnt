#!/usr/bin/env node
import type { CliResult, OutputFormat } from './output.js';
import { renderJson, renderText } from './output.js';
import {
  runInspect,
  runInstall,
  runList,
  runRemove,
  type CommandDeps,
} from './commands.js';
import {
  CliError,
  loadWorkspaceSettings,
  persistWorkspaceSettings,
  resolveCliWorkspaceRoot,
} from './workspace.js';

/**
 * `srgnt-connectors` CLI entrypoint. Five-line main that parses args, resolves
 * the workspace, dispatches to a command, and prints in text or JSON. All
 * heavy lifting lives in `commands.ts`; this file exists to keep tests focused
 * on pure functions without process.exit coupling.
 */

export interface ParsedArgs {
  command: 'install' | 'remove' | 'list' | 'inspect' | 'help';
  positional: string[];
  flags: Record<string, string | boolean>;
  format: OutputFormat;
  workspace?: string;
}

export function parseArgs(argv: readonly string[]): ParsedArgs {
  const rest = argv.slice();
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};
  let format: OutputFormat = 'text';
  let workspace: string | undefined;

  while (rest.length > 0) {
    const token = rest.shift()!;
    if (token === '--json') {
      format = 'json';
      continue;
    }
    if (token === '--text') {
      format = 'text';
      continue;
    }
    if (token === '--workspace') {
      const value = rest.shift();
      if (!value) throw new CliError('FLAG_MISSING_VALUE', '--workspace requires a value');
      workspace = value;
      continue;
    }
    if (token.startsWith('--workspace=')) {
      workspace = token.slice('--workspace='.length);
      continue;
    }
    if (token === '--connector-id' || token === '--expected-connector-id') {
      const value = rest.shift();
      if (!value) throw new CliError('FLAG_MISSING_VALUE', `${token} requires a value`);
      flags.expectedConnectorId = value;
      continue;
    }
    if (token.startsWith('--connector-id=')) {
      flags.expectedConnectorId = token.slice('--connector-id='.length);
      continue;
    }
    if (token.startsWith('--expected-connector-id=')) {
      flags.expectedConnectorId = token.slice('--expected-connector-id='.length);
      continue;
    }
    if (token === '--checksum' || token === '--expected-checksum') {
      const value = rest.shift();
      if (!value) throw new CliError('FLAG_MISSING_VALUE', `${token} requires a value`);
      flags.expectedChecksum = value;
      continue;
    }
    if (token.startsWith('--checksum=')) {
      flags.expectedChecksum = token.slice('--checksum='.length);
      continue;
    }
    if (token.startsWith('--expected-checksum=')) {
      flags.expectedChecksum = token.slice('--expected-checksum='.length);
      continue;
    }
    if (token === '-h' || token === '--help' || token === 'help') {
      positional.unshift('help');
      continue;
    }
    positional.push(token);
  }

  const command = (positional.shift() ?? 'help') as ParsedArgs['command'];
  if (command !== 'install' && command !== 'remove' && command !== 'list' && command !== 'inspect' && command !== 'help') {
    throw new CliError('UNKNOWN_COMMAND', `Unknown command: ${String(command)}`);
  }

  return { command, positional, flags, format, workspace };
}

export function renderHelp(): string {
  return [
    'srgnt-connectors — manage third-party connector packages from the CLI',
    '',
    'Usage:',
    '  srgnt-connectors install <package-url> [--connector-id <id>] [--checksum <sha256>] [--json]',
    '  srgnt-connectors remove  <package-id> [--json]',
    '  srgnt-connectors list    [--json]',
    '  srgnt-connectors inspect <package-id | connector-id> [--json]',
    '',
    'Global flags:',
    '  --workspace <path>   Use a specific workspace (default: $SRGNT_WORKSPACE or ~/srgnt-workspace)',
    '  --json               Emit machine-readable JSON output',
    '',
    'Notes:',
    '  - Installing only writes a durable package record. Activation happens',
    '    when the Electron desktop boots and loads the isolated runtime.',
    '  - Only https:// URLs (and localhost dev registries) are accepted.',
    '',
  ].join('\n');
}

export interface RunOptions {
  argv?: readonly string[];
  env?: NodeJS.ProcessEnv;
  homeDir?: string;
  stdout?: (message: string) => void;
  stderr?: (message: string) => void;
  fetch?: CommandDeps['fetch'];
  now?: () => string;
}

export async function runCli(options: RunOptions = {}): Promise<number> {
  const stdout = options.stdout ?? ((msg: string) => process.stdout.write(`${msg}\n`));
  const stderr = options.stderr ?? ((msg: string) => process.stderr.write(`${msg}\n`));
  const argv = options.argv ?? process.argv.slice(2);

  let parsed: ParsedArgs;
  try {
    parsed = parseArgs(argv);
  } catch (error) {
    const cliErr = error instanceof CliError ? error : new CliError('ARG_PARSE_FAILED', String(error));
    stderr(`error: ${cliErr.message}`);
    stderr(renderHelp());
    return 64; // EX_USAGE
  }

  if (parsed.command === 'help') {
    stdout(renderHelp());
    return 0;
  }

  let workspaceRoot: string;
  try {
    const resolved = await resolveCliWorkspaceRoot({
      explicit: parsed.workspace,
      env: options.env,
      homeDir: options.homeDir,
    });
    workspaceRoot = resolved.workspaceRoot;
  } catch (error) {
    const cliErr = error instanceof CliError ? error : new CliError('WORKSPACE_RESOLUTION_FAILED', String(error));
    stderr(`error: ${cliErr.message}`);
    return 66; // EX_NOINPUT
  }

  const deps: CommandDeps = {
    loadSettings: async () => loadWorkspaceSettings(workspaceRoot),
    persistSettings: async (next) => persistWorkspaceSettings(workspaceRoot, next),
    now: options.now ?? (() => new Date().toISOString()),
    fetch: options.fetch,
  };

  let result: CliResult | null = null;
  try {
    switch (parsed.command) {
      case 'install': {
        const url = parsed.positional[0];
        if (!url) {
          stderr('error: install requires a package URL');
          return 64;
        }
        result = await runInstall(deps, {
          packageUrl: url,
          expectedConnectorId: typeof parsed.flags.expectedConnectorId === 'string' ? parsed.flags.expectedConnectorId : undefined,
          expectedChecksum: typeof parsed.flags.expectedChecksum === 'string' ? parsed.flags.expectedChecksum : undefined,
        });
        break;
      }
      case 'remove': {
        const id = parsed.positional[0];
        if (!id) {
          stderr('error: remove requires a package id');
          return 64;
        }
        result = await runRemove(deps, { packageId: id });
        break;
      }
      case 'list': {
        result = await runList(deps);
        break;
      }
      case 'inspect': {
        const id = parsed.positional[0];
        if (!id) {
          stderr('error: inspect requires a package id or connector id');
          return 64;
        }
        result = await runInspect(deps, { packageId: id });
        break;
      }
    }
  } catch (error) {
    const cliErr = error instanceof CliError ? error : new CliError('COMMAND_FAILED', error instanceof Error ? error.message : String(error));
    stderr(`error: ${cliErr.message}`);
    return 70; // EX_SOFTWARE
  }

  if (!result) {
    stderr('error: command produced no result');
    return 70;
  }

  const rendered = parsed.format === 'json' ? renderJson(result) : renderText(result);
  if (
    result.kind === 'install-error' ||
    result.kind === 'remove-error' ||
    result.kind === 'inspect-error'
  ) {
    stderr(rendered);
    return 1;
  }
  stdout(rendered);
  return 0;
}

// Only auto-run when invoked directly, not when imported for tests.
// `require.main === module` is the canonical Node check and works under ts-node
// / cjs builds alike; this file compiles to CommonJS.
if (require.main === module) {
  runCli().then((code) => {
    process.exit(code);
  }, (error) => {
    process.stderr.write(`fatal: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(70);
  });
}
