import { Schema } from "@effect/schema";

export const SPolicyEffect = Schema.Literal("allow", "deny", "prompt");
export type PolicyEffect = Schema.Schema.Type<typeof SPolicyEffect>;

export const SPolicyCondition = Schema.Struct({
  capability: Schema.String,
  effect: SPolicyEffect,
  reason: Schema.optional(Schema.String),
  requiresApproval: Schema.optional(Schema.Boolean),
  approverRole: Schema.optional(Schema.String),
});

export type PolicyCondition = Schema.Schema.Type<typeof SPolicyCondition>;

export const SCapabilityPolicy = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  description: Schema.optional(Schema.String),
  conditions: Schema.optionalWith(Schema.Array(SPolicyCondition), { default: () => [] }),
  defaultEffect: Schema.optionalWith(SPolicyEffect, { default: () => "prompt" as const }),
  enabled: Schema.optionalWith(Schema.Boolean, { default: () => true }),
});

export type CapabilityPolicy = Schema.Schema.Type<typeof SCapabilityPolicy>;

export interface ApprovalRequest {
  id: string;
  capability: string;
  reason: string;
  requestedAt: Date;
  requestedBy: string;
  status: 'pending' | 'approved' | 'denied';
  resolvedAt?: Date;
  resolver?: string;
}

export class CapabilityPolicyEngine {
  private policies: Map<string, CapabilityPolicy>;

  constructor() {
    this.policies = new Map();
  }

  addPolicy(policy: CapabilityPolicy): void {
    this.policies.set(policy.id, policy);
  }

  removePolicy(policyId: string): boolean {
    return this.policies.delete(policyId);
  }

  getPolicy(policyId: string): CapabilityPolicy | undefined {
    return this.policies.get(policyId);
  }

  listPolicies(): CapabilityPolicy[] {
    return Array.from(this.policies.values());
  }

  evaluateCapability(capability: string): { effect: PolicyEffect; requiresApproval: boolean } {
    for (const policy of this.policies.values()) {
      if (!policy.enabled) continue;

      const condition = policy.conditions.find((c) => c.capability === capability);
      if (condition) {
        return {
          effect: condition.effect,
          requiresApproval: condition.requiresApproval ?? (condition.effect === 'prompt'),
        };
      }
    }

    return { effect: 'prompt', requiresApproval: true };
  }

  createApprovalRequest(
    capability: string,
    reason: string,
    requestedBy: string
  ): ApprovalRequest {
    return {
      id: `approval-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      capability,
      reason,
      requestedAt: new Date(),
      requestedBy,
      status: 'pending',
    };
  }

  resolveApproval(
    request: ApprovalRequest,
    approved: boolean,
    resolver: string
  ): ApprovalRequest {
    return {
      ...request,
      status: approved ? 'approved' : 'denied',
      resolvedAt: new Date(),
      resolver,
    };
  }
}

export function createCapabilityPolicyEngine(): CapabilityPolicyEngine {
  return new CapabilityPolicyEngine();
}

export const defaultPolicy: CapabilityPolicy = {
  id: 'default',
  name: 'Default Policy',
  description: 'Default capability policy for srgnt',
  conditions: [
    { capability: 'read:tasks', effect: 'allow', reason: 'Read tasks is allowed' },
    { capability: 'write:tasks', effect: 'prompt', reason: 'Write tasks requires approval', requiresApproval: true },
    { capability: 'read:calendar', effect: 'allow', reason: 'Read calendar is allowed' },
    { capability: 'write:calendar', effect: 'prompt', reason: 'Write calendar requires approval', requiresApproval: true },
    { capability: 'read:messages', effect: 'allow', reason: 'Read messages is allowed' },
    { capability: 'write:messages', effect: 'deny', reason: 'Writing messages is not allowed' },
    { capability: 'exec:shell', effect: 'deny', reason: 'Shell execution is not allowed' },
    { capability: 'exec:http', effect: 'prompt', reason: 'HTTP execution requires approval', requiresApproval: true },
  ],
  defaultEffect: 'prompt',
  enabled: true,
};
