import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  generateAIQuiz,
  getBloomSkills,
  getDifficultyDefinitions,
  getQuestionTypes,
} from "@/api/AIAPI";
import {
  QUIZ_TITLE_MAX_LENGTH,
  normalizeQuizTitleInput,
} from "../quizTitleConfig";
import {
  AI_MAXIMUM_QUESTION_COUNT,
  AI_MINIMUM_QUESTION_COUNT,
  AI_MINIMUM_SECONDS_PER_QUESTION,
  AI_VALIDATION_ERROR_KEYS,
  HIDDEN_AI_QUESTION_TYPES,
  IMAGE_BASED_QUESTION_TYPE,
} from "./createQuizForm.constants";
import {
  buildAiValidationState,
  clampNumber,
  convertLockedValuesByUnit,
  distributeConfigValues,
  distributeCustomDifficultyEvenly,
  distributeDifficultyValues,
  getDifficultyConfig,
  normalizeIntegerInput,
  normalizeListResponse,
} from "./createQuizForm.utils";

const formatPreviewValue = (value) => {
  const rounded = Math.round((Number(value) || 0) * 100) / 100;
  return Number(rounded.toFixed(2)).toString();
};

export const useCreateQuizAiForm = ({
  defaultContextId,
  hasImageMaterials,
  i18nLanguage,
  onCreateQuiz,
  selectedMaterialIds,
  t,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [difficultyDefs, setDifficultyDefs] = useState([]);
  const [selectedDifficultyId, setSelectedDifficultyId] = useState("");
  const [customDifficulty, setCustomDifficulty] = useState({
    easy: 30,
    medium: 40,
    hard: 30,
  });
  const [lockedDifficultyLevel, setLockedDifficultyLevel] = useState(null);
  const [allQTypes, setAllQTypes] = useState([]);
  const [qTypes, setQTypes] = useState([]);
  const [selectedQTypes, setSelectedQTypes] = useState([]);
  const [bloomSkills, setBloomSkills] = useState([]);
  const [selectedBloomSkills, setSelectedBloomSkills] = useState([]);
  const [aiName, setAiName] = useState("");
  const [aiTotalQuestions, setAiTotalQuestions] = useState(10);
  const [aiDuration, setAiDuration] = useState(15);
  const [aiEasyDuration, setAiEasyDuration] = useState(60);
  const [aiMediumDuration, setAiMediumDuration] = useState(120);
  const [aiHardDuration, setAiHardDuration] = useState(180);
  const [aiPrompt, setAiPrompt] = useState("");
  const aiQuizIntent = "REVIEW";
  const [aiTimerMode, setAiTimerMode] = useState(true);
  const [aiDurationSyncNotice, setAiDurationSyncNotice] = useState("");
  const [questionTypeUnit, setQuestionTypeUnit] = useState(false);
  const [bloomUnit, setBloomUnit] = useState(false);
  const [questionUnit, setQuestionUnit] = useState(false);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [metadataError, setMetadataError] = useState("");

  const prevDifficultyUnitRef = useRef(questionUnit);
  const prevQuestionTypeUnitRef = useRef(questionTypeUnit);
  const prevBloomUnitRef = useRef(bloomUnit);
  const prevAiTotalQuestionsRef = useRef(aiTotalQuestions);
  const prevAiTimerModeRef = useRef(aiTimerMode);
  const latestErrorRef = useRef("");

  const aiGeneralSectionRef = useRef(null);
  const aiSettingsSectionRef = useRef(null);
  const aiDifficultySectionRef = useRef(null);
  const aiQuestionTypesSectionRef = useRef(null);
  const aiBloomSectionRef = useRef(null);
  const aiPromptSectionRef = useRef(null);

  const getTargetTotal = useCallback(
    (unitByCount) => (unitByCount ? Number(aiTotalQuestions || 0) : 100),
    [aiTotalQuestions]
  );

  const minimumAiDurationMinutes = useMemo(
    () => Math.ceil((Math.max(0, Number(aiTotalQuestions) || 0) * AI_MINIMUM_SECONDS_PER_QUESTION) / 60),
    [aiTotalQuestions]
  );

  const hasValidAiTotalQuestions = useMemo(() => {
    const totalQuestions = Number(aiTotalQuestions);
    return (
      Number.isFinite(totalQuestions)
      && totalQuestions >= AI_MINIMUM_QUESTION_COUNT
      && totalQuestions <= AI_MAXIMUM_QUESTION_COUNT
    );
  }, [aiTotalQuestions]);

  const hasAiDurationMinimumMismatch = useMemo(() => (
    aiTimerMode
    && hasValidAiTotalQuestions
    && Number(aiDuration) > 0
    && Number(aiDuration) < minimumAiDurationMinutes
  ), [aiDuration, aiTimerMode, hasValidAiTotalQuestions, minimumAiDurationMinutes]);

  const filterQuestionTypesByImageAvailability = useCallback((items) => (
    (Array.isArray(items) ? items : []).filter((item) => {
      const normalizedType = String(item?.questionType || "").toUpperCase();
      if (HIDDEN_AI_QUESTION_TYPES.includes(normalizedType)) {
        return false;
      }

      if (normalizedType === IMAGE_BASED_QUESTION_TYPE && !hasImageMaterials) {
        return false;
      }

      return true;
    })
  ), [hasImageMaterials]);

  useEffect(() => {
    let cancelled = false;

    const fetchMetadata = async () => {
      setMetadataLoading(true);
      setMetadataError("");

      try {
        const [questionTypeResponse, difficultyResponse, bloomResponse] = await Promise.all([
          getQuestionTypes(),
          getDifficultyDefinitions(),
          getBloomSkills(),
        ]);

        if (cancelled) {
          return;
        }

        const questionTypeList = normalizeListResponse(questionTypeResponse);
        const difficultyList = normalizeListResponse(difficultyResponse);
        const bloomList = normalizeListResponse(bloomResponse);
        const availableQuestionTypes = filterQuestionTypesByImageAvailability(questionTypeList);

        setAllQTypes(questionTypeList);
        setDifficultyDefs(difficultyList);
        setBloomSkills(bloomList);
        setSelectedDifficultyId((previousId) => {
          if (previousId === "CUSTOM") {
            return previousId;
          }

          const previousExists = difficultyList.some(
            (difficulty) => String(difficulty?.id) === String(previousId)
          );
          if (previousExists) {
            return previousId;
          }

          const defaultDifficulty = difficultyList.find(
            (difficulty) => difficulty?.difficultyName === "EASY"
          ) || difficultyList[0];

          return defaultDifficulty?.id || "";
        });

        if (!availableQuestionTypes.length || !difficultyList.length || !bloomList.length) {
          setMetadataError(t("workspace.quiz.aiConfig.metadataEmpty"));
        }
      } catch (fetchError) {
        if (cancelled) {
          return;
        }

        console.error("Failed to load AI config data:", fetchError);
        setMetadataError(fetchError?.message || t("workspace.quiz.aiConfig.metadataLoadFailed"));
      } finally {
        if (!cancelled) {
          setMetadataLoading(false);
        }
      }
    };

    fetchMetadata();

    return () => {
      cancelled = true;
    };
  }, [defaultContextId, filterQuestionTypesByImageAvailability, t]);

  useEffect(() => {
    setQTypes(filterQuestionTypesByImageAvailability(allQTypes));
  }, [allQTypes, filterQuestionTypesByImageAvailability]);

  useEffect(() => {
    if (!Array.isArray(qTypes) || qTypes.length === 0) {
      setSelectedQTypes([]);
      return;
    }

    const availableTypeIds = new Set(
      qTypes
        .map((item) => Number(item?.questionTypeId))
        .filter((questionTypeId) => Number.isInteger(questionTypeId) && questionTypeId > 0)
    );

    setSelectedQTypes((previousItems) => {
      const filteredItems = previousItems.filter((item) => (
        availableTypeIds.has(Number(item?.questionTypeId))
      ));

      if (filteredItems.length === 0) {
        const singleChoice = qTypes.find(
          (item) => String(item?.questionType || "").toUpperCase() === "SINGLE_CHOICE"
        );
        const fallbackType = singleChoice || qTypes[0];
        if (!fallbackType?.questionTypeId) {
          return [];
        }

        return [{
          questionTypeId: fallbackType.questionTypeId,
          ratio: getTargetTotal(questionTypeUnit),
          isLocked: false,
        }];
      }

      if (filteredItems.length === previousItems.length) {
        return previousItems;
      }

      return distributeConfigValues(
        filteredItems,
        getTargetTotal(questionTypeUnit),
        questionTypeUnit
      );
    });
  }, [getTargetTotal, qTypes, questionTypeUnit]);

  useEffect(() => {
    if (!Array.isArray(bloomSkills) || bloomSkills.length === 0) {
      setSelectedBloomSkills([]);
      return;
    }

    const availableBloomIds = new Set(
      bloomSkills
        .map((item) => Number(item?.bloomId))
        .filter((bloomId) => Number.isInteger(bloomId) && bloomId > 0)
    );

    setSelectedBloomSkills((previousItems) => {
      const filteredItems = previousItems.filter((item) => (
        availableBloomIds.has(Number(item?.bloomId))
      ));

      if (filteredItems.length === 0) {
        const remember = bloomSkills.find(
          (item) => String(item?.bloomName || "").toUpperCase() === "REMEMBER"
        );
        const fallbackSkill = remember || bloomSkills[0];
        if (!fallbackSkill?.bloomId) {
          return [];
        }

        return [{
          bloomId: fallbackSkill.bloomId,
          ratio: getTargetTotal(bloomUnit),
          isLocked: false,
        }];
      }

      if (filteredItems.length === previousItems.length) {
        return previousItems;
      }

      return distributeConfigValues(filteredItems, getTargetTotal(bloomUnit), bloomUnit);
    });
  }, [bloomSkills, bloomUnit, getTargetTotal]);

  useEffect(() => {
    if (selectedDifficultyId !== "CUSTOM" && questionUnit) {
      setQuestionUnit(false);
    }
  }, [questionUnit, selectedDifficultyId]);

  useEffect(() => {
    if (selectedDifficultyId !== "CUSTOM") {
      return;
    }

    if (prevDifficultyUnitRef.current !== questionUnit) {
      setCustomDifficulty((previousValues) => (
        distributeDifficultyValues(
          previousValues,
          getTargetTotal(questionUnit),
          questionUnit
        )
      ));
      prevDifficultyUnitRef.current = questionUnit;
      return;
    }

    setCustomDifficulty((previousValues) => (
      distributeDifficultyValues(
        previousValues,
        getTargetTotal(questionUnit),
        questionUnit,
        lockedDifficultyLevel
      )
    ));
  }, [
    aiTotalQuestions,
    getTargetTotal,
    lockedDifficultyLevel,
    questionUnit,
    selectedDifficultyId,
  ]);

  useEffect(() => {
    if (prevQuestionTypeUnitRef.current !== questionTypeUnit) {
      const fromUnitByCount = prevQuestionTypeUnitRef.current;
      setSelectedQTypes((previousItems) => {
        const convertedItems = convertLockedValuesByUnit(
          previousItems,
          fromUnitByCount,
          questionTypeUnit,
          aiTotalQuestions
        );

        return distributeConfigValues(
          convertedItems,
          getTargetTotal(questionTypeUnit),
          questionTypeUnit
        );
      });
      prevQuestionTypeUnitRef.current = questionTypeUnit;
      return;
    }

    setSelectedQTypes((previousItems) => (
      distributeConfigValues(previousItems, getTargetTotal(questionTypeUnit), questionTypeUnit)
    ));
  }, [aiTotalQuestions, getTargetTotal, questionTypeUnit]);

  useEffect(() => {
    if (prevBloomUnitRef.current !== bloomUnit) {
      const fromUnitByCount = prevBloomUnitRef.current;
      setSelectedBloomSkills((previousItems) => {
        const convertedItems = convertLockedValuesByUnit(
          previousItems,
          fromUnitByCount,
          bloomUnit,
          aiTotalQuestions
        );

        return distributeConfigValues(convertedItems, getTargetTotal(bloomUnit), bloomUnit);
      });
      prevBloomUnitRef.current = bloomUnit;
      return;
    }

    setSelectedBloomSkills((previousItems) => (
      distributeConfigValues(previousItems, getTargetTotal(bloomUnit), bloomUnit)
    ));
  }, [aiTotalQuestions, bloomUnit, getTargetTotal]);

  const {
    ratios: difficultyRatios,
    selectedDifficulty,
  } = useMemo(() => getDifficultyConfig({
    selectedDifficultyId,
    difficultyDefs,
    customDifficulty,
  }), [customDifficulty, difficultyDefs, selectedDifficultyId]);

  const difficultyRawTotal = useMemo(() => (
    difficultyRatios.easy + difficultyRatios.medium + difficultyRatios.hard
  ), [difficultyRatios.easy, difficultyRatios.hard, difficultyRatios.medium]);

  const difficultyPreviewTarget = useMemo(
    () => (questionUnit ? Math.max(0, Number(aiTotalQuestions || 0)) : 100),
    [aiTotalQuestions, questionUnit]
  );

  const difficultyPreviewPercent = useMemo(() => {
    const difficultyBarBase = Math.max(difficultyPreviewTarget, difficultyRawTotal, 1);
    return {
      easy: (difficultyRatios.easy / difficultyBarBase) * 100,
      medium: (difficultyRatios.medium / difficultyBarBase) * 100,
      hard: (difficultyRatios.hard / difficultyBarBase) * 100,
    };
  }, [difficultyPreviewTarget, difficultyRawTotal, difficultyRatios.easy, difficultyRatios.hard, difficultyRatios.medium]);

  const difficultyPreviewRemainingPercent = useMemo(() => {
    const usedPercent = difficultyPreviewPercent.easy
      + difficultyPreviewPercent.medium
      + difficultyPreviewPercent.hard;
    return Math.max(0, Math.round((100 - usedPercent) * 100) / 100);
  }, [difficultyPreviewPercent.easy, difficultyPreviewPercent.hard, difficultyPreviewPercent.medium]);

  const difficultyPreviewSummary = useMemo(() => (
    questionUnit
      ? `${Number((Math.round(difficultyRawTotal * 100) / 100).toFixed(2))}/${difficultyPreviewTarget} ${t("workspace.quiz.aiConfig.countUnit")}`
      : `${formatPreviewValue(difficultyRawTotal)}%`
  ), [difficultyPreviewTarget, difficultyRawTotal, questionUnit, t]);

  const aiValidationState = useMemo(() => buildAiValidationState({
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
    questionTypeUnit,
    questionUnit,
    quizTitleMaxLength: QUIZ_TITLE_MAX_LENGTH,
    selectedBloomSkills,
    selectedDifficultyId,
    selectedMaterialIds,
    selectedQTypes,
    t,
  }), [
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
    questionTypeUnit,
    questionUnit,
    selectedBloomSkills,
    selectedDifficultyId,
    selectedMaterialIds,
    selectedQTypes,
    t,
  ]);

  useEffect(() => {
    latestErrorRef.current = error;
  }, [error]);

  useEffect(() => {
    setFieldErrors((previousErrors) => {
      let changed = false;
      const nextErrors = { ...previousErrors };

      AI_VALIDATION_ERROR_KEYS.forEach((fieldKey) => {
        if (previousErrors[fieldKey] && !aiValidationState.fieldErrors[fieldKey]) {
          delete nextErrors[fieldKey];
          changed = true;
        }
      });

      return changed ? nextErrors : previousErrors;
    });
  }, [aiValidationState]);

  useEffect(() => {
    if (!latestErrorRef.current) {
      return;
    }

    setError("");
  }, [
    aiDuration,
    aiEasyDuration,
    aiHardDuration,
    aiMediumDuration,
    aiName,
    aiPrompt,
    aiTimerMode,
    aiTotalQuestions,
    bloomUnit,
    questionTypeUnit,
    questionUnit,
    selectedBloomSkills,
    selectedDifficultyId,
    selectedMaterialIds,
    selectedQTypes,
  ]);

  useEffect(() => {
    const previousTotalQuestions = Number(prevAiTotalQuestionsRef.current);
    const currentTotalQuestions = Number(aiTotalQuestions);
    const totalQuestionsChanged = previousTotalQuestions !== currentTotalQuestions;
    const timerModeEnabled = !prevAiTimerModeRef.current && aiTimerMode;

    prevAiTotalQuestionsRef.current = aiTotalQuestions;
    prevAiTimerModeRef.current = aiTimerMode;

    if (!aiTimerMode) {
      setAiDurationSyncNotice("");
      return;
    }

    if (!totalQuestionsChanged && !timerModeEnabled) {
      return;
    }

    const normalizedDuration = Number(aiDuration) || 0;

    if (minimumAiDurationMinutes > 0 && normalizedDuration < minimumAiDurationMinutes) {
      setAiDuration(minimumAiDurationMinutes);
      setFieldErrors((previousErrors) => ({ ...previousErrors, aiDuration: "" }));
      setAiDurationSyncNotice(
        t("workspace.quiz.validation.durationAutoAdjusted", {
          minutes: minimumAiDurationMinutes,
          count: Math.max(0, Number(aiTotalQuestions) || 0),
        })
      );
      return;
    }

    setAiDurationSyncNotice("");
  }, [aiDuration, aiTimerMode, aiTotalQuestions, minimumAiDurationMinutes, t]);

  const scrollToAiSection = useCallback((sectionKey) => {
    const sectionRefs = {
      general: aiGeneralSectionRef,
      settings: aiSettingsSectionRef,
      difficulty: aiDifficultySectionRef,
      questionTypes: aiQuestionTypesSectionRef,
      bloomSkills: aiBloomSectionRef,
      prompt: aiPromptSectionRef,
    };
    const sectionNode = sectionRefs[sectionKey]?.current;

    if (!sectionNode) {
      return;
    }

    sectionNode.scrollIntoView({ behavior: "smooth", block: "center" });
    const focusTarget = sectionNode.querySelector("input, textarea, select, button");
    if (focusTarget && typeof focusTarget.focus === "function") {
      window.setTimeout(() => focusTarget.focus(), 180);
    }
  }, []);

  const handleBlockedAiSubmit = useCallback(() => {
    if (aiValidationState.isValid) {
      return;
    }

    setFieldErrors(aiValidationState.fieldErrors);
    setError(aiValidationState.firstErrorMessage);

    if (aiValidationState.firstInvalidSection) {
      scrollToAiSection(aiValidationState.firstInvalidSection);
    }
  }, [aiValidationState, scrollToAiSection]);

  const handleAiNameChange = useCallback((value) => {
    setAiName(normalizeQuizTitleInput(value));
  }, []);

  const handleAiPromptChange = useCallback((value) => {
    setAiPrompt(value);
  }, []);

  const handleAiTotalQuestionsChange = useCallback((value) => {
    setAiTotalQuestions(normalizeIntegerInput(value));
  }, []);

  const handleAiTotalQuestionsBlur = useCallback(() => {
    setAiTotalQuestions((previousValue) => (
      clampNumber(previousValue, AI_MINIMUM_QUESTION_COUNT, AI_MAXIMUM_QUESTION_COUNT)
    ));
  }, []);

  const handleAiDurationChange = useCallback((value) => {
    setAiDuration(normalizeIntegerInput(value));
  }, []);

  const handleAiDurationBlur = useCallback(() => {
    setAiDuration((previousValue) => clampNumber(previousValue, 1));
  }, []);

  const handleAiEasyDurationChange = useCallback((value) => {
    setAiEasyDuration(normalizeIntegerInput(value));
  }, []);

  const handleAiEasyDurationBlur = useCallback(() => {
    setAiEasyDuration((previousValue) => clampNumber(previousValue, 1));
  }, []);

  const handleAiMediumDurationChange = useCallback((value) => {
    setAiMediumDuration(normalizeIntegerInput(value));
  }, []);

  const handleAiMediumDurationBlur = useCallback(() => {
    setAiMediumDuration((previousValue) => clampNumber(previousValue, 1));
  }, []);

  const handleAiHardDurationChange = useCallback((value) => {
    setAiHardDuration(normalizeIntegerInput(value));
  }, []);

  const handleAiHardDurationBlur = useCallback(() => {
    setAiHardDuration((previousValue) => clampNumber(previousValue, 1));
  }, []);

  const handleDifficultyChange = useCallback((event) => {
    const nextValue = event.target.value;

    if (nextValue === "CUSTOM") {
      setSelectedDifficultyId("CUSTOM");
      setLockedDifficultyLevel(null);
      setCustomDifficulty(distributeCustomDifficultyEvenly(questionUnit, aiTotalQuestions));
      prevDifficultyUnitRef.current = questionUnit;
      return;
    }

    setSelectedDifficultyId(Number(nextValue));
    setQuestionUnit(false);
    setLockedDifficultyLevel(null);
    prevDifficultyUnitRef.current = false;
  }, [aiTotalQuestions, questionUnit]);

  const handleCustomDifficultyChange = useCallback((level, value) => {
    const parsedValue = Math.max(0, Number(value) || 0);
    setCustomDifficulty((previousValues) => (
      distributeDifficultyValues(
        { ...previousValues, [level]: parsedValue },
        getTargetTotal(questionUnit),
        questionUnit,
        lockedDifficultyLevel,
        level
      )
    ));
  }, [getTargetTotal, lockedDifficultyLevel, questionUnit]);

  const handleToggleDifficultyLock = useCallback((level) => {
    setLockedDifficultyLevel((previousLevel) => (previousLevel === level ? null : level));
  }, []);

  const handleToggleQuestionTypeSelection = useCallback((questionTypeId) => {
    setSelectedQTypes((previousItems) => {
      const normalizedId = Number(questionTypeId);
      const alreadySelected = previousItems.some(
        (item) => Number(item.questionTypeId) === normalizedId
      );
      const nextItems = alreadySelected
        ? previousItems.filter((item) => Number(item.questionTypeId) !== normalizedId)
        : [...previousItems, { questionTypeId: normalizedId, ratio: 0, isLocked: false }];

      return distributeConfigValues(nextItems, getTargetTotal(questionTypeUnit), questionTypeUnit);
    });
  }, [getTargetTotal, questionTypeUnit]);

  const handleQTypeRatioChange = useCallback((questionTypeId, ratio) => {
    const rawRatio = Math.max(0, Number(ratio) || 0);
    const parsedRatio = questionTypeUnit ? Math.round(rawRatio) : rawRatio;

    setSelectedQTypes((previousItems) => {
      const nextItems = previousItems.map((item) => (
        Number(item.questionTypeId) === Number(questionTypeId)
          ? { ...item, ratio: parsedRatio, isLocked: true }
          : item
      ));

      return distributeConfigValues(nextItems, getTargetTotal(questionTypeUnit), questionTypeUnit);
    });
  }, [getTargetTotal, questionTypeUnit]);

  const handleToggleQTypeLock = useCallback((questionTypeId) => {
    setSelectedQTypes((previousItems) => {
      const normalizedId = Number(questionTypeId);
      const targetItem = previousItems.find(
        (item) => Number(item.questionTypeId) === normalizedId
      );

      if (!targetItem) {
        return previousItems;
      }

      if (!targetItem.isLocked) {
        const unlockedCount = previousItems.filter((item) => !item.isLocked).length;
        if (unlockedCount <= 1) {
          return previousItems;
        }
      }

      const nextItems = previousItems.map((item) => (
        Number(item.questionTypeId) === normalizedId
          ? { ...item, isLocked: !item.isLocked }
          : item
      ));

      return distributeConfigValues(nextItems, getTargetTotal(questionTypeUnit), questionTypeUnit);
    });
  }, [getTargetTotal, questionTypeUnit]);

  const handleToggleBloomSelection = useCallback((bloomId) => {
    setSelectedBloomSkills((previousItems) => {
      const normalizedId = Number(bloomId);
      const alreadySelected = previousItems.some(
        (item) => Number(item.bloomId) === normalizedId
      );
      const nextItems = alreadySelected
        ? previousItems.filter((item) => Number(item.bloomId) !== normalizedId)
        : [...previousItems, { bloomId: normalizedId, ratio: 0, isLocked: false }];

      return distributeConfigValues(nextItems, getTargetTotal(bloomUnit), bloomUnit);
    });
  }, [bloomUnit, getTargetTotal]);

  const handleBloomRatioChange = useCallback((bloomId, ratio) => {
    const rawRatio = Math.max(0, Number(ratio) || 0);
    const parsedRatio = bloomUnit ? Math.round(rawRatio) : rawRatio;

    setSelectedBloomSkills((previousItems) => {
      const nextItems = previousItems.map((item) => (
        Number(item.bloomId) === Number(bloomId)
          ? { ...item, ratio: parsedRatio, isLocked: true }
          : item
      ));

      return distributeConfigValues(nextItems, getTargetTotal(bloomUnit), bloomUnit);
    });
  }, [bloomUnit, getTargetTotal]);

  const handleToggleBloomLock = useCallback((bloomId) => {
    setSelectedBloomSkills((previousItems) => {
      const normalizedId = Number(bloomId);
      const targetItem = previousItems.find((item) => Number(item.bloomId) === normalizedId);

      if (!targetItem) {
        return previousItems;
      }

      if (!targetItem.isLocked) {
        const unlockedCount = previousItems.filter((item) => !item.isLocked).length;
        if (unlockedCount <= 1) {
          return previousItems;
        }
      }

      const nextItems = previousItems.map((item) => (
        Number(item.bloomId) === normalizedId
          ? { ...item, isLocked: !item.isLocked }
          : item
      ));

      return distributeConfigValues(nextItems, getTargetTotal(bloomUnit), bloomUnit);
    });
  }, [bloomUnit, getTargetTotal]);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setError("");

    try {
      if (!aiValidationState.isValid) {
        setFieldErrors(aiValidationState.fieldErrors);
        setError(aiValidationState.firstErrorMessage);
        if (aiValidationState.firstInvalidSection) {
          scrollToAiSection(aiValidationState.firstInvalidSection);
        }
        return;
      }

      const payload = {
        title: String(aiName || "").trim(),
        materialIds: selectedMaterialIds,
        overallDifficulty: selectedDifficultyId === "CUSTOM"
          ? "CUSTOM"
          : selectedDifficulty?.difficultyName || "MEDIUM",
        durationInMinute: aiTimerMode ? Math.max(1, Number(aiDuration) || 1) : 0,
        durationInSecond: 0,
        roadmapId: null,
        phaseId: null,
        knowledgeId: null,
        workspaceId: defaultContextId,
        totalQuestion: aiTotalQuestions,
        prompt: aiPrompt,
        outputLanguage: i18nLanguage === "vi" ? "Vietnamese" : "English",
        questionTypeUnit,
        questionTypes: selectedQTypes.map((item) => ({
          questionTypeId: item.questionTypeId,
          ratio: Number(item.ratio) || 0,
        })),
        bloomUnit,
        bloomSkills: selectedBloomSkills.map((item) => ({
          bloomId: item.bloomId,
          ratio: Number(item.ratio) || 0,
        })),
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
        }),
      };

      const result = await generateAIQuiz(payload);
      await onCreateQuiz?.(result?.data || result);
    } catch (submitError) {
      console.error("Failed to create AI quiz:", submitError);
      setError(submitError?.message || t("workspace.quiz.validation.createFailed"));
    } finally {
      setSubmitting(false);
    }
  }, [
    aiDuration,
    aiEasyDuration,
    aiHardDuration,
    aiMediumDuration,
    aiName,
    aiPrompt,
    aiQuizIntent,
    aiTimerMode,
    aiTotalQuestions,
    aiValidationState,
    bloomUnit,
    defaultContextId,
    difficultyRatios.easy,
    difficultyRatios.hard,
    difficultyRatios.medium,
    i18nLanguage,
    onCreateQuiz,
    questionTypeUnit,
    questionUnit,
    scrollToAiSection,
    selectedBloomSkills,
    selectedDifficulty,
    selectedDifficultyId,
    selectedMaterialIds,
    selectedQTypes,
    t,
  ]);

  return {
    aiValidationState,
    error,
    fieldErrors,
    handleBlockedAiSubmit,
    handleSubmit,
    refsMap: {
      aiBloomSectionRef,
      aiDifficultySectionRef,
      aiGeneralSectionRef,
      aiPromptSectionRef,
      aiQuestionTypesSectionRef,
      aiSettingsSectionRef,
    },
    state: {
      aiDuration,
      aiDurationSyncNotice,
      aiEasyDuration,
      aiHardDuration,
      aiMediumDuration,
      aiName,
      aiPrompt,
      aiTimerMode,
      aiTotalQuestions,
      bloomSkills,
      bloomUnit,
      customDifficulty,
      difficultyDefs,
      difficultyPreviewPercent,
      difficultyPreviewRemainingPercent,
      difficultyPreviewSummary,
      difficultyPreviewTarget,
      difficultyRawTotal,
      fieldErrors,
      hasAiDurationMinimumMismatch,
      hasValidAiTotalQuestions,
      lockedDifficultyLevel,
      metadataError,
      metadataLoading,
      minimumAiDurationMinutes,
      qTypes,
      questionTypeUnit,
      questionUnit,
      selectedBloomSkills,
      selectedDifficultyId,
      selectedQTypes,
    },
    handlers: {
      handleAiDurationBlur,
      handleAiDurationChange,
      handleAiEasyDurationBlur,
      handleAiEasyDurationChange,
      handleAiHardDurationBlur,
      handleAiHardDurationChange,
      handleAiMediumDurationBlur,
      handleAiMediumDurationChange,
      handleAiNameChange,
      handleAiPromptChange,
      handleAiTotalQuestionsBlur,
      handleAiTotalQuestionsChange,
      handleBloomRatioChange,
      handleCustomDifficultyChange,
      handleDifficultyChange,
      handleQTypeRatioChange,
      handleToggleBloomLock,
      handleToggleBloomSelection,
      handleToggleDifficultyLock,
      handleToggleQTypeLock,
      handleToggleQuestionTypeSelection,
      setAiTimerMode,
      setBloomUnit,
      setQuestionTypeUnit,
      setQuestionUnit,
    },
    submitting,
  };
};
