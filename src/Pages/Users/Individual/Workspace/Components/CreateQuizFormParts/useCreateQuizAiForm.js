import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  generateAIQuiz,
  previewAIQuizStructure,
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
  IMAGE_BASED_QUESTION_TYPE,
} from "./createQuizForm.constants";
import { isAdvancedQuizQuestionType } from "@/lib/quizQuestionTypes";
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

const STRUCTURE_DIFFICULTY_OPTIONS = ["EASY", "MEDIUM", "HARD"];

const normalizeStructureItems = (items) => (
  (Array.isArray(items) ? items : []).map((item) => ({
    difficulty: String(item?.difficulty || "MEDIUM").toUpperCase(),
    questionType: String(item?.questionType || "SINGLE_CHOICE").toUpperCase(),
    bloomSkill: String(item?.bloomSkill || "REMEMBER").toUpperCase(),
    quantity: Math.max(1, Math.round(Number(item?.quantity) || 1)),
  }))
);

const parseStructureJsonItems = (structureJson) => {
  if (!structureJson) {
    return [];
  }

  try {
    const parsed = JSON.parse(structureJson);
    return normalizeStructureItems(parsed?.items);
  } catch (error) {
    console.error("Failed to parse structureJson:", error);
    return [];
  }
};

const toPercentRatios = (entries, total) => {
  if (!entries.length || total <= 0) {
    return entries.map(([key]) => ({ key, ratio: 0 }));
  }

  const mapped = entries.map(([key, value]) => ({
    key,
    ratio: Math.round(((value / total) * 100) * 100) / 100,
  }));

  const assigned = mapped.reduce((sum, item) => sum + item.ratio, 0);
  const delta = Math.round((100 - assigned) * 100) / 100;
  if (mapped.length > 0 && delta !== 0) {
    mapped[mapped.length - 1].ratio = Math.max(0, Math.round((mapped[mapped.length - 1].ratio + delta) * 100) / 100);
  }

  return mapped;
};

const serializeStructureConfigPayload = (payload) => {
  if (!payload) {
    return "";
  }

  const normalizedQuestionTypes = (Array.isArray(payload.questionTypes) ? payload.questionTypes : [])
    .map((item) => ({
      questionTypeId: Number(item?.questionTypeId),
      ratio: Number(item?.ratio) || 0,
    }))
    .filter((item) => Number.isFinite(item.questionTypeId))
    .sort((left, right) => left.questionTypeId - right.questionTypeId);

  const normalizedBloomSkills = (Array.isArray(payload.bloomSkills) ? payload.bloomSkills : [])
    .map((item) => ({
      bloomId: Number(item?.bloomId),
      ratio: Number(item?.ratio) || 0,
    }))
    .filter((item) => Number.isFinite(item.bloomId))
    .sort((left, right) => left.bloomId - right.bloomId);

  return JSON.stringify({
    totalQuestion: Number(payload.totalQuestion) || 0,
    questionTypeUnit: Boolean(payload.questionTypeUnit),
    bloomUnit: Boolean(payload.bloomUnit),
    questionUnit: Boolean(payload.questionUnit),
    easyRatio: Number(payload.easyRatio) || 0,
    mediumRatio: Number(payload.mediumRatio) || 0,
    hardRatio: Number(payload.hardRatio) || 0,
    questionTypes: normalizedQuestionTypes,
    bloomSkills: normalizedBloomSkills,
  });
};

const normalizeStructurePreviewResponse = (response) => {
  const payload = response?.data ?? response ?? {};
  const items = Array.isArray(payload?.items) ? payload.items : [];
  return {
    totalQuestion: Number(payload?.totalQuestion) || 0,
    structureJson: String(payload?.structureJson || ""),
    items,
  };
};

export const useCreateQuizAiForm = ({
  defaultContextId,
  hasAdvanceQuizConfig,
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
  const [structurePreview, setStructurePreview] = useState(null);
  const [structurePreviewLoading, setStructurePreviewLoading] = useState(false);
  const [structurePreviewError, setStructurePreviewError] = useState("");
  const [structureConfigSignature, setStructureConfigSignature] = useState("");
  const [isStructureEditing, setIsStructureEditing] = useState(false);
  const [editableStructureItems, setEditableStructureItems] = useState([]);
  const structurePreviewSnapshotRef = useRef(null);
  const structureConfigSnapshotRef = useRef(null);
  const structureConfigSignatureSnapshotRef = useRef("");

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

    const selectableQuestionTypes = qTypes.filter((item) => (
      hasAdvanceQuizConfig || !isAdvancedQuizQuestionType(item?.questionType)
    ));

    const availableTypeIds = new Set(
      selectableQuestionTypes
        .map((item) => Number(item?.questionTypeId))
        .filter((questionTypeId) => Number.isInteger(questionTypeId) && questionTypeId > 0)
    );

    setSelectedQTypes((previousItems) => {
      const filteredItems = previousItems.filter((item) => (
        availableTypeIds.has(Number(item?.questionTypeId))
      ));

      if (filteredItems.length === 0) {
        const singleChoice = selectableQuestionTypes.find(
          (item) => String(item?.questionType || "").toUpperCase() === "SINGLE_CHOICE"
        );
        const fallbackType = singleChoice || selectableQuestionTypes[0];
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
  }, [getTargetTotal, hasAdvanceQuizConfig, qTypes, questionTypeUnit]);

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

  const canFetchStructurePreview = useMemo(() => {
    const previewBlockingFields = [
      "aiTotalQuestions",
      "aiDifficulty",
      "selectedQTypes",
      "selectedBloomSkills",
    ];

    return previewBlockingFields.every((fieldKey) => !aiValidationState.fieldErrors[fieldKey]);
  }, [aiValidationState.fieldErrors]);

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
      const targetQuestionType = qTypes.find(
        (item) => Number(item?.questionTypeId) === normalizedId
      );
      if (!hasAdvanceQuizConfig && isAdvancedQuizQuestionType(targetQuestionType?.questionType)) {
        return previousItems;
      }
      const alreadySelected = previousItems.some(
        (item) => Number(item.questionTypeId) === normalizedId
      );
      const nextItems = alreadySelected
        ? previousItems.filter((item) => Number(item.questionTypeId) !== normalizedId)
        : [...previousItems, { questionTypeId: normalizedId, ratio: 0, isLocked: false }];

      return distributeConfigValues(nextItems, getTargetTotal(questionTypeUnit), questionTypeUnit);
    });
  }, [getTargetTotal, hasAdvanceQuizConfig, qTypes, questionTypeUnit]);

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

  const applyStructureItemsToConfig = useCallback((items) => {
    const normalizedItems = normalizeStructureItems(items);
    const totalQuestion = normalizedItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    const safeTotal = Math.max(1, totalQuestion);

    const difficultyCounts = normalizedItems.reduce((accumulator, item) => {
      const key = String(item?.difficulty || "").toUpperCase();
      if (!accumulator[key]) {
        accumulator[key] = 0;
      }
      accumulator[key] += Number(item.quantity) || 0;
      return accumulator;
    }, {});

    const difficultyPercentEntries = toPercentRatios([
      ["EASY", difficultyCounts.EASY || 0],
      ["MEDIUM", difficultyCounts.MEDIUM || 0],
      ["HARD", difficultyCounts.HARD || 0],
    ], safeTotal);

    const toDifficultyValue = (key) => {
      const matched = difficultyPercentEntries.find((entry) => entry.key === key);
      return matched ? matched.ratio : 0;
    };

    setSelectedDifficultyId("CUSTOM");
    setQuestionUnit(false);
    setLockedDifficultyLevel(null);
    setCustomDifficulty({
      easy: toDifficultyValue("EASY"),
      medium: toDifficultyValue("MEDIUM"),
      hard: toDifficultyValue("HARD"),
    });

    const qTypeCountMap = normalizedItems.reduce((accumulator, item) => {
      const typeKey = String(item?.questionType || "").toUpperCase();
      accumulator[typeKey] = (accumulator[typeKey] || 0) + (Number(item.quantity) || 0);
      return accumulator;
    }, {});

    const bloomCountMap = normalizedItems.reduce((accumulator, item) => {
      const bloomKey = String(item?.bloomSkill || "").toUpperCase();
      accumulator[bloomKey] = (accumulator[bloomKey] || 0) + (Number(item.quantity) || 0);
      return accumulator;
    }, {});

    const qTypeEntries = Object.entries(qTypeCountMap)
      .filter(([, count]) => Number(count) > 0)
      .map(([typeName, count]) => {
        const matchedType = qTypes.find(
          (item) => String(item?.questionType || "").toUpperCase() === typeName
        );
        if (!matchedType?.questionTypeId) {
          return null;
        }

        return {
          questionTypeId: matchedType.questionTypeId,
          count: Number(count) || 0,
        };
      })
      .filter(Boolean);

    const bloomEntries = Object.entries(bloomCountMap)
      .filter(([, count]) => Number(count) > 0)
      .map(([bloomName, count]) => {
        const matchedBloom = bloomSkills.find(
          (item) => String(item?.bloomName || "").toUpperCase() === bloomName
        );
        if (!matchedBloom?.bloomId) {
          return null;
        }

        return {
          bloomId: matchedBloom.bloomId,
          count: Number(count) || 0,
        };
      })
      .filter(Boolean);

    const qTypeRatios = questionTypeUnit
      ? qTypeEntries.map((entry) => ({ ...entry, ratio: entry.count }))
      : toPercentRatios(
        qTypeEntries.map((entry) => [entry.questionTypeId, entry.count]),
        safeTotal
      ).map((entry) => ({
        questionTypeId: entry.key,
        ratio: entry.ratio,
      }));

    const bloomRatios = bloomUnit
      ? bloomEntries.map((entry) => ({ ...entry, ratio: entry.count }))
      : toPercentRatios(
        bloomEntries.map((entry) => [entry.bloomId, entry.count]),
        safeTotal
      ).map((entry) => ({
        bloomId: entry.key,
        ratio: entry.ratio,
      }));

    setSelectedQTypes(qTypeRatios.map((entry) => ({
      questionTypeId: entry.questionTypeId,
      ratio: Number(entry.ratio) || 0,
      isLocked: true,
    })));

    setSelectedBloomSkills(bloomRatios.map((entry) => ({
      bloomId: entry.bloomId,
      ratio: Number(entry.ratio) || 0,
      isLocked: true,
    })));
  }, [bloomSkills, bloomUnit, qTypes, questionTypeUnit]);

  const buildStructurePreviewPayload = useCallback(() => ({
    totalQuestion: Number(aiTotalQuestions) || 0,
    questionTypeUnit,
    bloomUnit,
    questionUnit,
    easyRatio: Number(difficultyRatios.easy) || 0,
    mediumRatio: Number(difficultyRatios.medium) || 0,
    hardRatio: Number(difficultyRatios.hard) || 0,
    questionTypes: selectedQTypes.map((item) => ({
      questionTypeId: item.questionTypeId,
      ratio: Number(item.ratio) || 0,
    })),
    bloomSkills: selectedBloomSkills.map((item) => ({
      bloomId: item.bloomId,
      ratio: Number(item.ratio) || 0,
    })),
  }), [
    aiTotalQuestions,
    bloomUnit,
    difficultyRatios.easy,
    difficultyRatios.hard,
    difficultyRatios.medium,
    questionTypeUnit,
    questionUnit,
    selectedBloomSkills,
    selectedQTypes,
  ]);

  const currentStructureConfigSignature = useMemo(
    () => serializeStructureConfigPayload(buildStructurePreviewPayload()),
    [buildStructurePreviewPayload]
  );

  const isStructureOutdated = useMemo(() => {
    if (!structurePreview?.structureJson) {
      return false;
    }

    if (isStructureEditing) {
      return false;
    }

    if (!structureConfigSignature) {
      return false;
    }

    return structureConfigSignature !== currentStructureConfigSignature;
  }, [
    currentStructureConfigSignature,
    isStructureEditing,
    structureConfigSignature,
    structurePreview?.structureJson,
  ]);

  const handlePreviewStructure = useCallback(async () => {
    setStructurePreviewError("");
    setStructurePreviewLoading(true);

    try {
      const previewPayload = buildStructurePreviewPayload();
      const nextSignature = serializeStructureConfigPayload(previewPayload);
      const response = await previewAIQuizStructure(previewPayload);
      const normalizedPreview = normalizeStructurePreviewResponse(response);
      console.log("[AI Quiz][Structure Preview] structureJson:", normalizedPreview.structureJson);
      setStructurePreview(normalizedPreview);
      setStructureConfigSignature(nextSignature);
      return normalizedPreview;
    } catch (previewError) {
      console.error("Failed to preview AI quiz structure:", previewError);
      setStructurePreview(null);
      setStructurePreviewError(previewError?.message || t("workspace.quiz.aiConfig.structurePreviewFailed"));
      return null;
    } finally {
      setStructurePreviewLoading(false);
    }
  }, [buildStructurePreviewPayload, t]);

  const handleStartStructureEdit = useCallback(async () => {
    let preview = structurePreview;
    if (!preview?.structureJson) {
      preview = await handlePreviewStructure();
    }

    if (!preview) {
      return;
    }

    const parsedItems = parseStructureJsonItems(preview.structureJson);
    const fallbackItems = normalizeStructureItems(preview.items);
    const nextItems = parsedItems.length > 0 ? parsedItems : fallbackItems;

    structurePreviewSnapshotRef.current = preview;
    structureConfigSignatureSnapshotRef.current = structureConfigSignature;
    structureConfigSnapshotRef.current = {
      aiTotalQuestions,
      selectedDifficultyId,
      questionUnit,
      lockedDifficultyLevel,
      customDifficulty,
      selectedQTypes,
      selectedBloomSkills,
    };
    setEditableStructureItems(nextItems);
    setIsStructureEditing(true);
    applyStructureItemsToConfig(nextItems);
  }, [
    aiTotalQuestions,
    applyStructureItemsToConfig,
    customDifficulty,
    handlePreviewStructure,
    lockedDifficultyLevel,
    questionUnit,
    selectedBloomSkills,
    selectedDifficultyId,
    selectedQTypes,
    structurePreview,
  ]);

  const updateStructureFromEditableItems = useCallback((nextItems) => {
    const normalizedItems = normalizeStructureItems(nextItems);
    const totalQuestion = normalizedItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    const nextStructureJson = JSON.stringify({ items: normalizedItems });

    setEditableStructureItems(normalizedItems);
    setStructurePreview((previousPreview) => {
      if (!previousPreview) {
        return previousPreview;
      }

      return {
        ...previousPreview,
        structureJson: nextStructureJson,
        totalQuestion,
      };
    });

    applyStructureItemsToConfig(normalizedItems);
  }, [applyStructureItemsToConfig]);

  const handleStructureItemChange = useCallback((index, field, value) => {
    if (!Array.isArray(editableStructureItems) || index < 0 || index >= editableStructureItems.length) {
      return;
    }

    const nextItems = editableStructureItems.map((item, itemIndex) => {
      if (itemIndex !== index) {
        return item;
      }

      if (field === "quantity") {
        return {
          ...item,
          quantity: Math.max(1, Math.round(Number(value) || 1)),
        };
      }

      return {
        ...item,
        [field]: String(value || "").toUpperCase(),
      };
    });

    updateStructureFromEditableItems(nextItems);
  }, [editableStructureItems, updateStructureFromEditableItems]);

  const handleAddStructureItem = useCallback(() => {
    const currentTotal = (Array.isArray(editableStructureItems) ? editableStructureItems : [])
      .reduce((sum, item) => sum + (Number(item?.quantity) || 0), 0);
    const targetTotal = Math.max(0, Number(aiTotalQuestions) || 0);

    if (targetTotal > 0 && currentTotal >= targetTotal) {
      return;
    }

    const nextItems = [
      {
        difficulty: "EASY",
        questionType: "SINGLE_CHOICE",
        bloomSkill: "REMEMBER",
        quantity: 1,
      },
      ...(Array.isArray(editableStructureItems) ? editableStructureItems : []),
    ];

    updateStructureFromEditableItems(nextItems);
  }, [aiTotalQuestions, editableStructureItems, updateStructureFromEditableItems]);

  const handleRemoveStructureItem = useCallback((index) => {
    if (!Array.isArray(editableStructureItems) || editableStructureItems.length <= 1) {
      return;
    }

    if (index < 0 || index >= editableStructureItems.length) {
      return;
    }

    const nextItems = editableStructureItems.filter((_, itemIndex) => itemIndex !== index);
    updateStructureFromEditableItems(nextItems);
  }, [editableStructureItems, updateStructureFromEditableItems]);

  const handleMoveStructureItem = useCallback((fromIndex, toIndex) => {
    if (!Array.isArray(editableStructureItems) || editableStructureItems.length === 0) {
      return;
    }

    const normalizedFromIndex = Number(fromIndex);
    const normalizedToIndex = Number(toIndex);

    if (!Number.isInteger(normalizedFromIndex) || !Number.isInteger(normalizedToIndex)) {
      return;
    }

    if (normalizedFromIndex < 0 || normalizedToIndex < 0) {
      return;
    }

    if (normalizedFromIndex >= editableStructureItems.length || normalizedToIndex >= editableStructureItems.length) {
      return;
    }

    if (normalizedFromIndex === normalizedToIndex) {
      return;
    }

    const nextItems = [...editableStructureItems];
    const [movedItem] = nextItems.splice(normalizedFromIndex, 1);
    nextItems.splice(normalizedToIndex, 0, movedItem);

    updateStructureFromEditableItems(nextItems);
  }, [editableStructureItems, updateStructureFromEditableItems]);

  const handleCancelStructureEdit = useCallback(() => {
    if (!isStructureEditing) {
      return;
    }

    const snapshot = structurePreviewSnapshotRef.current;
    if (snapshot) {
      setStructurePreview(snapshot);
      setStructurePreviewError("");
    }

    if (structureConfigSignatureSnapshotRef.current) {
      setStructureConfigSignature(structureConfigSignatureSnapshotRef.current);
    }

    const configSnapshot = structureConfigSnapshotRef.current;
    if (configSnapshot) {
      setAiTotalQuestions(configSnapshot.aiTotalQuestions);
      setSelectedDifficultyId(configSnapshot.selectedDifficultyId);
      setQuestionUnit(configSnapshot.questionUnit);
      setLockedDifficultyLevel(configSnapshot.lockedDifficultyLevel);
      setCustomDifficulty(configSnapshot.customDifficulty);
      setSelectedQTypes(configSnapshot.selectedQTypes);
      setSelectedBloomSkills(configSnapshot.selectedBloomSkills);
    } else if (snapshot?.items) {
      applyStructureItemsToConfig(snapshot.items);
    }

    setEditableStructureItems([]);
    setIsStructureEditing(false);
  }, [applyStructureItemsToConfig, isStructureEditing]);

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

      let structureJson = String(structurePreview?.structureJson || "");
      if (!structureJson) {
        const previewResult = await handlePreviewStructure();
        structureJson = String(previewResult?.structureJson || "");
      }

      console.log("[AI Quiz][Generate] structureJson:", structureJson);

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
        structure: structureJson,
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
    handlePreviewStructure,
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
    structurePreview?.structureJson,
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
      structurePreview,
      structurePreviewError,
      structurePreviewLoading,
      isStructureOutdated,
      isStructureEditing,
      editableStructureItems,
      structureDifficultyOptions: STRUCTURE_DIFFICULTY_OPTIONS,
      canFetchStructurePreview,
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
      handlePreviewStructure,
      handleStartStructureEdit,
      handleCancelStructureEdit,
      handleStructureItemChange,
      handleAddStructureItem,
      handleRemoveStructureItem,
      handleMoveStructureItem,
      setAiTimerMode,
      setBloomUnit,
      setQuestionTypeUnit,
      setQuestionUnit,
    },
    submitting,
  };
};
