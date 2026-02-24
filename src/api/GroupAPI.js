import api from './api';

// Lấy danh sách nhóm mà user đã tham gia
export const getMyJoinedGroups = async () => {
  const response = await api.get('/group/me/joined');
  return response;
};

// Tạo nhóm mới
export const createGroup = async (data) => {
  const response = await api.post('/group/create', data);
  return response;
};

// Lấy danh sách thành viên của nhóm (có phân trang)
export const getGroupMembers = async (groupId, page = 0, size = 50) => {
  const response = await api.get(`/group/${groupId}/members?page=${page}&size=${size}`);
  return response;
};

// Leader cấp quyền upload cho thành viên (tối đa 3 member)
export const grantUpload = async (groupId, memberId) => {
  const response = await api.post(`/group/${groupId}/members/${memberId}/grant-upload`);
  return response;
};

// Leader thu hồi quyền upload của thành viên
export const revokeUpload = async (groupId, memberId) => {
  const response = await api.delete(`/group/${groupId}/members/${memberId}/grant-upload`);
  return response;
};

// Leader cập nhật vai trò thành viên
export const updateMemberRole = async (groupId, memberId, roleName) => {
  const response = await api.put(`/group/${groupId}/members/${memberId}/role?roleName=${roleName}`);
  return response;
};

// Leader mời thành viên vào nhóm bằng email
export const inviteMember = async (groupId, email) => {
  const response = await api.post(`/group/${groupId}/invitation`, { email });
  return response;
};

// Chấp nhận lời mời vào nhóm (từ link email)
export const acceptInvitation = async (token) => {
  const response = await api.get(`/group/invitation/accept?token=${token}`);
  return response;
};

// Leader xóa thành viên khỏi nhóm
export const removeMember = async (groupId, memberId) => {
  const response = await api.delete(`/group/${groupId}/members/${memberId}`);
  return response;
};
