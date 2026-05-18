import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '@/api/api';
import {
  approveJoinRequest,
  cancelJoinRequest,
  listGroupJoinRequests,
  listMyJoinRequests,
  rejectJoinRequest,
  submitJoinRequest,
} from '@/api/JoinRequestAPI';

vi.mock('@/api/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('JoinRequestAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: {} });
    api.post.mockResolvedValue({ data: {} });
    api.delete.mockResolvedValue({ data: {} });
  });

  it('submitJoinRequest POSTs to workspace-scoped endpoint with payload', async () => {
    await submitJoinRequest(7, { message: 'Hi' });
    expect(api.post).toHaveBeenCalledWith('/group/7/join-request', { message: 'Hi' });
  });

  it('submitJoinRequest defaults to empty body', async () => {
    await submitJoinRequest(7);
    expect(api.post).toHaveBeenCalledWith('/group/7/join-request', {});
  });

  it('cancelJoinRequest DELETEs the workspace endpoint', async () => {
    await cancelJoinRequest(7);
    expect(api.delete).toHaveBeenCalledWith('/group/7/join-request');
  });

  it('listMyJoinRequests hits /me/join-requests', async () => {
    await listMyJoinRequests();
    expect(api.get).toHaveBeenCalledWith('/group/me/join-requests');
  });

  it('listGroupJoinRequests applies default pagination', async () => {
    await listGroupJoinRequests(7);
    expect(api.get).toHaveBeenCalledWith('/group/7/join-requests?page=0&size=20');
  });

  it('listGroupJoinRequests forwards custom pagination', async () => {
    await listGroupJoinRequests(7, { page: 2, size: 5 });
    expect(api.get).toHaveBeenCalledWith('/group/7/join-requests?page=2&size=5');
  });

  it('approveJoinRequest hits the approve endpoint with note', async () => {
    await approveJoinRequest(7, 42, { decisionNote: 'Welcome' });
    expect(api.post).toHaveBeenCalledWith('/group/7/join-requests/42/approve', { decisionNote: 'Welcome' });
  });

  it('rejectJoinRequest hits the reject endpoint with note', async () => {
    await rejectJoinRequest(7, 42, { decisionNote: 'Not now' });
    expect(api.post).toHaveBeenCalledWith('/group/7/join-requests/42/reject', { decisionNote: 'Not now' });
  });

  it('mutations throw on missing workspaceId/joinRequestId', async () => {
    await expect(submitJoinRequest(null)).rejects.toThrow('Missing workspaceId');
    await expect(cancelJoinRequest(null)).rejects.toThrow('Missing workspaceId');
    await expect(listGroupJoinRequests(null)).rejects.toThrow('Missing workspaceId');
    await expect(approveJoinRequest(1, null)).rejects.toThrow('Missing joinRequestId');
    await expect(rejectJoinRequest(1, null)).rejects.toThrow('Missing joinRequestId');
  });
});
