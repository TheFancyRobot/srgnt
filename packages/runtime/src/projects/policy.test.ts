import { describe, expect, it } from 'vitest';
import { createPermissionEngine, type NormalizedPermissionRequest } from '../permissions/engine.js';
import { createProjectPolicyHook } from './policy.js';

function request(kind: string, overrides: Partial<NormalizedPermissionRequest> = {}): NormalizedPermissionRequest {
  return { sessionId: 'chat-1', kind, title: `${kind} something`, ...overrides };
}

describe('createProjectPolicyHook', () => {
  it('answers with a stored allow or reject', () => {
    const hook = createProjectPolicyHook({ read: 'allow', delete: 'reject' });
    expect(hook(request('read'))).toBe('allow');
    expect(hook(request('delete'))).toBe('reject');
  });

  it('falls through for a stored ask, an unknown kind, and no policy at all', () => {
    const hook = createProjectPolicyHook({ execute: 'ask' });
    expect(hook(request('execute'))).toBeUndefined();
    expect(hook(request('edit'))).toBeUndefined();
    expect(createProjectPolicyHook(undefined)(request('read'))).toBeUndefined();
  });

  it('does not read decisions off Object.prototype for an agent-invented kind', () => {
    // `kind` is agent-supplied, so a bare property lookup would return a
    // function here and be treated as a decision.
    const hook = createProjectPolicyHook({ read: 'allow' });
    for (const kind of ['__proto__', 'constructor', 'toString', 'hasOwnProperty']) {
      expect(hook(request(kind))).toBeUndefined();
    }
  });
});

describe('permission engine with a project policy', () => {
  it('short-circuits the prompt for a policy-allowed kind and asks for everything else', () => {
    const engine = createPermissionEngine({
      projectPolicy: createProjectPolicyHook({ read: 'allow', delete: 'reject' }),
    });

    expect(engine.resolve(request('read', { paths: ['/w/a.ts'] }))).toBe('allow');
    expect(engine.resolve(request('delete', { paths: ['/w/a.ts'] }))).toBe('reject');
    expect(engine.resolve(request('edit', { paths: ['/w/a.ts'] }))).toBe('ask');
    expect(engine.resolve(request('execute', { command: 'rm -rf /' }))).toBe('ask');
  });

  it('lets a session-remembered answer win over the project policy', () => {
    const engine = createPermissionEngine({ projectPolicy: createProjectPolicyHook({ read: 'allow' }) });
    const req = request('read', { paths: ['/w/secret.ts'] });

    engine.remember(req, 'reject');
    expect(engine.resolve(req)).toBe('reject');
    // A different path still falls through to the project policy.
    expect(engine.resolve(request('read', { paths: ['/w/other.ts'] }))).toBe('allow');
  });
});
