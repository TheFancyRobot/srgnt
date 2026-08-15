/**
 * @vitest-environment node
 *
 * Service/IPC-boundary tests, deliberately NOT routed through the renderer:
 * the canonicalization, the abort-on-load-failure rule and the secret rejection
 * exist precisely because a scripted IPC caller (or a future second settings
 * surface) is as real as the UI. A test that drives the UI proves nothing about
 * them.
 */
import { createHash } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ipcChannels,
  type HarnessDefinition,
  type HarnessCapabilitiesResponse,
  type HarnessDetection,
  type HarnessListResponse,
  type HarnessMutationResponse,
  type HarnessesFile,
} from '@srgnt/contracts';

const { handlers, mockHandle } = vi.hoisted(() => {
  const handlers = new Map<string, (event: unknown, payload: unknown) => unknown>();
  const mockHandle = vi.fn((channel: string, handler: (event: unknown, payload: unknown) => unknown) => {
    handlers.set(channel, handler);
  });
  return { handlers, mockHandle };
});

vi.mock('electron', () => ({ ipcMain: { handle: mockHandle } }));

import { createHarnessesService } from './harnesses.js';

let workspaceRoot = '';
let currentRoot = '';

const harnessesJson = (): string => path.join(workspaceRoot, 'harnesses.json');

function invoke<T>(channel: string, payload?: unknown): Promise<T> {
  const handler = handlers.get(channel);
  if (handler === undefined) throw new Error(`No handler for ${channel}`);
  return Promise.resolve(handler({}, payload)) as Promise<T>;
}

/** Injected probe: no real process is ever spawned in these tests. */
const probes: string[] = [];
const detect = async (definition: HarnessDefinition): Promise<HarnessDetection> => {
  const command = definition.detectCommand || definition.launch.command;
  probes.push(command);
  return command === 'missing'
    ? { status: 'not-installed', command }
    : { status: 'ok', command, version: '1.0.0' };
};

function service() {
  const created = createHarnessesService({
    getWorkspaceRoot: () => currentRoot,
    detect,
    loadHarness: () => import('@srgnt/harness'),
  });
  created.registerIpcHandlers();
  return created;
}

const readFile = async (): Promise<HarnessesFile> => JSON.parse(await fs.readFile(harnessesJson(), 'utf8'));
const writeFile = (value: unknown): Promise<void> =>
  fs.writeFile(harnessesJson(), typeof value === 'string' ? value : JSON.stringify(value), 'utf8');
const hashFile = async (): Promise<string> =>
  createHash('sha256').update(await fs.readFile(harnessesJson())).digest('hex');

/** The built-in Pi record, the base every `pi` save is canonicalized against. */
async function builtinPi(): Promise<HarnessDefinition> {
  const { piDefinition } = await import('@srgnt/harness');
  return piDefinition;
}

const save = (harnessId: string, definition: unknown): Promise<HarnessMutationResponse> =>
  invoke(ipcChannels.harnessSaveOverride, { harnessId, definition });
const reset = (harnessId: string): Promise<HarnessMutationResponse> =>
  invoke(ipcChannels.harnessResetOverride, { harnessId });
const list = (refresh = false): Promise<HarnessListResponse> => invoke(ipcChannels.harnessList, { refresh });

const entryFor = (response: HarnessListResponse, id: string) =>
  response.harnesses.find((entry) => entry.definition.id === id);

beforeEach(async () => {
  handlers.clear();
  mockHandle.mockClear();
  probes.length = 0;
  workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'srgnt-harnesses-svc-'));
  currentRoot = workspaceRoot;
});

afterEach(async () => {
  await fs.rm(workspaceRoot, { recursive: true, force: true });
});

describe('createHarnessesService', () => {
  it('registers every harness channel', () => {
    service();
    expect([...handlers.keys()].sort()).toEqual(
      [
        ipcChannels.harnessList,
        ipcChannels.harnessSaveOverride,
        ipcChannels.harnessResetOverride,
        ipcChannels.harnessCapabilities,
      ].sort(),
    );
  });

  it('lists built-ins with detection when the workspace has no harnesses.json', async () => {
    service();
    const response = await list();
    expect(response.workspaceLoad).toEqual({ ok: true });
    expect(response.harnesses.map((entry) => entry.definition.id)).toEqual(['pi', 'opencode']);
    // Pi launches `npx` but its prerequisite is `pi` — detection follows the
    // definition's own `detectCommand`.
    expect(entryFor(response, 'pi')?.detection).toEqual({ status: 'ok', command: 'pi', version: '1.0.0' });
    expect(response.harnesses.every((entry) => !entry.overridden)).toBe(true);
  });

  it('caches probes per command and re-probes on refresh', async () => {
    service();
    await list();
    await list();
    expect(probes).toEqual(['pi', 'opencode']);
    await list(true);
    expect(probes).toEqual(['pi', 'opencode', 'pi', 'opencode']);
  });
});

describe('save-override', () => {
  it('writes the override, badges it, and keeps every untouched field byte-identical', async () => {
    service();
    const pi = await builtinPi();
    const result = await save('pi', { ...pi, launch: { ...pi.launch, command: '/opt/bin/npx' } });
    expect(result).toEqual({ ok: true });

    const stored = (await readFile()).harnesses[0] as HarnessDefinition;
    expect(stored.launch.command).toBe('/opt/bin/npx');
    // The registry replaces a shadowed built-in WHOLESALE, so anything the
    // editor did not carry has to survive the round-trip or it is a deletion.
    expect(stored.quirks).toEqual(pi.quirks);
    expect(stored.capabilityOverrides).toEqual(pi.capabilityOverrides);
    expect(stored.detectCommand).toBe(pi.detectCommand);
    expect(stored.source).toBe('builtin');
    expect(stored.docsUrl).toBe(pi.docsUrl);

    const response = await list();
    expect(entryFor(response, 'pi')?.overridden).toBe(true);
    expect(entryFor(response, 'pi')?.definition.launch.command).toBe('/opt/bin/npx');
  });

  // POSIX-only: Windows does not map `stat().mode` onto POSIX permission bits,
  // and the desktop suite also runs on the windows-latest lane in
  // desktop-release.yml. The guarantee itself is unconditional; only the way to
  // observe it is platform-specific.
  it.skipIf(process.platform === 'win32')('writes harnesses.json owner-only (0600)', async () => {
    service();
    const pi = await builtinPi();
    await save('pi', { ...pi, launch: { ...pi.launch, command: '/opt/bin/npx' } });
    expect((await fs.stat(harnessesJson())).mode & 0o777).toBe(0o600);
  });

  it('canonicalizes a duplicate custom id against the LAST entry, and replaces only that one', async () => {
    // `HarnessRegistry.create` is last-write-wins, so with a hand-edited file
    // carrying the same id twice the last entry is what the registry resolves
    // and what the UI rendered. Basing on the first would revert protected
    // fields the user's command edit never mentioned.
    const shadowed = {
      id: 'inhouse',
      name: 'Old name',
      source: 'custom',
      launch: { command: 'old', args: [], env: {} },
      quirks: [],
      capabilityOverrides: {},
    };
    const effective = {
      ...shadowed,
      name: 'Real name',
      capabilityOverrides: { mcpServers: false },
      launch: { command: 'real', args: ['serve'], env: {} },
    };
    await writeFile({ version: 1, harnesses: [shadowed, effective] });
    service();

    await save('inhouse', { ...effective, launch: { ...effective.launch, command: '/opt/bin/real' } });

    const { harnesses } = await readFile();
    expect(harnesses).toHaveLength(2);
    // The shadowed entry is inert but still the user's data: untouched.
    expect(harnesses[0]).toMatchObject({ name: 'Old name', launch: { command: 'old' } });
    // The effective entry keeps its own protected fields, not the first one's.
    expect(harnesses[1]).toMatchObject({
      name: 'Real name',
      capabilityOverrides: { mcpServers: false },
      launch: { command: '/opt/bin/real', args: ['serve'] },
    });
  });

  it('takes ONLY the allowlisted fields from a complete-but-tampered payload', async () => {
    service();
    const pi = await builtinPi();
    // Schema-valid and complete — and lying about everything that matters.
    await save('pi', {
      ...pi,
      name: 'Definitely Pi',
      docsUrl: 'https://evil.example',
      source: 'custom',
      quirks: [],
      capabilityOverrides: { mcpServers: true },
      launch: { ...pi.launch, command: '/opt/bin/npx' },
      detectCommand: '/opt/bin/pi',
    });

    const stored = (await readFile()).harnesses[0] as HarnessDefinition;
    // Only the two editable fields landed...
    expect(stored.launch.command).toBe('/opt/bin/npx');
    expect(stored.detectCommand).toBe('/opt/bin/pi');
    // ...everything else is re-derived from the built-in base.
    expect(stored.name).toBe(pi.name);
    expect(stored.docsUrl).toBe(pi.docsUrl);
    expect(stored.source).toBe('builtin');
    expect(stored.quirks).toEqual(pi.quirks);
    expect(stored.capabilityOverrides).toEqual({ mcpServers: false });

    // The clamp still holds where it is actually consumed.
    const { HarnessRegistry, effectiveCapabilities } = await import('@srgnt/harness');
    const registry = HarnessRegistry.create({ workspace: await readFile() });
    expect(
      effectiveCapabilities(registry.require('pi'), { mcpServers: true } as never).mcpServers,
    ).toBe(false);
  });

  it('rejects a payload whose id does not match the target, writing nothing', async () => {
    service();
    const pi = await builtinPi();
    const result = await save('pi', { ...pi, id: 'opencode' });
    expect(result).toMatchObject({ ok: false });
    expect((result as { error: string }).error).toMatch(/targets "pi" but carries a definition for "opencode"/);
    await expect(fs.stat(harnessesJson())).rejects.toThrow();
  });

  it('refuses to invent a built-in for an id that has none', async () => {
    service();
    const pi = await builtinPi();
    const result = await save('ghost', { ...pi, id: 'ghost', source: 'builtin' });
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/no harness "ghost"/i) });
  });

  it('clears detectCommand as ABSENT rather than an empty string', async () => {
    service();
    const pi = await builtinPi();
    const { detectCommand: _cleared, ...withoutDetect } = pi;
    await save('pi', { ...withoutDetect, launch: { ...pi.launch, command: 'missing' } });
    const stored = (await readFile()).harnesses[0] as HarnessDefinition;
    expect('detectCommand' in stored).toBe(false);
    // Detection now follows the launch command, which is the point of clearing it.
    expect(entryFor(await list(), 'pi')?.detection).toEqual({ status: 'not-installed', command: 'missing' });
  });

  it('edits a CUSTOM entry against itself as the base', async () => {
    const custom: HarnessDefinition = {
      id: 'inhouse',
      name: 'In-house agent',
      source: 'custom',
      launch: { command: 'inhouse-acp', args: ['--acp'], env: {} },
      quirks: ['adapter-mediated'],
      capabilityOverrides: { images: false },
    };
    await writeFile({ version: 1, harnesses: [custom] });
    service();

    await save('inhouse', { ...custom, quirks: [], launch: { ...custom.launch, command: '/opt/inhouse' } });
    const stored = (await readFile()).harnesses[0] as HarnessDefinition;
    expect(stored.launch.command).toBe('/opt/inhouse');
    expect(stored.quirks).toEqual(['adapter-mediated']);
    expect(stored.capabilityOverrides).toEqual({ images: false });
  });
});

describe('secret handling', () => {
  const withEnv = async (env: Record<string, string>): Promise<HarnessDefinition> => {
    const pi = await builtinPi();
    return { ...pi, launch: { ...pi.launch, env } };
  };

  it('refuses a literal value on a sensitive key and leaves the file alone', async () => {
    service();
    for (const key of ['OPENAI_API_KEY', 'GITHUB_TOKEN', 'MY_SECRET', 'DB_PASSWORD', 'SESSION_ID']) {
      const result = await save('pi', await withEnv({ [key]: 'sk-live-1234' }));
      expect(result).toMatchObject({ ok: false });
      expect((result as { error: string }).error).toContain(key);
      expect((result as { error: string }).error).toContain('${env:');
    }
    await expect(fs.stat(harnessesJson())).rejects.toThrow();
  });

  it('refuses a secret passed through launch args, in either argv form', async () => {
    // `canonicalize` copies argv verbatim, and the threat model here is a
    // scripted IPC caller — so scanning only the env left the one rule that
    // exists to keep secrets off disk trivially bypassable.
    service();
    const pi = await builtinPi();
    const withArgs = (args: string[]): HarnessDefinition => ({ ...pi, launch: { ...pi.launch, args } });

    for (const args of [
      ['--api-key', 'sk-live-1234'],
      ['--api-key=sk-live-1234'],
      ['serve', '--auth-token', 'ghp_abc123'],
      ['--password=hunter2'],
    ]) {
      const result = await save('pi', withArgs(args));
      expect(result).toMatchObject({ ok: false });
      expect((result as { error: string }).error).toMatch(/secret/i);
    }
    await expect(fs.stat(harnessesJson())).rejects.toThrow();
  });

  it('allows ordinary args and a flag whose value is another flag', async () => {
    service();
    const pi = await builtinPi();
    // `--key` immediately followed by another option is a boolean flag, not a
    // secret being passed; refusing it would block legitimate launch specs.
    const result = await save('pi', {
      ...pi,
      launch: { ...pi.launch, args: ['acp', '--verbose', '--keyring', '--stdio'] },
    });
    expect(result).toEqual({ ok: true });
  });

  it('lets a sensitive key be cleared to an empty value', async () => {
    // Refusing '' would leave someone who pasted a secret unable to remove it
    // through the editor that accepted it.
    service();
    const result = await save('pi', await withEnv({ GITHUB_TOKEN: '' }));
    expect(result).toEqual({ ok: true });
  });

  it('stores a ${env:…} reference literally and resolves it only at spawn', async () => {
    const harnesses = service();
    const result = await save('pi', await withEnv({ GITHUB_TOKEN: '${env:MY_TOKEN}' }));
    expect(result).toEqual({ ok: true });

    // The secret itself never reaches the file.
    const raw = await fs.readFile(harnessesJson(), 'utf8');
    expect(raw).toContain('${env:MY_TOKEN}');
    expect(raw).not.toContain('resolved-secret');
    // Nor the renderer's view of it.
    expect(entryFor(await list(), 'pi')?.definition.launch.env).toEqual({ GITHUB_TOKEN: '${env:MY_TOKEN}' });

    process.env.MY_TOKEN = 'resolved-secret';
    try {
      const spawnable = await harnesses.resolveDefinition('pi');
      expect(spawnable?.launch.env).toEqual({ GITHUB_TOKEN: 'resolved-secret' });
    } finally {
      delete process.env.MY_TOKEN;
    }
  });

  it('fails the spawn readably when the referenced variable is absent', async () => {
    const harnesses = service();
    await save('pi', await withEnv({ GITHUB_TOKEN: '${env:MISSING_TOKEN}' }));
    // Passing `${env:MISSING_TOKEN}` through verbatim would fail somewhere far
    // from the cause — usually as an unexplained agent auth error.
    await expect(harnesses.resolveDefinition('pi')).rejects.toThrow(/MISSING_TOKEN is not set/);
  });

  it('leaves non-sensitive literals alone', async () => {
    const harnesses = service();
    expect(await save('pi', await withEnv({ PI_LOG_LEVEL: 'debug' }))).toEqual({ ok: true });
    expect((await harnesses.resolveDefinition('pi'))?.launch.env).toEqual({ PI_LOG_LEVEL: 'debug' });
  });
});

describe('an unreadable harnesses.json', () => {
  const BROKEN = '{ "version": 1, "harnesses": [ { "id": "inhouse", "name": 42 } ] }';

  it('is reported by list, distinct from an empty workspace, with built-ins still usable', async () => {
    await writeFile(BROKEN);
    service();
    const response = await list();
    expect(response.workspaceLoad).toMatchObject({ ok: false });
    expect((response.workspaceLoad as { error: string }).error).toContain('harnesses.json');
    expect(response.harnesses.map((entry) => entry.definition.id)).toEqual(['pi', 'opencode']);
  });

  it('is NEVER overwritten by a save or a reset', async () => {
    await writeFile(BROKEN);
    service();
    const before = await hashFile();
    const pi = await builtinPi();

    const saved = await save('pi', { ...pi, launch: { ...pi.launch, command: '/opt/bin/npx' } });
    expect(saved).toMatchObject({ ok: false, error: expect.stringContaining('harnesses.json') });
    const wasReset = await reset('pi');
    expect(wasReset).toMatchObject({ ok: false, error: expect.stringContaining('harnesses.json') });

    // Byte-identical, custom entry intact, and no scratch file left behind.
    expect(await hashFile()).toBe(before);
    expect(await fs.readFile(harnessesJson(), 'utf8')).toContain('inhouse');
    expect(await fs.readdir(workspaceRoot)).toEqual(['harnesses.json']);
  });

  it('recovers on the next call once the file is repaired, preserving custom entries', async () => {
    await writeFile(BROKEN);
    service();
    expect(await list().then((response) => response.workspaceLoad)).toMatchObject({ ok: false });

    const custom: HarnessDefinition = {
      id: 'inhouse',
      name: 'In-house agent',
      source: 'custom',
      launch: { command: 'inhouse-acp', args: [], env: {} },
      quirks: [],
      capabilityOverrides: {},
    };
    await writeFile({ version: 1, harnesses: [custom] });

    const pi = await builtinPi();
    expect(await save('pi', { ...pi, launch: { ...pi.launch, command: '/opt/bin/npx' } })).toEqual({ ok: true });
    const stored = await readFile();
    expect(stored.harnesses.map((entry) => entry.id)).toEqual(['inhouse', 'pi']);
  });

  it('is not what a MISSING file means — that one may be created', async () => {
    service();
    const pi = await builtinPi();
    expect(await save('pi', { ...pi, launch: { ...pi.launch, command: '/opt/bin/npx' } })).toEqual({ ok: true });
  });
});

describe('reset-override', () => {
  it('removes the entry and returns a built-in to its shipped definition', async () => {
    const harnesses = service();
    const pi = await builtinPi();
    await save('pi', { ...pi, launch: { ...pi.launch, command: '/opt/bin/npx' } });

    expect(await reset('pi')).toEqual({ ok: true });
    expect((await readFile()).harnesses).toEqual([]);
    expect((await harnesses.resolveDefinition('pi'))?.launch.command).toBe(pi.launch.command);
    expect(entryFor(await list(), 'pi')?.overridden).toBe(false);
  });

  it('removes a custom harness from the registry entirely', async () => {
    const custom: HarnessDefinition = {
      id: 'inhouse',
      name: 'In-house agent',
      source: 'custom',
      launch: { command: 'inhouse-acp', args: [], env: {} },
      quirks: [],
      capabilityOverrides: {},
    };
    await writeFile({ version: 1, harnesses: [custom] });
    const harnesses = service();
    expect(await harnesses.resolveDefinition('inhouse')).toBeDefined();

    expect(await reset('inhouse')).toEqual({ ok: true });
    expect(await harnesses.resolveDefinition('inhouse')).toBeUndefined();
  });

  it('is a no-op for an id with no workspace entry', async () => {
    service();
    expect(await reset('pi')).toEqual({ ok: true });
    await expect(fs.stat(harnessesJson())).rejects.toThrow();
  });
});

describe('concurrency and re-rooting', () => {
  it('serializes saves so two edits to different harnesses both land', async () => {
    service();
    const pi = await builtinPi();
    const { opencodeDefinition } = await import('@srgnt/harness');

    // Fired together: with atomic rename alone both would read the pre-mutation
    // file and the last rename would silently drop the other's entry.
    const [first, second] = await Promise.all([
      save('pi', { ...pi, launch: { ...pi.launch, command: '/opt/bin/npx' } }),
      save('opencode', {
        ...opencodeDefinition,
        launch: { ...opencodeDefinition.launch, command: '/opt/bin/opencode' },
      }),
    ]);
    expect(first).toEqual({ ok: true });
    expect(second).toEqual({ ok: true });

    const stored = await readFile();
    expect(stored.harnesses.map((entry) => [entry.id, entry.launch.command])).toEqual(
      expect.arrayContaining([
        ['pi', '/opt/bin/npx'],
        ['opencode', '/opt/bin/opencode'],
      ]),
    );
  });

  it('reads the new root after the workspace changes, not the old one', async () => {
    const harnesses = service();
    const pi = await builtinPi();
    await save('pi', { ...pi, launch: { ...pi.launch, command: '/opt/bin/npx' } });
    expect((await harnesses.resolveDefinition('pi'))?.launch.command).toBe('/opt/bin/npx');

    const otherRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'srgnt-harnesses-other-'));
    try {
      currentRoot = otherRoot;
      harnesses.setWorkspaceRoot(otherRoot);
      expect((await harnesses.resolveDefinition('pi'))?.launch.command).toBe(pi.launch.command);
      expect((await list()).harnesses.every((entry) => !entry.overridden)).toBe(true);
      // ...and the workspace we left is untouched.
      currentRoot = workspaceRoot;
      expect((await readFile()).harnesses[0]?.launch.command).toBe('/opt/bin/npx');
    } finally {
      await fs.rm(otherRoot, { recursive: true, force: true });
    }
  });

  it('refuses to read or write before a workspace root exists', async () => {
    currentRoot = '';
    service();
    const pi = await builtinPi();
    await expect(save('pi', pi)).rejects.toThrow(/No workspace root/);
    // Listing still answers: built-ins exist without a workspace.
    expect((await list()).harnesses).toHaveLength(2);
  });

  it('returns undefined for an id the registry does not know', async () => {
    const harnesses = service();
    expect(await harnesses.resolveDefinition('deleted-harness')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// The point of all of the above: what the NEXT session spawns (STEP-25-02).
// ---------------------------------------------------------------------------

describe('an override reaching the spawn', () => {
  it('launches the overridden command and env, and the built-in again after a reset', async () => {
    const harnesses = service();
    const pi = await builtinPi();
    const { resolveConnectDefinition } = await import('../chat/session-controller.js');
    const connectOptions = { resolveDefinition: (id: string) => harnesses.resolveDefinition(id) };

    // Baseline: the built-in launch spec.
    expect((await resolveConnectDefinition('pi', connectOptions, pi))?.launch.command).toBe(pi.launch.command);

    process.env.MY_TOKEN = 'resolved-secret';
    try {
      await save('pi', {
        ...pi,
        launch: { ...pi.launch, command: '/fake/bin/agent-a', env: { PI_LOG_LEVEL: 'debug', GITHUB_TOKEN: '${env:MY_TOKEN}' } },
      });

      const spawned = await resolveConnectDefinition('pi', connectOptions, pi);
      expect(spawned?.launch.command).toBe('/fake/bin/agent-a');
      // Env references resolve on the way to the process, never on disk.
      expect(spawned?.launch.env).toEqual({ PI_LOG_LEVEL: 'debug', GITHUB_TOKEN: 'resolved-secret' });
      // The clamp the definition carries survives the override, so capability
      // safety is not quietly traded away for a binary path.
      expect(spawned?.capabilityOverrides).toEqual({ mcpServers: false });

      await reset('pi');
      const afterReset = await resolveConnectDefinition('pi', connectOptions, pi);
      expect(afterReset?.launch.command).toBe(pi.launch.command);
      expect(afterReset?.launch.env).toEqual(pi.launch.env);
    } finally {
      delete process.env.MY_TOKEN;
    }
  });

  it('never resolves a definition for the mock, and refuses an unconfigured id', async () => {
    const harnesses = service();
    const pi = await builtinPi();
    const { resolveConnectDefinition } = await import('../chat/session-controller.js');
    const connectOptions = { resolveDefinition: (id: string) => harnesses.resolveDefinition(id) };

    expect(await resolveConnectDefinition('mock', connectOptions, pi)).toBeUndefined();
    await expect(resolveConnectDefinition('deleted-harness', connectOptions, pi)).rejects.toThrow(
      /No harness "deleted-harness" is configured/,
    );
  });
});

/**
 * The capability matrix's data (STEP-25-03). Written against the file the cache
 * actually produces, because the point of the channel is that rows describe
 * *measurements*, not the definitions the settings list already shows.
 */
describe('harness:capabilities', () => {
  const capabilities = (): Promise<HarnessCapabilitiesResponse> => invoke(ipcChannels.harnessCapabilities);
  const rowFor = (response: HarnessCapabilitiesResponse, id: string) =>
    response.entries.find((entry) => entry.harnessId === id);

  /** Writes a cache entry the way a real connect would, fingerprint included. */
  const writeCache = async (entries: Record<string, unknown>): Promise<void> =>
    fs.writeFile(
      path.join(workspaceRoot, 'harness-capabilities.json'),
      JSON.stringify({ version: 1, entries }),
      'utf8',
    );

  const piEntry = async (overrides: Record<string, unknown> = {}) => {
    const { harnessDefinitionFingerprint } = await import('@srgnt/runtime');
    return {
      negotiated: {
        loadSession: true,
        mcpServers: true,
        modes: false,
        slashCommands: false,
        authMethods: [
          {
            id: 'pi_terminal_login',
            name: 'Launch pi in the terminal',
            type: 'terminal',
            args: ['--terminal-login'],
            env: {},
          },
        ],
      },
      effective: { loadSession: true, mcpServers: false, modes: false, slashCommands: false },
      agentVersion: '0.0.31',
      capturedAt: '2026-08-15T09:00:00.000Z',
      definitionFingerprint: harnessDefinitionFingerprint(await builtinPi()),
      ...overrides,
    };
  };

  it('renders every registry harness, measured or not', async () => {
    service();
    await writeCache({ pi: await piEntry() });
    const response = await capabilities();

    expect(response.entries.map((entry) => entry.harnessId)).toEqual(['pi', 'opencode']);
    expect(rowFor(response, 'pi')?.state).toBe('measured');
    // Never connected: honestly unmeasured, NOT a wall of "no".
    const opencode = rowFor(response, 'opencode');
    expect(opencode?.state).toBe('not-yet-measured');
    expect(opencode?.negotiated).toEqual({});
    expect(opencode?.authMethods).toEqual([]);
  });

  it('passes the cache fields through unchanged and names the harness from its definition', async () => {
    service();
    const entry = await piEntry();
    await writeCache({ pi: entry });
    const row = rowFor(await capabilities(), 'pi');

    expect(row?.negotiated).toEqual(entry.negotiated);
    expect(row?.effective).toEqual(entry.effective);
    expect(row?.agentVersion).toBe('0.0.31');
    expect(row?.capturedAt).toBe('2026-08-15T09:00:00.000Z');
    // Rows are labelled and linked from definition data, never from the id.
    expect(row?.name).toBe('Pi');
    expect(row?.docsUrl).toBe((await builtinPi()).docsUrl);
    expect(row?.quirks).toContain('mcp-passthrough-gaps');
  });

  it('normalizes auth methods with the harness binary as the fallback executable', async () => {
    service();
    await writeCache({ pi: await piEntry() });
    // pi's method names args but no executable: the command is built from the
    // definition's own `detectCommand`, so nothing here is a hardcoded login line.
    expect(rowFor(await capabilities(), 'pi')?.authMethods).toEqual([
      {
        id: 'pi_terminal_login',
        name: 'Launch pi in the terminal',
        kind: 'external-command',
        command: { command: 'pi', args: ['--terminal-login'], env: {} },
      },
    ]);
  });

  it('marks the session-discovered fields even for a harness that never connected', async () => {
    service();
    const response = await capabilities();
    for (const row of response.entries) {
      expect(row.provenance['slashCommands']).toBe('session');
      expect(row.provenance['modes']).toBe('session');
    }
    await writeCache({ pi: await piEntry() });
    const pi = rowFor(await capabilities(), 'pi');
    expect(pi?.provenance['loadSession']).toBe('initialize');
    expect(pi?.provenance['slashCommands']).toBe('session');
  });

  it('marks a row stale when the definition changed under the same id', async () => {
    service();
    await writeCache({ pi: await piEntry({ definitionFingerprint: 'measured-against-something-else' }) });
    const row = rowFor(await capabilities(), 'pi');
    expect(row?.state).toBe('stale');
    // The measurement is still carried so the row can say what it USED to be.
    expect(row?.negotiated['loadSession']).toBe(true);
  });

  it('drops a cache entry for a harness the registry no longer knows', async () => {
    service();
    await writeCache({ pi: await piEntry(), 'deleted-harness': await piEntry() });
    const response = await capabilities();
    expect(response.entries.map((entry) => entry.harnessId)).toEqual(['pi', 'opencode']);
  });

  it('produces a row for a harness that only exists in harnesses.json — no component changes needed', async () => {
    // The no-hardcoding constraint, tested where it can actually be broken.
    await writeFile({
      version: 1,
      harnesses: [{ id: 'invented', name: 'Invented', launch: { command: 'invented' }, quirks: ['no-client-delegation'] }],
    });
    service();
    const row = rowFor(await capabilities(), 'invented');
    expect(row).toMatchObject({ harnessId: 'invented', name: 'Invented', state: 'not-yet-measured' });
    expect(row?.quirks).toEqual(['no-client-delegation']);
  });

  it('survives a missing or corrupt cache file with every row unmeasured', async () => {
    service();
    expect((await capabilities()).entries.every((entry) => entry.state === 'not-yet-measured')).toBe(true);
    await fs.writeFile(path.join(workspaceRoot, 'harness-capabilities.json'), '{ not json', 'utf8');
    expect((await capabilities()).entries.every((entry) => entry.state === 'not-yet-measured')).toBe(true);
  });

  it('answers with unmeasured rows before a workspace root exists', async () => {
    currentRoot = '';
    service();
    const response = await capabilities();
    expect(response.entries.length).toBeGreaterThan(0);
    expect(response.entries.every((entry) => entry.state === 'not-yet-measured')).toBe(true);
  });
});
