import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWorkspace } from '@/hooks/useWorkspace';
import { createGroupWorkspace, createWorkspace, getWorkspaceById, getWorkspacesByUser, updateWorkspace, deleteIndividualWorkspace } from '@/api/WorkspaceAPI';

vi.mock('@/api/WorkspaceAPI', () => ({
  createGroupWorkspace: vi.fn(),
  createWorkspace: vi.fn(),
  deleteIndividualWorkspace: vi.fn(),
  getWorkspaceById: vi.fn(),
  getWorkspacesByUser: vi.fn(),
  updateWorkspace: vi.fn(),
}));

function createWrapper(queryClient) {
  return function Wrapper({ children }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe('useWorkspace performance invariants', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getWorkspacesByUser.mockResolvedValue({ data: { data: { content: [], totalElements: 0, totalPages: 0, size: 10, number: 0 } } });
    getWorkspaceById.mockResolvedValue({ data: { data: null } });
    updateWorkspace.mockResolvedValue({ data: { data: null } });
    deleteIndividualWorkspace.mockResolvedValue({});
  });

  it('returns created individual workspace without waiting for invalidateQueries to settle', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    queryClient.setQueryData(['workspaces', 0, 10], {
      workspaces: [{ workspaceId: 1, title: 'Existing workspace' }],
      pagination: { page: 0, size: 10, totalPages: 1, totalElements: 1 },
    });

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries').mockImplementation(() => new Promise(() => {}));
    createWorkspace.mockResolvedValue({
      data: {
        data: {
          workspaceId: 2,
          title: 'New workspace',
        },
      },
    });

    const { result } = renderHook(() => useWorkspace({ enabled: false }), {
      wrapper: createWrapper(queryClient),
    });

    let resolution;
    await act(async () => {
      resolution = await Promise.race([
        result.current.createWorkspace({ title: 'New workspace' }).then(() => 'resolved'),
        new Promise((resolve) => setTimeout(() => resolve('timeout'), 25)),
      ]);
    });

    expect(resolution).toBe('resolved');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['workspaces'] });
    expect(queryClient.getQueryData(['workspaces', 0, 10]).workspaces[0].workspaceId).toBe(2);
  });

  it('returns created group workspace without waiting for background invalidations', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    queryClient.setQueryData(['workspaces', 0, 10], {
      workspaces: [],
      pagination: { page: 0, size: 10, totalPages: 0, totalElements: 0 },
    });

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries').mockImplementation(() => new Promise(() => {}));
    createGroupWorkspace.mockResolvedValue({
      data: {
        data: {
          workspaceId: 99,
          title: 'New group workspace',
          workspaceKind: 'GROUP',
        },
      },
    });

    const { result } = renderHook(() => useWorkspace({ enabled: false }), {
      wrapper: createWrapper(queryClient),
    });

    let resolution;
    await act(async () => {
      resolution = await Promise.race([
        result.current.createGroupWorkspace({ title: 'New group workspace' }).then(() => 'resolved'),
        new Promise((resolve) => setTimeout(() => resolve('timeout'), 25)),
      ]);
    });

    expect(resolution).toBe('resolved');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['workspaces'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['groups'] });
    expect(queryClient.getQueryData(['workspaces', 0, 10]).workspaces[0].workspaceId).toBe(99);
  });
});
