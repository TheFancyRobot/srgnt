import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createApprovalService, type ApprovalService, type ApprovalRequest } from './service.js';
import type { LaunchContext, LaunchTemplate } from '@srgnt/contracts';

function makeLaunchContext(overrides?: Partial<LaunchContext>): LaunchContext {
  return {
    launchId: 'launch-test-001',
    sourceWorkflow: 'daily-briefing',
    workingDirectory: '/home/user/workspace',
    intent: 'artifactAffecting',
    createdAt: '2024-03-25T10:00:00Z',
    ...overrides,
  } as LaunchContext;
}

function makeLaunchTemplate(overrides?: Partial<LaunchTemplate>): LaunchTemplate {
  return {
    id: 'terminal-readonly',
    name: 'Open Terminal',
    description: 'Open a terminal session',
    command: 'bash',
    args: [],
    intent: 'readOnly',
    requiredCapabilities: [],
    ...overrides,
  } as LaunchTemplate;
}

describe('createApprovalService', () => {
  it('returns an ApprovalService with all required methods', () => {
    const service = createApprovalService();
    expect(service.requestApproval).toBeDefined();
    expect(service.getApproval).toBeDefined();
    expect(service.approve).toBeDefined();
    expect(service.deny).toBeDefined();
    expect(service.expire).toBeDefined();
    expect(service.listPending).toBeDefined();
    expect(service.listAll).toBeDefined();
  });

  it('creates independent instances', () => {
    const service1 = createApprovalService();
    const service2 = createApprovalService();

    const ctx = makeLaunchContext();
    const tmpl = makeLaunchTemplate();
    service1.requestApproval(ctx, tmpl);

    expect(service1.listAll()).toHaveLength(1);
    expect(service2.listAll()).toHaveLength(0);
  });
});

describe('ApprovalService.requestApproval', () => {
  let service: ApprovalService;

  beforeEach(() => {
    service = createApprovalService();
  });

  it('creates a pending approval request', () => {
    const ctx = makeLaunchContext();
    const tmpl = makeLaunchTemplate();

    const request = service.requestApproval(ctx, tmpl);

    expect(request).toBeDefined();
    expect(request.status).toBe('pending');
    expect(request.launchContext).toBe(ctx);
    expect(request.template).toBe(tmpl);
    expect(request.id).toMatch(/^approval-/);
    expect(request.requestedAt).toBeInstanceOf(Date);
    expect(request.reviewedAt).toBeUndefined();
    expect(request.reviewedBy).toBeUndefined();
  });

  it('generates unique IDs for each request', () => {
    const ctx = makeLaunchContext();
    const tmpl = makeLaunchTemplate();
    const ids = new Set<string>();

    for (let i = 0; i < 50; i++) {
      const request = service.requestApproval(ctx, tmpl);
      ids.add(request.id);
    }

    expect(ids.size).toBe(50);
  });

  it('adds the request to listAll', () => {
    const ctx = makeLaunchContext();
    const tmpl = makeLaunchTemplate();

    service.requestApproval(ctx, tmpl);
    expect(service.listAll()).toHaveLength(1);

    service.requestApproval(ctx, tmpl);
    expect(service.listAll()).toHaveLength(2);
  });

  it('adds the request to listPending', () => {
    const ctx = makeLaunchContext();
    const tmpl = makeLaunchTemplate();

    service.requestApproval(ctx, tmpl);
    expect(service.listPending()).toHaveLength(1);
  });

  it('stores the correct launchContext and template', () => {
    const ctx = makeLaunchContext({ launchId: 'launch-custom-42' });
    const tmpl = makeLaunchTemplate({ id: 'custom-template', name: 'Custom' });

    const request = service.requestApproval(ctx, tmpl);

    expect(request.launchContext.launchId).toBe('launch-custom-42');
    expect(request.template.id).toBe('custom-template');
    expect(request.template.name).toBe('Custom');
  });

  it('sets requestedAt to current time', () => {
    const before = new Date();
    const ctx = makeLaunchContext();
    const tmpl = makeLaunchTemplate();
    const request = service.requestApproval(ctx, tmpl);
    const after = new Date();

    expect(request.requestedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(request.requestedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});

describe('ApprovalService.getApproval', () => {
  let service: ApprovalService;

  beforeEach(() => {
    service = createApprovalService();
  });

  it('returns the approval request by id', () => {
    const ctx = makeLaunchContext();
    const tmpl = makeLaunchTemplate();
    const request = service.requestApproval(ctx, tmpl);

    const found = service.getApproval(request.id);
    expect(found).toBeDefined();
    expect(found!.id).toBe(request.id);
  });

  it('returns undefined for non-existent id', () => {
    expect(service.getApproval('non-existent')).toBeUndefined();
  });

  it('returns undefined for empty string id', () => {
    expect(service.getApproval('')).toBeUndefined();
  });

  it('returns the same object reference (mutability)', () => {
    const ctx = makeLaunchContext();
    const tmpl = makeLaunchTemplate();
    const request = service.requestApproval(ctx, tmpl);

    const found = service.getApproval(request.id);
    expect(found).toBe(request); // Same reference
  });
});

describe('ApprovalService.approve', () => {
  let service: ApprovalService;
  let pendingRequest: ApprovalRequest;

  beforeEach(() => {
    service = createApprovalService();
    pendingRequest = service.requestApproval(
      makeLaunchContext(),
      makeLaunchTemplate(),
    );
  });

  it('approves a pending request', () => {
    const result = service.approve(pendingRequest.id);

    expect(result).toBeDefined();
    expect(result!.status).toBe('approved');
    expect(result!.reviewedAt).toBeInstanceOf(Date);
  });

  it('sets reviewedBy when provided', () => {
    const result = service.approve(pendingRequest.id, 'admin@srgnt.app');

    expect(result!.reviewedBy).toBe('admin@srgnt.app');
  });

  it('sets reviewedBy to undefined when not provided', () => {
    const result = service.approve(pendingRequest.id);

    expect(result!.reviewedBy).toBeUndefined();
  });

  it('removes the approved request from listPending', () => {
    expect(service.listPending()).toHaveLength(1);

    service.approve(pendingRequest.id);

    expect(service.listPending()).toHaveLength(0);
  });

  it('keeps the approved request in listAll', () => {
    service.approve(pendingRequest.id);

    expect(service.listAll()).toHaveLength(1);
    expect(service.listAll()[0].status).toBe('approved');
  });

  it('returns undefined for non-existent id', () => {
    expect(service.approve('non-existent')).toBeUndefined();
  });

  it('mutates the original request object', () => {
    service.approve(pendingRequest.id, 'admin@srgnt.app');

    // The original object is mutated in place
    expect(pendingRequest.status).toBe('approved');
    expect(pendingRequest.reviewedBy).toBe('admin@srgnt.app');
    expect(pendingRequest.reviewedAt).toBeInstanceOf(Date);
  });

  it('sets reviewedAt to current time', () => {
    const before = new Date();
    const result = service.approve(pendingRequest.id);
    const after = new Date();

    expect(result!.reviewedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(result!.reviewedAt!.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('can approve multiple requests', () => {
    const req2 = service.requestApproval(makeLaunchContext(), makeLaunchTemplate());
    const req3 = service.requestApproval(makeLaunchContext(), makeLaunchTemplate());

    service.approve(pendingRequest.id, 'reviewer-1');
    service.approve(req2.id, 'reviewer-2');
    service.approve(req3.id);

    expect(service.listPending()).toHaveLength(0);
    expect(service.listAll()).toHaveLength(3);
    expect(service.listAll()[0].reviewedBy).toBe('reviewer-1');
    expect(service.listAll()[1].reviewedBy).toBe('reviewer-2');
    expect(service.listAll()[2].reviewedBy).toBeUndefined();
  });
});

describe('ApprovalService.deny', () => {
  let service: ApprovalService;
  let pendingRequest: ApprovalRequest;

  beforeEach(() => {
    service = createApprovalService();
    pendingRequest = service.requestApproval(
      makeLaunchContext(),
      makeLaunchTemplate(),
    );
  });

  it('denies a pending request', () => {
    const result = service.deny(pendingRequest.id);

    expect(result).toBeDefined();
    expect(result!.status).toBe('denied');
    expect(result!.reviewedAt).toBeInstanceOf(Date);
  });

  it('sets reviewedBy when provided', () => {
    const result = service.deny(pendingRequest.id, 'admin@srgnt.app');

    expect(result!.reviewedBy).toBe('admin@srgnt.app');
  });

  it('sets reviewedBy to undefined when not provided', () => {
    const result = service.deny(pendingRequest.id);

    expect(result!.reviewedBy).toBeUndefined();
  });

  it('removes the denied request from listPending', () => {
    expect(service.listPending()).toHaveLength(1);

    service.deny(pendingRequest.id);

    expect(service.listPending()).toHaveLength(0);
  });

  it('keeps the denied request in listAll', () => {
    service.deny(pendingRequest.id);

    expect(service.listAll()).toHaveLength(1);
    expect(service.listAll()[0].status).toBe('denied');
  });

  it('returns undefined for non-existent id', () => {
    expect(service.deny('non-existent')).toBeUndefined();
  });

  it('mutates the original request object', () => {
    service.deny(pendingRequest.id, 'security@srgnt.app');

    expect(pendingRequest.status).toBe('denied');
    expect(pendingRequest.reviewedBy).toBe('security@srgnt.app');
    expect(pendingRequest.reviewedAt).toBeInstanceOf(Date);
  });

  it('can deny multiple requests independently', () => {
    const req2 = service.requestApproval(makeLaunchContext(), makeLaunchTemplate());

    service.approve(pendingRequest.id);
    service.deny(req2.id, 'admin');

    const all = service.listAll();
    expect(all).toHaveLength(2);
    expect(all[0].status).toBe('approved');
    expect(all[1].status).toBe('denied');
  });
});

describe('ApprovalService.expire', () => {
  let service: ApprovalService;
  let pendingRequest: ApprovalRequest;

  beforeEach(() => {
    service = createApprovalService();
    pendingRequest = service.requestApproval(
      makeLaunchContext(),
      makeLaunchTemplate(),
    );
  });

  it('expires a pending request', () => {
    const result = service.expire(pendingRequest.id);

    expect(result).toBeDefined();
    expect(result!.status).toBe('expired');
  });

  it('does not set reviewedAt or reviewedBy', () => {
    const result = service.expire(pendingRequest.id);

    expect(result!.reviewedAt).toBeUndefined();
    expect(result!.reviewedBy).toBeUndefined();
  });

  it('removes the expired request from listPending', () => {
    expect(service.listPending()).toHaveLength(1);

    service.expire(pendingRequest.id);

    expect(service.listPending()).toHaveLength(0);
  });

  it('keeps the expired request in listAll', () => {
    service.expire(pendingRequest.id);

    expect(service.listAll()).toHaveLength(1);
    expect(service.listAll()[0].status).toBe('expired');
  });

  it('returns undefined for non-existent id', () => {
    expect(service.expire('non-existent')).toBeUndefined();
  });

  it('mutates the original request object', () => {
    service.expire(pendingRequest.id);

    expect(pendingRequest.status).toBe('expired');
  });

  it('can expire multiple requests', () => {
    const req2 = service.requestApproval(makeLaunchContext(), makeLaunchTemplate());
    const req3 = service.requestApproval(makeLaunchContext(), makeLaunchTemplate());

    service.expire(pendingRequest.id);
    service.expire(req2.id);

    expect(service.listPending()).toHaveLength(1); // Only req3 still pending
    expect(service.listAll()).toHaveLength(3);
  });
});

describe('ApprovalService.listPending', () => {
  let service: ApprovalService;

  beforeEach(() => {
    service = createApprovalService();
  });

  it('returns empty array when no requests', () => {
    expect(service.listPending()).toEqual([]);
  });

  it('returns only pending requests', () => {
    const req1 = service.requestApproval(makeLaunchContext(), makeLaunchTemplate());
    const req2 = service.requestApproval(makeLaunchContext(), makeLaunchTemplate());
    const req3 = service.requestApproval(makeLaunchContext(), makeLaunchTemplate());

    service.approve(req1.id);
    // req2 stays pending
    service.deny(req3.id);

    const pending = service.listPending();
    expect(pending).toHaveLength(1);
    expect(pending[0].id).toBe(req2.id);
  });

  it('returns all requests when all are pending', () => {
    service.requestApproval(makeLaunchContext(), makeLaunchTemplate());
    service.requestApproval(makeLaunchContext(), makeLaunchTemplate());
    service.requestApproval(makeLaunchContext(), makeLaunchTemplate());

    expect(service.listPending()).toHaveLength(3);
  });

  it('returns empty after all requests are resolved', () => {
    const req1 = service.requestApproval(makeLaunchContext(), makeLaunchTemplate());
    const req2 = service.requestApproval(makeLaunchContext(), makeLaunchTemplate());

    service.approve(req1.id);
    service.deny(req2.id);

    expect(service.listPending()).toHaveLength(0);
  });

  it('returns empty after all requests are expired', () => {
    const req1 = service.requestApproval(makeLaunchContext(), makeLaunchTemplate());
    const req2 = service.requestApproval(makeLaunchContext(), makeLaunchTemplate());

    service.expire(req1.id);
    service.expire(req2.id);

    expect(service.listPending()).toHaveLength(0);
  });

  it('updates dynamically as requests are resolved', () => {
    const req1 = service.requestApproval(makeLaunchContext(), makeLaunchTemplate());
    const req2 = service.requestApproval(makeLaunchContext(), makeLaunchTemplate());

    expect(service.listPending()).toHaveLength(2);

    service.approve(req1.id);
    expect(service.listPending()).toHaveLength(1);

    service.deny(req2.id);
    expect(service.listPending()).toHaveLength(0);
  });
});

describe('ApprovalService.listAll', () => {
  let service: ApprovalService;

  beforeEach(() => {
    service = createApprovalService();
  });

  it('returns empty array when no requests', () => {
    expect(service.listAll()).toEqual([]);
  });

  it('returns all requests regardless of status', () => {
    const req1 = service.requestApproval(makeLaunchContext(), makeLaunchTemplate());
    const req2 = service.requestApproval(makeLaunchContext(), makeLaunchTemplate());
    const req3 = service.requestApproval(makeLaunchContext(), makeLaunchTemplate());

    service.approve(req1.id);
    service.deny(req2.id);
    service.expire(req3.id);

    const all = service.listAll();
    expect(all).toHaveLength(3);
    expect(all.find(r => r.id === req1.id)?.status).toBe('approved');
    expect(all.find(r => r.id === req2.id)?.status).toBe('denied');
    expect(all.find(r => r.id === req3.id)?.status).toBe('expired');
  });

  it('grows as new requests are added', () => {
    expect(service.listAll()).toHaveLength(0);

    service.requestApproval(makeLaunchContext(), makeLaunchTemplate());
    expect(service.listAll()).toHaveLength(1);

    service.requestApproval(makeLaunchContext(), makeLaunchTemplate());
    expect(service.listAll()).toHaveLength(2);
  });
});

describe('ApprovalService - state transitions', () => {
  let service: ApprovalService;

  beforeEach(() => {
    service = createApprovalService();
  });

  it('allows re-approving an already approved request', () => {
    const req = service.requestApproval(makeLaunchContext(), makeLaunchTemplate());
    service.approve(req.id, 'first-reviewer');

    const result = service.approve(req.id, 'second-reviewer');
    expect(result!.status).toBe('approved');
    expect(result!.reviewedBy).toBe('second-reviewer');
  });

  it('allows re-denying an already denied request', () => {
    const req = service.requestApproval(makeLaunchContext(), makeLaunchTemplate());
    service.deny(req.id, 'first-reviewer');

    const result = service.deny(req.id, 'second-reviewer');
    expect(result!.status).toBe('denied');
    expect(result!.reviewedBy).toBe('second-reviewer');
  });

  it('allows denying a previously approved request', () => {
    const req = service.requestApproval(makeLaunchContext(), makeLaunchTemplate());
    service.approve(req.id);

    const result = service.deny(req.id);
    expect(result!.status).toBe('denied');
  });

  it('allows approving a previously denied request', () => {
    const req = service.requestApproval(makeLaunchContext(), makeLaunchTemplate());
    service.deny(req.id);

    const result = service.approve(req.id);
    expect(result!.status).toBe('approved');
  });

  it('allows expiring an approved request', () => {
    const req = service.requestApproval(makeLaunchContext(), makeLaunchTemplate());
    service.approve(req.id);

    const result = service.expire(req.id);
    expect(result!.status).toBe('expired');
  });

  it('allows approving an expired request', () => {
    const req = service.requestApproval(makeLaunchContext(), makeLaunchTemplate());
    service.expire(req.id);

    const result = service.approve(req.id);
    expect(result!.status).toBe('approved');
    expect(result!.reviewedBy).toBeUndefined();
  });

  it('pending -> approved keeps it out of listPending', () => {
    const req = service.requestApproval(makeLaunchContext(), makeLaunchTemplate());
    service.approve(req.id);

    expect(service.listPending()).toHaveLength(0);
    expect(service.listAll()).toHaveLength(1);
  });

  it('expired -> approved keeps it out of listPending', () => {
    const req = service.requestApproval(makeLaunchContext(), makeLaunchTemplate());
    service.expire(req.id);
    expect(service.listPending()).toHaveLength(0);

    service.approve(req.id);
    expect(service.listPending()).toHaveLength(0);
  });
});

describe('ApprovalService - edge cases', () => {
  let service: ApprovalService;

  beforeEach(() => {
    service = createApprovalService();
  });

  it('handles operations on non-existent ids gracefully', () => {
    expect(service.getApproval('')).toBeUndefined();
    expect(service.approve('')).toBeUndefined();
    expect(service.deny('')).toBeUndefined();
    expect(service.expire('')).toBeUndefined();
  });

  it('handles concurrent-like operations on the same request', () => {
    const req = service.requestApproval(makeLaunchContext(), makeLaunchTemplate());

    // Approve, deny, and expire in sequence
    service.approve(req.id, 'admin-1');
    service.deny(req.id, 'admin-2');
    service.expire(req.id);

    // Final state is expired (last operation wins)
    const final = service.getApproval(req.id);
    expect(final!.status).toBe('expired');
  });

  it('handles many requests efficiently', () => {
    for (let i = 0; i < 1000; i++) {
      service.requestApproval(makeLaunchContext(), makeLaunchTemplate());
    }

    expect(service.listAll()).toHaveLength(1000);
    expect(service.listPending()).toHaveLength(1000);

    // Approve half
    const all = service.listAll();
    for (let i = 0; i < 500; i++) {
      service.approve(all[i].id);
    }

    expect(service.listPending()).toHaveLength(500);
    expect(service.listAll()).toHaveLength(1000);
  });

  it('works with different launch contexts and templates', () => {
    const req1 = service.requestApproval(
      makeLaunchContext({ sourceWorkflow: 'workflow-a', launchId: 'launch-a' }),
      makeLaunchTemplate({ id: 'template-a', name: 'Template A' }),
    );
    const req2 = service.requestApproval(
      makeLaunchContext({ sourceWorkflow: 'workflow-b', launchId: 'launch-b' }),
      makeLaunchTemplate({ id: 'template-b', name: 'Template B', intent: 'artifactAffecting' }),
    );

    expect(service.getApproval(req1.id)?.launchContext.sourceWorkflow).toBe('workflow-a');
    expect(service.getApproval(req1.id)?.template.id).toBe('template-a');
    expect(service.getApproval(req2.id)?.launchContext.sourceWorkflow).toBe('workflow-b');
    expect(service.getApproval(req2.id)?.template.id).toBe('template-b');
  });
});
