import api from './api';

export const listWorkspaceReviewBans = async (workspaceId) => {
  return await api.get(`/group/${workspaceId}/review-bans`);
};

export const banWorkspaceReviewer = async (workspaceId, userId, note, relatedQuizId = null) => {
  const body = { note };
  if (relatedQuizId != null) body.relatedQuizId = relatedQuizId;
  return await api.post(`/group/${workspaceId}/review-bans/${userId}`, body);
};

export const unbanWorkspaceReviewer = async (workspaceId, userId) => {
  return await api.delete(`/group/${workspaceId}/review-bans/${userId}`);
};
