import {
  AI_MAXIMUM_QUESTION_COUNT,
  AI_MINIMUM_QUESTION_COUNT,
  AI_MINIMUM_SECONDS_PER_QUESTION,
  AI_VALIDATION_SECTION_ORDER,
  DIFFICULTY_LEVELS,
} from "./createQuizForm.constants";
import { isAdvancedQuizQuestionType } from "@/lib/quizQuestionTypes";

export const shuffle = (items) => {
  const clone = [...items];
  for (let index = clone.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [clone[index], clone[swapIndex]] = [clone[swapIndex], clone[index]];
  }
  return clone;
};

export const splitIntegerRandom = (parts, total) => {
  if (parts <= 0) {
    return [];
  }

  const base = Math.floor(total / parts);
  const remainder = Math.max(0, total - (base * parts));
  const values = Array(parts).fill(base);
  const indexes = shuffle(Array.from({ length: parts }, (_, index) => index));

  for (let index = 0; index < remainder; index += 1) {
    values[indexes[index]] += 1;
  }

  return values;
};

export const distributeConfigValues = (items, targetTotal, unitByCount = false) => {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const lockedTotal = items
    .filter((item) => item.isLocked)
    .reduce((sum, item) => {
      const ratio = Number(item.ratio) || 0;
      return sum + (unitByCount ? Math.round(ratio) : ratio);
    }, 0);

  const unlockedIndexes = items
    .map((item, index) => (!item.isLocked ? index : -1))
    .filter((index) => index !== -1);

  if (unlockedIndexes.length === 0) {
    return items;
  }

  const remaining = Math.max(0, Number(targetTotal || 0) - lockedTotal);
  let next = items;

  if (unitByCount) {
    const integerTarget = Math.max(0, Math.round(remaining));
    const randomSplit = splitIntegerRandom(unlockedIndexes.length, integerTarget);

    next = items.map((item, index) => {
      if (item.isLocked) {
        return { ...item, ratio: Math.max(0, Math.round(Number(item.ratio) || 0)) };
      }

      const splitIndex = unlockedIndexes.indexOf(index);
      return { ...item, ratio: randomSplit[splitIndex] || 0 };
    });
  } else {
    const base = Math.floor((remaining / unlockedIndexes.length) * 100) / 100;
    next = items.map((item) => (item.isLocked ? item : { ...item, ratio: base }));
    const distributedTotal = next.reduce((sum, item) => sum + (Number(item.ratio) || 0), 0);
    const delta = Math.round((Number(targetTotal || 0) - distributedTotal) * 100) / 100;

    const lastUnlockedIndex = unlockedIndexes[unlockedIndexes.length - 1];
    if (lastUnlockedIndex !== undefined && delta !== 0) {
      next[lastUnlockedIndex] = {
        ...next[lastUnlockedIndex],
        ratio: Math.max(0, Math.round((Number(next[lastUnlockedIndex].ratio || 0) + delta) * 100) / 100),
      };
    }
  }

  return next;
};

export const convertLockedValuesByUnit = (items, fromUnitByCount, toUnitByCount, totalQuestions) => {
  if (!Array.isArray(items) || items.length === 0 || fromUnitByCount === toUnitByCount) {
    return items;
  }

  const total = Math.max(1, Number(totalQuestions || 0));

  return items.map((item) => {
    if (!item?.isLocked) {
      return item;
    }

    const raw = Math.max(0, Number(item.ratio) || 0);
    let converted = raw;

    if (!fromUnitByCount && toUnitByCount) {
      converted = Math.ceil((raw / 100) * total);
    } else if (fromUnitByCount && !toUnitByCount) {
      converted = Math.ceil(((raw / total) * 100) * 100) / 100;
    }

    return { ...item, ratio: converted };
  });
};

export const distributeCustomDifficultyEvenly = (unitByCount, totalQuestions) => {
  if (unitByCount) {
    const values = splitIntegerRandom(3, Math.max(0, Number(totalQuestions || 0)));
    return { easy: values[0], medium: values[1], hard: values[2] };
  }

  const target = 100;
  const base = Math.floor((target / 3) * 100) / 100;
  const easy = base;
  const medium = base;
  const hard = Math.round((target - easy - medium) * 100) / 100;

  return { easy, medium, hard };
};

export const normalizeDifficultyValue = (value, unitByCount) => {
  const raw = Math.max(0, Number(value) || 0);
  return unitByCount ? Math.round(raw) : Math.round(raw * 100) / 100;
};

export const distributeDifficultyValues = (
  values,
  targetTotal,
  unitByCount,
  lockedKey = null,
  changedKey = null
) => {
  const validKeys = DIFFICULTY_LEVELS;
  const target = unitByCount
    ? Math.max(0, Math.round(Number(targetTotal || 0)))
    : Math.max(0, Number(targetTotal || 0));

  const next = validKeys.reduce((accumulator, key) => {
    accumulator[key] = normalizeDifficultyValue(values?.[key], unitByCount);
    return accumulator;
  }, {});

  const preservedKeys = [...new Set([lockedKey, changedKey].filter((key) => validKeys.includes(key)))];

  if (changedKey && preservedKeys.includes(changedKey)) {
    const otherPreservedTotal = preservedKeys
      .filter((key) => key !== changedKey)
      .reduce((sum, key) => sum + next[key], 0);
    const maxAllowed = Math.max(0, target - otherPreservedTotal);
    next[changedKey] = Math.min(next[changedKey], maxAllowed);
  }

  const adjustableKeys = validKeys.filter((key) => !preservedKeys.includes(key));
  const preservedTotal = preservedKeys.reduce((sum, key) => sum + next[key], 0);
  const remaining = Math.max(0, target - preservedTotal);

  if (adjustableKeys.length > 0) {
    const adjustableTotal = adjustableKeys.reduce((sum, key) => sum + next[key], 0);

    if (unitByCount) {
      const rawShares = adjustableKeys.map((key) => (
        adjustableTotal > 0
          ? (next[key] / adjustableTotal) * remaining
          : remaining / adjustableKeys.length
      ));
      const baseShares = rawShares.map((value) => Math.floor(value));
      let leftover = Math.max(0, remaining - baseShares.reduce((sum, value) => sum + value, 0));

      adjustableKeys.forEach((key, index) => {
        next[key] = baseShares[index];
      });

      const order = rawShares
        .map((value, index) => ({ index, fraction: value - baseShares[index] }))
        .sort((a, b) => b.fraction - a.fraction || a.index - b.index);

      for (let index = 0; index < leftover; index += 1) {
        const targetKey = adjustableKeys[order[index % order.length].index];
        next[targetKey] += 1;
      }
    } else {
      const rawShares = adjustableKeys.map((key) => (
        adjustableTotal > 0
          ? (next[key] / adjustableTotal) * remaining
          : remaining / adjustableKeys.length
      ));
      const baseShares = rawShares.map((value) => Math.floor(value * 100) / 100);
      const distributed = baseShares.reduce((sum, value) => sum + value, 0);
      const delta = Math.round((remaining - distributed) * 100) / 100;

      adjustableKeys.forEach((key, index) => {
        next[key] = baseShares[index];
      });

      const lastAdjustableKey = adjustableKeys[adjustableKeys.length - 1];
      if (lastAdjustableKey && delta !== 0) {
        next[lastAdjustableKey] = Math.max(0, Math.round((next[lastAdjustableKey] + delta) * 100) / 100);
      }
    }
  }

  const total = validKeys.reduce((sum, key) => sum + next[key], 0);
  const finalDelta = unitByCount ? target - total : Math.round((target - total) * 100) / 100;
  const fixupKey = adjustableKeys[adjustableKeys.length - 1] || changedKey || lockedKey;

  if (fixupKey && finalDelta !== 0) {
    next[fixupKey] = Math.max(0, normalizeDifficultyValue(next[fixupKey] + finalDelta, unitByCount));
  }

  return next;
};

export const isNearlyEqual = (left, right, tolerance = 0.01) => Math.abs(left - right) <= tolerance;

export const sumRatios = (items = [], key = "ratio") => (
  items.reduce((sum, item) => sum + (Number(item?.[key]) || 0), 0)
);

export const getDifficultyConfig = ({ selectedDifficultyId, difficultyDefs, customDifficulty }) => {
  const selectedDifficulty = (Array.isArray(difficultyDefs) ? difficultyDefs : []).find(
    (difficulty) => difficulty.id === selectedDifficultyId
  );

  const ratios = selectedDifficultyId === "CUSTOM"
    ? {
        easy: Math.max(0, Number(customDifficulty?.easy) || 0),
        medium: Math.max(0, Number(customDifficulty?.medium) || 0),
        hard: Math.max(0, Number(customDifficulty?.hard) || 0),
      }
    : {
        easy: Math.max(0, Number(selectedDifficulty?.easyRatio) || 0),
        medium: Math.max(0, Number(selectedDifficulty?.mediumRatio) || 0),
        hard: Math.max(0, Number(selectedDifficulty?.hardRatio) || 0),
      };

  return {
    selectedDifficulty,
    ratios,
  };
};

export const buildAiValidationState = ({
  aiDuration,
  aiEasyDuration,
  aiHardDuration,
  aiMediumDuration,
  aiName,
  aiPrompt,
  aiTimerMode,
  aiTotalQuestions,
  bloomUnit,
  customDifficulty,
  difficultyDefs,
  minimumAiDurationMinutes,
  hasAdvanceQuizConfig,
  questionTypeUnit,
  questionTypeDefinitions,
  questionUnit,
  quizTitleMaxLength,
  selectedBloomSkills,
  selectedDifficultyId,
  selectedMaterialIds,
  selectedQTypes,
  structureItems,
  t,
}) => {
  const nextFieldErrors = {};
  const nextSectionErrors = {};

  const registerError = (sectionKey, fieldKey, message) => {
    if (!message) {
      return;
    }

    if (!nextFieldErrors[fieldKey]) {
      nextFieldErrors[fieldKey] = message;
    }

    nextSectionErrors[sectionKey] = true;
  };

  const normalizedTotalQuestions = Number(aiTotalQuestions);
  const hasValidTotalQuestions = Number.isFinite(normalizedTotalQuestions)
    && normalizedTotalQuestions >= AI_MINIMUM_QUESTION_COUNT
    && normalizedTotalQuestions <= AI_MAXIMUM_QUESTION_COUNT;
  const normalizedDuration = Number(aiDuration);

  if (!aiName.trim()) {
    registerError("general", "aiName", t("workspace.quiz.validation.nameRequired"));
  } else if (aiName.trim().length > quizTitleMaxLength) {
    registerError(
      "general",
      "aiName",
      t("workspace.quiz.validation.nameMaxLength", {
        max: quizTitleMaxLength,
        defaultValue: `Quiz title must be at most ${quizTitleMaxLength} characters.`,
      })
    );
  }

  if (!(selectedMaterialIds?.length > 0) && !aiPrompt.trim()) {
    registerError("prompt", "aiPrompt", t("workspace.quiz.validation.aiMaterialOrPromptRequired"));
  }

  if (!hasValidTotalQuestions) {
    registerError(
      "settings",
      "aiTotalQuestions",
      t("workspace.quiz.validation.totalQuestionsRange", {
        min: AI_MINIMUM_QUESTION_COUNT,
        max: AI_MAXIMUM_QUESTION_COUNT,
      })
    );
  }

  if (aiTimerMode) {
    if (!Number.isFinite(normalizedDuration) || normalizedDuration <= 0) {
      registerError("settings", "aiDuration", t("workspace.quiz.validation.timeDurationRequired"));
    } else if (hasValidTotalQuestions && normalizedDuration < minimumAiDurationMinutes) {
      registerError(
        "settings",
        "aiDuration",
        t("workspace.quiz.validation.minimumTimePerQuestion", {
          count: Math.max(0, Number(aiTotalQuestions) || 0),
          minutes: minimumAiDurationMinutes,
          seconds: AI_MINIMUM_SECONDS_PER_QUESTION,
        })
      );
    }
  } else {
    const easyDuration = Number(aiEasyDuration) || 0;
    const mediumDuration = Number(aiMediumDuration) || 0;
    const hardDuration = Number(aiHardDuration) || 0;

    if (!easyDuration || !mediumDuration || !hardDuration) {
      registerError("settings", "aiDurations", t("workspace.quiz.validation.allDurationsRequired"));
    } else if (easyDuration < 10 || mediumDuration < 10 || hardDuration < 10) {
      registerError("settings", "aiDurations", t("workspace.quiz.validation.durationMinimum"));
    } else if (mediumDuration <= easyDuration) {
      registerError("settings", "aiDurations", t("workspace.quiz.validation.mediumDurationMustBeGreaterThanEasy"));
    } else if (hardDuration <= mediumDuration) {
      registerError("settings", "aiDurations", t("workspace.quiz.validation.hardDurationMustBeGreaterThanMedium"));
    }
  }

  const { ratios: difficultyRatios } = getDifficultyConfig({
    selectedDifficultyId,
    difficultyDefs,
    customDifficulty,
  });

  const difficultyTarget = questionUnit ? normalizedTotalQuestions : 100;
  const difficultyTotal = difficultyRatios.easy + difficultyRatios.medium + difficultyRatios.hard;
  if ((!questionUnit || hasValidTotalQuestions) && !isNearlyEqual(difficultyTotal, difficultyTarget)) {
    registerError(
      "difficulty",
      "aiDifficulty",
      questionUnit
        ? t("workspace.quiz.validation.difficultyTotalByCount", { target: difficultyTarget })
        : t("workspace.quiz.validation.difficultyTotalByPercent")
    );
  }

  const questionTypeTarget = questionTypeUnit ? normalizedTotalQuestions : 100;
  const restrictedAdvancedQuestionTypes = !hasAdvanceQuizConfig
    ? selectedQTypes.filter((item) => {
        const detail = (Array.isArray(questionTypeDefinitions) ? questionTypeDefinitions : []).find(
          (questionType) => Number(questionType?.questionTypeId) === Number(item?.questionTypeId),
        );
        return isAdvancedQuizQuestionType(detail?.questionType);
      })
    : [];
  const restrictedAdvancedStructureItems = !hasAdvanceQuizConfig
    ? (Array.isArray(structureItems) ? structureItems : []).filter((item) => (
        isAdvancedQuizQuestionType(item?.questionType)
      ))
    : [];

  if (selectedQTypes.length === 0) {
    registerError("questionTypes", "selectedQTypes", t("workspace.quiz.validation.questionTypeRequired"));
  } else if (restrictedAdvancedQuestionTypes.length > 0 || restrictedAdvancedStructureItems.length > 0) {
    registerError(
      "questionTypes",
      "selectedQTypes",
      t("workspace.quiz.validation.advancedQuestionTypePlanRequired", {
        defaultValue: "Advanced question types require a plan with advanced quiz configuration.",
      }),
    );
  } else if ((!questionTypeUnit || hasValidTotalQuestions) && !isNearlyEqual(sumRatios(selectedQTypes), questionTypeTarget)) {
    registerError(
      "questionTypes",
      "selectedQTypes",
      questionTypeUnit
        ? t("workspace.quiz.validation.questionTypeTotalByCount", { target: questionTypeTarget })
        : t("workspace.quiz.validation.questionTypeTotalByPercent")
    );
  }

  const bloomTarget = bloomUnit ? normalizedTotalQuestions : 100;
  if (selectedBloomSkills.length === 0) {
    registerError("bloomSkills", "selectedBloomSkills", t("workspace.quiz.validation.bloomRequired"));
  } else if ((!bloomUnit || hasValidTotalQuestions) && !isNearlyEqual(sumRatios(selectedBloomSkills), bloomTarget)) {
    registerError(
      "bloomSkills",
      "selectedBloomSkills",
      bloomUnit
        ? t("workspace.quiz.validation.bloomTotalByCount", { target: bloomTarget })
        : t("workspace.quiz.validation.bloomTotalByPercent")
    );
  }

  return {
    fieldErrors: nextFieldErrors,
    firstErrorMessage: Object.values(nextFieldErrors)[0] || "",
    firstInvalidSection: AI_VALIDATION_SECTION_ORDER.find((sectionKey) => nextSectionErrors[sectionKey]) || null,
    isValid: Object.keys(nextFieldErrors).length === 0,
  };
};

export const normalizeListResponse = (response) => {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.data?.content)) {
    return response.data.content;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.content)) {
    return response.content;
  }

  return [];
};

export const normalizeIntegerInput = (value) => {
  if (value === "") {
    return "";
  }

  const digits = String(value).replace(/\D/g, "");
  if (!digits) {
    return "";
  }

  const normalized = digits.replace(/^0+(?=\d)/, "");
  return Number(normalized || 0);
};

export const clampNumber = (value, minValue = 1, maxValue = Number.POSITIVE_INFINITY) => {
  const next = Number(value);

  if (!Number.isFinite(next)) {
    return minValue;
  }

  return Math.min(Math.max(next, minValue), maxValue);
};
