import api from './api';

/**
 * Leader block / unban / list reviewer bị ban trong 1 workspace nhóm.
 *
 * Use case: leader phát hiện reviewer cố tình xóa nhiều câu để phá đề (đi kèm
 * auto-concern khi vượt ngưỡng 30%). Block để user này không xuất hiện trong
 * picker mời reviewer cho các quiz mới của workspace.
 *
 * Scope = workspace: ban ở group A vẫn cho review group B. Leader có thể gỡ.
 */

/** Liệt kê reviewer đang bị ban active (revokedAt IS NULL). */
export const listWorkspaceReviewBans = async (workspaceId) => {
  return await api.get(`/group/${workspaceId}/review-bans`);
};

/** Block 1 user khỏi việc được mời review trong workspace — note bắt buộc ≥ 10 ký tự. */
export const banWorkspaceReviewer = async (workspaceId, userId, note, relatedQuizId = null) => {
  const body = { note };
  if (relatedQuizId != null) body.relatedQuizId = relatedQuizId;
  return await api.post(`/group/${workspaceId}/review-bans/${userId}`, body);
};

/** Gỡ ban active của 1 user. */
export const unbanWorkspaceReviewer = async (workspaceId, userId) => {
  return await api.delete(`/group/${workspaceId}/review-bans/${userId}`);
};
