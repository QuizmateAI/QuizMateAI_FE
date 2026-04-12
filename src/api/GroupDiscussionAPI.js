import api from './api';
import { unwrapApiData } from '@/Utils/apiResponse';

function buildDiscussionPath(workspaceId, quizId) {
  return `/group/${workspaceId}/quizzes/${quizId}/discussion`;
}

function normalizeMessage(message) {
  if (!message || typeof message !== 'object') return message;
  return {
    ...message,
    id: String(message.id ?? message.messageId ?? ''),
    authorUserName: message.authorUserName || message.authorUsername || message.userName || message.username || '',
    authorAvatar: message.authorAvatar || message.avatar || message.avatarUrl || '',
    authorRole: String(message.authorRole || 'MEMBER').toUpperCase(),
  };
}

/**
 * Get all messages for a thread.
 * @returns {{ messages: Message[] }}
 */
export async function getThreadMessages(workspaceId, quizId, questionId = null) {
  const response = await api.get(buildDiscussionPath(workspaceId, quizId), {
    params: questionId != null ? { questionId } : undefined,
  });
  const payload = unwrapApiData(response) || {};
  return {
    messages: Array.isArray(payload.messages)
      ? payload.messages.map(normalizeMessage).filter(Boolean)
      : [],
  };
}

/**
 * Post a new message.
 * @returns {Message}
 */
export async function postMessage(workspaceId, quizId, questionId = null, { body }) {
  const response = await api.post(buildDiscussionPath(workspaceId, quizId), {
    questionId,
    body,
  });
  return normalizeMessage(unwrapApiData(response));
}

/**
 * Delete a message.
 */
export async function deleteMessage(workspaceId, quizId, questionId = null, messageId) {
  await api.delete(`${buildDiscussionPath(workspaceId, quizId)}/${messageId}`, {
    params: questionId != null ? { questionId } : undefined,
  });
}

/**
 * Get message counts per scope for a quiz — used to render badges on the navigator.
 * @param {number[]} questionIds
 * @returns {{ quiz: number, questions: Record<string, number> }}
 */
export async function getThreadCounts(workspaceId, quizId, questionIds = []) {
  const params = {};
  if (Array.isArray(questionIds) && questionIds.length > 0) {
    params.questionIds = questionIds.filter(Boolean).join(',');
  }

  const response = await api.get(`${buildDiscussionPath(workspaceId, quizId)}/counts`, { params });
  const payload = unwrapApiData(response) || {};
  return {
    quiz: Number(payload.quiz) || 0,
    questions: payload.questions && typeof payload.questions === 'object' ? payload.questions : {},
  };
}
