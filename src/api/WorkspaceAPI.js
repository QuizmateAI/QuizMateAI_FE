import api from './api';

// Lấy danh sách workspace theo user đang đăng nhập (có hỗ trợ phân trang)
export const getWorkspacesByUser = async (page = 0, size = 10) => {
  const response = await api.get(`/workSpace/getByUser?page=${page}&size=${size}`);
  return response;
};

// Tạo workspace mới
export const createWorkspace = async (data) => {
  const response = await api.post('/workSpace/create', data);
  return response;
};

// Cập nhật thông tin workspace
export const updateWorkspace = async (workspaceId, data) => {
  const response = await api.put(`/workSpace/${workspaceId}`, data);
  return response;
};

// Xóa workspace
export const deleteWorkspace = async (workspaceId) => {
  const response = await api.delete(`/workSpace/${workspaceId}`);
  return response;
};

// Lấy chi tiết workspace
export const getWorkspaceById = async (workspaceId) => {
  const response = await api.get(`/workSpace/${workspaceId}`);
  return response;
};

// Lấy danh sách roadmap của workspace (có phân trang)
export const getRoadmapsByWorkspace = async (workspaceId, page = 0, size = 10) => {
  const response = await api.get(`/roadmap/workspace/${workspaceId}?page=${page}&size=${size}`);
  return response;
};

// Lấy danh sách topics (có phân trang)
export const getAllTopics = async (page = 0, size = 100) => {
  const response = await api.get(`/topic/all?page=${page}&size=${size}`);
  return response;
};

// Cấu hình Individual Workspace Profile
export const configureIndividualWorkspaceProfile = async (workspaceId, data) => {
  const response = await api.put(`/workspace-profile/individual/${workspaceId}/config`, data);
  return response;
};

// Lấy Profile Cá nhân của Workspace
export const getIndividualWorkspaceProfile = async (workspaceId) => {
  const response = await api.get(`/workspace-profile/individual/${workspaceId}`);
  return response;
};
