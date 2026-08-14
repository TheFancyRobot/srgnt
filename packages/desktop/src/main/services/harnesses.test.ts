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
      [ipcChannels.harnessList, ipcChannels.harnessSaveOverride, ipcChannels.harnessResetOverride].sort(),
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
