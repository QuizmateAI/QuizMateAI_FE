export const QUIZ_TITLE_MAX_LENGTH = 20;

export function normalizeQuizTitleInput(value, maxLength = QUIZ_TITLE_MAX_LENGTH) {
  const normalizedValue = String(value ?? "");
  const resolvedMaxLength = Number(maxLength);

  return Number.isFinite(resolvedMaxLength) && resolvedMaxLength > 0
    ? normalizedValue.slice(0, resolvedMaxLength)
    : normalizedValue;
}
