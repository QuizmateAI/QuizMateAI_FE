import { useState, useEffect, useCallback } from 'react';
import {
  getWorkspacesByUser,
  createWorkspace as createWorkspaceAPI,
  updateWorkspace as updateWorkspaceAPI,
  deleteWorkspace as deleteWorkspaceAPI,
  getWorkspaceById,
  getAllTopics,
} from '@/api/WorkspaceAPI';

// Hook quản lý toàn bộ logic workspace: CRUD + topics
export function useWorkspace() {
  const [workspaces, setWorkspaces] = useState([]);
  const [topics, setTopics] = useState([]);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [loading, setLoading] = useState(false);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [workspaceDetailLoading, setWorkspaceDetailLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Paging state
  const [pagination, setPagination] = useState({
    page: 0,
    size: 10,
    totalPages: 0,
    totalElements: 0,
  });

  // Lấy danh sách workspace của user (có hỗ trợ phân trang)
  const fetchWorkspaces = useCallback(async (page = 0, size = 10) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getWorkspacesByUser(page, size);
      const responseData = res.data || {};
      
      // Xử lý cấu trúc response có thể là paginated hoặc array thuần
      if (Array.isArray(responseData)) {
        // Trường hợp BE trả về mảng trực tiếp (không có paging)
        setWorkspaces(responseData);
        setPagination({ page: 0, size: responseData.length, totalPages: 1, totalElements: responseData.length });
      } else if (responseData.content && Array.isArray(responseData.content)) {
        // Trường hợp BE trả về object có paging (Spring Page format)
        setWorkspaces(responseData.content);
        setPagination({
          page: responseData.number || 0,
          size: responseData.size || size,
          totalPages: responseData.totalPages || 0,
          totalElements: responseData.totalElements || 0,
        });
      } else {
        // Fallback: set empty array
        setWorkspaces([]);
        setPagination({ page: 0, size: size, totalPages: 0, totalElements: 0 });
      }
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách workspace');
      console.error('Lỗi khi lấy danh sách workspace:', err);
      setWorkspaces([]);
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

  // Thay đổi trang
  const changePage = useCallback(async (newPage) => {
    await fetchWorkspaces(newPage, pagination.size);
  }, [fetchWorkspaces, pagination.size]);

  // Thay đổi kích thước trang
  const changePageSize = useCallback(async (newSize) => {
    await fetchWorkspaces(0, newSize);
  }, [fetchWorkspaces]);

  // Tạo workspace mới
  const createWorkspace = useCallback(async (data) => {
    const res = await createWorkspaceAPI(data);
    // Tải lại danh sách sau khi tạo mới
    await fetchWorkspaces(pagination.page, pagination.size);
    return res.data;
  }, [fetchWorkspaces, pagination.page, pagination.size]);

  // Cập nhật workspace
  const editWorkspace = useCallback(async (workspaceId, data) => {
    const res = await updateWorkspaceAPI(workspaceId, data);
    // Cập nhật workspace trong danh sách local
    setWorkspaces((prev) =>
      prev.map((ws) => (ws.workspaceId === workspaceId ? res.data : ws))
    );
    return res.data;
  }, []);

  // Xóa workspace
  const removeWorkspace = useCallback(async (workspaceId) => {
    await deleteWorkspaceAPI(workspaceId);
    // Tải lại danh sách sau khi xóa
    await fetchWorkspaces(pagination.page, pagination.size);
  }, [fetchWorkspaces, pagination.page, pagination.size]);

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
    pagination,
    fetchWorkspaces,
    fetchTopics,
    fetchWorkspaceDetail,
    createWorkspace,
    editWorkspace,
    removeWorkspace,
    changePage,
    changePageSize,
  };
}
