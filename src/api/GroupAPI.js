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

// Lấy danh sách nhóm mà user đã tham gia
export const getMyJoinedGroups = async () => {
  const response = await api.get('/group/me/joined');
  return response;
};

export const getPublicGroups = async (search) => {
  const response = await api.get(buildUrl('/group/public', { search }));
  return response;
};

export const joinPublicGroup = async (workspaceId) => {
  const response = await api.post(`/group/${workspaceId}/join`);
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

// Leader cấp quyền upload cho thành viên theo workspaceMemberId
export const grantUpload = async (workspaceId, memberId) => {
  const response = await api.post(`/group/${workspaceId}/members/${memberId}/grant-upload`);
  return response;
};

// Leader thu hồi quyền upload của thành viên theo workspaceMemberId
export const revokeUpload = async (workspaceId, memberId) => {
  const response = await api.delete(`/group/${workspaceId}/members/${memberId}/grant-upload`);
  return response;
};

// Leader cập nhật vai trò thành viên theo workspaceMemberId
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

// Leader hủy lời mời đang chờ
export const cancelInvitation = async (workspaceId, invitationId) => {
  if (invitationId == null) throw new Error('Missing invitation id');
  const id = encodeURIComponent(String(invitationId));
  return await api.delete(`/group/${workspaceId}/invitations/${id}`);
};

// Leader gửi lại lời mời đang chờ
export const resendInvitation = async (workspaceId, invitationId) => {
  if (invitationId == null) throw new Error('Missing invitation id');
  const id = encodeURIComponent(String(invitationId));
  return await api.post(`/group/${workspaceId}/invitations/${id}/resend`);
};

// Lấy activity log của nhóm
export const getGroupLogs = async (workspaceId) => {
  const response = await api.get(`/group/${workspaceId}/logs`);
  return response;
};

// Lấy capability hiện tại của tôi trong group
export const getGroupMyPermissions = async (workspaceId) => {
  const response = await api.get(`/group/${workspaceId}/me/permissions`);
  return response;
};

// Lấy permission assignment của một member theo workspaceMemberId
export const getGroupMemberPermissions = async (workspaceId, memberId) => {
  const response = await api.get(`/group/${workspaceId}/members/${memberId}/permissions`);
  return response;
};

// Sync permission assignment của một member theo workspaceMemberId
export const syncGroupMemberPermissions = async (workspaceId, memberId, permissionCodes = []) => {
  const response = await api.put(`/group/${workspaceId}/members/${memberId}/permissions`, {
    permissionCodes,
  });
  return response;
};

/** Thống kê tổng hợp nhóm (leader): quiz, tài liệu, phân loại AI */
export const getGroupDashboardSummary = async (workspaceId) => {
  const response = await api.get(`/group/${workspaceId}/dashboard/summary`);
  return response;
};

/** Dashboard tóm tắt từng thành viên (leader), phân trang */
export const getMemberDashboardCards = async (workspaceId, page = 0, size = 20) => {
  const response = await api.get(`/group/${workspaceId}/dashboard/members?page=${page}&size=${size}`);
  return response;
};

/** Chi tiết dashboard một thành viên theo workspaceMemberId */
export const getMemberDashboardDetail = async (workspaceId, memberId, attemptMode = 'ALL') => {
  const mode = encodeURIComponent(String(attemptMode || 'ALL').toUpperCase());
  const response = await api.get(`/group/${workspaceId}/dashboard/members/${memberId}?attemptMode=${mode}`);
  return response;
};

/** Latest learning snapshots của các member trong group */
export const getGroupLearningSnapshotsLatest = async (
  workspaceId,
  { period = 'DAILY', classification, sort = 'averageScore,desc', page = 0, size = 20 } = {},
) => {
  const response = await api.get(buildUrl(`/group/${workspaceId}/dashboard/learning-snapshots/latest`, {
    period,
    classification,
    sort,
    page,
    size,
  }));
  return response;
};

/** Tổng hợp learning snapshot của group */
export const getGroupLearningSnapshotsSummary = async (
  workspaceId,
  { period = 'DAILY', from, to } = {},
) => {
  const response = await api.get(buildUrl(`/group/${workspaceId}/dashboard/learning-snapshots/summary`, {
    period,
    from,
    to,
  }));
  return response;
};

/** Ranking member theo metric learning snapshot */
export const getGroupLearningSnapshotsRanking = async (
  workspaceId,
  { period = 'DAILY', date, metric = 'averageScore', direction = 'desc', page = 0, size = 20 } = {},
) => {
  const response = await api.get(buildUrl(`/group/${workspaceId}/dashboard/learning-snapshots/ranking`, {
    period,
    date,
    metric,
    direction,
    page,
    size,
  }));
  return response;
};

/** Generate/rebuild learning snapshots cho cả group */
export const generateGroupLearningSnapshots = async (workspaceId, data = {}) => {
  const response = await api.post(`/group/${workspaceId}/dashboard/learning-snapshots:generate`, data);
  return response;
};

/** Latest learning snapshot của một member trong group */
export const getGroupMemberLearningSnapshotLatest = async (
  workspaceId,
  workspaceMemberId,
  { period = 'DAILY' } = {},
) => {
  const response = await api.get(buildUrl(`/group/${workspaceId}/dashboard/members/${workspaceMemberId}/learning-snapshots/latest`, {
    period,
  }));
  return response;
};

/** Lịch sử learning snapshot của một member */
export const getGroupMemberLearningSnapshots = async (
  workspaceId,
  workspaceMemberId,
  { period = 'DAILY', from, to, page = 0, size = 20 } = {},
) => {
  const response = await api.get(buildUrl(`/group/${workspaceId}/dashboard/members/${workspaceMemberId}/learning-snapshots`, {
    period,
    from,
    to,
    page,
    size,
  }));
  return response;
};

/** Trend learning snapshot của một member */
export const getGroupMemberLearningSnapshotTrend = async (
  workspaceId,
  workspaceMemberId,
  { period = 'DAILY', from, to } = {},
) => {
  const response = await api.get(buildUrl(`/group/${workspaceId}/dashboard/members/${workspaceMemberId}/learning-snapshots/trend`, {
    period,
    from,
    to,
  }));
  return response;
};

/** Compare hai learning snapshot của một member */
export const compareGroupMemberLearningSnapshots = async (
  workspaceId,
  workspaceMemberId,
  fromSnapshotId,
  toSnapshotId,
) => {
  const response = await api.get(buildUrl(`/group/${workspaceId}/dashboard/members/${workspaceMemberId}/learning-snapshots/compare`, {
    fromSnapshotId,
    toSnapshotId,
  }));
  return response;
};

/** Generate/rebuild learning snapshot cho một member */
export const generateGroupMemberLearningSnapshot = async (workspaceId, workspaceMemberId, data = {}) => {
  const response = await api.post(`/group/${workspaceId}/dashboard/members/${workspaceMemberId}/learning-snapshots:generate`, data);
  return response;
};

// Xem trước thông tin lời mời vào nhóm
export const previewInvitation = async (token) => {
  const response = await api.get(`/group/invitation/preview?token=${token}`, {
    skipAuthHeader: true,
    skipAuthRedirect: true,
  });
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

// Leader bật/tắt chế độ public của nhóm
export const toggleVisibility = async (workspaceId) => {
  const response = await api.put(`/group/${workspaceId}/visibility`);
  return response;
};

/** Xếp hạng tổng hợp nhóm — aggregate 1 API thay vì N+1 */
export const getGroupOverallRanking = async (workspaceId) => {
  const response = await api.get(`/group/${workspaceId}/ranking/overall`);
  return response;
};

/** Chi tiết điểm RP của một thành viên trong bảng xếp hạng nhóm */
export const getGroupRankingMemberDetail = async (workspaceId, userId) => {
  const response = await api.get(`/group/${workspaceId}/ranking/overall/members/${userId}`);
  return response;
};

/** Leader xóa nhóm (soft delete). Yêu cầu confirmText = "delete group". */
export const deleteGroup = async (workspaceId, confirmText) => {
  const response = await api.delete(`/group/${workspaceId}`, {
    data: { confirmText },
  });
  return response;
};
