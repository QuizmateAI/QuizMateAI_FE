import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Brain,
  BrainCircuit,
  CheckCircle2,
  FileQuestion,
  Info,
  Layers3,
  Loader2,
  Lock,
  Play,
  Sliders,
  SlidersHorizontal,
  Target,
  Unlock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getQuizCollectionById,
  getQuizCollectionQuestions,
  startQuizCollectionAdvancedPractice,
} from "@/api/QuizCollectionAPI";
import { unwrapApiData, unwrapApiList } from "@/utils/apiResponse";
import { useToast } from "@/context/ToastContext";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { buildQuizAttemptPath } from "@/lib/routePaths";
import { cn } from "@/lib/utils";
import {
  convertLockedValuesByUnit,
  distributeConfigValues,
  distributeCustomDifficultyEvenly,
  distributeDifficultyValues,
} from "@/pages/Users/Individual/Workspace/Components/CreateQuizFormParts/createQuizForm.utils";
import {
  getBloomSkillLabel,
  getQuizDifficultyLabel,
  getQuizQuestionTypeLabel,
  QUESTION_TYPE_LABEL_FALLBACKS,
} from "@/lib/quizQuestionTypes";

const DIFFICULTY_PRESETS = [
  { id: "BALANCED", difficultyName: "Balanced", easyRatio: 20, mediumRatio: 60, hardRatio: 20 },
  { id: "EASY_FOCUS", difficultyName: "Easy focus", easyRatio: 60, mediumRatio: 30, hardRatio: 10 },
  { id: "HARD_FOCUS", difficultyName: "Hard focus", easyRatio: 10, mediumRatio: 30, hardRatio: 60 },
];

function toPositiveInteger(value, fallback = 1) {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) return fallback;
  return normalized;
}

function countBy(items, readKey) {
  return items.reduce((result, item) => {
    const key = readKey(item);
    if (key == null || key === "") return result;
    result[key] = (result[key] || 0) + 1;
    return result;
  }, {});
}

function percentagesToCounts(ratios, total) {
  const result = new Array(ratios.length).fill(0);
  let assigned = 0;
  ratios.forEach((ratio, index) => {
    if (index === ratios.length - 1) {
      result[index] = Math.max(0, total - assigned);
      return;
    }
    const count = Math.max(0, Math.round(total * ((Number(ratio) || 0) / 100)));
    result[index] = count;
    assigned += count;
  });
  const sum = result.reduce((totalCount, value) => totalCount + value, 0);
  if (result.length > 0 && sum !== total) {
    result[result.length - 1] = Math.max(0, result[result.length - 1] + (total - sum));
  }
  return result;
}

function getDifficultyLabel(t, key) {
  return getQuizDifficultyLabel(key, t);
}

function getQuestionTypeLabel(questionType, t) {
  const normalizedType = String(questionType || "").toUpperCase();
  const fallbackLabel = QUESTION_TYPE_LABEL_FALLBACKS[normalizedType] || questionType || "-";
  return getQuizQuestionTypeLabel(normalizedType, t) || fallbackLabel;
}

function getBloomLabel(bloomSkill, t) {
  return getBloomSkillLabel(bloomSkill, t);
}

function formatDifficultyPreviewPercent(value) {
  const normalized = Number(value) || 0;
  return Number.isInteger(normalized) ? String(normalized) : normalized.toFixed(1);
}

function getTargetTotal(unitByCount, totalQuestions) {
  return unitByCount ? Math.max(0, Number(totalQuestions || 0)) : 100;
}

function areRatioItemsEqual(left, right, idKey) {
  if (left === right) return true;
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;

  return left.every((item, index) => (
    Number(item?.[idKey]) === Number(right[index]?.[idKey])
    && Number(item?.ratio || 0) === Number(right[index]?.ratio || 0)
    && Boolean(item?.isLocked) === Boolean(right[index]?.isLocked)
  ));
}

function areDifficultyValuesEqual(left, right) {
  return Number(left?.easy || 0) === Number(right?.easy || 0)
    && Number(left?.medium || 0) === Number(right?.medium || 0)
    && Number(left?.hard || 0) === Number(right?.hard || 0);
}

function QuizCollectionAdvancedPracticeConfigView({
  isDarkMode = false,
  workspaceId,
  collection,
  onBack,
}) {
  const { t, i18n } = useTranslation();
  const { showError } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const collectionId = Number(collection?.collectionId);
  const normalizedWorkspaceId = Number(workspaceId) || 0;
  const [starting, setStarting] = useState(false);
  const prevDifficultyUnitRef = useRef(false);
  const prevQuestionTypeUnitRef = useRef(false);
  const prevBloomUnitRef = useRef(false);
  const [config, setConfig] = useState({
    numQuestions: 10,
    duration: 30,
    timerMode: true,
    questionUnit: false,
    selectedDifficultyId: "BALANCED",
    customDifficulty: { easy: 20, medium: 60, hard: 20 },
    lockedDifficultyLevel: null,
    bloomUnit: false,
    selectedBloomSkills: [],
    questionTypeUnit: false,
    selectedQuestionTypes: [],
  });

  const { data: currentCollection = collection } = useQuery({
    queryKey: ["quiz-collection", collectionId],
    enabled: Number.isInteger(collectionId) && collectionId > 0,
    queryFn: async () => unwrapApiData(await getQuizCollectionById(collectionId)),
    initialData: collection,
  });

  const {
    data: questions = [],
    isLoading: loadingQuestions,
  } = useQuery({
    queryKey: ["quiz-collection-questions", collectionId],
    enabled: Number.isInteger(collectionId) && collectionId > 0,
    queryFn: async () => unwrapApiList(await getQuizCollectionQuestions(collectionId)),
  });

  const totalQuestion = questions.length || Number(currentCollection?.totalQuestion ?? 0) || 0;
  const maxSelectableQuestions = Math.max(totalQuestion, 1);
  const mutedTextClass = isDarkMode ? "text-slate-400" : "text-slate-500";
  const inputCls = cn(
    "h-10 w-full rounded-xl border px-3 text-sm outline-none transition-colors focus:border-blue-400",
    isDarkMode
      ? "border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-500"
      : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400",
  );
  const selectCls = cn(
    "h-10 w-full rounded-xl border px-3 text-sm outline-none transition-colors focus:border-blue-400",
    isDarkMode
      ? "border-slate-700 bg-slate-900 text-slate-100"
      : "border-slate-200 bg-white text-slate-900",
  );
  const labelCls = cn(
    "mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em]",
    isDarkMode ? "text-slate-400" : "text-gray-600",
  );
  const sectionCardClass = cn(
    "rounded-[28px] border p-5 shadow-sm",
    isDarkMode ? "border-slate-800 bg-slate-900/80" : "border-slate-200 bg-white",
  );
  const bulkActionButtonClass = isDarkMode
    ? "h-7 border-slate-700 bg-slate-900/60 px-2.5 text-[11px] text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
    : "h-7 border-gray-200 bg-white px-2.5 text-[11px] text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50";

  useEffect(() => {
    if (totalQuestion <= 0) return;
    setConfig((current) => ({
      ...current,
      numQuestions: Math.min(toPositiveInteger(current.numQuestions, 10), totalQuestion),
    }));
  }, [totalQuestion]);

  const bloomOptions = useMemo(() => {
    const byId = new Map();
    questions.forEach((question) => {
      const id = Number(question?.bloomId);
      if (!Number.isInteger(id) || id <= 0) return;
      const currentOption = byId.get(id) || {
        bloomId: id,
        bloomName: question?.bloomName || `Bloom ${id}`,
        count: 0,
      };
      currentOption.count += 1;
      byId.set(id, currentOption);
    });
    return [...byId.values()].sort((a, b) => a.bloomId - b.bloomId);
  }, [questions]);

  const questionTypeOptions = useMemo(() => {
    const byId = new Map();
    questions.forEach((question) => {
      const id = Number(question?.questionTypeId);
      if (!Number.isInteger(id) || id <= 0) return;
      const normalizedType = String(question?.questionType || question?.questionTypeName || "").toUpperCase();
      const displayLabel = getQuestionTypeLabel(normalizedType, t);
      const currentOption = byId.get(id) || {
        questionTypeId: id,
        questionTypeKey: normalizedType,
        questionType: displayLabel,
        description: displayLabel,
        count: 0,
      };
      currentOption.count += 1;
      byId.set(id, currentOption);
    });
    return [...byId.values()].sort((a, b) => a.questionTypeId - b.questionTypeId);
  }, [questions, t]);

  const requestedCount = Math.min(toPositiveInteger(config.numQuestions, 1), maxSelectableQuestions);
  const difficultyTargetTotal = getTargetTotal(config.questionUnit, requestedCount);

  useEffect(() => {
    if (!questionTypeOptions.length) return;

    setConfig((current) => {
      const availableTypeIds = new Set(questionTypeOptions.map((item) => Number(item.questionTypeId)));
      const filteredItems = current.selectedQuestionTypes
        .filter((item) => availableTypeIds.has(Number(item?.questionTypeId)))
        .map((item) => {
          const detail = questionTypeOptions.find(
            (questionType) => Number(questionType.questionTypeId) === Number(item.questionTypeId),
          );
          return detail ? { ...item, questionType: detail.questionType, description: detail.description } : item;
        });

      const sourceItems = filteredItems.length > 0
        ? filteredItems
        : questionTypeOptions.map((item) => ({
          questionTypeId: item.questionTypeId,
          questionTypeKey: item.questionTypeKey,
          questionType: item.questionType,
          description: item.description,
          ratio: 0,
          isLocked: false,
        }));

      const nextItems = distributeConfigValues(
        sourceItems,
        getTargetTotal(current.questionTypeUnit, Math.min(toPositiveInteger(current.numQuestions, 1), maxSelectableQuestions)),
        current.questionTypeUnit,
      );

      if (areRatioItemsEqual(nextItems, current.selectedQuestionTypes, "questionTypeId")) {
        return current;
      }

      return {
        ...current,
        selectedQuestionTypes: nextItems,
      };
    });
  }, [maxSelectableQuestions, questionTypeOptions]);

  useEffect(() => {
    if (!bloomOptions.length) return;

    setConfig((current) => {
      const availableBloomIds = new Set(bloomOptions.map((item) => Number(item.bloomId)));
      const filteredItems = current.selectedBloomSkills
        .filter((item) => availableBloomIds.has(Number(item?.bloomId)))
        .map((item) => {
          const detail = bloomOptions.find((skill) => Number(skill.bloomId) === Number(item.bloomId));
          return detail
            ? { ...item, bloomName: detail.bloomName, description: detail.bloomName }
            : item;
        });

      const sourceItems = filteredItems.length > 0
        ? filteredItems
        : bloomOptions.map((item) => ({
          bloomId: item.bloomId,
          bloomName: item.bloomName,
          description: item.bloomName,
          ratio: 0,
          isLocked: false,
        }));

      const nextItems = distributeConfigValues(
        sourceItems,
        getTargetTotal(current.bloomUnit, Math.min(toPositiveInteger(current.numQuestions, 1), maxSelectableQuestions)),
        current.bloomUnit,
      );

      if (areRatioItemsEqual(nextItems, current.selectedBloomSkills, "bloomId")) {
        return current;
      }

      return {
        ...current,
        selectedBloomSkills: nextItems,
      };
    });
  }, [bloomOptions, maxSelectableQuestions]);

  useEffect(() => {
    if (config.selectedDifficultyId !== "CUSTOM" && config.questionUnit) {
      setConfig((current) => ({ ...current, questionUnit: false }));
    }
  }, [config.questionUnit, config.selectedDifficultyId]);

  useEffect(() => {
    if (config.selectedDifficultyId !== "CUSTOM") return;

    setConfig((current) => {
      if (current.selectedDifficultyId !== "CUSTOM") return current;

      let nextCustomDifficulty;
      if (prevDifficultyUnitRef.current !== current.questionUnit) {
        nextCustomDifficulty = distributeDifficultyValues(
          current.customDifficulty,
          getTargetTotal(current.questionUnit, requestedCount),
          current.questionUnit,
        );
        prevDifficultyUnitRef.current = current.questionUnit;
      } else {
        nextCustomDifficulty = distributeDifficultyValues(
          current.customDifficulty,
          getTargetTotal(current.questionUnit, requestedCount),
          current.questionUnit,
          current.lockedDifficultyLevel,
        );
      }

      if (areDifficultyValuesEqual(nextCustomDifficulty, current.customDifficulty)) {
        return current;
      }

      return {
        ...current,
        customDifficulty: nextCustomDifficulty,
      };
    });
  }, [config.questionUnit, config.lockedDifficultyLevel, config.selectedDifficultyId, requestedCount]);

  useEffect(() => {
    setConfig((current) => {
      const fromUnitByCount = prevQuestionTypeUnitRef.current;
      let nextItems = current.selectedQuestionTypes;

      if (fromUnitByCount !== current.questionTypeUnit) {
        nextItems = convertLockedValuesByUnit(
          current.selectedQuestionTypes,
          fromUnitByCount,
          current.questionTypeUnit,
          requestedCount,
        );
        prevQuestionTypeUnitRef.current = current.questionTypeUnit;
      }

      nextItems = distributeConfigValues(
        nextItems,
        getTargetTotal(current.questionTypeUnit, requestedCount),
        current.questionTypeUnit,
      );

      if (areRatioItemsEqual(nextItems, current.selectedQuestionTypes, "questionTypeId")) {
        return current;
      }

      return {
        ...current,
        selectedQuestionTypes: nextItems,
      };
    });
  }, [config.questionTypeUnit, requestedCount]);

  useEffect(() => {
    setConfig((current) => {
      const fromUnitByCount = prevBloomUnitRef.current;
      let nextItems = current.selectedBloomSkills;

      if (fromUnitByCount !== current.bloomUnit) {
        nextItems = convertLockedValuesByUnit(
          current.selectedBloomSkills,
          fromUnitByCount,
          current.bloomUnit,
          requestedCount,
        );
        prevBloomUnitRef.current = current.bloomUnit;
      }

      nextItems = distributeConfigValues(
        nextItems,
        getTargetTotal(current.bloomUnit, requestedCount),
        current.bloomUnit,
      );

      if (areRatioItemsEqual(nextItems, current.selectedBloomSkills, "bloomId")) {
        return current;
      }

      return {
        ...current,
        selectedBloomSkills: nextItems,
      };
    });
  }, [config.bloomUnit, requestedCount]);

  const difficultyValues = useMemo(() => {
    if (config.selectedDifficultyId === "CUSTOM") {
      return {
        easy: Number(config.customDifficulty.easy) || 0,
        medium: Number(config.customDifficulty.medium) || 0,
        hard: Number(config.customDifficulty.hard) || 0,
      };
    }
    const preset = DIFFICULTY_PRESETS.find((item) => item.id === config.selectedDifficultyId) || DIFFICULTY_PRESETS[0];
    return {
      easy: preset.easyRatio,
      medium: preset.mediumRatio,
      hard: preset.hardRatio,
    };
  }, [config.customDifficulty, config.selectedDifficultyId]);

  const difficultyRawTotal = useMemo(
    () => difficultyValues.easy + difficultyValues.medium + difficultyValues.hard,
    [difficultyValues.easy, difficultyValues.hard, difficultyValues.medium],
  );

  const difficultyPreviewPercent = useMemo(() => {
    const difficultyBarBase = Math.max(difficultyTargetTotal, difficultyRawTotal, 1);
    return {
      easy: (difficultyValues.easy / difficultyBarBase) * 100,
      medium: (difficultyValues.medium / difficultyBarBase) * 100,
      hard: (difficultyValues.hard / difficultyBarBase) * 100,
    };
  }, [difficultyRawTotal, difficultyTargetTotal, difficultyValues.easy, difficultyValues.hard, difficultyValues.medium]);

  const selectedQuestionTypeIdSet = useMemo(
    () => new Set(config.selectedQuestionTypes.map((item) => Number(item?.questionTypeId))),
    [config.selectedQuestionTypes],
  );
  const selectedBloomIdSet = useMemo(
    () => new Set(config.selectedBloomSkills.map((item) => Number(item?.bloomId))),
    [config.selectedBloomSkills],
  );

  const baseCandidates = useMemo(() => {
    return questions.filter((question) => {
      const questionTypeId = Number(question?.questionTypeId);
      const bloomId = Number(question?.bloomId);
      return selectedQuestionTypeIdSet.has(questionTypeId) && selectedBloomIdSet.has(bloomId);
    });
  }, [questions, selectedBloomIdSet, selectedQuestionTypeIdSet]);

  const difficultyTargets = useMemo(() => {
    if (config.questionUnit) {
      return [
        Math.max(0, Math.round(Number(difficultyValues.easy) || 0)),
        Math.max(0, Math.round(Number(difficultyValues.medium) || 0)),
        Math.max(0, Math.round(Number(difficultyValues.hard) || 0)),
      ];
    }

    return percentagesToCounts(
      [difficultyValues.easy, difficultyValues.medium, difficultyValues.hard],
      requestedCount,
    );
  }, [config.questionUnit, difficultyValues.easy, difficultyValues.hard, difficultyValues.medium, requestedCount]);

  const bloomTargets = useMemo(() => {
    if (!config.selectedBloomSkills.length) return [];
    const counts = config.bloomUnit
      ? config.selectedBloomSkills.map((item) => Math.max(0, Math.round(Number(item?.ratio) || 0)))
      : percentagesToCounts(
        config.selectedBloomSkills.map((item) => Number(item?.ratio) || 0),
        requestedCount,
      );

    return config.selectedBloomSkills.map((item, index) => ({
      ...item,
      targetCount: counts[index] || 0,
    }));
  }, [config.bloomUnit, config.selectedBloomSkills, requestedCount]);

  const readiness = useMemo(() => {
    if (totalQuestion <= 0) {
      return {
        ok: false,
        message: t("quizCollection.noQuestions", "Bá»™ sÆ°u táº­p chÆ°a cÃ³ cÃ¢u há»i. HÃ£y import quiz hoáº·c import cÃ¢u há»i Ä‘á»ƒ báº¯t Ä‘áº§u."),
      };
    }
    if (config.selectedQuestionTypes.length === 0) {
      return {
        ok: false,
        message: t("quizCollection.questionTypeRequired", "HÃ£y chá»n Ã­t nháº¥t má»™t loáº¡i cÃ¢u há»i."),
      };
    }
    if (config.selectedBloomSkills.length === 0) {
      return {
        ok: false,
        message: t("quizCollection.bloomRequired", "HÃ£y chá»n Ã­t nháº¥t má»™t má»©c Bloom."),
      };
    }
    if (baseCandidates.length < requestedCount) {
      return {
        ok: false,
        message: t("quizCollection.advancedNotEnoughFiltered", {
          defaultValue: "Bá»™ lá»c hiá»‡n chá»‰ cÃ³ {{count}} cÃ¢u phÃ¹ há»£p. HÃ£y giáº£m sá»‘ cÃ¢u hoáº·c bá»• sung cÃ¢u há»i.",
          count: baseCandidates.length,
        }),
      };
    }

    const availableByDifficulty = countBy(baseCandidates, (question) => String(question?.difficulty || "").toUpperCase());
    const difficultyShortage = [
      { key: "EASY", label: getDifficultyLabel(t, "EASY"), target: difficultyTargets[0] || 0 },
      { key: "MEDIUM", label: getDifficultyLabel(t, "MEDIUM"), target: difficultyTargets[1] || 0 },
      { key: "HARD", label: getDifficultyLabel(t, "HARD"), target: difficultyTargets[2] || 0 },
    ].find((item) => item.target > 0 && (availableByDifficulty[item.key] || 0) < item.target);

    if (difficultyShortage) {
      return {
        ok: false,
        message: t("quizCollection.advancedDifficultyShortage", {
          defaultValue: "ChÆ°a Ä‘á»§ cÃ¢u theo tá»· lá»‡ Ä‘á»™ khÃ³ {{difficulty}}. HÃ£y chá»‰nh tá»· lá»‡ hoáº·c import thÃªm cÃ¢u.",
          difficulty: difficultyShortage.label,
        }),
      };
    }

    const availableByBloom = countBy(baseCandidates, (question) => Number(question?.bloomId) || null);
    const bloomShortage = bloomTargets.find((target) => target.targetCount > 0 && (availableByBloom[target.bloomId] || 0) < target.targetCount);
    if (bloomShortage) {
      return {
        ok: false,
        message: t("quizCollection.advancedBloomShortage", {
          defaultValue: "ChÆ°a Ä‘á»§ cÃ¢u theo Bloom {{bloom}}. HÃ£y chá»‰nh tá»· lá»‡ hoáº·c import thÃªm cÃ¢u.",
          bloom: getBloomLabel(bloomShortage.bloomName, t),
        }),
      };
    }

    return {
      ok: true,
      message: t("quizCollection.advancedReady", {
        defaultValue: "Sáºµn sÃ ng táº¡o phiÃªn luyá»‡n táº­p vá»›i {{count}} cÃ¢u.",
        count: requestedCount,
      }),
    };
  }, [
    baseCandidates,
    bloomTargets,
    config.selectedBloomSkills.length,
    config.selectedQuestionTypes.length,
    difficultyTargets,
    requestedCount,
    t,
    totalQuestion,
  ]);

  const updateConfig = (patch) => {
    setConfig((current) => ({ ...current, ...patch }));
  };

  const handleDifficultyPresetChange = (value) => {
    setConfig((current) => {
      if (value === "CUSTOM") {
        prevDifficultyUnitRef.current = current.questionUnit;
        return {
          ...current,
          selectedDifficultyId: value,
          customDifficulty: distributeCustomDifficultyEvenly(current.questionUnit, requestedCount),
          lockedDifficultyLevel: null,
        };
      }

      prevDifficultyUnitRef.current = false;
      return {
        ...current,
        selectedDifficultyId: value,
        questionUnit: false,
        lockedDifficultyLevel: null,
      };
    });
  };

  const handleCustomDifficultyChange = (level, value) => {
    const normalized = Math.max(0, Number(value) || 0);
    setConfig((current) => ({
      ...current,
      customDifficulty: distributeDifficultyValues(
        { ...current.customDifficulty, [level]: normalized },
        getTargetTotal(current.questionUnit, requestedCount),
        current.questionUnit,
        current.lockedDifficultyLevel,
        level,
      ),
    }));
  };

  const handleToggleDifficultyLock = (level) => {
    setConfig((current) => ({
      ...current,
      lockedDifficultyLevel: current.lockedDifficultyLevel === level ? null : level,
    }));
  };

  const handleToggleQuestionTypeSelection = (questionType) => {
    setConfig((current) => {
      const exists = current.selectedQuestionTypes.some((item) => item.questionTypeId === questionType.questionTypeId);
      const nextItems = exists
        ? current.selectedQuestionTypes.filter((item) => item.questionTypeId !== questionType.questionTypeId)
        : [
          ...current.selectedQuestionTypes,
          {
            questionTypeId: questionType.questionTypeId,
            questionTypeKey: questionType.questionTypeKey,
            questionType: questionType.questionType,
            description: questionType.description,
            ratio: 0,
            isLocked: false,
          },
        ];

      return {
        ...current,
        selectedQuestionTypes: distributeConfigValues(
          nextItems,
          getTargetTotal(current.questionTypeUnit, requestedCount),
          current.questionTypeUnit,
        ),
      };
    });
  };

  const handleToggleBloomSelection = (skill) => {
    setConfig((current) => {
      const exists = current.selectedBloomSkills.some((item) => item.bloomId === skill.bloomId);
      const nextItems = exists
        ? current.selectedBloomSkills.filter((item) => item.bloomId !== skill.bloomId)
        : [
          ...current.selectedBloomSkills,
          {
            bloomId: skill.bloomId,
            bloomName: skill.bloomName,
            description: skill.bloomName,
            ratio: 0,
            isLocked: false,
          },
        ];

      return {
        ...current,
        selectedBloomSkills: distributeConfigValues(
          nextItems,
          getTargetTotal(current.bloomUnit, requestedCount),
          current.bloomUnit,
        ),
      };
    });
  };

  const handleSelectAllQuestionTypes = () => {
    setConfig((current) => {
      const nextItems = questionTypeOptions.map((questionType) => {
        const existingItem = current.selectedQuestionTypes.find(
          (item) => Number(item.questionTypeId) === Number(questionType.questionTypeId),
        );

        return existingItem || {
          questionTypeId: questionType.questionTypeId,
          questionTypeKey: questionType.questionTypeKey,
          questionType: questionType.questionType,
          description: questionType.description,
          ratio: 0,
          isLocked: false,
        };
      });

      return {
        ...current,
        selectedQuestionTypes: distributeConfigValues(
          nextItems,
          getTargetTotal(current.questionTypeUnit, requestedCount),
          current.questionTypeUnit,
        ),
      };
    });
  };

  const handleClearQuestionTypes = () => {
    setConfig((current) => ({
      ...current,
      selectedQuestionTypes: [],
    }));
  };

  const handleSelectAllBloomSkills = () => {
    setConfig((current) => {
      const nextItems = bloomOptions.map((skill) => {
        const existingItem = current.selectedBloomSkills.find(
          (item) => Number(item.bloomId) === Number(skill.bloomId),
        );

        return existingItem || {
          bloomId: skill.bloomId,
          bloomName: skill.bloomName,
          description: skill.bloomName,
          ratio: 0,
          isLocked: false,
        };
      });

      return {
        ...current,
        selectedBloomSkills: distributeConfigValues(
          nextItems,
          getTargetTotal(current.bloomUnit, requestedCount),
          current.bloomUnit,
        ),
      };
    });
  };

  const handleClearBloomSkills = () => {
    setConfig((current) => ({
      ...current,
      selectedBloomSkills: [],
    }));
  };

  const handleQuestionTypeRatioChange = (questionTypeId, value) => {
    setConfig((current) => {
      const rawValue = Math.max(0, Number(value) || 0);
      const normalized = current.questionTypeUnit ? Math.round(rawValue) : rawValue;
      const nextItems = current.selectedQuestionTypes.map((item) => (
        item.questionTypeId === questionTypeId ? { ...item, ratio: normalized, isLocked: true } : item
      ));

      return {
        ...current,
        selectedQuestionTypes: distributeConfigValues(
          nextItems,
          getTargetTotal(current.questionTypeUnit, requestedCount),
          current.questionTypeUnit,
        ),
      };
    });
  };

  const handleBloomRatioChange = (bloomId, value) => {
    setConfig((current) => {
      const rawValue = Math.max(0, Number(value) || 0);
      const normalized = current.bloomUnit ? Math.round(rawValue) : rawValue;
      const nextItems = current.selectedBloomSkills.map((item) => (
        item.bloomId === bloomId ? { ...item, ratio: normalized, isLocked: true } : item
      ));

      return {
        ...current,
        selectedBloomSkills: distributeConfigValues(
          nextItems,
          getTargetTotal(current.bloomUnit, requestedCount),
          current.bloomUnit,
        ),
      };
    });
  };

  const handleToggleQuestionTypeLock = (questionTypeId) => {
    setConfig((current) => {
      const targetItem = current.selectedQuestionTypes.find((item) => item.questionTypeId === questionTypeId);
      if (!targetItem) return current;

      if (!targetItem.isLocked) {
        const unlockedCount = current.selectedQuestionTypes.filter((item) => !item.isLocked).length;
        if (unlockedCount <= 1) {
          return current;
        }
      }

      const nextItems = current.selectedQuestionTypes.map((item) => (
        item.questionTypeId === questionTypeId ? { ...item, isLocked: !item.isLocked } : item
      ));

      return {
        ...current,
        selectedQuestionTypes: distributeConfigValues(
          nextItems,
          getTargetTotal(current.questionTypeUnit, requestedCount),
          current.questionTypeUnit,
        ),
      };
    });
  };

  const handleToggleBloomLock = (bloomId) => {
    setConfig((current) => {
      const targetItem = current.selectedBloomSkills.find((item) => item.bloomId === bloomId);
      if (!targetItem) return current;

      if (!targetItem.isLocked) {
        const unlockedCount = current.selectedBloomSkills.filter((item) => !item.isLocked).length;
        if (unlockedCount <= 1) {
          return current;
        }
      }

      const nextItems = current.selectedBloomSkills.map((item) => (
        item.bloomId === bloomId ? { ...item, isLocked: !item.isLocked } : item
      ));

      return {
        ...current,
        selectedBloomSkills: distributeConfigValues(
          nextItems,
          getTargetTotal(current.bloomUnit, requestedCount),
          current.bloomUnit,
        ),
      };
    });
  };

  const buildPayload = () => ({
    numQuestions: requestedCount,
    duration: config.timerMode ? Math.max(0, Number(config.duration) || 0) : 0,
    timerMode: Boolean(config.timerMode),
    questionUnit: Boolean(config.questionUnit),
    easyRatio: difficultyValues.easy,
    mediumRatio: difficultyValues.medium,
    hardRatio: difficultyValues.hard,
    bloomUnit: Boolean(config.bloomUnit),
    bloomSkills: config.selectedBloomSkills.map((item) => ({
      bloomId: Number(item.bloomId),
      ratio: Number(item.ratio) || 0,
    })),
    questionTypeUnit: Boolean(config.questionTypeUnit),
    questionTypes: config.selectedQuestionTypes.map((item) => ({
      questionTypeId: Number(item.questionTypeId),
      ratio: Number(item.ratio) || 0,
    })),
  });

  const handleStartAdvanced = async () => {
    if (starting) return;
    if (!readiness.ok) {
      showError(readiness.message);
      return;
    }

    setStarting(true);
    try {
      const response = await startQuizCollectionAdvancedPractice(collectionId, buildPayload(), {
        isPracticeMode: true,
      });
      const result = unwrapApiData(response);
      if (result?.hasEnoughQuestions === false) {
        showError(
          result?.message ||
            t("quizCollection.advancedNotEnough", "Bá»™ sÆ°u táº­p chÆ°a Ä‘á»§ cÃ¢u há»i cho cáº¥u hÃ¬nh nÃ y."),
        );
        return;
      }

      const nextQuizId = Number(result?.attempt?.quizId);
      if (!Number.isInteger(nextQuizId) || nextQuizId <= 0) {
        throw new Error(t("quizCollection.startMissingQuiz", "KhÃ´ng xÃ¡c Ä‘á»‹nh Ä‘Æ°á»£c quiz luyá»‡n táº­p."));
      }

      navigate(buildQuizAttemptPath("practice", nextQuizId), {
        state: {
          autoStart: true,
          returnToQuizPath: location.pathname.replace(/\/advanced-practice$/, ""),
          sourceView: "quiz-collection",
          sourceWorkspaceId: normalizedWorkspaceId,
        },
      });
    } catch (error) {
      showError(getErrorMessage(t, error));
    } finally {
      setStarting(false);
    }
  };

  if (loadingQuestions) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className={cn("flex h-full min-h-0 flex-col", fontClass)}>
      <div className={cn("border-b px-4 py-3", isDarkMode ? "border-slate-800" : "border-gray-200")}>
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className={cn("rounded-lg p-1.5 transition-all active:scale-95", isDarkMode ? "text-slate-300 hover:bg-slate-800" : "text-gray-600 hover:bg-gray-100")}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h2 className={cn("truncate text-xl font-semibold", isDarkMode ? "text-slate-100" : "text-slate-900")}>
              {t("quizCollection.advancedPractice", "Luyá»‡n táº­p nÃ¢ng cao")}
            </h2>
            <p className={cn("mt-0.5 line-clamp-1 text-sm", mutedTextClass)}>
              {currentCollection?.title || t("quizCollection.fallbackTitle", "Bá»™ sÆ°u táº­p")}
            </p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-6xl space-y-4">
          <section className={cn("rounded-3xl border p-5", isDarkMode ? "border-slate-800 bg-slate-900/80" : "border-emerald-100 bg-[linear-gradient(135deg,#f0fdf4_0%,#ffffff_60%,#ecfeff_100%)]")}>
            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div>
                <div className={cn("mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold", isDarkMode ? "bg-emerald-950/50 text-emerald-300" : "bg-emerald-100 text-emerald-700")}>
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  {t("quizCollection.advancedSubtitle", "TÃ¹y biáº¿n phiÃªn luyá»‡n táº­p")}
                </div>
                <h3 className={cn("text-2xl font-semibold", isDarkMode ? "text-slate-100" : "text-slate-950")}>
                  {t("quizCollection.advancedHero", "Chá»n Ä‘Ãºng pháº§n cáº§n Ã´n, Ä‘Ãºng má»©c Ä‘á»™ cáº§n luyá»‡n.")}
                </h3>
                <p className={cn("mt-2 text-sm leading-6", mutedTextClass)}>
                  {t("quizCollection.advancedHeroHint", "Há»‡ thá»‘ng sáº½ táº¡o má»™t quiz session má»›i tá»« cÃ¡c cÃ¢u há»i trong bá»™ sÆ°u táº­p theo cáº¥u hÃ¬nh bÃªn dÆ°á»›i.")}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <StatCard icon={FileQuestion} label={t("quizCollection.questions", "CÃ¢u há»i")} value={totalQuestion} isDarkMode={isDarkMode} />
                <StatCard icon={Target} label={t("quizCollection.selectedPool", "PhÃ¹ há»£p")} value={baseCandidates.length} isDarkMode={isDarkMode} />
                <StatCard icon={Brain} label={t("quizCollection.bloom", "Bloom")} value={bloomOptions.length || "-"} isDarkMode={isDarkMode} />
                <StatCard icon={Layers3} label={t("quizCollection.questionType", "Loáº¡i cÃ¢u")} value={questionTypeOptions.length || "-"} isDarkMode={isDarkMode} />
              </div>
            </div>
          </section>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className={sectionCardClass}>
              <h3 className={cn("mb-2 flex items-center gap-2 text-sm font-semibold", isDarkMode ? "text-slate-200" : "text-gray-800")}>
                <Sliders className="h-4 w-4 text-gray-500" /> {t("workspace.quiz.aiConfig.settings", "Settings")}
              </h3>

              <div className={cn("grid gap-2", config.timerMode ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1")}>
                <div>
                  <label className={labelCls}>{t("workspace.quiz.aiConfig.totalQuestions", "Total questions")}</label>
                  <input
                    type="number"
                    min={1}
                    max={maxSelectableQuestions}
                    className={inputCls}
                    value={config.numQuestions}
                    onChange={(event) => updateConfig({
                      numQuestions: Math.min(toPositiveInteger(event.target.value, 1), maxSelectableQuestions),
                    })}
                  />
                </div>

                {config.timerMode ? (
                  <div>
                    <label className={labelCls}>{t("workspace.quiz.aiConfig.timeMinutes", "Time (minutes)")}</label>
                    <input
                      type="number"
                      min={1}
                      className={inputCls}
                      value={config.duration}
                      onChange={(event) => updateConfig({ duration: Math.max(1, Number(event.target.value) || 1) })}
                    />
                  </div>
                ) : null}
              </div>

              <div className="mt-2">
                <label className={labelCls}>{t("workspace.quiz.aiConfig.examType", "Exam type")}</label>
                <div className={cn("inline-flex w-full flex-wrap gap-2 rounded-full p-1", isDarkMode ? "bg-slate-900/60" : "bg-slate-100")}>
                  <button
                    type="button"
                    onClick={() => updateConfig({ timerMode: true })}
                    className={cn(
                      "min-w-0 flex-1 rounded-full px-3 py-2 text-left transition-all",
                      config.timerMode
                        ? (isDarkMode ? "bg-blue-500/20 text-blue-200" : "bg-white text-blue-700 shadow-sm")
                        : (isDarkMode ? "text-slate-400 hover:text-slate-200" : "text-gray-600 hover:text-gray-900"),
                    )}
                  >
                    <p className="text-[11px] font-medium leading-4 sm:text-xs">
                      {t("workspace.quiz.aiConfig.examTypeTimed", "Timed Exam (global timer, free navigation)")}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateConfig({ timerMode: false })}
                    className={cn(
                      "min-w-0 flex-1 rounded-full px-3 py-2 text-left transition-all",
                      !config.timerMode
                        ? (isDarkMode ? "bg-emerald-500/20 text-emerald-200" : "bg-white text-emerald-700 shadow-sm")
                        : (isDarkMode ? "text-slate-400 hover:text-slate-200" : "text-gray-600 hover:text-gray-900"),
                    )}
                  >
                    <p className="text-[11px] font-medium leading-4 sm:text-xs">
                      {t("workspace.quiz.aiConfig.examTypeSequential", "Sequential Timed Exam (per-question timer, locked order)")}
                    </p>
                  </button>
                </div>

                {!config.timerMode ? (
                  <div className={cn("mt-2 rounded-xl border px-3 py-2 text-xs", isDarkMode ? "border-slate-800 bg-slate-900/60 text-slate-400" : "border-slate-200 bg-slate-50 text-slate-600")}>
                    {t("quizCollection.practiceSequentialHint", "Cháº¿ Ä‘á»™ nÃ y sáº½ táº¡o session khÃ´ng giá»›i háº¡n tá»•ng thá»i gian.")}
                  </div>
                ) : null}
              </div>
            </div>

            <div className={sectionCardClass}>
              <h3 className={cn("mb-2 flex items-center gap-2 text-sm font-semibold", isDarkMode ? "text-slate-200" : "text-gray-800")}>
                <Sliders className="h-4 w-4 text-amber-500" /> {t("workspace.quiz.aiConfig.difficultyLevel", "Difficulty level")}
              </h3>

              <div className="mb-3 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.questionUnit}
                  disabled={config.selectedDifficultyId !== "CUSTOM"}
                  onChange={(event) => updateConfig({ questionUnit: event.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                />
                <span className={cn("text-xs", isDarkMode ? "text-slate-400" : "text-gray-600")}>
                  {t("workspace.quiz.aiConfig.difficultyUnitByCount", "By count")}
                </span>
              </div>

              <select className={selectCls} value={config.selectedDifficultyId} onChange={(event) => handleDifficultyPresetChange(event.target.value)}>
                {DIFFICULTY_PRESETS.map((difficulty) => (
                  <option key={difficulty.id} value={difficulty.id}>
                    {difficulty.difficultyName} ({difficulty.easyRatio}-{difficulty.mediumRatio}-{difficulty.hardRatio})
                  </option>
                ))}
                <option value="CUSTOM">{t("workspace.quiz.aiConfig.customSelfConfig", "Custom")}</option>
              </select>

              {config.selectedDifficultyId === "CUSTOM" ? (
                <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                  {["easy", "medium", "hard"].map((level) => (
                    <div key={level}>
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <label className={cn("block text-[10px] font-bold uppercase", isDarkMode ? "text-slate-500" : "text-gray-500")}>
                          {getDifficultyLabel(t, level.toUpperCase())} ({config.questionUnit ? t("workspace.quiz.aiConfig.countUnit", "count") : "%"})
                        </label>
                        <button
                          type="button"
                          onClick={() => handleToggleDifficultyLock(level)}
                          className={cn(
                            "rounded p-1 transition-colors",
                            config.lockedDifficultyLevel === level
                              ? "text-blue-500"
                              : (isDarkMode ? "text-slate-400 hover:text-slate-200" : "text-gray-500 hover:text-gray-700"),
                          )}
                          title={config.lockedDifficultyLevel === level ? t("workspace.quiz.aiConfig.unlock", "Unlock") : t("workspace.quiz.aiConfig.lock", "Lock")}
                        >
                          {config.lockedDifficultyLevel === level ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                      <input
                        type="number"
                        className={inputCls}
                        value={config.customDifficulty[level]}
                        onChange={(event) => handleCustomDifficultyChange(level, event.target.value)}
                      />
                    </div>
                  ))}
                </div>
              ) : null}

              <div className={cn("mt-4 border-t pt-3", isDarkMode ? "border-slate-800" : "border-slate-200")}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className={cn("text-xs font-medium", isDarkMode ? "text-slate-300" : "text-gray-700")}>
                    {t("workspace.quiz.aiConfig.difficultyPreviewTitle", "Difficulty preview")}
                  </span>
                  <span className={cn("text-[11px]", isDarkMode ? "text-slate-400" : "text-gray-500")}>
                    {config.questionUnit
                      ? `${difficultyTargets[0] || 0} / ${difficultyTargets[1] || 0} / ${difficultyTargets[2] || 0}`
                      : `${formatDifficultyPreviewPercent(difficultyValues.easy)} / ${formatDifficultyPreviewPercent(difficultyValues.medium)} / ${formatDifficultyPreviewPercent(difficultyValues.hard)}`}
                  </span>
                </div>

                <div className="flex h-3 w-full overflow-hidden rounded-full">
                  <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${difficultyPreviewPercent.easy}%` }} />
                  <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${difficultyPreviewPercent.medium}%` }} />
                  <div className="h-full bg-red-500 transition-all duration-300" style={{ width: `${difficultyPreviewPercent.hard}%` }} />
                </div>

                <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                  <PreviewLegend color="bg-green-500" label={`${getDifficultyLabel(t, "EASY")}: ${formatDifficultyPreviewPercent(difficultyPreviewPercent.easy)}%`} isDarkMode={isDarkMode} />
                  <PreviewLegend color="bg-amber-500" label={`${getDifficultyLabel(t, "MEDIUM")}: ${formatDifficultyPreviewPercent(difficultyPreviewPercent.medium)}%`} isDarkMode={isDarkMode} />
                  <PreviewLegend color="bg-red-500" label={`${getDifficultyLabel(t, "HARD")}: ${formatDifficultyPreviewPercent(difficultyPreviewPercent.hard)}%`} isDarkMode={isDarkMode} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <div className={sectionCardClass}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className={cn("flex items-center gap-2 text-sm font-semibold", isDarkMode ? "text-slate-200" : "text-gray-800")}>
                  <SlidersHorizontal className="h-4 w-4 text-purple-500" /> {t("workspace.quiz.aiConfig.questionTypes", "Question types")}
                </h3>
                {questionTypeOptions.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="outline" className={bulkActionButtonClass} disabled={config.selectedQuestionTypes.length === questionTypeOptions.length} onClick={handleSelectAllQuestionTypes}>
                      {t("workspace.sources.selectAll", "Select all")}
                    </Button>
                    <Button type="button" variant="outline" className={bulkActionButtonClass} disabled={config.selectedQuestionTypes.length === 0} onClick={handleClearQuestionTypes}>
                      {t("workspace.sources.deselectAll", "Deselect all")}
                    </Button>
                  </div>
                ) : null}
              </div>

              <div className="mb-3 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.questionTypeUnit}
                  onChange={(event) => updateConfig({ questionTypeUnit: event.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className={cn("text-xs", isDarkMode ? "text-slate-400" : "text-gray-600")}>
                  {t("workspace.quiz.aiConfig.questionTypeUnitByCount", "By count")}
                </span>
              </div>

              <div className="mb-3 flex flex-wrap gap-2">
                {questionTypeOptions.map((questionType) => {
                  const isSelected = selectedQuestionTypeIdSet.has(questionType.questionTypeId);
                  return (
                    <button
                      key={questionType.questionTypeId}
                      type="button"
                      onClick={() => handleToggleQuestionTypeSelection(questionType)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all active:scale-95",
                        isSelected
                          ? (isDarkMode ? "border-blue-500 bg-blue-600/30 text-blue-300" : "border-blue-400 bg-blue-100 text-blue-700")
                          : (isDarkMode ? "border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500 hover:text-slate-300" : "border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-400 hover:text-gray-700"),
                      )}
                    >
                      {isSelected ? <CheckCircle2 className="h-3 w-3 shrink-0" /> : null}
                      {`${questionType.questionType} (${questionType.count})`}
                    </button>
                  );
                })}
              </div>

              <SelectedRatioPanel
                isDarkMode={isDarkMode}
                items={config.selectedQuestionTypes}
                labelKey="questionType"
                unitLabel={config.questionTypeUnit ? t("workspace.quiz.aiConfig.countUnit", "count") : "%"}
                onRatioChange={(id, value) => handleQuestionTypeRatioChange(id, value)}
                onToggleLock={(id) => handleToggleQuestionTypeLock(id)}
                idKey="questionTypeId"
                emptyLabel={t("quizCollection.noSelectionYet", "ChÆ°a chá»n má»¥c nÃ o.")}
                lockLabel={t("workspace.quiz.aiConfig.lock", "Lock")}
                unlockLabel={t("workspace.quiz.aiConfig.unlock", "Unlock")}
              />
            </div>

            <div className={sectionCardClass}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className={cn("flex items-center gap-2 text-sm font-semibold", isDarkMode ? "text-slate-200" : "text-gray-800")}>
                  <BrainCircuit className="h-4 w-4 text-teal-500" /> {t("workspace.quiz.aiConfig.bloomSkills", "Bloom skills")}
                  <div className="group relative">
                    <button
                      type="button"
                      className={cn("inline-flex h-5 w-5 items-center justify-center rounded-full border transition-colors", isDarkMode ? "border-slate-700 text-slate-400 hover:border-teal-500/50 hover:text-teal-300" : "border-gray-300 text-gray-500 hover:border-teal-400 hover:text-teal-600")}
                      aria-label={t("workspace.quiz.aiConfig.bloomInfo", "Bloom info")}
                    >
                      <Info className="h-3.5 w-3.5" />
                    </button>
                    <div className={cn("absolute left-0 top-7 z-20 hidden w-[260px] rounded-xl border px-3 py-2 text-xs shadow-xl group-hover:block", isDarkMode ? "border-slate-700 bg-slate-900 text-slate-300" : "border-gray-200 bg-white text-gray-600")}>
                      {t("quizCollection.bloomInfoInline", "Bloom Ä‘Æ°á»£c dÃ¹ng Ä‘á»ƒ Ä‘iá»u chá»‰nh má»©c Ä‘á»™ tá»« ghi nhá»› Ä‘áº¿n váº­n dá»¥ng, phÃ¢n tÃ­ch vÃ  Ä‘Ã¡nh giÃ¡.")}
                    </div>
                  </div>
                </h3>
                {bloomOptions.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="outline" className={bulkActionButtonClass} disabled={config.selectedBloomSkills.length === bloomOptions.length} onClick={handleSelectAllBloomSkills}>
                      {t("workspace.sources.selectAll", "Select all")}
                    </Button>
                    <Button type="button" variant="outline" className={bulkActionButtonClass} disabled={config.selectedBloomSkills.length === 0} onClick={handleClearBloomSkills}>
                      {t("workspace.sources.deselectAll", "Deselect all")}
                    </Button>
                  </div>
                ) : null}
              </div>

              <div className="mb-3 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.bloomUnit}
                  onChange={(event) => updateConfig({ bloomUnit: event.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className={cn("text-xs", isDarkMode ? "text-slate-400" : "text-gray-600")}>
                  {t("workspace.quiz.aiConfig.bloomUnitByCount", "By count")}
                </span>
              </div>

              <div className="mb-3 flex flex-wrap gap-2">
                {bloomOptions.map((skill) => {
                  const isSelected = selectedBloomIdSet.has(skill.bloomId);
                  return (
                    <button
                      key={skill.bloomId}
                      type="button"
                      onClick={() => handleToggleBloomSelection(skill)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all active:scale-95",
                        isSelected
                          ? (isDarkMode ? "border-teal-500 bg-teal-600/30 text-teal-300" : "border-teal-400 bg-teal-100 text-teal-700")
                          : (isDarkMode ? "border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500 hover:text-slate-300" : "border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-400 hover:text-gray-700"),
                      )}
                    >
                      {isSelected ? <CheckCircle2 className="h-3 w-3 shrink-0" /> : null}
                      {`${skill.bloomName} (${skill.count})`}
                    </button>
                  );
                })}
              </div>

              <SelectedRatioPanel
                isDarkMode={isDarkMode}
                items={config.selectedBloomSkills}
                labelKey="bloomName"
                unitLabel={config.bloomUnit ? t("workspace.quiz.aiConfig.countUnit", "count") : "%"}
                onRatioChange={(id, value) => handleBloomRatioChange(id, value)}
                onToggleLock={(id) => handleToggleBloomLock(id)}
                idKey="bloomId"
                emptyLabel={t("quizCollection.noSelectionYet", "ChÆ°a chá»n má»¥c nÃ o.")}
                lockLabel={t("workspace.quiz.aiConfig.lock", "Lock")}
                unlockLabel={t("workspace.quiz.aiConfig.unlock", "Unlock")}
              />
            </div>
          </div>

          <section className={cn("sticky bottom-3 rounded-3xl border p-4 shadow-2xl", isDarkMode ? "border-slate-800 bg-slate-950/95" : "border-slate-200 bg-white/95")}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className={cn("text-sm font-semibold", readiness.ok ? "text-emerald-600" : "text-amber-600")}>
                  {readiness.message}
                </p>
                <p className={cn("mt-1 text-xs", mutedTextClass)}>
                  {t("quizCollection.advancedPreview", {
                    defaultValue: "Nguá»“n lá»c hiá»‡n cÃ³ {{pool}} cÃ¢u, yÃªu cáº§u {{requested}} cÃ¢u.",
                    pool: baseCandidates.length,
                    requested: requestedCount,
                  })}
                </p>
              </div>
              <Button
                type="button"
                onClick={handleStartAdvanced}
                disabled={starting || !readiness.ok}
                className="h-11 rounded-full bg-emerald-600 px-6 text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {starting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                {t("quizCollection.startAdvanced", "Báº¯t Ä‘áº§u luyá»‡n táº­p")}
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, isDarkMode }) {
  return (
    <div className={cn("rounded-2xl border px-4 py-3", isDarkMode ? "border-slate-800 bg-slate-950/60" : "border-white/80 bg-white/80")}>
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4", isDarkMode ? "text-emerald-300" : "text-emerald-600")} />
        <span className={cn("text-xs font-semibold uppercase tracking-[0.12em]", isDarkMode ? "text-slate-400" : "text-slate-500")}>{label}</span>
      </div>
      <p className={cn("mt-2 text-xl font-semibold", isDarkMode ? "text-slate-100" : "text-slate-900")}>{value}</p>
    </div>
  );
}

function PreviewLegend({ color, label, isDarkMode }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", color)} />
      <span className={cn("truncate text-[11px]", isDarkMode ? "text-slate-300" : "text-gray-700")}>{label}</span>
    </div>
  );
}

function SelectedRatioPanel({
  isDarkMode,
  items,
  labelKey,
  unitLabel,
  onRatioChange,
  onToggleLock,
  idKey,
  emptyLabel,
  lockLabel,
  unlockLabel,
}) {
  return (
    <div className={cn("rounded-xl border p-2", isDarkMode ? "border-slate-800 bg-slate-900/60" : "border-slate-200 bg-white")}>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item[idKey]} className={cn("flex items-center gap-2 border-b py-2 text-xs last:border-b-0", isDarkMode ? "border-slate-800 text-slate-300" : "border-gray-200 text-gray-700")}>
            <span className="flex-1 truncate" title={item.description}>{item[labelKey]}</span>
            <input
              type="number"
              className={cn("w-16 rounded border p-1 text-center", isDarkMode ? "border-slate-700 bg-slate-900" : "border-gray-200 bg-white")}
              value={item.ratio}
              onChange={(event) => onRatioChange(item[idKey], event.target.value)}
            />
            <span>{unitLabel}</span>
            <button
              type="button"
              onClick={() => onToggleLock(item[idKey])}
              className={cn("rounded p-1", item.isLocked ? "text-blue-500" : (isDarkMode ? "text-slate-400" : "text-gray-500"))}
              title={item.isLocked ? unlockLabel : lockLabel}
            >
              {item.isLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
            </button>
          </div>
        ))}
        {items.length === 0 ? (
          <p className={cn("px-2 py-3 text-xs", isDarkMode ? "text-slate-500" : "text-slate-500")}>{emptyLabel}</p>
        ) : null}
      </div>
    </div>
  );
}

export default QuizCollectionAdvancedPracticeConfigView;

