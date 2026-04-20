/**
 * Xác định luồng edit phù hợp cho quiz.
 *
 * @param {object} quiz - Quiz object (cần createVia)
 * @param {boolean} hasHistoryCompleted - true nếu user đã có ít nhất 1 completed attempt
 * @returns {"EDIT_IN_PLACE" | "REQUIRES_DUPLICATE" | "LOCKED_UNTIL_FIRST_ATTEMPT"}
 *
 * Matrix (theo plan section 5.1):
 *   AI   + chưa attempt → LOCKED_UNTIL_FIRST_ATTEMPT
 *   AI   + đã attempt   → REQUIRES_DUPLICATE
 *   Manual + chưa attempt → EDIT_IN_PLACE
 *   Manual + đã attempt   → REQUIRES_DUPLICATE
 */
export function resolveEditRule(quiz, hasHistoryCompleted) {
  const createVia = String(quiz?.createVia || "").toUpperCase();
  const isManual = createVia === "MANUAL" || createVia === "MANUAL_FROM_AI";

  if (isManual) {
    return hasHistoryCompleted ? "REQUIRES_DUPLICATE" : "EDIT_IN_PLACE";
  }

  // AI quiz (default)
  return hasHistoryCompleted ? "REQUIRES_DUPLICATE" : "LOCKED_UNTIL_FIRST_ATTEMPT";
}
