import type { LaunchContext, LaunchTemplate } from '@srgnt/contracts';

export type ApprovalStatus = 'pending' | 'approved' | 'denied' | 'expired';

export interface ApprovalRequest {
  id: string;
  launchContext: LaunchContext;
  template: LaunchTemplate;
  requestedAt: Date;
  status: ApprovalStatus;
  reviewedAt?: Date;
  reviewedBy?: string;
}

export interface ApprovalService {
  requestApproval(launchContext: LaunchContext, template: LaunchTemplate): ApprovalRequest;
  getApproval(id: string): ApprovalRequest | undefined;
  approve(id: string, reviewedBy?: string): ApprovalRequest | undefined;
  deny(id: string, reviewedBy?: string): ApprovalRequest | undefined;
  expire(id: string): ApprovalRequest | undefined;
  listPending(): ApprovalRequest[];
  listAll(): ApprovalRequest[];
}

export function createApprovalService(): ApprovalService {
  const approvals = new Map<string, ApprovalRequest>();

  return {
    requestApproval(launchContext, template) {
      const id = `approval-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const request: ApprovalRequest = {
        id,
        launchContext,
        template,
        requestedAt: new Date(),
        status: 'pending',
      };
      approvals.set(id, request);
      return request;
    },

    getApproval(id) {
      return approvals.get(id);
    },

    approve(id, reviewedBy) {
      const approval = approvals.get(id);
      if (!approval) return undefined;
      approval.status = 'approved';
      approval.reviewedAt = new Date();
      approval.reviewedBy = reviewedBy;
      return approval;
    },

    deny(id, reviewedBy) {
      const approval = approvals.get(id);
      if (!approval) return undefined;
      approval.status = 'denied';
      approval.reviewedAt = new Date();
      approval.reviewedBy = reviewedBy;
      return approval;
    },

    expire(id) {
      const approval = approvals.get(id);
      if (!approval) return undefined;
      approval.status = 'expired';
      return approval;
    },

    listPending() {
      return Array.from(approvals.values()).filter((a) => a.status === 'pending');
    },

    listAll() {
      return Array.from(approvals.values());
    },
  };
}