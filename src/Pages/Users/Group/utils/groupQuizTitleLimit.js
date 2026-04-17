export const GROUP_LEVEL_QUIZ_TITLE_MAX_LENGTH = 30;

function extractLeadingNumber(value) {
  if (value == null) return null;

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const matched = String(value).match(/\d+/);
  return matched ? Number(matched[0]) : null;
}

export function resolveGroupQuizTitleMaxLength(groupSubscription) {
  const planLevel = extractLeadingNumber(
    groupSubscription?.plan?.planLevel
    ?? groupSubscription?.planLevel
    ?? null,
  );

  return Number.isFinite(planLevel) && planLevel > 0
    ? GROUP_LEVEL_QUIZ_TITLE_MAX_LENGTH
    : null;
}
