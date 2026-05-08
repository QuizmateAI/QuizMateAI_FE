/** Ghi nhận một lần chuyển quiz → flashcard trong quiz detail (đến khi BE trả cờ riêng). */

const STORAGE_PREFIX = 'quizmate:quiz-detail:flashcard-done:';

function key(quizId) {
  return `${STORAGE_PREFIX}${Number(quizId)}`;
}

export function readQuizFlashcardConversion(quizId) {
  const qid = Number(quizId);
  if (!Number.isFinite(qid) || qid <= 0) return null;
  try {
    const raw = window.localStorage.getItem(key(qid));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function markQuizFlashcardConverted(quizId, payload = {}) {
  const qid = Number(quizId);
  if (!Number.isFinite(qid) || qid <= 0) return;
  try {
    window.localStorage.setItem(
      key(qid),
      JSON.stringify({
        convertedAt: new Date().toISOString(),
        ...payload,
      }),
    );
  } catch {
    /* noop */
  }
}
