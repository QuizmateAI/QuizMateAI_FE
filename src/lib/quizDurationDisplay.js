/**
 * Chuẩn hóa quiz.duration (BE) sang số phút để hiển thị trong danh sách.
 * Đồng bộ với logic đã dùng ở QuizListView.
 */
export function getDurationInMinutes(quiz) {
  const rawDuration = Number(quiz?.duration) || 0;
  if (!rawDuration) return 0;

  const createVia = String(quiz?.createVia || '').toUpperCase();
  const isAiQuiz = createVia === 'AI';

  const rawTimerMode = quiz?.timerMode;
  const isTotalTimerMode = rawTimerMode === true
    || rawTimerMode === "true"
    || rawTimerMode === 1
    || rawTimerMode === "1"
    || rawTimerMode === "TOTAL";

  if (isAiQuiz) {
    const normalizedSeconds = rawDuration >= 36000
      ? Math.floor(rawDuration / 60)
      : rawDuration;
    return Math.max(1, Math.round(normalizedSeconds / 60));
  }

  const normalizedDurationInSeconds = isTotalTimerMode && rawDuration >= 36000
    ? Math.floor(rawDuration / 60)
    : rawDuration;

  if (isTotalTimerMode) {
    return Math.max(1, Math.round(normalizedDurationInSeconds / 60));
  }

  return rawDuration;
}
