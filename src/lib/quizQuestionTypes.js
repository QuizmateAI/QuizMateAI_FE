export const QUESTION_TYPE_LABEL_FALLBACKS = {
  SINGLE_CHOICE: "Single choice",
  MULTIPLE_CHOICE: "Multiple choice",
  TRUE_FALSE: "True/False",
  FILL_IN_BLANK: "Fill in the blank",
  MATCHING: "Matching pairs",
  IMAGED_BASED: "Image based",
  SHORT_ANSWER: "Short answer",
};

export const DIFFICULTY_LABEL_FALLBACKS = {
  EASY: "Easy",
  MEDIUM: "Medium",
  HARD: "Hard",
  CUSTOM: "Custom",
  UNSPECIFIED: "Unspecified",
};

export const BLOOM_SKILL_LABEL_FALLBACKS = {
  REMEMBER: "Remember",
  UNDERSTAND: "Understand",
  APPLY: "Apply",
  ANALYZE: "Analyze",
  EVALUATE: "Evaluate",
  CREATE: "Create",
  UNSPECIFIED: "Unspecified",
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

export function getQuizQuestionTypeLabel(questionType, t) {
  const normalizedType = normalizeQuizQuestionType(questionType);
  const fallbackLabel = QUESTION_TYPE_LABEL_FALLBACKS[normalizedType] || questionType || "-";
  return typeof t === "function"
    ? t(`workspace.quiz.aiConfig.questionTypeLabels.${normalizedType}`, fallbackLabel)
    : fallbackLabel;
}

export function getQuizDifficultyLabel(difficulty, t) {
  const normalizedDifficulty = String(difficulty || "").trim().toUpperCase();
  const fallbackLabel = DIFFICULTY_LABEL_FALLBACKS[normalizedDifficulty] || difficulty || "-";

  if (!normalizedDifficulty || typeof t !== "function") {
    return fallbackLabel;
  }

  const quizLabel = t(`workspace.quiz.difficultyLevels.${normalizedDifficulty.toLowerCase()}`, "");
  if (quizLabel) {
    return quizLabel;
  }

  const statsLabel = t(`workspace.questionStats.difficulty.${normalizedDifficulty}`, "");
  if (statsLabel) {
    return statsLabel;
  }

  return fallbackLabel;
}

export function getBloomSkillLabel(bloomSkill, t) {
  const normalizedBloomSkill = String(bloomSkill || "").trim().toUpperCase();
  const fallbackLabel = BLOOM_SKILL_LABEL_FALLBACKS[normalizedBloomSkill] || bloomSkill || "-";

  if (!normalizedBloomSkill || typeof t !== "function") {
    return fallbackLabel;
  }

  const quizLabel = t(`workspace.quiz.bloomLevels.${normalizedBloomSkill.toLowerCase()}`, "");
  if (quizLabel) {
    return quizLabel;
  }

  const statsLabel = t(`workspace.questionStats.bloom.${normalizedBloomSkill}`, "");
  if (statsLabel) {
    return statsLabel;
  }

  return fallbackLabel;
}
