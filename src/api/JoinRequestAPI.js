import api from './api';

const buildUrl = (path, params = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `${path}?${query}` : path;
};

// Member submit request vào nhóm private. Public group dùng /join thay vì
// endpoint này — nếu vẫn gọi vào đây BE trả 1363 JOIN_REQUEST_PUBLIC_GROUP.
// message optional (max 500), dùng để giải thích lý do xin gia nhập.
export const submitJoinRequest = async (workspaceId, payload = {}) => {
  if (workspaceId == null) throw new Error('Missing workspaceId');
  return await api.post(`/group/${workspaceId}/join-request`, payload);
};

// Hủy request đang PENDING của tôi cho workspace. HTTP 204; lỗi 1360 nếu
// không có request pending.
export const cancelJoinRequest = async (workspaceId) => {
  if (workspaceId == null) throw new Error('Missing workspaceId');
  return await api.delete(`/group/${workspaceId}/join-request`);
};

// List request của user hiện tại trên tất cả workspaces — dùng cho landing
// "My requests" để user theo dõi/hủy.
export const listMyJoinRequests = async () => {
  return await api.get('/group/me/join-requests');
};

// Leader list pending request trong workspace. Yêu cầu MANAGE_MEMBERS. Trả
// kèm pendingCount để hiển thị badge mà không cần count thủ công.
export const listGroupJoinRequests = async (workspaceId, { page = 0, size = 20 } = {}) => {
  if (workspaceId == null) throw new Error('Missing workspaceId');
  return await api.get(buildUrl(`/group/${workspaceId}/join-requests`, { page, size }));
};

// Leader approve — tạo (hoặc reactivate) WorkspaceMember role=MEMBER, status
// ACTIVE. Body có decisionNote optional (max 500).
export const approveJoinRequest = async (workspaceId, joinRequestId, payload = {}) => {
  if (workspaceId == null) throw new Error('Missing workspaceId');
  if (joinRequestId == null) throw new Error('Missing joinRequestId');
  const id = encodeURIComponent(String(joinRequestId));
  return await api.post(`/group/${workspaceId}/join-requests/${id}/approve`, payload);
};

// Leader reject. Body cùng shape với approve. Không tạo member.
export const rejectJoinRequest = async (workspaceId, joinRequestId, payload = {}) => {
  if (workspaceId == null) throw new Error('Missing workspaceId');
  if (joinRequestId == null) throw new Error('Missing joinRequestId');
  const id = encodeURIComponent(String(joinRequestId));
  return await api.post(`/group/${workspaceId}/join-requests/${id}/reject`, payload);
};
