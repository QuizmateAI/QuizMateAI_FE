import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrapApiData } from '@/Utils/apiResponse';
import {
  getWorkspacesByUser,
  createWorkspace as createWorkspaceAPI,
  createGroupWorkspace as createGroupWorkspaceAPI,
  updateWorkspace as updateWorkspaceAPI,
  deleteIndividualWorkspace as deleteWorkspaceAPI,
  getWorkspaceById,
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

  return {
    ...workspace,
    title: normalizedTitle,
    name: normalizedTitle,
    displayTitle: normalizedDisplayTitle,
    description: normalizedDescription,
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

// Hook quản lý toàn bộ logic workspace: CRUD (dùng React Query cho fetch)
export function useWorkspace(options = {}) {
  const { enabled = true } = options;
  const queryClient = useQueryClient();
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [workspaceDetailLoading, setWorkspaceDetailLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);

  const { data, isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: [...WORKSPACES_QUERY_KEY, page, size],
    queryFn: async () => {
      const res = await getWorkspacesByUser(page, size);
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
            page: responseData.number || 0,
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

  const fetchWorkspaces = useCallback((newPage = 0, newSize = 10) => {
    setPage(newPage);
    setSize(newSize);
  }, []);

  // Lấy chi tiết workspace theo id
  const fetchWorkspaceDetail = useCallback(async (workspaceId) => {
    if (!workspaceId) {
      setCurrentWorkspace(null);
      return null;
    }

    setWorkspaceDetailLoading(true);
    try {
      const res = await getWorkspaceById(workspaceId);
      const workspace = normalizeWorkspace(unwrapApiData(res) || null);
      setCurrentWorkspace(workspace);
      return workspace;
    } catch (err) {
      console.error('Lỗi khi lấy chi tiết workspace:', err);
      setCurrentWorkspace(null);
      throw err;
    } finally {
      setWorkspaceDetailLoading(false);
    }
  }, []);

  // Thay đổi trang (useQuery tự refetch khi key thay đổi)
  const changePage = useCallback((newPage) => {
    setPage(newPage);
  }, []);

  // Thay đổi kích thước trang
  const changePageSize = useCallback((newSize) => {
    setSize(newSize);
    setPage(0);
  }, []);

  // Tạo workspace mới
  const createWorkspace = useCallback(async (data) => {
    const res = await createWorkspaceAPI(data);
    await queryClient.invalidateQueries({ queryKey: WORKSPACES_QUERY_KEY });
    return normalizeWorkspace(unwrapApiData(res));
  }, [queryClient]);

  // Tạo group workspace mới
  const createGroupWorkspace = useCallback(async (data) => {
    const res = await createGroupWorkspaceAPI(data);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: WORKSPACES_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: GROUPS_QUERY_KEY }),
    ]);
    return normalizeWorkspace(unwrapApiData(res));
  }, [queryClient]);

  // Cập nhật workspace
  const editWorkspace = useCallback(async (workspaceId, data) => {
    const res = await updateWorkspaceAPI(workspaceId, data);
    const updatedWorkspace = normalizeWorkspace(unwrapApiData(res) || {});
    queryClient.setQueryData([...WORKSPACES_QUERY_KEY, page, size], (old) => {
      if (!old) return old;
      return {
        ...old,
        workspaces: normalizeWorkspaceArray(old.workspaces).map((ws) =>
          ws.workspaceId === workspaceId ? updatedWorkspace : ws
        ),
      };
    });
    if (currentWorkspace?.workspaceId === workspaceId) {
      setCurrentWorkspace(updatedWorkspace);
    }
    return updatedWorkspace;
  }, [currentWorkspace?.workspaceId, queryClient, page, size]);

  // Xóa workspace
  const removeWorkspace = useCallback(async (workspaceId) => {
    await deleteWorkspaceAPI(workspaceId);
    await queryClient.invalidateQueries({ queryKey: WORKSPACES_QUERY_KEY });
  }, [queryClient]);

  return {
    workspaces,
    currentWorkspace,
    loading,
    workspaceDetailLoading,
    error,
    pagination,
    fetchWorkspaces,
    fetchWorkspaceDetail,
    createWorkspace,
    createGroupWorkspace,
    editWorkspace,
    removeWorkspace,
    changePage,
    changePageSize,
  };
}
