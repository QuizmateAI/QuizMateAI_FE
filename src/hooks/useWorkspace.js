import { useState, useEffect, useCallback } from 'react';
import {
  getWorkspacesByUser,
  createWorkspace as createWorkspaceAPI,
  updateWorkspace as updateWorkspaceAPI,
  deleteWorkspace as deleteWorkspaceAPI,
  getAllTopics,
} from '@/api/WorkspaceAPI';

// Hook quản lý toàn bộ logic workspace: CRUD + topics
export function useWorkspace() {
  const [workspaces, setWorkspaces] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Lấy danh sách workspace của user
  const fetchWorkspaces = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getWorkspacesByUser();
      setWorkspaces(res.data || []);
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

  // Tạo workspace mới
  const createWorkspace = useCallback(async (data) => {
    const res = await createWorkspaceAPI(data);
    // Thêm workspace mới vào đầu danh sách
    setWorkspaces((prev) => [res.data, ...prev]);
    return res.data;
  }, []);

  // Cập nhật workspace
  const editWorkspace = useCallback(async (workspaceId, data) => {
    const res = await updateWorkspaceAPI(workspaceId, data);
    // Cập nhật workspace trong danh sách
    setWorkspaces((prev) =>
      prev.map((ws) => (ws.workspaceId === workspaceId ? res.data : ws))
    );
    return res.data;
  }, []);

  // Xóa workspace
  const removeWorkspace = useCallback(async (workspaceId) => {
    await deleteWorkspaceAPI(workspaceId);
    // Loại bỏ workspace khỏi danh sách
    setWorkspaces((prev) => prev.filter((ws) => ws.workspaceId !== workspaceId));
  }, []);

  // Tải dữ liệu khi mount
  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  return {
    workspaces,
    topics,
    loading,
    topicsLoading,
    error,
    fetchWorkspaces,
    fetchTopics,
    createWorkspace,
    editWorkspace,
    removeWorkspace,
  };
}
