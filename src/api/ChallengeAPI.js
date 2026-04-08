import api from './api';

export const listChallenges = async (workspaceId, status) => {
  const params = status ? `?status=${status}` : '';
  return await api.get(`/group/${workspaceId}/challenges${params}`);
};

export const getChallengeDetail = async (workspaceId, eventId) => {
  return await api.get(`/group/${workspaceId}/challenges/${eventId}`);
};

export const createChallenge = async (workspaceId, data) => {
  return await api.post(`/group/${workspaceId}/challenges`, data);
};

export const updateChallenge = async (workspaceId, eventId, data) => {
  return await api.put(`/group/${workspaceId}/challenges/${eventId}`, data);
};

export const cancelChallenge = async (workspaceId, eventId) => {
  return await api.post(`/group/${workspaceId}/challenges/${eventId}/cancel`);
};

export const inviteToChallenge = async (workspaceId, eventId, userIds) => {
  return await api.post(`/group/${workspaceId}/challenges/${eventId}/invite`, { userIds });
};

export const registerForChallenge = async (workspaceId, eventId) => {
  return await api.post(`/group/${workspaceId}/challenges/${eventId}/register`);
};

export const acceptChallengeInvitation = async (workspaceId, eventId) => {
  return await api.post(`/group/${workspaceId}/challenges/${eventId}/accept-invite`);
};

export const startChallengeAttempt = async (workspaceId, eventId) => {
  return await api.post(`/group/${workspaceId}/challenges/${eventId}/start-attempt`);
};

export const getChallengeLeaderboard = async (workspaceId, eventId) => {
  return await api.get(`/group/${workspaceId}/challenges/${eventId}/leaderboard`);
};

/** Leader: người review đề snapshot — không được đăng ký challenge */
export const listQuizReviewContributors = async (workspaceId, quizId) => {
  return await api.get(`/group/${workspaceId}/quiz-review-contributors/${quizId}`);
};

export const addQuizReviewContributor = async (workspaceId, quizId, body) => {
  return await api.post(`/group/${workspaceId}/quiz-review-contributors/${quizId}`, body);
};

export const removeQuizReviewContributor = async (workspaceId, quizId, userId) => {
  return await api.delete(`/group/${workspaceId}/quiz-review-contributors/${quizId}/${userId}`);
};
