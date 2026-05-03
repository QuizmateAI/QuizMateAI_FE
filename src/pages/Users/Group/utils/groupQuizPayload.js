// Helpers thuần xử lý payload quiz từ form / WS event của group workspace.

/** Payload từ CreateQuizForm (manual / AI) — có thể lồng ApiResponse { data }. */
export function extractGroupCreatedQuizPayload(payload) {
  if (payload == null || typeof payload !== 'object') return null;
  let cur = payload;
  for (let depth = 0; depth < 4; depth += 1) {
    const quizId = Number(cur.quizId ?? cur.id);
    if (Number.isInteger(quizId) && quizId > 0) {
      return {
        ...cur,
        quizId,
        title: cur.title ?? '',
      };
    }
    if (cur.data != null && typeof cur.data === 'object') {
      cur = cur.data;
    } else {
      break;
    }
  }
  return null;
}

/** Trả về true nếu payload realtime cho biết quiz đang trong trạng thái xử lý (tương đương UI loading state). */
export function isRealtimeProcessingQuizPayload(payload) {
  if (payload == null || typeof payload !== 'object') return false;
  let current = payload;

  for (let depth = 0; depth < 4; depth += 1) {
    const taskId = String(current?.websocketTaskId ?? current?.taskId ?? '').trim();
    const status = String(current?.status ?? current?.final_status ?? '').toUpperCase();
    const percent = Number(
      current?.percent
      ?? current?.progressPercent
      ?? current?.processingPercent
      ?? current?.data?.percent
      ?? current?.data?.progressPercent
      ?? 0
    );

    if (taskId) return true;
    if (['PROCESSING', 'PENDING', 'QUEUED'].includes(status)) return true;
    if (Number.isFinite(percent) && percent > 0 && percent < 100) return true;

    if (current?.data != null && typeof current.data === 'object') {
      current = current.data;
      continue;
    }

    break;
  }

  return false;
}
