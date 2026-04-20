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

export function getDiscussionReplyDepth(messageMap, message, maxDepth = 2) {
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
