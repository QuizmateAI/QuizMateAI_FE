export function normalizeDiscussionMessageId(value) {
  if (value == null) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized || null;
}

export function buildDiscussionMessageMap(messages = []) {
  const messageMap = new Map();
  (Array.isArray(messages) ? messages : []).forEach((message) => {
    const messageId = normalizeDiscussionMessageId(message?.id ?? message?.messageId);
    if (messageId) {
      messageMap.set(messageId, message);
    }
  });
  return messageMap;
}

export function formatDiscussionPreview(body) {
  return String(body || '')
    .replace(/\[\[q:\d+:(\d+)\]\]/g, '#$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getDiscussionReplyPreview(messageMap, message) {
  const parentMessageId = normalizeDiscussionMessageId(message?.parentMessageId);
  if (!parentMessageId) {
    return null;
  }

  const parentMessage = messageMap.get(parentMessageId);
  if (!parentMessage) {
    return {
      id: parentMessageId,
      missing: true,
      authorName: null,
      body: '',
    };
  }

  return {
    id: parentMessageId,
    missing: false,
    authorName: parentMessage.authorName || null,
    authorUserName: parentMessage.authorUserName || null,
    body: formatDiscussionPreview(parentMessage.body),
  };
}

// Only show two visual tiers in the UI: top-level comments and a single reply tier.
export function getDiscussionReplyDepth(messageMap, message, maxDepth = 1) {
  let depth = 0;
  let cursorId = normalizeDiscussionMessageId(message?.parentMessageId);
  const visited = new Set();

  while (cursorId && depth < maxDepth && !visited.has(cursorId)) {
    visited.add(cursorId);
    depth += 1;
    cursorId = normalizeDiscussionMessageId(messageMap.get(cursorId)?.parentMessageId);
  }

  return depth;
}

export function upsertDiscussionMessage(messages = [], incomingMessage) {
  const incomingId = normalizeDiscussionMessageId(incomingMessage?.id ?? incomingMessage?.messageId);
  if (!incomingId) {
    return Array.isArray(messages) ? messages : [];
  }

  const nextMessages = Array.isArray(messages) ? [...messages] : [];
  const existingIndex = nextMessages.findIndex((message) => {
    const messageId = normalizeDiscussionMessageId(message?.id ?? message?.messageId);
    return messageId === incomingId;
  });

  if (existingIndex >= 0) {
    nextMessages[existingIndex] = {
      ...nextMessages[existingIndex],
      ...incomingMessage,
    };
  } else {
    nextMessages.push(incomingMessage);
  }

  return nextMessages.sort(compareDiscussionMessages);
}

export function removeDiscussionMessage(messages = [], messageId) {
  const normalizedMessageId = normalizeDiscussionMessageId(messageId);
  if (!normalizedMessageId) {
    return Array.isArray(messages) ? messages : [];
  }

  return (Array.isArray(messages) ? messages : []).filter((message) => {
    const currentMessageId = normalizeDiscussionMessageId(message?.id ?? message?.messageId);
    return currentMessageId !== normalizedMessageId;
  });
}

export function matchesDiscussionRealtimeThread(event, quizId, questionId = null) {
  const eventType = String(event?.type || '').trim().toUpperCase();
  if (!eventType || eventType === 'SOCKET_RESTORED') {
    return false;
  }

  const normalizedQuizId = Number(quizId);
  const eventQuizId = Number(event?.quizId);
  if (Number.isInteger(normalizedQuizId) && normalizedQuizId > 0 && eventQuizId !== normalizedQuizId) {
    return false;
  }

  const normalizedQuestionId = questionId == null ? null : Number(questionId);
  const eventQuestionId = event?.questionId == null || event?.questionId === ''
    ? null
    : Number(event.questionId);

  if (normalizedQuestionId == null) {
    return eventQuestionId == null;
  }

  return eventQuestionId === normalizedQuestionId;
}

function compareDiscussionMessages(left, right) {
  const leftTime = Date.parse(left?.createdAt || '') || 0;
  const rightTime = Date.parse(right?.createdAt || '') || 0;

  if (leftTime !== rightTime) {
    return leftTime - rightTime;
  }

  const leftId = Number(left?.messageId ?? left?.id ?? 0) || 0;
  const rightId = Number(right?.messageId ?? right?.id ?? 0) || 0;
  return leftId - rightId;
}
