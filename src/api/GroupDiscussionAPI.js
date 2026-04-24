import api from './api';

function buildDiscussionPath(workspaceId, quizId, suffix = '') {
  return `/group/${encodeURIComponent(String(workspaceId))}/quizzes/${encodeURIComponent(String(quizId))}/discussion${suffix}`;
}

function buildThreadParams(questionId = null) {
  if (questionId == null) {
    return {};
  }
  return { questionId };
}

export async function getThreadMessages(workspaceId, quizId, questionId = null) {
  const response = await api.get(buildDiscussionPath(workspaceId, quizId), {
    params: buildThreadParams(questionId),
  });
  return response?.data ?? { messages: [] };
}

export async function postMessage(workspaceId, quizId, questionId = null, payload = {}) {
  const response = await api.post(buildDiscussionPath(workspaceId, quizId), {
    questionId,
    parentMessageId: payload?.parentMessageId ?? null,
    body: String(payload?.body || ''),
  });
  return response?.data ?? null;
}

export async function deleteMessage(workspaceId, quizId, _questionId = null, messageId) {
  await api.delete(buildDiscussionPath(workspaceId, quizId, `/${encodeURIComponent(String(messageId))}`));
}

export async function getThreadCounts(workspaceId, quizId, questionIds = []) {
  const safeQuestionIds = Array.isArray(questionIds)
    ? questionIds.filter((questionId) => questionId != null)
    : [];

  const response = await api.get(buildDiscussionPath(workspaceId, quizId, '/counts'), {
    params: safeQuestionIds.length > 0
      ? { questionIds: safeQuestionIds.join(',') }
      : {},
  });

  return response?.data ?? { quiz: 0, questions: {} };
}
