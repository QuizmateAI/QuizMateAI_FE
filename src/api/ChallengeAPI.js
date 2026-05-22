import api from './api';

const CHALLENGE_CREATE_TIMEOUT_MS = 60000;
const CHALLENGE_DETAIL_TIMEOUT_MS = 60000;

export const listChallenges = async (workspaceId, status) => {
  const params = status ? `?status=${status}` : '';
  return await api.get(`/group/${workspaceId}/challenges${params}`);
};

export const getChallengeDetail = async (workspaceId, eventId) => {
  return await api.get(`/group/${workspaceId}/challenges/${eventId}`, {
    timeout: CHALLENGE_DETAIL_TIMEOUT_MS,
  });
};

export const createChallenge = async (workspaceId, data) => {
  return await api.post(`/group/${workspaceId}/challenges`, data, {
    timeout: CHALLENGE_CREATE_TIMEOUT_MS,
  });
};

export const updateChallenge = async (workspaceId, eventId, data) => {
  return await api.put(`/group/${workspaceId}/challenges/${eventId}`, data);
};

export const cancelChallenge = async (workspaceId, eventId) => {
  return await api.post(`/group/${workspaceId}/challenges/${eventId}/cancel`);
};

export const publishChallenge = async (workspaceId, eventId) => {
  return await api.post(`/group/${workspaceId}/challenges/${eventId}/publish`);
};

export const startChallenge = async (workspaceId, eventId) => {
  return await api.post(`/group/${workspaceId}/challenges/${eventId}/start`);
};

export const finishChallenge = async (workspaceId, eventId) => {
  return await api.post(`/group/${workspaceId}/challenges/${eventId}/finish`);
};

// BE ChallengeInviteRequest: userIds max 100. Slice defensive ở API level —
// caller hiện tại không vượt biên, nhưng tránh 400 cho future caller.
export const CHALLENGE_INVITE_USER_IDS_MAX = 100;

export const inviteToChallenge = async (workspaceId, eventId, userIds) => {
  const safeUserIds = Array.isArray(userIds)
    ? userIds.slice(0, CHALLENGE_INVITE_USER_IDS_MAX)
    : [];
  return await api.post(`/group/${workspaceId}/challenges/${eventId}/invite`, { userIds: safeUserIds });
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

export const getChallengeDashboard = async (workspaceId, eventId) => {
  return await api.get(`/group/${workspaceId}/challenges/${eventId}/dashboard`);
};

export const getChallengeTeams = async (workspaceId, eventId) => {
  return await api.get(`/group/${workspaceId}/challenges/${eventId}/teams`);
};

export const getChallengeBracket = async (workspaceId, eventId) => {
  return await api.get(`/group/${workspaceId}/challenges/${eventId}/bracket`);
};

export const listQuizReviewContributors = async (workspaceId, quizId) => {
  return await api.get(`/group/${workspaceId}/quiz-review-contributors/${quizId}`);
};

export const addQuizReviewContributor = async (workspaceId, quizId, body) => {
  return await api.post(`/group/${workspaceId}/quiz-review-contributors/${quizId}`, body);
};

// BE BatchInviteQuizReviewersRequest: invitations max 2 items.
export const BATCH_REVIEWER_INVITATIONS_MAX = 2;

export const batchInviteQuizReviewers = async (workspaceId, quizId, invitations) => {
  const safeInvitations = Array.isArray(invitations)
    ? invitations.slice(0, BATCH_REVIEWER_INVITATIONS_MAX)
    : [];
  return await api.post(
    `/group/${workspaceId}/quiz-review-contributors/${quizId}/invite-batch`,
    { invitations: safeInvitations },
  );
};

export const removeQuizReviewContributor = async (workspaceId, quizId, userId) => {
  return await api.delete(`/group/${workspaceId}/quiz-review-contributors/${quizId}/${userId}`);
};

export const submitQuizReviewDecision = async (workspaceId, quizId, decision) => {
  return await api.post(`/group/${workspaceId}/quiz-review-contributors/${quizId}/decision`, { decision });
};

export const recordQuizReviewView = async (workspaceId, quizId) => {
  return await api.post(`/group/${workspaceId}/quiz-review-contributors/${quizId}/review-view`);
};

export const setLeaderPublishBypass = async (workspaceId, eventId, reason) => {
  return await api.post(`/group/${workspaceId}/challenges/${eventId}/leader-publish-bypass`, { reason });
};

export const updateLeaderParticipation = async (workspaceId, eventId, participates) => {
  return await api.put(
    `/group/${workspaceId}/challenges/${eventId}/leader-participation`,
    { participates },
  );
};

// ── Question flags (reviewer gửi yêu cầu xem xét câu hỏi) ──────

export const listQuizReviewFlags = async (workspaceId, quizId) => {
  return await api.get(`/group/${workspaceId}/quiz-review-contributors/${quizId}/flags`);
};

export const flagQuizQuestion = async (workspaceId, quizId, questionId, reason) => {
  return await api.post(`/group/${workspaceId}/quiz-review-contributors/${quizId}/flags`, { questionId, reason });
};

export const unflagQuizQuestion = async (workspaceId, quizId, questionId) => {
  return await api.delete(`/group/${workspaceId}/quiz-review-contributors/${quizId}/flags/${questionId}`);
};

export const resolveQuizReviewFlag = async (workspaceId, quizId, flagId) => {
  return await api.post(`/group/${workspaceId}/quiz-review-contributors/${quizId}/flags/${flagId}/resolve`);
};

export const getMyQuizReviewContributor = async (workspaceId, quizId) => {
  return await api.get(`/group/${workspaceId}/quiz-review-contributors/${quizId}/me`);
};

export const acceptQuizReviewInvitation = async (workspaceId, quizId) => {
  return await api.post(`/group/${workspaceId}/quiz-review-contributors/${quizId}/review-invitation/accept`);
};

export const declineQuizReviewInvitation = async (workspaceId, quizId) => {
  return await api.post(`/group/${workspaceId}/quiz-review-contributors/${quizId}/review-invitation/decline`);
};

export const setQuizReviewCompleteOk = async (workspaceId, quizId, acknowledged = true) => {
  return await api.post(`/group/${workspaceId}/quiz-review-contributors/${quizId}/review-complete-ok`, { acknowledged });
};

export const deleteQuestionFromSnapshot = async (workspaceId, quizId, questionId, note) => {
  return await api.delete(
    `/group/${workspaceId}/quiz-review-contributors/${quizId}/questions/${questionId}`,
    { data: { note } },
  );
};

export const raiseSnapshotConcern = async (workspaceId, quizId, note) => {
  return await api.post(
    `/group/${workspaceId}/quiz-review-contributors/${quizId}/concern`,
    { note },
  );
};

export const clearSnapshotConcern = async (workspaceId, quizId, reviewerUserId = null) => {
  const path = `/group/${workspaceId}/quiz-review-contributors/${quizId}/concern/clear`;
  const url = reviewerUserId ? `${path}?reviewerUserId=${reviewerUserId}` : path;
  return await api.post(url);
};

export const listSnapshotDeletionAudits = async (workspaceId, quizId) => {
  return await api.get(`/group/${workspaceId}/quizzes/${quizId}/question-deletions`);
};
