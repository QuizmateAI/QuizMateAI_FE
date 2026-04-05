import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { Button } from "@/Components/ui/button";
import { ArrowLeft, BadgeCheck, Loader2, Rocket } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { QUESTION_TYPE_LABEL_FALLBACKS } from "./createQuizForm.constants";
import CreateQuizAiFormContent from "./CreateQuizAiFormContent";
import CreateQuizAiRecommendationsPanel from "./CreateQuizAiRecommendationsPanel";
import { useCreateQuizAiForm } from "./useCreateQuizAiForm";
import { useInlineQuizRecommendations } from "./useInlineQuizRecommendations";

function resolvePersonalizationFocusTopic(preset) {
  const reviewTopic = String(preset?.reviewTopic || "").trim();
  if (reviewTopic) {
    return reviewTopic;
  }

  const focusTopics = Array.isArray(preset?.focusTopics)
    ? preset.focusTopics.map((topic) => String(topic || "").trim()).filter(Boolean)
    : [];

  return focusTopics[0] || "";
}

function buildPersonalizationPrompt(preset, task) {
  const focusTopic = resolvePersonalizationFocusTopic(preset);
  const quizIntent = String(preset?.quizIntent || "").trim().toUpperCase();
  const taskReason = String(task?.reason || "").trim();

  if (focusTopic && quizIntent === "REVIEW") {
    return `Create a concise review quiz focused on ${focusTopic}.`;
  }

  if (focusTopic) {
    return `Create a quiz focused on ${focusTopic}.`;
  }

  return taskReason;
}

function CreateQuizForm({
  isDarkMode = false,
  onCreateQuiz,
  onBack,
  contextId: defaultContextId,
  selectedSourceIds = [],
  sources = [],
  planEntitlements = null,
}) {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const personalizationAppliedRef = useRef(false);
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";

  const selectedMaterialIds = useMemo(
    () => (Array.isArray(selectedSourceIds) ? selectedSourceIds : []),
    [selectedSourceIds]
  );

  const selectedSourceItems = useMemo(() => {
    const sourceItems = Array.isArray(sources) ? sources : [];
    return sourceItems.filter((source) => selectedMaterialIds.includes(source.id));
  }, [selectedMaterialIds, sources]);

  const hasImageMaterials = useMemo(
    () => selectedSourceItems.some((item) => item?.hasImage === true),
    [selectedSourceItems]
  );

  const {
    activeRecommendation,
    expandedRecId,
    inlineRecommendations,
    inlineRecError,
    inlineRecGeneratingId,
    inlineRecLoading,
    setExpandedRecId,
    handleGenerateFromInlineRecommendation,
  } = useInlineQuizRecommendations({
    contextId: defaultContextId,
    onCreateQuiz,
    t,
  });

  const {
    aiValidationState,
    error,
    fieldErrors,
    handleBlockedAiSubmit,
    handleSubmit,
    refsMap,
    state,
    handlers,
    submitting,
  } = useCreateQuizAiForm({
    defaultContextId,
    hasAdvanceQuizConfig: planEntitlements?.hasAdvanceQuizConfig ?? false,
    hasImageMaterials,
    i18nLanguage: i18n.language,
    onCreateQuiz,
    selectedMaterialIds,
    t,
  });

  const {
    handleAiNameChange,
    handleAiPromptChange,
    handleAiTotalQuestionsChange,
  } = handlers;

  useEffect(() => {
    const preset = location.state?.personalizationPreset;
    if (!preset || personalizationAppliedRef.current) {
      return;
    }

    personalizationAppliedRef.current = true;

    const task = location.state?.personalizationTask;
    const nextTitle = String(task?.title || "").trim();
    const nextPrompt = buildPersonalizationPrompt(preset, task);
    const nextQuestionCount = Number(preset?.questionCount);

    if (nextTitle) {
      handleAiNameChange(nextTitle);
    }

    if (nextPrompt) {
      handleAiPromptChange(nextPrompt);
    }

    if (Number.isFinite(nextQuestionCount) && nextQuestionCount > 0) {
      handleAiTotalQuestionsChange(String(nextQuestionCount));
    }

    navigate(location.pathname, {
      replace: true,
      state: null,
    });
  }, [
    handleAiNameChange,
    handleAiPromptChange,
    handleAiTotalQuestionsChange,
    location.pathname,
    location.state,
    navigate,
  ]);

  const getQuestionTypeLabel = useCallback((questionType) => {
    const normalizedType = String(questionType || "").toUpperCase();
    const fallbackLabel = QUESTION_TYPE_LABEL_FALLBACKS[normalizedType] || questionType || "-";
    return t(`workspace.quiz.aiConfig.questionTypeLabels.${normalizedType}`, fallbackLabel);
  }, [t]);

  const formatDifficultyPreviewPercent = useCallback((value) => {
    const rounded = Math.round((Number(value) || 0) * 100) / 100;
    return Number(rounded.toFixed(2)).toString();
  }, []);

  const inputCls = `w-full rounded-lg border px-3 py-2 text-sm outline-none transition-all ${
    isDarkMode
      ? "border-slate-700 bg-slate-800 text-white placeholder:text-slate-500 focus:border-blue-500"
      : "border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:border-blue-500"
  }`;

  const selectCls = `${inputCls} appearance-none cursor-pointer`;
  const labelCls = `mb-1 block text-left text-xs font-medium ${isDarkMode ? "text-slate-400" : "text-gray-600"} ${fontClass}`;
  const requiredMark = <span className="ml-1 text-red-500">*</span>;

  const getAiSectionCardClass = useCallback((errorKeys = []) => {
    const hasError = errorKeys.some((key) => fieldErrors[key]);
    const defaultClasses = isDarkMode
      ? "bg-slate-900/50 border-slate-800"
      : "bg-white border-gray-100 shadow-sm";

    if (!hasError) {
      return `rounded-xl border p-4 transition-colors ${defaultClasses}`;
    }

    return `rounded-xl border p-4 transition-colors ${
      isDarkMode
        ? "border-red-500/60 bg-red-950/10"
        : "border-red-300 bg-red-50/70 shadow-sm"
    }`;
  }, [fieldErrors, isDarkMode]);

  const aiDurationMetaBaseClass = "mt-2 inline-flex max-w-full items-start gap-2 rounded-lg border px-3 py-2 text-[11px] font-medium leading-relaxed";
  const aiDurationHintClass = isDarkMode
    ? `${aiDurationMetaBaseClass} border-slate-700 bg-slate-800/70 text-slate-300`
    : `${aiDurationMetaBaseClass} border-slate-200 bg-slate-50 text-slate-600`;
  const aiDurationSyncClass = isDarkMode
    ? `${aiDurationMetaBaseClass} border-cyan-500/30 bg-cyan-500/10 text-cyan-200`
    : `${aiDurationMetaBaseClass} border-blue-200 bg-blue-50 text-blue-700`;

  return (
    <div id="create-quiz-header" className="flex h-full flex-col scroll-mt-20">
      <div className={`flex h-12 shrink-0 items-center gap-3 border-b px-4 transition-colors duration-300 ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <button
          type="button"
          onClick={onBack}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${isDarkMode ? "text-slate-300 hover:bg-slate-800" : "text-gray-600 hover:bg-gray-100"}`}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex flex-1 items-center gap-2">
          <BadgeCheck className="h-5 w-5 text-blue-500" />
          <p className={`text-base font-medium ${isDarkMode ? "text-slate-100" : "text-gray-800"} ${fontClass}`}>
            {t("workspace.quiz.createTitle")}
          </p>
        </div>
      </div>

      <div id="create-quiz-scroll-root" className="flex-1 space-y-4 overflow-y-auto p-4">
        <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
          {t("workspace.quiz.createDesc")}
        </p>

        <div className={`rounded-lg border px-3 py-2 text-xs ${isDarkMode ? "border-amber-900/40 bg-amber-950/30 text-amber-300" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
          {t("workspace.quiz.validation.requiredFieldsHint")}
        </div>

        <CreateQuizAiRecommendationsPanel
          activeRecommendation={activeRecommendation}
          expandedRecId={expandedRecId}
          fontClass={fontClass}
          inlineRecommendations={inlineRecommendations}
          inlineRecError={inlineRecError}
          inlineRecGeneratingId={inlineRecGeneratingId}
          inlineRecLoading={inlineRecLoading}
          isDarkMode={isDarkMode}
          onGenerateRecommendation={handleGenerateFromInlineRecommendation}
          onToggleRecommendation={setExpandedRecId}
          t={t}
        />

        {error && (
          <div className={`rounded-lg px-3 py-2 text-xs ${isDarkMode ? "bg-red-950/30 text-red-400" : "bg-red-50 text-red-600"}`}>
            {error}
          </div>
        )}

        <CreateQuizAiFormContent
          classes={{
            aiDurationHintClass,
            aiDurationSyncClass,
            getAiSectionCardClass,
            inputCls,
            labelCls,
            requiredMark,
            selectCls,
          }}
          handlers={handlers}
          refsMap={refsMap}
          state={{
            ...state,
            selectedMaterialIds,
            selectedQTypes: state.selectedQTypes,
            selectedBloomSkills: state.selectedBloomSkills,
            selectedSourceItems,
          }}
          ui={{
            fontClass,
            formatDifficultyPreviewPercent,
            getQuestionTypeLabel,
            isDarkMode,
            t,
            hasAdvanceQuizConfig: planEntitlements?.hasAdvanceQuizConfig ?? false,
          }}
        />
      </div>

      <div className={`flex shrink-0 justify-end gap-2 border-t px-4 py-3 transition-colors duration-300 ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <Button
          variant="outline"
          onClick={onBack}
          className={isDarkMode ? "border-slate-700 text-slate-300" : ""}
        >
          {t("workspace.quiz.cancel")}
        </Button>
        <Button
          onClick={() => {
            if (!aiValidationState.isValid) {
              handleBlockedAiSubmit();
              return;
            }

            handleSubmit();
          }}
          disabled={submitting || state.metadataLoading}
          aria-disabled={!aiValidationState.isValid}
          title={!aiValidationState.isValid ? aiValidationState.firstErrorMessage : undefined}
          className={
            !aiValidationState.isValid
              ? (isDarkMode
                  ? "cursor-not-allowed bg-slate-700 text-slate-300 hover:bg-slate-700"
                  : "cursor-not-allowed bg-slate-300 text-slate-600 hover:bg-slate-300")
              : "bg-[#2563EB] text-white hover:bg-blue-700"
          }
        >
          {submitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Rocket className="mr-2 h-4 w-4" />
          )}
          {submitting ? t("workspace.quiz.generating") : t("workspace.quiz.generateAI")}
        </Button>
      </div>
    </div>
  );
}

export default CreateQuizForm;
