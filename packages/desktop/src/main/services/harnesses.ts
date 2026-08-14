import { ipcMain } from 'electron';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {
  ipcChannels,
  parseSync,
  SHarnessListRequest,
  SHarnessRef,
  SHarnessSaveOverrideRequest,
  workspaceFiles,
  type HarnessDefinition,
  type HarnessDetection,
  type HarnessListResponse,
  type HarnessMutationResponse,
  type HarnessesFile,
} from '@srgnt/contracts';
import { writeJsonAtomic } from '@srgnt/runtime';

/**
 * Main-process owner of harness configuration (PHASE-25, STEP-25-02).
 *
 * `harnesses.json` and the registry's wholesale-shadow merge already existed;
 * this service is what lets a user *operate* them — and the only writer the
 * product has. Four rules make that writer safe, all enforced here rather than
 * in the renderer, because a scripted IPC caller is just as real as the UI:
 *
 * 1. **Canonicalize against a base.** Only `launch.*` and `detectCommand` are
 *    taken from the payload. Everything else (`quirks`, `capabilityOverrides`,
 *    `source`, identity) is re-derived from the built-in — or, for a custom
 *    harness, from the entry already on disk. A complete-but-tampered payload
 *    cannot clear Pi's `mcpServers` clamp by flipping a field.
 * 2. **Never repair by overwriting.** A `harnesses.json` that fails to load is
 *    still the user's data. Saves and resets re-read it first and ABORT on a
 *    load failure — the built-ins fallback is a listing affordance, never an
 *    authorization to rewrite the file from thin air.
 * 3. **Secrets are designed out.** A literal value on a sensitive-looking key
 *    is refused with the `${env:NAME}` reference form, which is resolved from
 *    the main process's environment at spawn and never written to disk.
 * 4. **Least privilege.** Writes go through the atomic tmp+rename path at
 *    `0600`, tmp file included, and are serialized per workspace so two
 *    surfaces cannot drop each other's entries.
 *
 * `@srgnt/harness` is ESM and desktop-main is CommonJS, so it is reached
 * through the same lazy `Function('return import(...)')` dance the chat
 * controller uses.
 */

type HarnessModule = typeof import('@srgnt/harness');
let harnessModulePromise: Promise<HarnessModule> | undefined;
function importHarness(): Promise<HarnessModule> {
  if (harnessModulePromise === undefined) {
    harnessModulePromise = Function('return import("@srgnt/harness")')() as Promise<HarnessModule>;
  }
  return harnessModulePromise;
}

/** Owner-only. `harnesses.json` holds no secrets by design, but it is still config the user owns. */
const HARNESS_FILE_MODE = 0o600;

/**
 * Keys whose *literal* values are refused. Deliberately broad and
 * case-insensitive: a false positive costs one `${env:…}` reference, a false
 * negative costs a token committed to source control forever.
 */
const SENSITIVE_KEY = /TOKEN|SECRET|KEY|PASSWORD|PASSWD|CREDENTIAL|AUTH|COOKIE|SESSION/i;

/** The one supported way to give a harness a secret: a reference, resolved at spawn. */
const ENV_REFERENCE = /^\$\{env:([A-Za-z_][A-Za-z0-9_]*)\}$/;

const EMPTY_FILE: HarnessesFile = { version: 1, harnesses: [] };

/** A `harnesses.json` that parsed, or the readable reason it did not. */
type WorkspaceLoad =
  | { readonly ok: true; readonly file: HarnessesFile }
  | { readonly ok: false; readonly error: string };

export interface HarnessesService {
  /** Drops this run's detection cache when the workspace changes underneath us. */
  setWorkspaceRoot(root: string): void;
  /**
   * The effective definition for a spawn, with `${env:…}` values resolved from
   * the main process environment. `undefined` for an id the registry does not
   * know (a deleted override, a removed custom harness) — the caller decides
   * whether that is fatal. Throws only when a reference cannot be resolved,
   * because passing `${env:X}` through to the agent verbatim is worse.
   */
  resolveDefinition(id: string): Promise<HarnessDefinition | undefined>;
  registerIpcHandlers(): void;
}

export function createHarnessesService(deps: {
  getWorkspaceRoot(): string;
  /** Overrides the real `--version` probe (tests). Absent → `detectHarness`. */
  detect?: (definition: HarnessDefinition) => Promise<HarnessDetection>;
  /**
   * Loads `@srgnt/harness`. Injected only by tests: the `Function('return
   * import(...)')` indirection that keeps the CJS main from `require()`ing an
   * ESM package has no dynamic-import callback under vitest's vm.
   */
  loadHarness?: () => Promise<HarnessModule>;
}): HarnessesService {
  const loadHarness = deps.loadHarness ?? importHarness;
  // Keyed by the probed COMMAND, not the harness id: overriding a binary path
  // changes the key, so a fixed PATH re-probes without anyone asking for a
  // refresh, while repeated list calls stay free.
  const detections = new Map<string, HarnessDetection>();
  // One write chain per workspace root. Atomic rename alone is not enough:
  // two saves that both read the pre-mutation file would each rewrite it whole
  // and the last rename would silently drop the other's entry.
  const writeQueues = new Map<string, Promise<unknown>>();

  const harnessesPath = (root: string): string => path.join(root, workspaceFiles.harnesses);

  function requireRoot(): string {
    const root = deps.getWorkspaceRoot();
    if (root === '') throw new Error('No workspace root: harness configuration cannot be read or written yet.');
    return root;
  }

  /**
   * Reads and validates `harnesses.json`. A MISSING file is not a failure — it
   * decodes as the empty workspace and may be created. Anything else that
   * cannot be understood is a typed failure that blocks every mutation.
   */
  async function readWorkspaceFile(root: string): Promise<WorkspaceLoad> {
    const file = harnessesPath(root);
    let raw: string;
    try {
      raw = await fs.readFile(file, 'utf8');
    } catch (cause) {
      if ((cause as NodeJS.ErrnoException).code === 'ENOENT') return { ok: true, file: EMPTY_FILE };
      return { ok: false, error: `Could not read ${file}: ${messageOf(cause)}` };
    }
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch (cause) {
      return { ok: false, error: `${file} is not valid JSON: ${messageOf(cause)}` };
    }
    const { loadWorkspaceHarnesses } = await loadHarness();
    const result = loadWorkspaceHarnesses(value);
    return result.ok
      ? { ok: true, file: result.file }
      : { ok: false, error: `${file} does not match the harness schema: ${result.error}` };
  }

  /** Built-ins merged with whatever the workspace file contributed (registry precedence). */
  async function buildRegistry(
    root: string,
  ): Promise<{ load: WorkspaceLoad; definitions: readonly HarnessDefinition[] }> {
    const { HarnessRegistry } = await loadHarness();
    const load = root === '' ? ({ ok: true, file: EMPTY_FILE } as const) : await readWorkspaceFile(root);
    const registry = HarnessRegistry.create(load.ok ? { workspace: load.file } : {});
    return { load, definitions: registry.list() };
  }

  async function detect(definition: HarnessDefinition, refresh: boolean): Promise<HarnessDetection> {
    const command = definition.detectCommand || definition.launch.command;
    const cached = detections.get(command);
    if (cached !== undefined && !refresh) return cached;
    const probe = deps.detect ?? (async (target) => (await loadHarness()).detectHarness(target) as Promise<HarnessDetection>);
    const result = await probe(definition);
    detections.set(command, result);
    return result;
  }

  async function list(refresh: boolean): Promise<HarnessListResponse> {
    const root = deps.getWorkspaceRoot();
    const { load, definitions } = await buildRegistry(root);
    const shadowed = new Set(load.ok ? load.file.harnesses.map((entry) => entry.id) : []);
    const harnesses = await Promise.all(
      definitions.map(async (definition) => ({
        definition,
        overridden: shadowed.has(definition.id),
        detection: await detect(definition, refresh),
      })),
    );
    return {
      workspaceLoad: load.ok ? { ok: true } : { ok: false, error: load.error },
      harnesses,
    };
  }

  /** Serializes mutations per root, and re-reads inside the queue so each save sees the previous one. */
  function enqueue<T>(root: string, run: () => Promise<T>): Promise<T> {
    const queue = writeQueues.get(root) ?? Promise.resolve();
    // `then(run, run)`: a failed predecessor must not poison later writers.
    const next = queue.then(run, run);
    writeQueues.set(
      root,
      next.then(
        () => undefined,
        () => undefined,
      ),
    );
    return next;
  }

  async function saveOverride(
    harnessId: string,
    payload: HarnessDefinition,
  ): Promise<HarnessMutationResponse> {
    const root = requireRoot();
    return enqueue(root, async () => {
      const load = await readWorkspaceFile(root);
      // Abort, do not repair: rewriting a file we could not parse would destroy
      // every custom entry in it.
      if (!load.ok) return { ok: false, error: load.error };

      // An id mismatch means the caller is confused about which record it is
      // editing — a hard error, never silently normalized to the target.
      if (payload.id !== harnessId) {
        return {
          ok: false,
          error: `This save targets "${harnessId}" but carries a definition for "${payload.id}".`,
        };
      }

      const { BUILTIN_HARNESSES } = await loadHarness();
      const builtin = BUILTIN_HARNESSES.find((entry) => entry.id === harnessId);
      const existing = load.file.harnesses.find((entry) => entry.id === harnessId);
      const base = builtin ?? existing;
      if (base === undefined) {
        return { ok: false, error: `There is no harness "${harnessId}" to configure.` };
      }
      if (payload.source === 'builtin' && builtin === undefined) {
        return { ok: false, error: `"${harnessId}" is not a built-in harness.` };
      }

      const sensitive = findSensitiveLiteral(payload.launch.env);
      if (sensitive !== undefined) return { ok: false, error: sensitive };

      const record = canonicalize(base, payload);
      const harnesses = load.file.harnesses.some((entry) => entry.id === harnessId)
        ? load.file.harnesses.map((entry) => (entry.id === harnessId ? record : entry))
        : [...load.file.harnesses, record];
      await fs.mkdir(root, { recursive: true });
      await writeJsonAtomic(
        harnessesPath(root),
        { version: load.file.version, harnesses } satisfies HarnessesFile,
        HARNESS_FILE_MODE,
      );
      return { ok: true };
    });
  }

  async function resetOverride(harnessId: string): Promise<HarnessMutationResponse> {
    const root = requireRoot();
    return enqueue(root, async () => {
      const load = await readWorkspaceFile(root);
      if (!load.ok) return { ok: false, error: load.error };
      const harnesses = load.file.harnesses.filter((entry) => entry.id !== harnessId);
      // Nothing to remove: leave the file (and its mtime) alone.
      if (harnesses.length === load.file.harnesses.length) return { ok: true };
      await fs.mkdir(root, { recursive: true });
      await writeJsonAtomic(
        harnessesPath(root),
        { version: load.file.version, harnesses } satisfies HarnessesFile,
        HARNESS_FILE_MODE,
      );
      return { ok: true };
    });
  }

  async function resolveDefinition(id: string): Promise<HarnessDefinition | undefined> {
    const { definitions } = await buildRegistry(deps.getWorkspaceRoot());
    const definition = definitions.find((entry) => entry.id === id);
    if (definition === undefined) return undefined;
    return { ...definition, launch: { ...definition.launch, env: resolveEnv(definition) } };
  }

  function registerIpcHandlers(): void {
    ipcMain.handle(ipcChannels.harnessList, async (_event, payload: unknown) => {
      const { refresh } = parseSync(SHarnessListRequest, payload ?? {});
      return list(refresh);
    });

    ipcMain.handle(ipcChannels.harnessSaveOverride, async (_event, payload: unknown) => {
      const request = parseSync(SHarnessSaveOverrideRequest, payload);
      return saveOverride(request.harnessId, request.definition);
    });

    ipcMain.handle(ipcChannels.harnessResetOverride, async (_event, payload: unknown) => {
      const { harnessId } = parseSync(SHarnessRef, payload);
      return resetOverride(harnessId);
    });
  }

  return {
    setWorkspaceRoot: () => detections.clear(),
    resolveDefinition,
    registerIpcHandlers,
  };
}

/**
 * The base record with ONLY the editable fields taken from the payload. The
 * registry replaces a shadowed definition wholesale, so this is what keeps a
 * save from being a partial write: identity, `source`, `quirks` and
 * `capabilityOverrides` always come from the base, whatever the payload claims.
 */
function canonicalize(base: HarnessDefinition, payload: HarnessDefinition): HarnessDefinition {
  // `launch` and `detectCommand` are destructured off so a CLEARED field lands
  // as absent rather than being resurrected by the spread.
  const { launch: _baseLaunch, detectCommand: _baseDetect, ...identity } = base;
  return {
    ...identity,
    launch: {
      command: payload.launch.command,
      args: payload.launch.args,
      env: payload.launch.env,
      ...(payload.launch.cwd !== undefined ? { cwd: payload.launch.cwd } : {}),
    },
    ...(payload.detectCommand !== undefined ? { detectCommand: payload.detectCommand } : {}),
  };
}

/** The actionable rejection for a secret-shaped literal, or `undefined` if the env is fine. */
function findSensitiveLiteral(env: Readonly<Record<string, string>>): string | undefined {
  for (const [key, value] of Object.entries(env)) {
    if (!SENSITIVE_KEY.test(key) || ENV_REFERENCE.test(value)) continue;
    return (
      `"${key}" looks like a secret, and harnesses.json travels with the workspace ` +
      `(source control, backups, shared filesystems). Reference it instead: \${env:${key}} — ` +
      `srgnt resolves that from your environment when the agent is spawned and never writes the value to disk.`
    );
  }
  return undefined;
}

/** Substitutes `${env:NAME}` values from the main process environment. */
function resolveEnv(definition: HarnessDefinition): Record<string, string> {
  return Object.fromEntries(
    Object.entries(definition.launch.env).map(([key, value]) => {
      const match = ENV_REFERENCE.exec(value);
      if (match === null) return [key, value];
      const name = match[1] as string;
      const resolved = process.env[name];
      // Passing the raw `${env:NAME}` string through would hand the agent a
      // literal placeholder and fail somewhere far away from the cause.
      if (resolved === undefined) {
        throw new Error(
          `Harness "${definition.name}" sets ${key} to \${env:${name}}, but ${name} is not set in srgnt's environment. ` +
            `Set it before launching srgnt, or clear the value in Settings → Harnesses.`,
        );
      }
      return [key, resolved];
    }),
  );
}

function messageOf(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}
