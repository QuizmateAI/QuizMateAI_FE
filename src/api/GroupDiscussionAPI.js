/**
 * GroupDiscussionAPI — localStorage stub.
 * Drop-in replaceable with real REST/WebSocket calls once the backend is ready.
 *
 * Thread scopes:
 *  - quiz-level  : questionId = null
 *  - question    : questionId = <number>
 */

const STORE_KEY = 'qm_group_discussions_v1';

function readStore() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeStore(data) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  } catch {
    // quota exceeded — silently ignore
  }
}

function threadKey(workspaceId, quizId, questionId) {
  return questionId != null
    ? `w${workspaceId}:q${quizId}:qu${questionId}`
    : `w${workspaceId}:q${quizId}`;
}

/**
 * Get all messages for a thread.
 * @returns {{ messages: Message[] }}
 */
export async function getThreadMessages(workspaceId, quizId, questionId = null) {
  const store = readStore();
  const key = threadKey(workspaceId, quizId, questionId);
  return { messages: store[key]?.messages || [] };
}

/**
 * Post a new message.
 * @returns {Message}
 */
export async function postMessage(workspaceId, quizId, questionId = null, { body, authorId, authorName, authorRole }) {
  const store = readStore();
  const key = threadKey(workspaceId, quizId, questionId);
  if (!store[key]) store[key] = { messages: [] };

  const msg = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    authorId,
    authorName,
    authorRole,
    body: body.trim(),
    createdAt: new Date().toISOString(),
  };

  store[key].messages.push(msg);
  writeStore(store);
  return msg;
}

/**
 * Delete a message (hard delete).
 */
export async function deleteMessage(workspaceId, quizId, questionId = null, messageId) {
  const store = readStore();
  const key = threadKey(workspaceId, quizId, questionId);
  if (!store[key]) return;
  store[key].messages = store[key].messages.filter((m) => m.id !== messageId);
  writeStore(store);
}

/**
 * Get message counts per scope for a quiz — used to render badges on the navigator.
 * @param {number[]} questionIds
 * @returns {{ quiz: number, questions: Record<string, number> }}
 */
export async function getThreadCounts(workspaceId, quizId, questionIds = []) {
  const store = readStore();

  const quizKey = threadKey(workspaceId, quizId, null);
  const quizCount = (store[quizKey]?.messages || []).length;

  const questions = {};
  for (const qId of questionIds) {
    const k = threadKey(workspaceId, quizId, qId);
    questions[String(qId)] = (store[k]?.messages || []).length;
  }

  return { quiz: quizCount, questions };
}
