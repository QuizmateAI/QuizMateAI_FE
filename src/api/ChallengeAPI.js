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

export const publishChallenge = async (workspaceId, eventId) => {
  return await api.post(`/group/${workspaceId}/challenges/${eventId}/publish`);
};

export const startChallenge = async (workspaceId, eventId) => {
  return await api.post(`/group/${workspaceId}/challenges/${eventId}/start`);
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

export const getChallengeDashboard = async (workspaceId, eventId) => {
  return await api.get(`/group/${workspaceId}/challenges/${eventId}/dashboard`);
};

export const getChallengeTeams = async (workspaceId, eventId) => {
  return await api.get(`/group/${workspaceId}/challenges/${eventId}/teams`);
};

export const getChallengeBracket = async (workspaceId, eventId) => {
  return await api.get(`/group/${workspaceId}/challenges/${eventId}/bracket`);
};

export const createChallengeRoundQuiz = async (workspaceId, eventId, roundNumber) => {
  return await api.post(`/group/${workspaceId}/challenges/${eventId}/rounds/${roundNumber}/quiz`);
};

/** Leader: người review đề snapshot — không được đăng ký challenge */
export const listQuizReviewContributors = async (workspaceId, quizId) => {
  return await api.get(`/group/${workspaceId}/quiz-review-contributors/${quizId}`);
};

export const addQuizReviewContributor = async (workspaceId, quizId, body) => {
  return await api.post(`/group/${workspaceId}/quiz-review-contributors/${quizId}`, body);
};

/**
 * Gửi đồng loạt lời mời reviewer (tối đa 2 người) → BE gửi email song song.
 * body = { invitations: [{ userId }, ...] }
 */
export const batchInviteQuizReviewers = async (workspaceId, quizId, invitations) => {
  return await api.post(
    `/group/${workspaceId}/quiz-review-contributors/${quizId}/invite-batch`,
    { invitations },
  );
};

/** Legacy endpoint: hiện không còn phân reviewer chính/phụ. */
export const setPrimaryQuizReviewer = async (workspaceId, quizId, userId) => {
  return await api.patch(
    `/group/${workspaceId}/quiz-review-contributors/${quizId}/set-primary/${userId}`,
  );
};

export const removeQuizReviewContributor = async (workspaceId, quizId, userId) => {
  return await api.delete(`/group/${workspaceId}/quiz-review-contributors/${quizId}/${userId}`);
};

/** Reviewer: gửi phiếu duyệt APPROVED | REJECTED */
export const submitQuizReviewDecision = async (workspaceId, quizId, decision) => {
  return await api.post(`/group/${workspaceId}/quiz-review-contributors/${quizId}/decision`, { decision });
};

/** Reviewer: ghi nhận đã mở xem snapshot */
export const recordQuizReviewView = async (workspaceId, quizId) => {
  return await api.post(`/group/${workspaceId}/quiz-review-contributors/${quizId}/review-view`);
};

/** Leader: cho phép xuất bản khi reviewer không phối hợp (lý do ≥ 20 ký tự) */
export const setLeaderPublishBypass = async (workspaceId, eventId, reason) => {
  return await api.post(`/group/${workspaceId}/challenges/${eventId}/leader-publish-bypass`, { reason });
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

/** Reviewer: lấy bản ghi review của mình (xác nhận đề ổn, …) */
export const getMyQuizReviewContributor = async (workspaceId, quizId) => {
  return await api.get(`/group/${workspaceId}/quiz-review-contributors/${quizId}/me`);
};

export const acceptQuizReviewInvitation = async (workspaceId, quizId) => {
  return await api.post(`/group/${workspaceId}/quiz-review-contributors/${quizId}/review-invitation/accept`);
};

export const declineQuizReviewInvitation = async (workspaceId, quizId) => {
  return await api.post(`/group/${workspaceId}/quiz-review-contributors/${quizId}/review-invitation/decline`);
};

/** Reviewer: xác nhận đã xem xong — đề ổn (acknowledged=false để bỏ xác nhận) */
export const setQuizReviewCompleteOk = async (workspaceId, quizId, acknowledged = true) => {
  return await api.post(`/group/${workspaceId}/quiz-review-contributors/${quizId}/review-complete-ok`, { acknowledged });
};

/** Leader: xóa câu hỏi khỏi snapshot quiz (chỉ leader mới có quyền, reviewer chỉ được flag) */
export const deleteQuestionFromSnapshot = async (workspaceId, quizId, questionId) => {
  return await api.delete(`/group/${workspaceId}/quiz-review-contributors/${quizId}/questions/${questionId}`);
};
