import type { ProjectPermissionPolicy } from '@srgnt/contracts';
import type { ProjectPolicyHook } from '../permissions/engine.js';

/**
 * Turns a project's stored `permissionPolicy` into the engine's project-policy
 * hook (STEP-23-03 left this as a stub that always fell through).
 *
 * Only `allow` and `reject` answer; a stored `ask`, an unknown kind, and an
 * absent policy all return `undefined`, which is the engine's fall-through to
 * prompting. Default-ask stays the ARCH-0009 invariant: this widens nothing on
 * its own, it only reads back what a project explicitly recorded.
 */
export function createProjectPolicyHook(policy: ProjectPermissionPolicy | undefined): ProjectPolicyHook {
  return (request) => {
    // `request.kind` is agent-supplied, so a plain `policy[kind]` lookup would
    // let `__proto__`/`constructor` read off Object.prototype and return a
    // function where a decision was expected.
    if (policy === undefined || !Object.prototype.hasOwnProperty.call(policy, request.kind)) {
      return undefined;
    }
    const decision = policy[request.kind];
    return decision === 'allow' || decision === 'reject' ? decision : undefined;
  };
}
