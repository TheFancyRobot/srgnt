import { describe, expect, it } from 'vitest';
import {
  createPermissionEngine,
  deriveScope,
  rememberedDecisionFor,
  type NormalizedPermissionRequest,
} from './engine.js';

const request = (overrides: Partial<NormalizedPermissionRequest> = {}): NormalizedPermissionRequest => ({
  sessionId: 's1',
  kind: 'edit',
  title: 'Edit answer.ts',
  paths: ['/work/answer.ts'],
  ...overrides,
});

describe('permission engine resolution order', () => {
  it('asks by default — nothing is auto-allowed before the user says so', () => {
    const engine = createPermissionEngine();
    expect(engine.resolve(request())).toBe('ask');
  });

  it('a remembered allow_always answers the same scope without a prompt', () => {
    const engine = createPermissionEngine();
    engine.remember(request(), 'allow');
    expect(engine.resolve(request())).toBe('allow');
  });

  it('remembers reject_always too', () => {
    const engine = createPermissionEngine();
    engine.remember(request(), 'reject');
    expect(engine.resolve(request())).toBe('reject');
  });

  it('a scoped always does NOT cover a different scope of the same kind', () => {
    const engine = createPermissionEngine();
    engine.remember(request({ paths: ['/work/a.ts'] }), 'allow');
    expect(engine.resolve(request({ paths: ['/work/b.ts'] }))).toBe('ask');
  });

  it('an allow_always on several paths does not cover a superset containing one of them', () => {
    const engine = createPermissionEngine();
    engine.remember(request({ paths: ['/work/a.ts', '/work/b.ts'] }), 'allow');
    expect(engine.resolve(request({ paths: ['/work/a.ts', '/work/secret.ts'] }))).toBe('ask');
    expect(engine.resolve(request({ paths: ['/work/a.ts'] }))).toBe('ask');
  });

  it('cannot be tricked by agent-supplied strings that forge a key separator', () => {
    // The agent controls `kind`, `title`, and `paths`, so a concatenated key is
    // forgeable: these two requests collided under `${kind}|${scope}`.
    const engine = createPermissionEngine();
    engine.remember(request({ kind: 'edit', paths: ['a|title:x'] }), 'allow');
    expect(engine.resolve(request({ kind: 'edit|path:a', title: 'x', paths: [] }))).toBe('ask');
  });

  it('a different command program of the same execute kind still prompts', () => {
    const engine = createPermissionEngine();
    engine.remember(request({ kind: 'execute', command: 'git status', title: 'Run git' }), 'allow');
    expect(engine.resolve(request({ kind: 'execute', command: 'git push', title: 'Run git' }))).toBe('allow');
    expect(engine.resolve(request({ kind: 'execute', command: 'rm -rf /', title: 'Run rm' }))).toBe('ask');
  });

  it('kind-wide breadth is honored only when explicitly recorded', () => {
    const engine = createPermissionEngine();
    engine.remember(request({ paths: ['/work/a.ts'] }), 'allow', 'kind');
    expect(engine.resolve(request({ paths: ['/work/zzz.ts'] }))).toBe('allow');
    // ...and it does not leak into other kinds.
    expect(engine.resolve(request({ kind: 'execute', command: 'ls' }))).toBe('ask');
  });

  it('memory is per-session: a new session prompts again', () => {
    const engine = createPermissionEngine();
    engine.remember(request(), 'allow');
    expect(engine.resolve(request({ sessionId: 's2' }))).toBe('ask');
  });

  it('forgetSession drops the session memory', () => {
    const engine = createPermissionEngine();
    engine.remember(request(), 'allow');
    engine.forgetSession('s1');
    expect(engine.resolve(request())).toBe('ask');
  });

  it('project policy is consulted after memory and before the default ask', () => {
    const seen: string[] = [];
    const engine = createPermissionEngine({
      projectPolicy: (candidate) => {
        seen.push(candidate.title);
        return candidate.kind === 'read' ? 'allow' : undefined;
      },
    });
    expect(engine.resolve(request({ kind: 'read' }))).toBe('allow');
    expect(engine.resolve(request({ kind: 'edit' }))).toBe('ask');
    // Memory short-circuits the hook entirely.
    engine.remember(request({ kind: 'delete' }), 'reject');
    expect(engine.resolve(request({ kind: 'delete' }))).toBe('reject');
    expect(seen).toHaveLength(2);
  });
});

describe('scope derivation', () => {
  it('keys path-ish kinds on the affected path', () => {
    for (const kind of ['read', 'edit', 'delete', 'move']) {
      expect(deriveScope(request({ kind, paths: ['/work/x.ts'] }))).toBe('path:["/work/x.ts"]');
    }
  });

  it('keys on every affected path, order-insensitively', () => {
    const both = deriveScope(request({ kind: 'edit', paths: ['/work/a.ts', '/work/b.ts'] }));
    expect(deriveScope(request({ kind: 'edit', paths: ['/work/b.ts', '/work/a.ts'] }))).toBe(both);
    // The load-bearing part: adding a path the user never saw is a new scope.
    expect(deriveScope(request({ kind: 'edit', paths: ['/work/a.ts', '/work/secret.ts'] }))).not.toBe(both);
    expect(deriveScope(request({ kind: 'edit', paths: ['/work/a.ts'] }))).not.toBe(both);
  });

  it('keys execute on the program token, not the whole command line', () => {
    expect(deriveScope(request({ kind: 'execute', command: '  pnpm  test --watch ' }))).toBe('cmd:pnpm');
  });

  it('falls back to the title rather than widening when nothing concrete is derivable', () => {
    expect(deriveScope(request({ kind: 'edit', paths: [] }))).toBe('title:Edit answer.ts');
    expect(deriveScope(request({ kind: 'fetch', title: 'Fetch docs' }))).toBe('title:Fetch docs');
    expect(deriveScope(request({ kind: 'execute', command: '   ' }))).toBe('title:Edit answer.ts');
  });
});

describe('remembered decision mapping', () => {
  it('remembers only the explicit *_always kinds', () => {
    expect(rememberedDecisionFor('allow_always')).toBe('allow');
    expect(rememberedDecisionFor('reject_always')).toBe('reject');
    expect(rememberedDecisionFor('allow_once')).toBeUndefined();
    expect(rememberedDecisionFor('reject_once')).toBeUndefined();
    // An agent inventing an option kind can never make the client stop asking.
    expect(rememberedDecisionFor('always_trust_me')).toBeUndefined();
  });
});
