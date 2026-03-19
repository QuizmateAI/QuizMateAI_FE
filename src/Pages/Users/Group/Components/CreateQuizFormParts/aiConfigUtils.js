export const AI_OUTPUT_LANGUAGES = ["Vietnamese", "English", "Japanese"];

export const sumRatios = (items = []) =>
  items.reduce((sum, item) => sum + (Number(item?.ratio) || 0), 0);

export const normalizeItemRatios = (items = [], idKey) =>
  items
    .map((item) => ({
      [idKey]: Number(item?.[idKey]),
      ratio: Math.max(0, Number(item?.ratio) || 0),
    }))
    .filter((item) => Number.isFinite(item[idKey]));

export const getDominantDifficulty = ({ easy = 0, medium = 0, hard = 0 } = {}) => {
  const candidates = [
    { key: "EASY", value: Number(easy) || 0 },
    { key: "MEDIUM", value: Number(medium) || 0 },
    { key: "HARD", value: Number(hard) || 0 },
  ];
  candidates.sort((a, b) => b.value - a.value);
  return candidates[0]?.key || "MEDIUM";
};

export const validateAiDistributions = ({
  aiTotalQuestions,
  difficultyRatios,
  selectedQTypes,
  selectedBloomSkills,
  questionUnit,
  questionTypeUnit,
  bloomUnit,
}) => {
  const totalDifficulty =
    (Number(difficultyRatios?.easy) || 0) +
    (Number(difficultyRatios?.medium) || 0) +
    (Number(difficultyRatios?.hard) || 0);
  const totalQuestionType = sumRatios(selectedQTypes);
  const totalBloom = sumRatios(selectedBloomSkills);

  const difficultyLimit = questionUnit ? aiTotalQuestions : 100;
  const questionTypeLimit = questionTypeUnit ? aiTotalQuestions : 100;
  const bloomLimit = bloomUnit ? aiTotalQuestions : 100;

  if (totalDifficulty > difficultyLimit) {
    return questionUnit
      ? `Difficulty count (${totalDifficulty}) must be <= totalQuestion (${aiTotalQuestions}).`
      : `Difficulty ratio (${totalDifficulty}%) must be <= 100%.`;
  }

  if (selectedQTypes.length > 0 && totalQuestionType > questionTypeLimit) {
    return questionTypeUnit
      ? `Question type count (${totalQuestionType}) must be <= totalQuestion (${aiTotalQuestions}).`
      : `Question type ratio (${totalQuestionType}%) must be <= 100%.`;
  }

  if (selectedBloomSkills.length > 0 && totalBloom > bloomLimit) {
    return bloomUnit
      ? `Bloom count (${totalBloom}) must be <= totalQuestion (${aiTotalQuestions}).`
      : `Bloom ratio (${totalBloom}%) must be <= 100%.`;
  }

  return null;
};

export const buildAiQuizPayload = ({
  aiName,
  selectedMaterialIds,
  selectedDifficultyId,
  selectedDifficulty,
  difficultyRatios,
  aiDuration,
  workspaceId,
  aiTotalQuestions,
  aiPrompt,
  aiOutputLanguage,
  questionTypeUnit,
  selectedQTypes,
  bloomUnit,
  selectedBloomSkills,
  aiQuizIntent,
  questionUnit,
  aiTimerMode,
  aiEasyDuration,
  aiMediumDuration,
  aiHardDuration,
}) => {
  const normalizedQTypes = normalizeItemRatios(selectedQTypes, "questionTypeId");
  const normalizedBloomSkills = normalizeItemRatios(selectedBloomSkills, "bloomId");

  const overallDifficultyEnum =
    selectedDifficultyId === "CUSTOM"
      ? getDominantDifficulty(difficultyRatios)
      : String(selectedDifficulty?.difficultyName || "MEDIUM").toUpperCase();

  const normalizedDuration = Math.max(1, Number(aiDuration) || 1);

  return {
    title: aiName,
    materialIds: selectedMaterialIds,
    overallDifficulty: overallDifficultyEnum,
    durationInMinute: aiTimerMode ? normalizedDuration : 0,
    durationInSecond: 0,
    roadmapId: null,
    phaseId: null,
    knowledgeId: null,
    workspaceId,
    totalQuestion: aiTotalQuestions,
    prompt: aiPrompt,
    outputLanguage: aiOutputLanguage,
    questionTypeUnit,
    questionTypes: normalizedQTypes,
    bloomUnit,
    bloomSkills: normalizedBloomSkills,
    quizIntent: aiQuizIntent || "REVIEW",
    questionUnit,
    easyRatio: difficultyRatios.easy,
    mediumRatio: difficultyRatios.medium,
    hardRatio: difficultyRatios.hard,
    timerMode: aiTimerMode,
    ...(aiTimerMode ? {} : {
      easyDurationInSeconds: Math.max(1, Number(aiEasyDuration) || 1),
      mediumDurationInSeconds: Math.max(1, Number(aiMediumDuration) || 1),
      hardDurationInSeconds: Math.max(1, Number(aiHardDuration) || 1),
    })
  };
};
