const STORAGE_PREFIX = 'quizmate:group-quiz:question-deletions:';

function storageKey(workspaceId, quizId) {
  return `${STORAGE_PREFIX}${Number(workspaceId)}:${Number(quizId)}`;
}

export function loadGroupQuizQuestionDeletionLog(workspaceId, quizId) {
  const ws = Number(workspaceId);
  const q = Number(quizId);
  if (!Number.isFinite(ws) || !Number.isFinite(q)) return [];
  try {
    const raw = window.localStorage.getItem(storageKey(ws, q));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function appendGroupQuizQuestionDeletion(workspaceId, quizId, entry) {
  const ws = Number(workspaceId);
  const q = Number(quizId);
  if (!Number.isFinite(ws) || !Number.isFinite(q) || !entry) return;

  const prev = loadGroupQuizQuestionDeletionLog(ws, q);
  const next = [entry, ...prev].slice(0, 100);
  try {
    window.localStorage.setItem(storageKey(ws, q), JSON.stringify(next));
  } catch {
    /* quota / privacy mode */
  }
}
