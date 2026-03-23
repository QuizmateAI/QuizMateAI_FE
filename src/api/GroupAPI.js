import api from './api';

// Lấy danh sách nhóm mà user đã tham gia
export const getMyJoinedGroups = async () => {
  const response = await api.get('/group/me/joined');
  return response;
};

// Tạo nhóm mới (dùng endpoint tạo group workspace)
export const createGroup = async (data) => {
  const response = await api.post('/workspace/create/group', data);
  return response;
};

// Lấy danh sách thành viên của nhóm (có phân trang)
export const getGroupMembers = async (workspaceId, page = 0, size = 50) => {
  const response = await api.get(`/group/${workspaceId}/members?page=${page}&size=${size}`);
  return response;
};

// Leader cấp quyền upload cho thành viên (tối đa 3 member)
export const grantUpload = async (workspaceId, memberId) => {
  const response = await api.post(`/group/${workspaceId}/members/${memberId}/grant-upload`);
  return response;
};

// Leader thu hồi quyền upload của thành viên
export const revokeUpload = async (workspaceId, memberId) => {
  const response = await api.delete(`/group/${workspaceId}/members/${memberId}/grant-upload`);
  return response;
};

// Leader cập nhật vai trò thành viên
export const updateMemberRole = async (workspaceId, memberId, roleName) => {
  const response = await api.put(`/group/${workspaceId}/members/${memberId}/role?roleName=${roleName}`);
  return response;
};

// Leader mời thành viên vào nhóm bằng email
export const inviteMember = async (workspaceId, email) => {
  const response = await api.post(`/group/${workspaceId}/invitation`, { email });
  return response;
};

// Lấy danh sách lời mời đang chờ của nhóm (count + list)
export const getPendingInvitations = async (workspaceId) => {
  const response = await api.get(`/group/${workspaceId}/invitations`);
  return response;
};

// Lấy activity log của nhóm
export const getGroupLogs = async (workspaceId) => {
  const response = await api.get(`/group/${workspaceId}/logs`);
  return response;
};

// Chấp nhận lời mời vào nhóm (từ link email)
export const acceptInvitation = async (token) => {
  const response = await api.get(`/group/invitation/accept?token=${token}`);
  return response;
};

// Leader xóa thành viên khỏi nhóm
export const removeMember = async (workspaceId, memberId) => {
  const response = await api.delete(`/group/${workspaceId}/members/${memberId}`);
  return response;
};
