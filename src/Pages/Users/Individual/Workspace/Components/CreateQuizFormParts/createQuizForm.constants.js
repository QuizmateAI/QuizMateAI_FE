export const QUESTION_TYPES = ["multipleChoice", "multipleSelect", "trueFalse", "fillBlank", "shortAnswer"];

export const DIFFICULTY_LEVELS = ["easy", "medium", "hard"];

export const QUIZ_INTENTS = ["PRE_LEARNING", "POST_LEARNING", "REVIEW"];

export const IMAGE_BASED_QUESTION_TYPE = "IMAGED_BASED";

export const HIDDEN_AI_QUESTION_TYPES = ["IMAGED_BASED"];

export const AI_MINIMUM_SECONDS_PER_QUESTION = 30;

export const AI_MINIMUM_QUESTION_COUNT = 10;

export const AI_MAXIMUM_QUESTION_COUNT = 100;

export const AI_VALIDATION_SECTION_ORDER = ["general", "settings", "difficulty", "questionTypes", "bloomSkills", "prompt"];

export const AI_VALIDATION_ERROR_KEYS = [
  "aiName",
  "aiPrompt",
  "aiTotalQuestions",
  "aiDuration",
  "aiDurations",
  "aiDifficulty",
  "selectedQTypes",
  "selectedBloomSkills",
];

export const BLOOM_LEVELS = [
  { id: 1, key: "remember" },
  { id: 2, key: "understand" },
  { id: 3, key: "apply" },
  { id: 4, key: "analyze" },
  { id: 5, key: "evaluate" },
];

export const QUESTION_TYPE_LABEL_FALLBACKS = {
  SINGLE_CHOICE: "Single choice",
  MULTIPLE_CHOICE: "Multiple choice",
  SHORT_ANSWER: "Short answer",
  TRUE_FALSE: "True/False",
  FILL_IN_BLANK: "Fill in the blank",
  IMAGED_BASED: "Image based",
};

export const SCORING_STRATEGIES = {
  balanced: { easy: 10, medium: 15, hard: 20 },
  linear: { easy: 10, medium: 20, hard: 30 },
  elite: { easy: 10, medium: 20, hard: 40 },
  tight: { easy: 10, medium: 11, hard: 12 },
};
