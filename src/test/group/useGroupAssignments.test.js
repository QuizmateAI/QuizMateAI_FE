import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/api/AssignmentAPI', () => ({
  listGroupAssignments: vi.fn(),
  listMyAssignments: vi.fn(),
  getAssignmentDetail: vi.fn(),
  createAssignment: vi.fn(),
  updateAssignment: vi.fn(),
  deleteAssignment: vi.fn(),
  submitAssignment: vi.fn(),
}));

import {
  createAssignment,
  deleteAssignment,
  listGroupAssignments,
  listMyAssignments,
  submitAssignment,
  updateAssignment,
} from '@/api/AssignmentAPI';
import {
  useGroupAssignments,
  useMyAssignments,
} from '@/pages/Users/Group/hooks/useGroupAssignments';

const buildLeaderList = (overrides = {}) => ({
  data: {
    items: [
      {
        assignmentId: 1,
        title: 'Older assignment',
        createdAt: '2026-05-15T10:00:00Z',
        audienceType: 'ALL_MEMBERS',
        totalTargets: 5,
        submittedCount: 2,
        overdue: false,
      },
      {
        assignmentId: 2,
        title: 'Newer assignment',
        createdAt: '2026-05-17T10:00:00Z',
        audienceType: 'SPECIFIC_MEMBERS',
        totalTargets: 3,
        submittedCount: 0,
        overdue: true,
      },
    ],
    totalElements: 2,
    totalPages: 1,
    page: 0,
    size: 20,
    ...overrides,
  },
});

const buildMyList = (workspaceId) => ({
  data: [
    {
      assignmentId: 10,
      workspaceId,
      title: 'Mine 1',
      createdAt: '2026-05-16T10:00:00Z',
      myTarget: { status: 'PENDING', userId: 99 },
    },
    {
      assignmentId: 11,
      workspaceId: workspaceId + 100,
      title: 'Other workspace',
      createdAt: '2026-05-16T10:00:00Z',
      myTarget: { status: 'PENDING', userId: 99 },
    },
  ],
});

describe('useGroupAssignments (leader)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listGroupAssignments.mockResolvedValue(buildLeaderList());
    createAssignment.mockResolvedValue({
      data: {
        assignmentId: 99,
        title: 'New',
        createdAt: '2026-05-18T10:00:00Z',
        audienceType: 'ALL_MEMBERS',
        totalTargets: 4,
        submittedCount: 0,
      },
    });
    updateAssignment.mockResolvedValue({
      data: {
        assignmentId: 1,
        title: 'Older assignment (edited)',
        createdAt: '2026-05-15T10:00:00Z',
        audienceType: 'ALL_MEMBERS',
        totalTargets: 5,
        submittedCount: 2,
      },
    });
    deleteAssignment.mockResolvedValue({});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('refresh loads page 0 and sorts by createdAt DESC', async () => {
    const { result } = renderHook(() => useGroupAssignments(7));
    await act(async () => {
      await result.current.refresh();
    });
    expect(listGroupAssignments).toHaveBeenCalledWith(7, { page: 0, size: 20 });
    expect(result.current.items[0].assignmentId).toBe(2);
    expect(result.current.items[1].assignmentId).toBe(1);
  });

  it('refresh skipped when workspaceId missing', async () => {
    const { result } = renderHook(() => useGroupAssignments(null));
    await act(async () => {
      await result.current.refresh();
    });
    expect(listGroupAssignments).not.toHaveBeenCalled();
  });

  it('create prepends locally and bumps total', async () => {
    const { result } = renderHook(() => useGroupAssignments(7));
    await act(async () => {
      await result.current.refresh();
    });
    await act(async () => {
      await result.current.create({
        resourceType: 'QUIZ',
        resourceId: 10,
        title: 'New',
        audienceType: 'ALL_MEMBERS',
      });
    });
    expect(createAssignment).toHaveBeenCalledWith(7, {
      resourceType: 'QUIZ',
      resourceId: 10,
      title: 'New',
      audienceType: 'ALL_MEMBERS',
    });
    expect(result.current.items.find((it) => it.assignmentId === 99)).toBeTruthy();
    expect(result.current.totalElements).toBe(3);
  });

  it('update replaces the in-place item without changing position', async () => {
    const { result } = renderHook(() => useGroupAssignments(7));
    await act(async () => {
      await result.current.refresh();
    });
    await act(async () => {
      await result.current.update(1, { title: 'Older assignment (edited)' });
    });
    expect(updateAssignment).toHaveBeenCalledWith(7, 1, { title: 'Older assignment (edited)' });
    expect(result.current.items.find((it) => it.assignmentId === 1)?.title)
      .toBe('Older assignment (edited)');
  });

  it('remove drops the item and decrements total', async () => {
    const { result } = renderHook(() => useGroupAssignments(7));
    await act(async () => {
      await result.current.refresh();
    });
    await act(async () => {
      await result.current.remove(1);
    });
    expect(deleteAssignment).toHaveBeenCalledWith(7, 1);
    expect(result.current.items.find((it) => it.assignmentId === 1)).toBeFalsy();
    expect(result.current.totalElements).toBe(1);
  });
});

describe('useMyAssignments (member)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    submitAssignment.mockResolvedValue({
      data: {
        userId: 99,
        status: 'SUBMITTED',
        submittedAt: '2026-05-18T11:00:00Z',
      },
    });
  });

  it('refresh filters items by workspaceId when provided', async () => {
    listMyAssignments.mockResolvedValue(buildMyList(7));
    const { result } = renderHook(() => useMyAssignments(7));
    await act(async () => {
      await result.current.refresh();
    });
    expect(listMyAssignments).toHaveBeenCalled();
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].assignmentId).toBe(10);
  });

  it('refresh returns all assignments when workspaceId is null', async () => {
    listMyAssignments.mockResolvedValue(buildMyList(7));
    const { result } = renderHook(() => useMyAssignments(null));
    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.items).toHaveLength(2);
  });

  it('submit marks target as SUBMITTED optimistically and POSTs to the right endpoint', async () => {
    listMyAssignments.mockResolvedValue(buildMyList(7));
    const { result } = renderHook(() => useMyAssignments(7));
    await act(async () => {
      await result.current.refresh();
    });
    await act(async () => {
      await result.current.submit(10, { submissionRefId: 555 });
    });
    expect(submitAssignment).toHaveBeenCalledWith(7, 10, { submissionRefId: 555 });
    const updated = result.current.items.find((it) => it.assignmentId === 10);
    expect(updated?.myTarget?.status).toBe('SUBMITTED');
  });

  it('submit refetches and rethrows on failure', async () => {
    listMyAssignments.mockResolvedValue(buildMyList(7));
    submitAssignment.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useMyAssignments(7));
    await act(async () => {
      await result.current.refresh();
    });
    listMyAssignments.mockClear();
    listMyAssignments.mockResolvedValue(buildMyList(7));
    await expect(act(async () => {
      await result.current.submit(10);
    })).rejects.toThrow('boom');
    expect(listMyAssignments).toHaveBeenCalled();
  });
});
