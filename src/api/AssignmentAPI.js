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

// Leader-only: list paginated workspace assignments. Targets không populate
// (BE optimize). Mỗi item kèm submittedCount/totalTargets/overdue.
export const listGroupAssignments = async (workspaceId, { page = 0, size = 20 } = {}) => {
  if (workspaceId == null) throw new Error('Missing workspaceId');
  return await api.get(buildUrl(`/group/${workspaceId}/assignments`, { page, size }));
};

// Detail — member chỉ xem được nếu là target. Có `myTarget` (PENDING/SUBMITTED).
export const getAssignmentDetail = async (workspaceId, assignmentId) => {
  if (workspaceId == null) throw new Error('Missing workspaceId');
  if (assignmentId == null) throw new Error('Missing assignmentId');
  const id = encodeURIComponent(String(assignmentId));
  return await api.get(`/group/${workspaceId}/assignments/${id}`);
};

// My assignments across workspaces. Caller filter theo workspaceId nếu muốn
// scoped view. Mỗi item có `myTarget` chứa status/submittedAt/submissionRefId.
export const listMyAssignments = async () => {
  return await api.get('/group/me/assignments');
};

// Create — MANAGE_ASSIGNMENT. Body: { resourceType, resourceId, title,
// description?, dueAt?, audienceType, targetUserIds? }. BE fanout
// ASSIGNMENT_RECEIVED notification cho mỗi target.
export const createAssignment = async (workspaceId, payload) => {
  if (workspaceId == null) throw new Error('Missing workspaceId');
  return await api.post(`/group/${workspaceId}/assignments`, payload);
};

// Update — chỉ creator hoặc leader. Body chỉ cho phép 3 field: title,
// description?, dueAt?. Resource và audience KHÔNG đổi được sau khi tạo
// (tránh confuse targets đã nộp).
export const updateAssignment = async (workspaceId, assignmentId, payload) => {
  if (workspaceId == null) throw new Error('Missing workspaceId');
  if (assignmentId == null) throw new Error('Missing assignmentId');
  const id = encodeURIComponent(String(assignmentId));
  return await api.put(`/group/${workspaceId}/assignments/${id}`, payload);
};

// Delete soft — creator hoặc leader. HTTP 204.
export const deleteAssignment = async (workspaceId, assignmentId) => {
  if (workspaceId == null) throw new Error('Missing workspaceId');
  if (assignmentId == null) throw new Error('Missing assignmentId');
  const id = encodeURIComponent(String(assignmentId));
  return await api.delete(`/group/${workspaceId}/assignments/${id}`);
};

// Submit — idempotent. Body optional submissionRefId (vd quizAttemptId vừa
// hoàn thành để deeplink kết quả).
export const submitAssignment = async (workspaceId, assignmentId, payload = {}) => {
  if (workspaceId == null) throw new Error('Missing workspaceId');
  if (assignmentId == null) throw new Error('Missing assignmentId');
  const id = encodeURIComponent(String(assignmentId));
  return await api.post(`/group/${workspaceId}/assignments/${id}/submit`, payload);
};
