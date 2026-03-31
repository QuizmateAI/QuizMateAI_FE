export const QUIZ_TITLE_MAX_LENGTH = 20;

export function normalizeQuizTitleInput(value) {
  return String(value ?? "").slice(0, QUIZ_TITLE_MAX_LENGTH);
}
