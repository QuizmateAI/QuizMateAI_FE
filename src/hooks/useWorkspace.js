import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrapApiData } from '@/utils/apiResponse';
import {
  getWorkspacesByUser,
  createWorkspace as createWorkspaceAPI,
  createGroupWorkspace as createGroupWorkspaceAPI,
  updateWorkspace as updateWorkspaceAPI,
  deleteIndividualWorkspace as deleteWorkspaceAPI,
  getWorkspaceById,
  markWorkspaceAccess as markWorkspaceAccessAPI,
} from '@/api/WorkspaceAPI';

const WORKSPACE_TITLE_PLACEHOLDERS = ['name null', 'group name null'];
const WORKSPACE_DESCRIPTION_PLACEHOLDERS = ['description null', 'group description null'];

function isPlaceholderWorkspaceTitle(value) {
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  if (WORKSPACE_TITLE_PLACEHOLDERS.includes(normalized)) return true;
  return /^(name null|group name null)\s*(\(\d+\))?$/.test(normalized);
}

function normalizeText(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeWorkspace(workspace) {
  if (!workspace || typeof workspace !== 'object') return workspace;

  const title = normalizeText(workspace.title);
  const name = normalizeText(workspace.name);
  const displayTitle = normalizeText(workspace.displayTitle);

  const firstValidTitle = [title, name, displayTitle].find((value) => value && !isPlaceholderWorkspaceTitle(value)) || null;

  const normalizedTitle = firstValidTitle;

  const normalizedDisplayTitle = (() => {
    if (displayTitle && !isPlaceholderWorkspaceTitle(displayTitle)) return displayTitle;
    if (normalizedTitle) return normalizedTitle;
    return null;
  })();

  const rawDescription = normalizeText(workspace.description);
  const normalizedDescription = rawDescription && WORKSPACE_DESCRIPTION_PLACEHOLDERS.includes(rawDescription.toLowerCase())
    ? null
    : rawDescription;
  const sourceCount = Number(workspace.sourceCount ?? workspace.materialCount ?? workspace.materialsCount ?? 0);

  return {
    ...workspace,
    title: normalizedTitle,
    name: normalizedTitle,
    displayTitle: normalizedDisplayTitle,
    description: normalizedDescription,
    sourceCount: Number.isFinite(sourceCount) && sourceCount > 0 ? sourceCount : 0,
    lastAccessedAt: workspace.lastAccessedAt ?? null,
  };
}

function normalizeWorkspaceArray(payload) {
  return normalizeWorkspaceList(payload).map(normalizeWorkspace).filter(Boolean);
}

function normalizeWorkspaceList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.result)) return payload.result;
  return [];
}

const WORKSPACES_QUERY_KEY = ['workspaces'];
const GROUPS_QUERY_KEY = ['groups'];
const workspaceDetailQueryKey = (id) => ['workspace', id];

function prependWorkspaceToCurrentPage(oldData, workspace) {
  if (!oldData || !Array.isArray(oldData.workspaces) || !workspace) {
    return oldData;
  }

  const currentWorkspaces = normalizeWorkspaceArray(oldData.workspaces);
  const filteredWorkspaces = currentWorkspaces.filter((item) => item.workspaceId !== workspace.workspaceId);
  const pageSize = Number(oldData?.pagination?.size) || currentWorkspaces.length || 10;
  const nextWorkspaces = [workspace, ...filteredWorkspaces].slice(0, pageSize);
  const isNewWorkspace = filteredWorkspaces.length === currentWorkspaces.length;
  const currentTotalElements = Number(oldData?.pagination?.totalElements);
  const safeTotalElements = Number.isFinite(currentTotalElements)
    ? currentTotalElements
    : currentWorkspaces.length;

  return {
    ...oldData,
    workspaces: nextWorkspaces,
    pagination: {
      ...oldData.pagination,
      size: oldData?.pagination?.size ?? pageSize,
      totalElements: safeTotalElements + (isNewWorkspace ? 1 : 0),
      totalPages: Math.max(Number(oldData?.pagination?.totalPages) || 1, 1),
    },
  };
}

// Hook quản lý toàn bộ logic workspace: CRUD (dùng React Query cho fetch)
export function useWorkspace(options = {}) {
  const { enabled = true } = options;
  const queryClient = useQueryClient();
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState(null);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [sortMode, setSortMode] = useState(() => {
    try {
      const saved = localStorage.getItem('qm_workspace_sort_mode');
      return saved === 'created' ? 'created' : 'recent';
    } catch {
      return 'recent';
    }
  });

  const { data, isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: [...WORKSPACES_QUERY_KEY, page, size, sortMode],
    queryFn: async () => {
      const res = await getWorkspacesByUser(page, size, sortMode);
      const responseData = unwrapApiData(res) || {};
      if (Array.isArray(responseData)) {
        const normalized = normalizeWorkspaceArray(responseData);
        return { workspaces: normalized, pagination: { page: 0, size: normalized.length, totalPages: 1, totalElements: normalized.length } };
      }
      if (responseData.content && Array.isArray(responseData.content)) {
        const normalized = normalizeWorkspaceArray(responseData.content);
        return {
          workspaces: normalized,
          pagination: {
            page: responseData.page ?? responseData.number ?? 0,
            size: responseData.size || size,
            totalPages: responseData.totalPages || 0,
            totalElements: responseData.totalElements || 0,
          },
        };
      }
      return { workspaces: [], pagination: { page: 0, size, totalPages: 0, totalElements: 0 } };
    },
    enabled,
  });

  const workspaces = data?.workspaces ?? [];
  const pagination = data?.pagination ?? { page: 0, size: 10, totalPages: 0, totalElements: 0 };
  const error = queryError?.message || null;

  // Detail cache, keyed by workspaceId. Driven by `currentWorkspaceId` state so
  // navigating between workspaces revalidates against cache instead of doing a
  // fresh GET /workspaces/:id every time.
  const detailQuery = useQuery({
    queryKey: workspaceDetailQueryKey(currentWorkspaceId),
    queryFn: async () => {
      const res = await getWorkspaceById(currentWorkspaceId);
      return normalizeWorkspace(unwrapApiData(res) || null);
    },
    enabled: Boolean(currentWorkspaceId),
  });
  const currentWorkspace = detailQuery.data ?? null;
  const workspaceDetailLoading = Boolean(currentWorkspaceId) && detailQuery.isPending;

  const fetchWorkspaces = useCallback((newPage = 0, newSize = 10) => {
    setPage(newPage);
    setSize(newSize);
  }, []);

  // Lấy chi tiết workspace theo id. Returns the workspace (cached or freshly
  // fetched) so existing `await fetchWorkspaceDetail(...)` callers still work.
  const fetchWorkspaceDetail = useCallback(async (workspaceId) => {
    if (!workspaceId) {
      setCurrentWorkspaceId(null);
      return null;
    }

    setCurrentWorkspaceId(workspaceId);

    // Mark access as a side-effect; on success patch lastAccessedAt in the
    // detail cache and refresh the list so sort-by-recent stays correct.
    void markWorkspaceAccessAPI(workspaceId)
      .then(() => {
        const accessedAt = new Date().toISOString();
        queryClient.setQueryData(workspaceDetailQueryKey(workspaceId), (prev) => (
          prev ? { ...prev, lastAccessedAt: accessedAt } : prev
        ));
        void queryClient.invalidateQueries({ queryKey: WORKSPACES_QUERY_KEY });
      })
      .catch(() => {});

    try {
      return await queryClient.fetchQuery({
        queryKey: workspaceDetailQueryKey(workspaceId),
        queryFn: async () => {
          const res = await getWorkspaceById(workspaceId);
          return normalizeWorkspace(unwrapApiData(res) || null);
        },
      });
    } catch (err) {
      console.error('Lỗi khi lấy chi tiết workspace:', err);
      throw err;
    }
  }, [queryClient]);

  // Thay đổi trang (useQuery tự refetch khi key thay đổi)
  const changePage = useCallback((newPage) => {
    setPage(newPage);
  }, []);

  // Thay đổi kích thước trang
  const changePageSize = useCallback((newSize) => {
    setSize(newSize);
    setPage(0);
  }, []);

  const changeSortMode = useCallback((newSortMode) => {
    const resolved = newSortMode === 'created' ? 'created' : 'recent';
    setSortMode(resolved);
    setPage(0);
    try { localStorage.setItem('qm_workspace_sort_mode', resolved); } catch { /* ignore storage errors */ }
  }, []);

  // Tạo workspace mới
  const createWorkspace = useCallback(async (data) => {
    const res = await createWorkspaceAPI(data);
    const createdWorkspace = normalizeWorkspace(unwrapApiData(res));

    if (page === 0) {
      queryClient.setQueryData(
        [...WORKSPACES_QUERY_KEY, page, size, sortMode],
        (old) => prependWorkspaceToCurrentPage(old, createdWorkspace)
      );
    }

    void queryClient.invalidateQueries({ queryKey: WORKSPACES_QUERY_KEY });
    return createdWorkspace;
  }, [page, queryClient, size, sortMode]);

  // Tạo group workspace mới
  const createGroupWorkspace = useCallback(async (data) => {
    const res = await createGroupWorkspaceAPI(data);
    const createdWorkspace = normalizeWorkspace(unwrapApiData(res));

    if (page === 0) {
      queryClient.setQueryData(
        [...WORKSPACES_QUERY_KEY, page, size, sortMode],
        (old) => prependWorkspaceToCurrentPage(old, createdWorkspace)
      );
    }

    void queryClient.invalidateQueries({ queryKey: WORKSPACES_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: GROUPS_QUERY_KEY });
    return createdWorkspace;
  }, [page, queryClient, size, sortMode]);

  // Cập nhật workspace
  const editWorkspace = useCallback(async (workspaceId, data) => {
    const res = await updateWorkspaceAPI(workspaceId, data);
    const updatedWorkspace = normalizeWorkspace(unwrapApiData(res) || {});
    queryClient.setQueryData([...WORKSPACES_QUERY_KEY, page, size, sortMode], (old) => {
      if (!old) return old;
      return {
        ...old,
        workspaces: normalizeWorkspaceArray(old.workspaces).map((ws) =>
          ws.workspaceId === workspaceId ? updatedWorkspace : ws
        ),
      };
    });
    queryClient.setQueryData(workspaceDetailQueryKey(workspaceId), updatedWorkspace);
    return updatedWorkspace;
  }, [queryClient, page, size, sortMode]);

  // Xóa workspace
  const removeWorkspace = useCallback(async (workspaceId) => {
    await deleteWorkspaceAPI(workspaceId);
    queryClient.removeQueries({ queryKey: workspaceDetailQueryKey(workspaceId) });
    await queryClient.invalidateQueries({ queryKey: WORKSPACES_QUERY_KEY });
  }, [queryClient]);

  return {
    workspaces,
    currentWorkspace,
    loading,
    workspaceDetailLoading,
    error,
    pagination,
    sortMode,
    fetchWorkspaces,
    fetchWorkspaceDetail,
    createWorkspace,
    createGroupWorkspace,
    editWorkspace,
    removeWorkspace,
    changePage,
    changePageSize,
    changeSortMode,
  };
}
