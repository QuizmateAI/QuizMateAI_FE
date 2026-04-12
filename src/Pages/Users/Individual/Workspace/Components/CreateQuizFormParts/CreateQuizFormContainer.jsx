import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { Button } from "@/Components/ui/button";
import { AlertCircle, ArrowLeft, BadgeCheck, Loader2, Rocket } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { QUESTION_TYPE_LABEL_FALLBACKS } from "./createQuizForm.constants";
import CreateQuizAiFormContent from "./CreateQuizAiFormContent";
import CreateQuizAiRecommendationsPanel from "./CreateQuizAiRecommendationsPanel";
import { useCreateQuizAiForm } from "./useCreateQuizAiForm";
import { useInlineQuizRecommendations } from "./useInlineQuizRecommendations";
import { getBloomSkillLabel, getQuizDifficultyLabel, getQuizQuestionTypeLabel } from "@/lib/quizQuestionTypes";
import useWorkspaceMaterialSelection from "../useWorkspaceMaterialSelection";

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
  selectedSourceIds,
  sources,
  planEntitlements = null,
  /** Gợi ý từ pending assessment — chỉ hỗ trợ workspace cá nhân; group nên tắt. */
  showInlineRecommendations = true,
  /** Bật/tắt chọn tài liệu trong card Source materials (đồng bộ với Sources panel). */
  onToggleMaterialSelection,
  readOnly = false,
  /** Ghi AI vào quiz snapshot challenge (BE existingQuizId). */
  existingQuizId = null,
  seedQuizTitle = '',
}) {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const personalizationAppliedRef = useRef(false);
  const insufficientCreditBannerRef = useRef(null);
  const prevSubmittingRef = useRef(false);
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";

  const {
    allSelected: areAllWorkspaceMaterialsSelected,
    clearSelectedSources,
    materialsError: workspaceMaterialsError,
    materialsLoading: workspaceMaterialsLoading,
    normalizedSources: workspaceSources,
    selectAllSources,
    selectedIds: selectedMaterialIds,
    toggleSourceSelection,
  } = useWorkspaceMaterialSelection({
    contextId: defaultContextId,
    onToggleMaterialSelection,
    selectedSourceIds,
    sources,
    t,
  });

  const selectedSourceItems = useMemo(
    () => workspaceSources.filter((source) => selectedMaterialIds.includes(source.id)),
    [selectedMaterialIds, workspaceSources],
  );

  const selectableMaterialIds = useMemo(() => (
    (Array.isArray(sources) ? sources : [])
      .map((source) => Number(source?.id ?? source?.materialId))
      .filter((id, index, ids) => Number.isInteger(id) && id > 0 && ids.indexOf(id) === index)
  ), [sources]);

  const hasImageMaterials = useMemo(
    () => selectedSourceItems.some((item) => item?.hasImage === true),
    [selectedSourceItems]
  );

  const handleToggleAllMaterialSelection = useCallback((shouldSelect) => {
    if (typeof onToggleMaterialSelection !== "function" || readOnly) {
      return;
    }

    const targetIds = shouldSelect
      ? selectableMaterialIds.filter((id) => !selectedMaterialIds.includes(id))
      : selectableMaterialIds.filter((id) => selectedMaterialIds.includes(id));

    targetIds.forEach((id) => {
      onToggleMaterialSelection(id, shouldSelect);
    });
  }, [onToggleMaterialSelection, readOnly, selectableMaterialIds, selectedMaterialIds]);

  const {
    activeRecommendation,
    expandedRecId,
    inlineRecommendations,
    inlineRecError,
    inlineRecGeneratingId,
    inlineRecDismissingId,
    inlineRecLoading,
    setExpandedRecId,
    handleGenerateFromInlineRecommendation,
    handleDismissRecommendation,
  } = useInlineQuizRecommendations({
    contextId: defaultContextId,
    enabled: showInlineRecommendations,
    onCreateQuiz,
    t,
  });

  const {
    aiValidationState,
    error,
    insufficientCreditError,
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
    existingQuizId,
    seedQuizTitle,
  });

  const {
    handleAiNameChange,
    handleAiPromptChange,
    handleAiTotalQuestionsChange,
  } = handlers;

  useEffect(() => {
    const finishedAttempt = prevSubmittingRef.current && !submitting;
    prevSubmittingRef.current = submitting;
    if (!finishedAttempt || !insufficientCreditError || !error) {
      return;
    }
    const scrollTimer = window.setTimeout(() => {
      insufficientCreditBannerRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
        inline: "nearest",
      });
    }, 0);
    return () => window.clearTimeout(scrollTimer);
  }, [submitting, insufficientCreditError, error]);

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
    return getQuizQuestionTypeLabel(normalizedType, t) || fallbackLabel;
  }, [t]);

  const getDifficultyLabel = useCallback((difficulty) => getQuizDifficultyLabel(difficulty, t), [t]);

  const getBloomLabel = useCallback((bloomSkill) => getBloomSkillLabel(bloomSkill, t), [t]);

  const formatDifficultyPreviewPercent = useCallback((value) => {
    const rounded = Math.round((Number(value) || 0) * 100) / 100;
    return Number(rounded.toFixed(2)).toString();
  }, []);

  const inputCls = `w-full rounded-lg border px-3 py-2 text-sm outline-none transition-all ${
    isDarkMode
      ? "border-slate-700 bg-slate-800 text-white placeholder:text-slate-500 focus:border-blue-500"
      : "border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-blue-500"
  }`;

  const selectCls = `${inputCls} appearance-none cursor-pointer`;
  const labelCls = `mb-1 block text-left text-xs font-medium ${isDarkMode ? "text-slate-400" : "text-gray-600"} ${fontClass}`;
  const requiredMark = <span className="ml-1 text-red-500">*</span>;

  const getAiSectionCardClass = useCallback((errorKeys = []) => {
    const hasError = errorKeys.some((key) => fieldErrors[key]);
    if (!hasError) {
      return `border-b pb-5 last:border-b-0 ${isDarkMode ? "border-slate-800" : "border-slate-200"}`;
    }

    return `border-b pb-5 last:border-b-0 ${
      isDarkMode
        ? "border-red-500/50"
        : "border-red-300"
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
      <div className={`flex h-14 shrink-0 items-center gap-3 border-b px-3 transition-colors duration-300 ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
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

      <div id="create-quiz-scroll-root" className="flex-1 space-y-5 overflow-y-auto px-4 pb-6 pt-4">

        <CreateQuizAiRecommendationsPanel
          activeRecommendation={activeRecommendation}
          expandedRecId={expandedRecId}
          fontClass={fontClass}
          inlineRecommendations={inlineRecommendations}
          inlineRecError={inlineRecError}
          inlineRecGeneratingId={inlineRecGeneratingId}
          inlineRecDismissingId={inlineRecDismissingId}
          inlineRecLoading={inlineRecLoading}
          isDarkMode={isDarkMode}
          onGenerateRecommendation={handleGenerateFromInlineRecommendation}
          onDismissRecommendation={handleDismissRecommendation}
          onToggleRecommendation={setExpandedRecId}
          t={t}
        />

        {error && (
          insufficientCreditError ? (
            <div
              ref={insufficientCreditBannerRef}
              id="create-quiz-insufficient-credit"
              className={`scroll-mt-3 rounded-xl border px-3 py-3 text-sm ${
                isDarkMode
                  ? "border-amber-800/60 bg-amber-950/25 text-amber-100"
                  : "border-amber-200 bg-amber-50 text-amber-950"
              }`}
            >
              <div className="flex gap-2.5">
                <AlertCircle className={`mt-0.5 h-4 w-4 shrink-0 ${isDarkMode ? "text-amber-400" : "text-amber-600"}`} />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className={`text-sm font-semibold leading-snug ${fontClass}`}>
                    {t("workspace.quiz.insufficientCredit.title")}
                  </p>
                  <p className={`text-xs leading-relaxed ${isDarkMode ? "text-amber-200/90" : "text-amber-900/85"}`}>
                    {error}
                  </p>
                  <p className={`text-xs leading-relaxed ${isDarkMode ? "text-amber-200/75" : "text-amber-900/70"}`}>
                    {t("workspace.quiz.insufficientCredit.hint")}
                  </p>
                  <div className={`flex flex-wrap gap-2 pt-1 ${fontClass}`}>
                    <Button asChild size="sm" className="h-8 bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600">
                      <Link to="/payments/credits">{t("workspace.quiz.insufficientCredit.ctaBuy")}</Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className={`h-8 ${isDarkMode ? "border-amber-700/80 text-amber-100 hover:bg-amber-950/40" : "border-amber-300 text-amber-900 hover:bg-amber-100/80"}`}>
                      <Link to="/wallets">{t("workspace.quiz.insufficientCredit.ctaWallet")}</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className={`rounded-lg px-3 py-2 text-xs ${isDarkMode ? "bg-red-950/30 text-red-400" : "bg-red-50 text-red-600"}`}>
              {error}
            </div>
          )
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
            areAllWorkspaceMaterialsSelected,
            selectedMaterialIds,
            selectedQTypes: state.selectedQTypes,
            selectedBloomSkills: state.selectedBloomSkills,
            workspaceMaterialsError,
            workspaceMaterialsLoading,
            workspaceSources,
          }}
          ui={{
            fontClass,
            formatDifficultyPreviewPercent,
            getBloomLabel,
            getDifficultyLabel,
            getQuestionTypeLabel,
            isDarkMode,
            t,
            hasAdvanceQuizConfig: planEntitlements?.hasAdvanceQuizConfig ?? false,
            onClearSelectedMaterials: clearSelectedSources,
            onSelectAllMaterials: selectAllSources,
            onToggleMaterialSelection: toggleSourceSelection,
            readOnly,
            workspaceMaterialsEmptyMessage,
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
