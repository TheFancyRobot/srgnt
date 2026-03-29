import { describe, it, expect, beforeEach } from 'vitest';
import {
  CapabilityPolicyEngine,
  createCapabilityPolicyEngine,
  defaultPolicy,
} from './capability.js';

describe('CapabilityPolicyEngine', () => {
  let engine: CapabilityPolicyEngine;

  beforeEach(() => {
    engine = createCapabilityPolicyEngine();
  });

  it('starts with no policies', () => {
    expect(engine.listPolicies()).toEqual([]);
  });

  it('adds and retrieves policies', () => {
    engine.addPolicy(defaultPolicy);
    expect(engine.getPolicy('default')?.id).toBe('default');
  });

  it('removes policies', () => {
    engine.addPolicy(defaultPolicy);
    expect(engine.removePolicy('default')).toBe(true);
    expect(engine.listPolicies()).toEqual([]);
  });

  it('evaluates known capability with allow', () => {
    engine.addPolicy(defaultPolicy);
    const result = engine.evaluateCapability('read:tasks');
    expect(result.effect).toBe('allow');
    expect(result.requiresApproval).toBeFalsy();
  });

  it('evaluates known capability with deny', () => {
    engine.addPolicy(defaultPolicy);
    const result = engine.evaluateCapability('write:messages');
    expect(result.effect).toBe('deny');
  });

  it('evaluates unknown capability as prompt', () => {
    const result = engine.evaluateCapability('unknown:capability');
    expect(result.effect).toBe('prompt');
    expect(result.requiresApproval).toBe(true);
  });

  it('creates approval requests', () => {
    const request = engine.createApprovalRequest(
      'write:tasks',
      'Need to update task status',
      'agent@srgnt.app'
    );
    expect(request.id).toMatch(/^approval-/);
    expect(request.capability).toBe('write:tasks');
    expect(request.status).toBe('pending');
    expect(request.requestedBy).toBe('agent@srgnt.app');
  });

  it('resolves approval as approved', () => {
    const request = engine.createApprovalRequest('write:tasks', 'Test', 'agent@srgnt.app');
    const resolved = engine.resolveApproval(request, true, 'user@srgnt.app');
    expect(resolved.status).toBe('approved');
    expect(resolved.resolver).toBe('user@srgnt.app');
    expect(resolved.resolvedAt).toBeDefined();
  });

  it('resolves approval as denied', () => {
    const request = engine.createApprovalRequest('write:tasks', 'Test', 'agent@srgnt.app');
    const resolved = engine.resolveApproval(request, false, 'user@srgnt.app');
    expect(resolved.status).toBe('denied');
    expect(resolved.resolver).toBe('user@srgnt.app');
  });

  it('ignores disabled policies', () => {
    const disabledPolicy = { ...defaultPolicy, enabled: false };
    engine.addPolicy(disabledPolicy);
    const result = engine.evaluateCapability('read:tasks');
    expect(result.effect).toBe('prompt');
  });
});

describe('defaultPolicy', () => {
  it('has required conditions', () => {
    expect(defaultPolicy.conditions.length).toBeGreaterThan(0);
  });

  it('allows read:tasks', () => {
    const condition = defaultPolicy.conditions.find((c) => c.capability === 'read:tasks');
    expect(condition?.effect).toBe('allow');
  });

  it('denies exec:shell', () => {
    const condition = defaultPolicy.conditions.find((c) => c.capability === 'exec:shell');
    expect(condition?.effect).toBe('deny');
  });
});
