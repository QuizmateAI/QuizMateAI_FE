import api from './api';

// Lấy danh sách users (có hỗ trợ phân trang)
export const getAllUsers = async (page = 0, size = 10) => {
  const response = await api.get(`/management/users?page=${page}&size=${size}`);
  return response;
};

export const updateUserStatus = async (userId, status) => {
  const response = await api.put(`/management/users/${userId}/status?status=${status}`);
  return response;
};

// Lấy danh sách groups (có hỗ trợ phân trang)
export const getAllGroups = async (page = 0, size = 10) => {
  const response = await api.get(`/management/groups?page=${page}&size=${size}`);
  return response;
};

export const getGroupDetail = async (groupId) => {
  const response = await api.get(`/management/groups/${groupId}`);
  return response;
};

export const createAdmin = async (data) => {
  const response = await api.post('/management/admins', data);
  return response;
};

export const getAllSystemUsers = async () => {
  const response = await api.get('/rbac/system/users');
  return response;
};

export const listPermissions = async () => {
  const response = await api.get('/rbac/system/permissions');
  return response;
};

export const getUserPermissions = async (userId) => {
  const response = await api.get(`/rbac/system/users/${userId}/permissions`);
  return response;
};

export const syncUserPermissions = async (userId, permissionCodes) => {
  const params = new URLSearchParams();
  const codes = Array.isArray(permissionCodes) ? permissionCodes : [];
  codes.forEach((code) => params.append('permissionCodes', String(code)));
  const query = params.toString();
  const url = `/rbac/system/users/${userId}/permissions${query ? `?${query}` : ''}`;
  const response = await api.put(url);
  return response;
};

export const grantPermissionToUser = async (userId, permissionCode) => {
  const response = await api.post(`/rbac/system/users/${userId}/permissions/${encodeURIComponent(permissionCode)}`);
  return response;
};

export const revokePermissionFromUser = async (userId, permissionCode) => {
  const response = await api.delete(`/rbac/system/users/${userId}/permissions/${encodeURIComponent(permissionCode)}`);
  return response;
};

export const getAuditLogs = async (actorId, action) => {
  const params = new URLSearchParams();
  if (actorId != null) params.append('actorId', actorId);
  if (action) params.append('action', action);
  const response = await api.get(`/rbac/system/audit-logs?${params.toString()}`);
  return response;
};
