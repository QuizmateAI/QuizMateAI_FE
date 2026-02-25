import { useState, useEffect, useCallback } from 'react';
import {
  getWorkspacesByUser,
  createWorkspace as createWorkspaceAPI,
  updateWorkspace as updateWorkspaceAPI,
  deleteWorkspace as deleteWorkspaceAPI,
  getWorkspaceById,
  getAllTopics,
} from '@/api/WorkspaceAPI';

function normalizeWorkspaceList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.result)) return payload.result;
  return [];
}

// Hook quản lý toàn bộ logic workspace: CRUD + topics
export function useWorkspace() {
  const [workspaces, setWorkspaces] = useState([]);
  const [topics, setTopics] = useState([]);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [loading, setLoading] = useState(false);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [workspaceDetailLoading, setWorkspaceDetailLoading] = useState(false);
  const [error, setError] = useState(null);

  // Lấy danh sách workspace của user
  const fetchWorkspaces = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getWorkspacesByUser();
      setWorkspaces(normalizeWorkspaceList(res?.data ?? res));
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách workspace');
      console.error('Lỗi khi lấy danh sách workspace:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Lấy danh sách topics (kèm subjects)
  const fetchTopics = useCallback(async () => {
    setTopicsLoading(true);
    try {
      const res = await getAllTopics(0, 100);
      setTopics(res.data?.content || []);
    } catch (err) {
      console.error('Lỗi khi lấy danh sách topics:', err);
    } finally {
      setTopicsLoading(false);
    }
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
      const workspace = res.data || null;
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

  // Tạo workspace mới
  const createWorkspace = useCallback(async (data) => {
    const res = await createWorkspaceAPI(data);
    const newWorkspace = res?.data ?? res;
    // Thêm workspace mới vào đầu danh sách
    setWorkspaces((prev) => [newWorkspace, ...normalizeWorkspaceList(prev)]);
    return newWorkspace;
  }, []);

  // Cập nhật workspace
  const editWorkspace = useCallback(async (workspaceId, data) => {
    const res = await updateWorkspaceAPI(workspaceId, data);
    const updatedWorkspace = res?.data ?? res;
    // Cập nhật workspace trong danh sách
    setWorkspaces((prev) =>
      normalizeWorkspaceList(prev).map((ws) => (ws.workspaceId === workspaceId ? updatedWorkspace : ws))
    );
    return updatedWorkspace;
  }, []);

  // Xóa workspace
  const removeWorkspace = useCallback(async (workspaceId) => {
    await deleteWorkspaceAPI(workspaceId);
    // Loại bỏ workspace khỏi danh sách
    setWorkspaces((prev) => normalizeWorkspaceList(prev).filter((ws) => ws.workspaceId !== workspaceId));
  }, []);

  // Tải dữ liệu khi mount
  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  return {
    workspaces,
    topics,
    currentWorkspace,
    loading,
    topicsLoading,
    workspaceDetailLoading,
    error,
    fetchWorkspaces,
    fetchTopics,
    fetchWorkspaceDetail,
    createWorkspace,
    editWorkspace,
    removeWorkspace,
  };
}
