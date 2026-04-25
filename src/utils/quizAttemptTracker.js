const ATTEMPTED_QUIZ_IDS_KEY = 'attemptedQuizIds';
const COMPLETED_QUIZ_IDS_KEY = 'completedQuizIds';

function resolveActiveUserIdentity() {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return 'anonymous';
    const user = JSON.parse(raw);
    const userId = Number(user?.id ?? user?.userId);
    if (Number.isFinite(userId) && userId > 0) return `user-${userId}`;
    const email = String(user?.email || '').trim().toLowerCase();
    if (email) return `email-${email}`;
  } catch {
    // Ignore localStorage/JSON issues and use anonymous scope.
  }
  return 'anonymous';
}

function getScopedStorageKey(baseKey) {
  return `${baseKey}:${resolveActiveUserIdentity()}`;
}

function normalizeQuizId(quizId) {
  const parsed = Number(quizId);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function readAttemptedQuizIds() {
  try {
    const raw = localStorage.getItem(getScopedStorageKey(ATTEMPTED_QUIZ_IDS_KEY));
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];
    return arr.map(normalizeQuizId).filter(Boolean);
  } catch {
    return [];
  }
}

function writeAttemptedQuizIds(ids) {
  try {
    localStorage.setItem(getScopedStorageKey(ATTEMPTED_QUIZ_IDS_KEY), JSON.stringify(ids));
  } catch {
    // Ignore localStorage errors in restricted browser modes.
  }
}

export function markQuizAttempted(quizId) {
  const normalized = normalizeQuizId(quizId);
  if (!normalized) return;

  const ids = new Set(readAttemptedQuizIds());
  ids.add(normalized);
  writeAttemptedQuizIds(Array.from(ids));
}

export function hasQuizAttempted(quizId) {
  const normalized = normalizeQuizId(quizId);
  if (!normalized) return false;

  return new Set(readAttemptedQuizIds()).has(normalized);
}

function readCompletedQuizIds() {
  try {
    const raw = localStorage.getItem(getScopedStorageKey(COMPLETED_QUIZ_IDS_KEY));
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];
    return arr.map(normalizeQuizId).filter(Boolean);
  } catch {
    return [];
  }
}

function writeCompletedQuizIds(ids) {
  try {
    localStorage.setItem(getScopedStorageKey(COMPLETED_QUIZ_IDS_KEY), JSON.stringify(ids));
  } catch {
    // Ignore localStorage errors in restricted browser modes.
  }
}

export function markQuizCompleted(quizId) {
  const normalized = normalizeQuizId(quizId);
  if (!normalized) return;

  const ids = new Set(readCompletedQuizIds());
  ids.add(normalized);
  writeCompletedQuizIds(Array.from(ids));
}

export function hasQuizCompleted(quizId) {
  const normalized = normalizeQuizId(quizId);
  if (!normalized) return false;

  return new Set(readCompletedQuizIds()).has(normalized);
}
