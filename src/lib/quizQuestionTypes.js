export const QUESTION_TYPE_LABEL_FALLBACKS = {
  SINGLE_CHOICE: "Single choice",
  MULTIPLE_CHOICE: "Multiple choice",
  TRUE_FALSE: "True/False",
  FILL_IN_BLANK: "Fill in the blank",
  MATCHING: "Matching pairs",
  IMAGED_BASED: "Image based",
  SHORT_ANSWER: "Short answer",
};

export const ADVANCED_QUIZ_QUESTION_TYPES = [
  "FILL_IN_BLANK",
  "MATCHING",
  "IMAGED_BASED",
  "SHORT_ANSWER",
];

export function normalizeQuizQuestionType(questionType) {
  return String(questionType || "").trim().toUpperCase();
}

export function isAdvancedQuizQuestionType(questionType) {
  return ADVANCED_QUIZ_QUESTION_TYPES.includes(normalizeQuizQuestionType(questionType));
}
