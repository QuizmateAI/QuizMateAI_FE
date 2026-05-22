export function resolveEditRule(quiz, hasHistoryCompleted) {
  const createVia = String(quiz?.createVia || "").toUpperCase();
  const isManual = createVia === "MANUAL" || createVia === "MANUAL_FROM_AI";

  if (isManual) {
    return hasHistoryCompleted ? "REQUIRES_DUPLICATE" : "EDIT_IN_PLACE";
  }

  // AI quiz (default)
  return hasHistoryCompleted ? "REQUIRES_DUPLICATE" : "LOCKED_UNTIL_FIRST_ATTEMPT";
}
