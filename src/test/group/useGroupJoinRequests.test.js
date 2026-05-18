import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/api/JoinRequestAPI', () => ({
  listGroupJoinRequests: vi.fn(),
  listMyJoinRequests: vi.fn(),
  submitJoinRequest: vi.fn(),
  cancelJoinRequest: vi.fn(),
  approveJoinRequest: vi.fn(),
  rejectJoinRequest: vi.fn(),
}));

import {
  approveJoinRequest,
  cancelJoinRequest,
  listGroupJoinRequests,
  listMyJoinRequests,
  rejectJoinRequest,
  submitJoinRequest,
} from '@/api/JoinRequestAPI';
import {
  useGroupJoinRequests,
  useMyJoinRequests,
} from '@/pages/Users/Group/hooks/useGroupJoinRequests';

const buildLeaderList = (overrides = {}) => ({
  data: {
    items: [
      {
        joinRequestId: 1,
        workspaceId: 7,
        requesterId: 100,
        requesterName: 'Alice',
        status: 'PENDING',
        createdAt: '2026-05-15T10:00:00Z',
      },
      {
        joinRequestId: 2,
        workspaceId: 7,
        requesterId: 101,
        requesterName: 'Bob',
        status: 'PENDING',
        createdAt: '2026-05-17T10:00:00Z',
      },
    ],
    totalElements: 2,
    totalPages: 1,
    page: 0,
    size: 20,
    pendingCount: 2,
    ...overrides,
  },
});

describe('useGroupJoinRequests (leader)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listGroupJoinRequests.mockResolvedValue(buildLeaderList());
    approveJoinRequest.mockResolvedValue({ data: { joinRequestId: 1, status: 'APPROVED' } });
    rejectJoinRequest.mockResolvedValue({ data: { joinRequestId: 2, status: 'REJECTED' } });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('refresh loads pending requests sorted by createdAt DESC', async () => {
    const { result } = renderHook(() => useGroupJoinRequests(7));
    await act(async () => {
      await result.current.refresh();
    });
    expect(listGroupJoinRequests).toHaveBeenCalledWith(7, { page: 0, size: 20 });
    expect(result.current.items[0].joinRequestId).toBe(2);
    expect(result.current.items[1].joinRequestId).toBe(1);
    expect(result.current.pendingCount).toBe(2);
  });

  it('skips API when disabled', async () => {
    const { result } = renderHook(() => useGroupJoinRequests(7, { enabled: false }));
    await act(async () => {
      await result.current.refresh();
    });
    expect(listGroupJoinRequests).not.toHaveBeenCalled();
  });

  it('approve drops the request and decrements pendingCount', async () => {
    const { result } = renderHook(() => useGroupJoinRequests(7));
    await act(async () => {
      await result.current.refresh();
    });
    await act(async () => {
      await result.current.approve(1, { decisionNote: 'Welcome' });
    });
    expect(approveJoinRequest).toHaveBeenCalledWith(7, 1, { decisionNote: 'Welcome' });
    expect(result.current.items.find((it) => it.joinRequestId === 1)).toBeFalsy();
    expect(result.current.pendingCount).toBe(1);
  });

  it('reject drops the request and decrements pendingCount', async () => {
    const { result } = renderHook(() => useGroupJoinRequests(7));
    await act(async () => {
      await result.current.refresh();
    });
    await act(async () => {
      await result.current.reject(2);
    });
    expect(rejectJoinRequest).toHaveBeenCalledWith(7, 2, {});
    expect(result.current.items.find((it) => it.joinRequestId === 2)).toBeFalsy();
    expect(result.current.pendingCount).toBe(1);
  });
});

describe('useMyJoinRequests (member)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listMyJoinRequests.mockResolvedValue({
      data: [
        {
          joinRequestId: 11,
          workspaceId: 7,
          status: 'PENDING',
          createdAt: '2026-05-16T10:00:00Z',
        },
      ],
    });
    submitJoinRequest.mockResolvedValue({
      data: {
        joinRequestId: 99,
        workspaceId: 7,
        status: 'PENDING',
        createdAt: '2026-05-18T10:00:00Z',
      },
    });
    cancelJoinRequest.mockResolvedValue({});
  });

  it('refresh loads my requests across workspaces', async () => {
    const { result } = renderHook(() => useMyJoinRequests());
    await act(async () => {
      await result.current.refresh();
    });
    expect(listMyJoinRequests).toHaveBeenCalled();
    expect(result.current.items).toHaveLength(1);
  });

  it('submit prepends the new pending request to my list', async () => {
    const { result } = renderHook(() => useMyJoinRequests());
    await act(async () => {
      await result.current.refresh();
    });
    await act(async () => {
      await result.current.submit(7, { message: 'Please let me in' });
    });
    expect(submitJoinRequest).toHaveBeenCalledWith(7, { message: 'Please let me in' });
    expect(result.current.items.find((it) => it.joinRequestId === 99)).toBeTruthy();
  });

  it('cancel drops the pending request for the workspace', async () => {
    const { result } = renderHook(() => useMyJoinRequests());
    await act(async () => {
      await result.current.refresh();
    });
    await act(async () => {
      await result.current.cancel(7);
    });
    expect(cancelJoinRequest).toHaveBeenCalledWith(7);
    expect(result.current.items.find((it) => it.joinRequestId === 11)).toBeFalsy();
  });

  it('cancel keeps requests for other workspaces', async () => {
    listMyJoinRequests.mockResolvedValueOnce({
      data: [
        { joinRequestId: 11, workspaceId: 7, status: 'PENDING', createdAt: '2026-05-16T10:00:00Z' },
        { joinRequestId: 12, workspaceId: 8, status: 'PENDING', createdAt: '2026-05-16T10:00:00Z' },
      ],
    });
    const { result } = renderHook(() => useMyJoinRequests());
    await act(async () => {
      await result.current.refresh();
    });
    await act(async () => {
      await result.current.cancel(7);
    });
    expect(result.current.items.find((it) => it.workspaceId === 8)).toBeTruthy();
    expect(result.current.items.find((it) => it.workspaceId === 7)).toBeFalsy();
  });
});
