import { useRef, useState } from "react";
import {
  BrainCircuit,
  CheckCircle2,
  CheckSquare,
  FileText,
  GripVertical,
  Info,
  ListTree,
  Loader2,
  Lock,
  Sliders,
  Sparkles,
  Trash2,
  Unlock,
  Wand2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/Components/ui/dialog";
import { Button } from "@/Components/ui/button";
import bloomTaxonomyImage from "@/assets/blooms-taxonomy-1536x926.jpg";
import { QUIZ_TITLE_MAX_LENGTH } from "../quizTitleConfig";
import PlanGatedFeature from "@/Components/plan/PlanGatedFeature";
import { isAdvancedQuizQuestionType } from "@/lib/quizQuestionTypes";

function CreateQuizAiFormContent({
  classes,
  handlers,
  refsMap,
  state,
  ui,
}) {
  const {
    aiDurationHintClass,
    aiDurationSyncClass,
    getAiSectionCardClass,
    inputCls,
    labelCls,
    requiredMark,
    selectCls,
  } = classes;
  const {
    aiBloomSectionRef,
    aiDifficultySectionRef,
    aiGeneralSectionRef,
    aiPromptSectionRef,
    aiQuestionTypesSectionRef,
    aiSettingsSectionRef,
  } = refsMap;
  const {
    formatDifficultyPreviewPercent,
    getBloomLabel,
    getDifficultyLabel,
    getQuestionTypeLabel,
    t,
    fontClass,
    isDarkMode,
    hasAdvanceQuizConfig = false,
  } = ui;
  const {
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
    selectedMaterialIds,
    selectedQTypes,
    selectedSourceItems,
    structurePreview,
    structurePreviewError,
    structurePreviewLoading,
    isStructureOutdated,
    isStructureEditing,
    editableStructureItems,
    structureDifficultyOptions,
    canFetchStructurePreview,
  } = state;
  const {
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
  } = handlers;
  const dragSourceIndexRef = useRef(-1);
  const dragCurrentIndexRef = useRef(-1);
  const [showStructureEditConfirm, setShowStructureEditConfirm] = useState(false);
  const [showStructureCancelConfirm, setShowStructureCancelConfirm] = useState(false);
  const [draggingIndex, setDraggingIndex] = useState(-1);
  const [dropTargetIndex, setDropTargetIndex] = useState(-1);
  const structureItemsForDisplay = isStructureEditing ? editableStructureItems : structurePreview?.items;
  const structureCurrentCount = (Array.isArray(structureItemsForDisplay) ? structureItemsForDisplay : [])
    .reduce((sum, item) => sum + (Number(item?.quantity) || 0), 0);
  const structureTargetCount = Math.max(0, Number(aiTotalQuestions) || 0);
  const isStructureCountMissing = structureTargetCount > 0 && structureCurrentCount < structureTargetCount;
  const canAddMoreStructureItem = structureTargetCount <= 0 || structureCurrentCount < structureTargetCount;
  const showStructureOutdatedOverlay = Boolean(isStructureOutdated && structurePreview?.structureJson);

  const onStructureDragStart = (index) => {
    dragSourceIndexRef.current = index;
    dragCurrentIndexRef.current = index;
    setDraggingIndex(index);
  };

  const onStructureDragEnd = () => {
    dragSourceIndexRef.current = -1;
    dragCurrentIndexRef.current = -1;
    setDraggingIndex(-1);
    setDropTargetIndex(-1);
  };

  const onStructureDragOverCard = (event, targetIndex) => {
    if (!isStructureEditing) {
      return;
    }

    const currentIndex = dragCurrentIndexRef.current;
    if (currentIndex < 0) {
      return;
    }

    event.preventDefault();

    const cardRect = event.currentTarget.getBoundingClientRect();
    const pointerOffsetY = event.clientY - cardRect.top;
    const placeAfter = pointerOffsetY > cardRect.height / 2;

    const adjustedTargetIndex = targetIndex > currentIndex ? targetIndex - 1 : targetIndex;
    const nextIndex = placeAfter ? adjustedTargetIndex + 1 : adjustedTargetIndex;
    const boundedNextIndex = Math.max(0, Math.min(nextIndex, Math.max(0, editableStructureItems.length - 1)));

    setDropTargetIndex(placeAfter ? Math.min(targetIndex + 1, editableStructureItems.length) : targetIndex);

    if (boundedNextIndex === currentIndex) {
      return;
    }

    handleMoveStructureItem(currentIndex, boundedNextIndex);
    dragCurrentIndexRef.current = boundedNextIndex;
    setDraggingIndex(boundedNextIndex);
  };

  const onStructureDragLeaveCard = (targetIndex) => {
    if (!isStructureEditing) {
      return;
    }

    if (dropTargetIndex === targetIndex) {
      setDropTargetIndex(-1);
    }
  };

  const onStructureDrop = () => {
    const sourceIndex = dragSourceIndexRef.current;
    dragSourceIndexRef.current = -1;
    dragCurrentIndexRef.current = -1;
    setDraggingIndex(-1);
    setDropTargetIndex(-1);
    if (!isStructureEditing) {
      return;
    }

    if (sourceIndex < 0) {
      return;
    }
  };

  return (
    <div className="space-y-5 pb-4">
      {metadataLoading && (
        <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${isDarkMode ? "bg-slate-800 text-slate-300" : "bg-gray-100 text-gray-700"}`}>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {t("workspace.quiz.aiConfig.loadingMetadata")}
        </div>
      )}

      {metadataError && (
        <div className={`rounded-lg px-3 py-2 text-xs ${isDarkMode ? "bg-red-950/30 text-red-400" : "bg-red-50 text-red-700"}`}>
          {metadataError}
        </div>
      )}

      <div ref={aiGeneralSectionRef} className={getAiSectionCardClass(["aiName"])}>
        <h3 className={`mb-3 flex items-center gap-2 text-sm font-semibold ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>
          <FileText className="h-4 w-4 text-blue-500" /> {t("workspace.quiz.aiConfig.generalInfo")}
        </h3>
        <div>
          <label className={labelCls}>{t("workspace.quiz.name")}{requiredMark}</label>
          <input
            className={`${inputCls} ${fieldErrors.aiName ? (isDarkMode ? "border-red-600" : "border-red-400") : ""}`}
            placeholder={t("workspace.quiz.namePlaceholder")}
            value={aiName}
            maxLength={QUIZ_TITLE_MAX_LENGTH}
            onChange={(event) => handleAiNameChange(event.target.value)}
          />
          {fieldErrors.aiName && (
            <p className="mt-1 text-xs text-red-500">{fieldErrors.aiName}</p>
          )}
          <p className={`mt-1 text-[11px] ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
            {t("workspace.quiz.validation.nameMaxLengthHint", {
              max: QUIZ_TITLE_MAX_LENGTH,
              defaultValue: `Toi da ${QUIZ_TITLE_MAX_LENGTH} ky tu.`,
            })}
          </p>
        </div>
      </div>

      <div className={`rounded-xl border p-4 ${isDarkMode ? "border-slate-800 bg-slate-900/50" : "border-gray-100 bg-white shadow-sm"}`}>
        <h3 className={`mb-3 flex items-center gap-2 text-sm font-semibold ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>
          <CheckSquare className="h-4 w-4 text-green-500" /> {t("workspace.quiz.aiConfig.selectedMaterials")}
        </h3>
        {selectedMaterialIds.length > 0 ? (
          <div className="space-y-2">
            <div className={`rounded-lg px-3 py-2.5 text-xs ${isDarkMode ? "border border-emerald-900/30 bg-emerald-950/20 text-emerald-400" : "border border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
              {t("workspace.quiz.aiConfig.selectedMaterialsCount", { count: selectedMaterialIds.length })}
            </div>
            <div className="max-h-28 space-y-1.5 overflow-y-auto pr-1">
              {selectedSourceItems.map((item) => (
                <div key={item.id} className={`rounded-md border px-2.5 py-1.5 text-xs ${isDarkMode ? "border-slate-700 bg-slate-800/60 text-slate-300" : "border-gray-200 bg-gray-50 text-gray-700"}`}>
                  {item.name || `Material #${item.id}`}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className={`rounded-lg px-3 py-2.5 text-xs ${isDarkMode ? "border border-amber-900/30 bg-amber-950/20 text-amber-400" : "border border-amber-200 bg-amber-50 text-amber-700"}`}>
            {t("workspace.quiz.aiConfig.noSelectedMaterials")}
          </div>
        )}
      </div>

      <div ref={aiSettingsSectionRef} className={getAiSectionCardClass(["aiTotalQuestions", "aiDuration", "aiDurations"])}>
        <h3 className={`mb-3 flex items-center gap-2 text-sm font-semibold ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>
          <Sliders className="h-4 w-4 text-gray-500" /> {t("workspace.quiz.aiConfig.settings")}
        </h3>

        <div className={`grid gap-3 ${aiTimerMode ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
          <div>
            <label className={labelCls}>{t("workspace.quiz.aiConfig.totalQuestions")}{requiredMark}</label>
            <input
              type="number"
              className={`${inputCls} ${fieldErrors.aiTotalQuestions ? (isDarkMode ? "border-red-600" : "border-red-400") : ""}`}
              value={aiTotalQuestions}
              onChange={(event) => handleAiTotalQuestionsChange(event.target.value)}
              onBlur={handleAiTotalQuestionsBlur}
              min={10}
              max={100}
            />
            {fieldErrors.aiTotalQuestions && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.aiTotalQuestions}</p>
            )}
            {!fieldErrors.aiTotalQuestions && (
              <p className={`mt-1 text-[11px] ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                {t("workspace.quiz.validation.totalQuestionsRangeHint", {
                  min: 10,
                  max: 100,
                })}
              </p>
            )}
          </div>

          {aiTimerMode && (
            <div>
              <label className={labelCls}>{t("workspace.quiz.aiConfig.timeMinutes")}{requiredMark}</label>
              <input
                type="number"
                className={`${inputCls} ${(fieldErrors.aiDuration || hasAiDurationMinimumMismatch) ? (isDarkMode ? "border-red-600" : "border-red-400") : ""}`}
                value={aiDuration}
                onChange={(event) => handleAiDurationChange(event.target.value)}
                onBlur={handleAiDurationBlur}
                min={1}
              />
              {fieldErrors.aiDuration && (
                <p className="mt-1 text-xs text-red-500">{fieldErrors.aiDuration}</p>
              )}
              {!fieldErrors.aiDuration && hasAiDurationMinimumMismatch && (
                <p className="mt-1 text-xs text-red-500">
                  {t("workspace.quiz.validation.minimumTimePerQuestion", {
                    defaultValue: `Moi cau can toi thieu 30 giay. Voi ${aiTotalQuestions} cau, thoi gian phai tu ${minimumAiDurationMinutes} phut.`,
                    count: Number(aiTotalQuestions) || 0,
                    minutes: minimumAiDurationMinutes,
                  })}
                </p>
              )}
              {!fieldErrors.aiDuration && !hasAiDurationMinimumMismatch && aiDurationSyncNotice && (
                <div className={aiDurationSyncClass}>
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span className="break-words">{aiDurationSyncNotice}</span>
                </div>
              )}
              {!fieldErrors.aiDuration && !hasAiDurationMinimumMismatch && !aiDurationSyncNotice && hasValidAiTotalQuestions && (
                <div className={aiDurationHintClass}>
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span className="break-words">
                    {t("workspace.quiz.validation.minimumTimePerQuestionHint", {
                      defaultValue: `Toi thieu ${minimumAiDurationMinutes} phut (30 giay/cau).`,
                      minutes: minimumAiDurationMinutes,
                    })}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-3">
          <label className={labelCls}>{t("workspace.quiz.aiConfig.examType")}</label>
          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => setAiTimerMode(true)}
              className={`rounded-lg border px-3 py-2 text-left transition-all ${
                aiTimerMode
                  ? (isDarkMode ? "border-blue-500 bg-blue-950/30 text-blue-300" : "border-blue-400 bg-blue-50 text-blue-700")
                  : (isDarkMode ? "border-slate-700 bg-slate-800/40 text-slate-300 hover:border-slate-500" : "border-gray-200 bg-white text-gray-700 hover:border-gray-300")
              }`}
            >
              <p className="text-xs font-medium">{t("workspace.quiz.aiConfig.examTypeTimed")}</p>
              <p className={`mt-1 text-[11px] ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>{t("workspace.quiz.aiConfig.examTypeHintTimed")}</p>
            </button>
            <button
              type="button"
              onClick={() => setAiTimerMode(false)}
              className={`rounded-lg border px-3 py-2 text-left transition-all ${
                !aiTimerMode
                  ? (isDarkMode ? "border-emerald-500 bg-emerald-950/25 text-emerald-300" : "border-emerald-400 bg-emerald-50 text-emerald-700")
                  : (isDarkMode ? "border-slate-700 bg-slate-800/40 text-slate-300 hover:border-slate-500" : "border-gray-200 bg-white text-gray-700 hover:border-gray-300")
              }`}
            >
              <p className="text-xs font-medium">{t("workspace.quiz.aiConfig.examTypeSequential")}</p>
              <p className={`mt-1 text-[11px] ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>{t("workspace.quiz.aiConfig.examTypeHintSequential")}</p>
            </button>
          </div>

          {!aiTimerMode && (
            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
              <div>
                <label className={labelCls}>{t("workspace.quiz.aiConfig.easyDuration")} (s)</label>
                <input
                  type="number"
                  className={`${inputCls} ${fieldErrors.aiDurations ? (isDarkMode ? "border-red-600" : "border-red-400") : ""}`}
                  value={aiEasyDuration}
                  onChange={(event) => handleAiEasyDurationChange(event.target.value)}
                  onBlur={handleAiEasyDurationBlur}
                  min={1}
                />
              </div>
              <div>
                <label className={labelCls}>{t("workspace.quiz.aiConfig.mediumDuration")} (s)</label>
                <input
                  type="number"
                  className={`${inputCls} ${fieldErrors.aiDurations ? (isDarkMode ? "border-red-600" : "border-red-400") : ""}`}
                  value={aiMediumDuration}
                  onChange={(event) => handleAiMediumDurationChange(event.target.value)}
                  onBlur={handleAiMediumDurationBlur}
                  min={1}
                />
              </div>
              <div>
                <label className={labelCls}>{t("workspace.quiz.aiConfig.hardDuration")} (s)</label>
                <input
                  type="number"
                  className={`${inputCls} ${fieldErrors.aiDurations ? (isDarkMode ? "border-red-600" : "border-red-400") : ""}`}
                  value={aiHardDuration}
                  onChange={(event) => handleAiHardDurationChange(event.target.value)}
                  onBlur={handleAiHardDurationBlur}
                  min={1}
                />
              </div>
            </div>
          )}

          {fieldErrors.aiDurations && (
            <p className="mt-2 text-xs text-red-500">{fieldErrors.aiDurations}</p>
          )}
        </div>
      </div>

      <div ref={aiDifficultySectionRef} className={getAiSectionCardClass(["aiDifficulty"])}>
        <h3 className={`mb-3 flex items-center gap-2 text-sm font-semibold ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>
          <Sliders className="h-4 w-4 text-amber-500" /> {t("workspace.quiz.aiConfig.difficultyLevel")}
        </h3>

        <div className="mb-3 flex items-center gap-2">
          <input
            type="checkbox"
            checked={questionUnit}
            disabled={selectedDifficultyId !== "CUSTOM"}
            onChange={(event) => setQuestionUnit(event.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
          />
          <span className={`text-xs ${isDarkMode ? "text-slate-400" : "text-gray-600"}`}>{t("workspace.quiz.aiConfig.difficultyUnitByCount")}</span>
        </div>

        <select className={selectCls} value={selectedDifficultyId} onChange={handleDifficultyChange}>
          {difficultyDefs.map((difficulty) => (
            <option key={difficulty.id} value={difficulty.id}>
              {difficulty.difficultyName} ({difficulty.easyRatio}-{difficulty.mediumRatio}-{difficulty.hardRatio})
            </option>
          ))}
          <option value="CUSTOM">{t("workspace.quiz.aiConfig.customSelfConfig")}</option>
        </select>

        {selectedDifficultyId === "CUSTOM" && (
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
            {["easy", "medium", "hard"].map((level) => (
              <div key={level}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label className={`block text-[10px] font-bold uppercase ${isDarkMode ? "text-slate-500" : "text-gray-500"}`}>
                    {level} ({questionUnit ? t("workspace.quiz.aiConfig.countUnit") : "%"})
                  </label>
                  <button
                    type="button"
                    onClick={() => handleToggleDifficultyLock(level)}
                    className={`rounded p-1 transition-colors ${
                      lockedDifficultyLevel === level
                        ? "text-blue-500"
                        : (isDarkMode ? "text-slate-400 hover:text-slate-200" : "text-gray-500 hover:text-gray-700")
                    }`}
                    title={lockedDifficultyLevel === level ? t("workspace.quiz.aiConfig.unlock") : t("workspace.quiz.aiConfig.lock")}
                  >
                    {lockedDifficultyLevel === level ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <input
                  type="number"
                  className={`${inputCls} ${fieldErrors.aiDifficulty ? (isDarkMode ? "border-red-600" : "border-red-400") : ""}`}
                  value={customDifficulty[level]}
                  onChange={(event) => handleCustomDifficultyChange(level, event.target.value)}
                />
              </div>
            ))}
          </div>
        )}

        <div className={`mt-4 rounded-lg border p-3 ${isDarkMode ? "border-slate-700 bg-slate-800/50" : "border-gray-200 bg-gray-50"}`}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className={`text-xs font-medium ${isDarkMode ? "text-slate-300" : "text-gray-700"}`}>
              {t("workspace.quiz.aiConfig.difficultyPreviewTitle")}
            </span>
            <span className={`text-[11px] ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
              {difficultyPreviewSummary}
            </span>
          </div>

          <div className="flex h-3 w-full overflow-hidden rounded-full">
            <div
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${difficultyPreviewPercent.easy}%` }}
              title={`${t("workspace.quiz.difficultyLevels.easy")}: ${formatDifficultyPreviewPercent(difficultyPreviewPercent.easy)}%`}
            />
            <div
              className="h-full bg-amber-500 transition-all duration-300"
              style={{ width: `${difficultyPreviewPercent.medium}%` }}
              title={`${t("workspace.quiz.difficultyLevels.medium")}: ${formatDifficultyPreviewPercent(difficultyPreviewPercent.medium)}%`}
            />
            <div
              className="h-full bg-red-500 transition-all duration-300"
              style={{ width: `${difficultyPreviewPercent.hard}%` }}
              title={`${t("workspace.quiz.difficultyLevels.hard")}: ${formatDifficultyPreviewPercent(difficultyPreviewPercent.hard)}%`}
            />
            {difficultyPreviewRemainingPercent > 0 && (
              <div
                className={`h-full transition-all duration-300 ${isDarkMode ? "bg-slate-700/70" : "bg-gray-200"}`}
                style={{ width: `${difficultyPreviewRemainingPercent}%` }}
                title={questionUnit
                  ? `${difficultyPreviewTarget - Math.round(difficultyRawTotal)} ${t("workspace.quiz.aiConfig.countUnit")}`
                  : `${formatDifficultyPreviewPercent(100 - difficultyRawTotal)}%`}
              />
            )}
          </div>

          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-green-500" />
              <span className={`truncate text-[11px] ${isDarkMode ? "text-slate-300" : "text-gray-700"}`}>
                {t("workspace.quiz.difficultyLevels.easy")}: {formatDifficultyPreviewPercent(difficultyPreviewPercent.easy)}%
              </span>
            </div>
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500" />
              <span className={`truncate text-[11px] ${isDarkMode ? "text-slate-300" : "text-gray-700"}`}>
                {t("workspace.quiz.difficultyLevels.medium")}: {formatDifficultyPreviewPercent(difficultyPreviewPercent.medium)}%
              </span>
            </div>
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />
              <span className={`truncate text-[11px] ${isDarkMode ? "text-slate-300" : "text-gray-700"}`}>
                {t("workspace.quiz.difficultyLevels.hard")}: {formatDifficultyPreviewPercent(difficultyPreviewPercent.hard)}%
              </span>
            </div>
          </div>
        </div>

        {fieldErrors.aiDifficulty && (
          <p className="mt-2 text-xs text-red-500">{fieldErrors.aiDifficulty}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div ref={aiQuestionTypesSectionRef} className={getAiSectionCardClass(["selectedQTypes"])}>
          <h3 className={`mb-3 flex items-center gap-2 text-sm font-semibold ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>
            <Sparkles className="h-4 w-4 text-purple-500" /> {t("workspace.quiz.aiConfig.questionTypes")}
          </h3>

          <div className="mb-3 flex items-center gap-2">
            <input
              type="checkbox"
              checked={questionTypeUnit}
              onChange={(event) => setQuestionTypeUnit(event.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className={`text-xs ${isDarkMode ? "text-slate-400" : "text-gray-600"}`}>{t("workspace.quiz.aiConfig.questionTypeUnitByCount")}</span>
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            {qTypes.map((questionType) => {
              const isSelected = selectedQTypes.some((item) => item.questionTypeId === questionType.questionTypeId);
              const isAdvancedType = isAdvancedQuizQuestionType(questionType.questionType);
              const questionTypeChip = (
                <button
                  key={questionType.questionTypeId}
                  type="button"
                  onClick={() => handleToggleQuestionTypeSelection(questionType.questionTypeId)}
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all active:scale-95 ${
                    isSelected
                      ? (isDarkMode ? "border-blue-500 bg-blue-600/30 text-blue-300" : "border-blue-400 bg-blue-100 text-blue-700")
                      : (isDarkMode ? "border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500 hover:text-slate-300" : "border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-400 hover:text-gray-700")
                  }`}
                >
                  {isSelected && <CheckCircle2 className="h-3 w-3 shrink-0" />}
                  {getQuestionTypeLabel(questionType.questionType)}
                </button>
              );

              if (!isAdvancedType || hasAdvanceQuizConfig) {
                return questionTypeChip;
              }

              return (
                <PlanGatedFeature
                  key={questionType.questionTypeId}
                  allowed={false}
                  featureName={t("workspace.quiz.aiConfig.advancedConfig", "Loại quiz nâng cao")}
                  isDarkMode={isDarkMode}
                >
                  {questionTypeChip}
                </PlanGatedFeature>
              );
            })}
          </div>

          <div className="space-y-2">
            {selectedQTypes.map((item) => {
              const detail = qTypes.find((questionType) => questionType.questionTypeId === item.questionTypeId);

              return (
                <div key={item.questionTypeId} className={`flex items-center gap-2 rounded-md border p-2 text-xs ${isDarkMode ? "border-slate-700 bg-slate-800/40 text-slate-300" : "border-gray-200 bg-gray-50 text-gray-700"}`}>
                  <span className="flex-1 truncate" title={detail?.description}>
                    {detail?.questionType ? getQuestionTypeLabel(detail.questionType) : `Type #${item.questionTypeId}`}
                  </span>
                  <input
                    type="number"
                    className={`w-16 rounded border p-1 text-center ${isDarkMode ? "border-slate-700 bg-slate-800" : "border-gray-200 bg-white"}`}
                    value={item.ratio}
                    onChange={(event) => handleQTypeRatioChange(item.questionTypeId, event.target.value)}
                  />
                  <span>{questionTypeUnit ? t("workspace.quiz.aiConfig.countUnit") : "%"}</span>
                  <button
                    type="button"
                    onClick={() => handleToggleQTypeLock(item.questionTypeId)}
                    className={`rounded p-1 ${item.isLocked ? "text-blue-500" : (isDarkMode ? "text-slate-400" : "text-gray-500")}`}
                    title={item.isLocked ? t("workspace.quiz.aiConfig.unlock") : t("workspace.quiz.aiConfig.lock")}
                  >
                    {item.isLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                  </button>
                </div>
              );
            })}
          </div>

          {fieldErrors.selectedQTypes && (
            <p className="mt-3 text-xs text-red-500">{fieldErrors.selectedQTypes}</p>
          )}
        </div>

        <div ref={aiBloomSectionRef} className={getAiSectionCardClass(["selectedBloomSkills"])}>
          <h3 className={`mb-3 flex items-center gap-2 text-sm font-semibold ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>
            <BrainCircuit className="h-4 w-4 text-teal-500" /> {t("workspace.quiz.aiConfig.bloomSkills")}
            <div className="group/bloom-info relative">
              <button
                type="button"
                className={`inline-flex h-5 w-5 items-center justify-center rounded-full border transition-colors ${isDarkMode ? "border-slate-700 text-slate-400 hover:border-teal-500/50 hover:text-teal-300" : "border-gray-300 text-gray-500 hover:border-teal-400 hover:text-teal-600"}`}
                aria-label={t("workspace.quiz.aiConfig.bloomInfo")}
                title={t("workspace.quiz.aiConfig.bloomInfo")}
              >
                <Info className="h-3.5 w-3.5" />
              </button>

              <div className={`absolute left-0 top-7 z-50 hidden w-[320px] rounded-xl border p-2 shadow-xl group-hover/bloom-info:block group-focus-within/bloom-info:block md:w-[420px] ${isDarkMode ? "border-slate-700 bg-slate-900" : "border-gray-200 bg-white"}`}>
                <p className={`mb-1 text-xs font-medium ${isDarkMode ? "text-slate-300" : "text-gray-700"} ${fontClass}`}>
                  {t("workspace.quiz.aiConfig.bloomInfo")}
                </p>
                <img
                  src={bloomTaxonomyImage}
                  alt={t("workspace.quiz.aiConfig.bloomInfoAlt")}
                  className="h-auto w-full rounded-lg border border-slate-200/30"
                />
              </div>
            </div>
          </h3>

          <div className="mb-3 flex items-center gap-2">
            <input
              type="checkbox"
              checked={bloomUnit}
              onChange={(event) => setBloomUnit(event.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className={`text-xs ${isDarkMode ? "text-slate-400" : "text-gray-600"}`}>{t("workspace.quiz.aiConfig.bloomUnitByCount")}</span>
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            {bloomSkills.map((skill) => {
              const isSelected = selectedBloomSkills.some((item) => item.bloomId === skill.bloomId);

              return (
                <button
                  key={skill.bloomId}
                  type="button"
                  onClick={() => handleToggleBloomSelection(skill.bloomId)}
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all active:scale-95 ${
                    isSelected
                      ? (isDarkMode ? "border-teal-500 bg-teal-600/30 text-teal-300" : "border-teal-400 bg-teal-100 text-teal-700")
                      : (isDarkMode ? "border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500 hover:text-slate-300" : "border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-400 hover:text-gray-700")
                  }`}
                >
                  {isSelected && <CheckCircle2 className="h-3 w-3 shrink-0" />}
                  {skill.bloomName}
                </button>
              );
            })}
          </div>

          <div className="space-y-2">
            {selectedBloomSkills.map((item) => {
              const detail = bloomSkills.find((skill) => skill.bloomId === item.bloomId);

              return (
                <div key={item.bloomId} className={`flex items-center gap-2 rounded-md border p-2 text-xs ${isDarkMode ? "border-slate-700 bg-slate-800/40 text-slate-300" : "border-gray-200 bg-gray-50 text-gray-700"}`}>
                  <span className="flex-1 truncate" title={detail?.description}>
                    {detail?.bloomName || `Bloom #${item.bloomId}`}
                  </span>
                  <input
                    type="number"
                    className={`w-16 rounded border p-1 text-center ${isDarkMode ? "border-slate-700 bg-slate-800" : "border-gray-200 bg-white"}`}
                    value={item.ratio}
                    onChange={(event) => handleBloomRatioChange(item.bloomId, event.target.value)}
                  />
                  <span>{bloomUnit ? t("workspace.quiz.aiConfig.countUnit") : "%"}</span>
                  <button
                    type="button"
                    onClick={() => handleToggleBloomLock(item.bloomId)}
                    className={`rounded p-1 ${item.isLocked ? "text-blue-500" : (isDarkMode ? "text-slate-400" : "text-gray-500")}`}
                    title={item.isLocked ? t("workspace.quiz.aiConfig.unlock") : t("workspace.quiz.aiConfig.lock")}
                  >
                    {item.isLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                  </button>
                </div>
              );
            })}
          </div>

          {fieldErrors.selectedBloomSkills && (
            <p className="mt-3 text-xs text-red-500">{fieldErrors.selectedBloomSkills}</p>
          )}
        </div>
      </div>

      <div ref={aiPromptSectionRef} className={getAiSectionCardClass(["aiPrompt"])}>
        <h3 className={`mb-3 flex items-center gap-2 text-sm font-semibold ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>
          <FileText className="h-4 w-4 text-violet-500" /> {t("workspace.quiz.aiConfig.customPromptLabel", "Vui long nhap yeu cau cua ban")}
        </h3>

        <textarea
          className={`${inputCls} min-h-[96px] resize-none ${fieldErrors.aiPrompt ? (isDarkMode ? "border-red-600" : "border-red-400") : ""}`}
          placeholder={t("workspace.quiz.aiConfig.promptPlaceholder")}
          value={aiPrompt}
          onChange={(event) => handleAiPromptChange(event.target.value)}
        />

        {fieldErrors.aiPrompt && (
          <p className="mt-2 text-xs text-red-500">{fieldErrors.aiPrompt}</p>
        )}
      </div>

      <div className={`relative overflow-hidden rounded-2xl border transition-all ${isDarkMode ? "border-cyan-900/40 bg-slate-900/60 shadow-2xl shadow-blue-950/20" : "border-cyan-100 bg-white shadow-2xl shadow-slate-900/5"}`}>
        <div className={`${showStructureOutdatedOverlay ? "opacity-20 pointer-events-none select-none" : ""}`}>
        <div className={`border-b px-4 py-3 ${isDarkMode ? "border-cyan-900/30 bg-gradient-to-r from-cyan-950/20 to-transparent" : "border-cyan-100 bg-gradient-to-r from-cyan-50/80 to-transparent"}`}>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`inline-flex h-8 w-8 items-center justify-center rounded-xl ${isDarkMode ? "bg-cyan-500/15 text-cyan-300" : "bg-cyan-100 text-cyan-600"}`}>
                  <ListTree className="h-4 w-4" />
                </span>
                <div>
                  <h3 className={`text-sm font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
                    {t("workspace.quiz.aiConfig.structureLabel", "Cấu trúc của quiz")}
                  </h3>
                  <p className={`text-[11px] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                    {t("workspace.quiz.aiConfig.structurePreviewHint", "Nhấn Cấu hình chi tiết để xem trước cấu trúc quiz AI.")}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {(Array.isArray(structurePreview?.items) && structurePreview.items.length > 0) && !isStructureEditing && (
                <>
                  <button
                    type="button"
                    onClick={handlePreviewStructure}
                    disabled={structurePreviewLoading || !canFetchStructurePreview}
                    className={`inline-flex min-w-[180px] items-center justify-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold transition-all active:scale-95 ${
                      isDarkMode
                        ? "border-cyan-500/30 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                        : "border-cyan-200 bg-white text-cyan-700 shadow-sm hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-50"
                    }`}
                  >
                    {structurePreviewLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                    {structurePreviewLoading
                      ? t("workspace.quiz.aiConfig.structurePreviewLoading", "Đang tạo cấu trúc...")
                      : t("workspace.quiz.aiConfig.structurePreviewAction", "Cấu hình chi tiết")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowStructureEditConfirm(true)}
                    disabled={structurePreviewLoading || !canFetchStructurePreview}
                    className={`inline-flex min-w-[140px] items-center justify-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold transition-all active:scale-95 ${
                      isDarkMode
                        ? "border-amber-500/30 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                        : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                    }`}
                  >
                    {t("workspace.quiz.aiConfig.structureEditAction", "Chỉnh sửa")}
                  </button>
                </>
              )}

              {isStructureEditing && (
                <>
                  <button
                    type="button"
                    onClick={handleAddStructureItem}
                    disabled={!canAddMoreStructureItem}
                    className={`inline-flex min-w-[140px] items-center justify-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold transition-all active:scale-95 ${
                      isDarkMode
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                    }`}
                  >
                    {t("workspace.quiz.aiConfig.structureAddQuestionAction", "Thêm câu")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowStructureCancelConfirm(true)}
                    className={`inline-flex min-w-[180px] items-center justify-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold transition-all active:scale-95 ${
                      isDarkMode
                        ? "border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/20"
                        : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                    }`}
                  >
                    {t("workspace.quiz.aiConfig.structureCancelEditAction", "Hủy chỉnh sửa")}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3 p-4">
          {structurePreviewError && (
            <div className={`rounded-xl border px-3 py-2 text-xs ${isDarkMode ? "border-red-900/40 bg-red-950/25 text-red-300" : "border-red-200 bg-red-50 text-red-700"}`}>
              {structurePreviewError}
            </div>
          )}

          {(Array.isArray(structurePreview?.items) && structurePreview.items.length > 0) && (
            <div className={`grid gap-3 md:grid-cols-2`}>
              <div className={`rounded-xl border px-4 py-3 ${isStructureCountMissing
                ? (isDarkMode ? "border-red-500/40 bg-red-950/25" : "border-red-200 bg-red-50")
                : (isDarkMode ? "border-cyan-900/40 bg-cyan-950/15" : "border-cyan-100 bg-cyan-50/70")}`}
              >
                <p className={`text-[11px] uppercase tracking-[0.22em] ${isStructureCountMissing
                  ? (isDarkMode ? "text-red-300/90" : "text-red-700/80")
                  : (isDarkMode ? "text-cyan-300/80" : "text-cyan-700/70")}`}
                >
                  {t("workspace.quiz.aiConfig.totalQuestions")}
                </p>
                <p className={`mt-1 text-2xl font-semibold leading-none ${isStructureCountMissing
                  ? (isDarkMode ? "text-red-200" : "text-red-700")
                  : (isDarkMode ? "text-white" : "text-slate-900")}`}
                >
                  {isStructureCountMissing
                    ? `${structureCurrentCount}/${structureTargetCount}`
                    : (Number(structurePreview?.totalQuestion) || structureCurrentCount || 0)}
                </p>
              </div>
              <div className={`rounded-xl border px-4 py-3 ${isDarkMode ? "border-slate-800 bg-slate-900/40" : "border-slate-200 bg-white"}`}>
                <p className={`text-[11px] uppercase tracking-[0.22em] ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                  {t("workspace.quiz.aiConfig.structureLabel", "Cấu trúc của quiz")}
                </p>
                <p className={`mt-1 text-2xl font-semibold leading-none ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
                  {Array.isArray(structurePreview?.items) ? structurePreview.items.length : 0}
                </p>
              </div>
            </div>
          )}

          {(isStructureEditing ? editableStructureItems : structurePreview?.items)?.length > 0 ? (
            <div className="space-y-2">
              {(isStructureEditing ? editableStructureItems : structurePreview.items).map((item, index) => (
                <div
                  key={`${item.difficulty || "NA"}-${item.questionType || "NA"}-${item.bloomSkill || "NA"}-${index}`}
                  className={`group relative overflow-hidden rounded-2xl border px-4 py-4 transition-all duration-300 ${
                    isDarkMode
                      ? "bg-slate-900/60"
                      : "bg-white"
                  } ${
                    draggingIndex === index
                      ? (isDarkMode
                          ? "z-20 scale-[1.01] border-cyan-500/70 shadow-2xl shadow-cyan-900/30 opacity-90"
                          : "z-20 scale-[1.01] border-cyan-300 shadow-2xl shadow-slate-900/10 opacity-90")
                      : dropTargetIndex === index
                        ? (isDarkMode
                            ? "border-cyan-400/70 ring-2 ring-cyan-500/30"
                            : "border-cyan-300 ring-2 ring-cyan-200")
                        : (isDarkMode
                            ? "border-slate-800 hover:-translate-y-0.5 hover:border-cyan-700/40"
                            : "border-slate-200 hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-lg hover:shadow-slate-900/5")
                  }`}
                  draggable={isStructureEditing}
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = "move";
                    onStructureDragStart(index);
                  }}
                  onDragEnd={onStructureDragEnd}
                  onDragOver={(event) => {
                    event.dataTransfer.dropEffect = "move";
                    onStructureDragOverCard(event, index);
                  }}
                  onDragLeave={() => onStructureDragLeaveCard(index)}
                  onDrop={onStructureDrop}
                >
                  {isStructureEditing && dropTargetIndex === index && draggingIndex !== index && (
                    <div className={`pointer-events-none absolute inset-x-3 top-1.5 h-0.5 rounded-full ${isDarkMode ? "bg-cyan-400/80" : "bg-cyan-500"}`} />
                  )}
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                      {isStructureEditing && (
                        <span
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border cursor-grab transition-all active:cursor-grabbing ${
                            draggingIndex === index
                              ? (isDarkMode ? "border-cyan-500/70 bg-cyan-500/20 text-cyan-200" : "border-cyan-300 bg-cyan-50 text-cyan-700")
                              : (isDarkMode ? "border-slate-700 bg-slate-950 text-slate-300 hover:border-cyan-700/50" : "border-slate-200 bg-slate-50 text-slate-600 hover:border-cyan-200 hover:text-cyan-700")
                          }`}
                          title={t("workspace.quiz.aiConfig.structureDragHint", "Kéo để đổi vị trí")}
                        >
                          <GripVertical className="h-4 w-4" />
                        </span>
                      )}
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-[11px] font-bold ${isDarkMode ? "border-slate-800 bg-slate-950 text-cyan-200" : "border-slate-200 bg-slate-50 text-cyan-700"}`}>
                        #{index + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${item.difficulty === "HARD" ? "bg-rose-500" : item.difficulty === "MEDIUM" ? "bg-amber-500" : "bg-emerald-500"}`} />
                          <p className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                            {item.quantity || 0} {t("workspace.quiz.aiConfig.countUnit")}
                          </p>
                        </div>
                        <p className={`mt-0.5 text-[11px] ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                          {t("workspace.quiz.aiConfig.structureLabel", "Cấu trúc của quiz")} #{index + 1}
                        </p>
                      </div>
                    </div>

                    {isStructureEditing ? (
                      <div className="flex items-end gap-2 overflow-x-auto pb-1 text-xs md:overflow-visible">
                        <label className="flex min-w-[150px] flex-1 flex-col gap-1">
                          <span className={isDarkMode ? "text-slate-400" : "text-slate-500"}>{t("workspace.quiz.aiConfig.structureDifficulty", "Độ khó")}</span>
                          <select
                            className={`rounded-lg border px-2 py-1.5 ${isDarkMode ? "border-slate-700 bg-slate-950 text-slate-200" : "border-slate-200 bg-white text-slate-700"}`}
                            value={String(item.difficulty || "").toUpperCase()}
                            onChange={(event) => handleStructureItemChange(index, "difficulty", event.target.value)}
                          >
                            {structureDifficultyOptions.map((option) => (
                              <option key={option} value={option}>{getDifficultyLabel(option)}</option>
                            ))}
                          </select>
                        </label>

                        <label className="flex min-w-[180px] flex-[1.3] flex-col gap-1">
                          <span className={isDarkMode ? "text-slate-400" : "text-slate-500"}>{t("workspace.quiz.aiConfig.structureQuestionType", "Loại câu")}</span>
                          <select
                            className={`rounded-lg border px-2 py-1.5 ${isDarkMode ? "border-slate-700 bg-slate-950 text-slate-200" : "border-slate-200 bg-white text-slate-700"}`}
                            value={String(item.questionType || "").toUpperCase()}
                            onChange={(event) => handleStructureItemChange(index, "questionType", event.target.value)}
                          >
                            {qTypes.map((questionType) => (
                              <option key={questionType.questionTypeId} value={questionType.questionType}>
                                {getQuestionTypeLabel(questionType.questionType)}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="flex min-w-[170px] flex-[1.15] flex-col gap-1">
                          <span className={isDarkMode ? "text-slate-400" : "text-slate-500"}>{t("workspace.quiz.aiConfig.structureBloom", "Bloom")}</span>
                          <select
                            className={`rounded-lg border px-2 py-1.5 ${isDarkMode ? "border-slate-700 bg-slate-950 text-slate-200" : "border-slate-200 bg-white text-slate-700"}`}
                            value={String(item.bloomSkill || "").toUpperCase()}
                            onChange={(event) => handleStructureItemChange(index, "bloomSkill", event.target.value)}
                          >
                            {bloomSkills.map((skill) => (
                              <option key={skill.bloomId} value={skill.bloomName}>{getBloomLabel(skill.bloomName)}</option>
                            ))}
                          </select>
                        </label>

                        <label className="flex min-w-[88px] w-[88px] flex-col gap-1">
                          <span className={isDarkMode ? "text-slate-400" : "text-slate-500"}>{t("workspace.quiz.aiConfig.structureQuantity", "Số câu")}</span>
                          <input
                            type="number"
                            min={1}
                            className={`rounded-lg border px-2 py-1.5 ${isDarkMode ? "border-slate-700 bg-slate-950 text-slate-200" : "border-slate-200 bg-white text-slate-700"}`}
                            value={Number(item.quantity) || 1}
                            onChange={(event) => handleStructureItemChange(index, "quantity", event.target.value)}
                          />
                        </label>

                        <button
                          type="button"
                          onClick={() => handleRemoveStructureItem(index)}
                          disabled={editableStructureItems.length <= 1}
                          className={`inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg border transition-all active:scale-95 ${
                            isDarkMode
                              ? "border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                              : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                          }`}
                          title={t("workspace.quiz.aiConfig.structureRemoveAction", "Xóa câu")}
                          aria-label={t("workspace.quiz.aiConfig.structureRemoveAction", "Xóa câu")}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${isDarkMode ? "border-slate-800 bg-slate-950/60 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
                          <span className={`h-2 w-2 rounded-full ${item.difficulty === "HARD" ? "bg-rose-500" : item.difficulty === "MEDIUM" ? "bg-amber-500" : "bg-emerald-500"}`} />
                          {t("workspace.quiz.aiConfig.structureDifficulty", "Độ khó")} <strong>{getDifficultyLabel(item.difficulty)}</strong>
                        </span>
                        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${isDarkMode ? "border-slate-800 bg-slate-950/60 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
                          {t("workspace.quiz.aiConfig.structureQuestionType", "Loại câu")} <strong>{getQuestionTypeLabel(item.questionType)}</strong>
                        </span>
                        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${isDarkMode ? "border-slate-800 bg-slate-950/60 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
                          {t("workspace.quiz.aiConfig.structureBloom", "Bloom")} <strong>{getBloomLabel(item.bloomSkill)}</strong>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={`rounded-2xl border px-4 py-8 text-sm ${isDarkMode ? "border-slate-700 bg-slate-800/40 text-slate-400" : "border-slate-200 bg-white text-slate-600"}`}>
              <div className="flex flex-col items-center justify-center gap-3 text-center">
                <p>{t("workspace.quiz.aiConfig.structurePreviewHint", "Nhấn Cấu hình chi tiết để xem trước cấu trúc quiz AI.")}</p>
                <button
                  type="button"
                  onClick={handlePreviewStructure}
                  disabled={structurePreviewLoading || !canFetchStructurePreview}
                  className={`inline-flex min-w-[190px] items-center justify-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold transition-all active:scale-95 ${
                    isDarkMode
                      ? "border-cyan-500/30 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-40"
                      : "border-cyan-200 bg-white text-cyan-700 shadow-sm hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-40"
                  }`}
                >
                  {structurePreviewLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                  {t("workspace.quiz.aiConfig.structureFetchAction", "Lấy cấu hình chi tiết")}
                </button>
              </div>
            </div>
          )}
        </div>
        </div>

        {showStructureOutdatedOverlay && (
          <div className={`absolute inset-0 z-10 flex items-center justify-center p-4 ${isDarkMode ? "bg-slate-950/45" : "bg-white/45"}`}>
            <div className={`max-w-xl rounded-2xl border px-5 py-4 text-center shadow-2xl ${isDarkMode ? "border-amber-700/50 bg-slate-900/95 text-slate-100" : "border-amber-200 bg-white/95 text-slate-900"}`}>
              <p className={`text-sm font-medium ${isDarkMode ? "text-amber-200" : "text-amber-700"}`}>
                {t(
                  "workspace.quiz.aiConfig.structureOutdatedWarning",
                  "Thiết lập ở trên đã khác với cấu trúc quiz hiện tại, vui lòng lấy lại cấu hình chi tiết"
                )}
              </p>
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={handlePreviewStructure}
                  disabled={structurePreviewLoading || !canFetchStructurePreview}
                  className={`inline-flex min-w-[190px] items-center justify-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold transition-all active:scale-95 ${
                    isDarkMode
                      ? "border-cyan-500/30 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-40"
                      : "border-cyan-200 bg-white text-cyan-700 shadow-sm hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-40"
                  }`}
                >
                  {structurePreviewLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                  {t("workspace.quiz.aiConfig.structureFetchAction", "Lấy cấu hình chi tiết")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={showStructureEditConfirm} onOpenChange={setShowStructureEditConfirm}>
        <DialogContent className={isDarkMode ? "border-slate-700 bg-slate-900 text-slate-100" : "border-slate-200 bg-white text-slate-900"}>
          <DialogHeader>
            <DialogTitle>{t("workspace.quiz.aiConfig.structureEditAction", "Chỉnh sửa")}</DialogTitle>
            <DialogDescription className={isDarkMode ? "text-slate-300" : "text-slate-600"}>
              {t(
                "workspace.quiz.aiConfig.structureEditConfirm",
                "Nếu chỉnh sửa cấu trúc, các thông số cấu hình ở trên sẽ thay đổi. Bạn có muốn tiếp tục?"
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowStructureEditConfirm(false)}
              className={isDarkMode ? "border-slate-600 text-slate-200" : ""}
            >
              {t("workspace.quiz.cancel")}
            </Button>
            <Button
              type="button"
              onClick={async () => {
                setShowStructureEditConfirm(false);
                await handleStartStructureEdit();
              }}
              className="bg-[#2563EB] text-white hover:bg-blue-700"
            >
              {t("workspace.quiz.continue", "Tiếp tục")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showStructureCancelConfirm} onOpenChange={setShowStructureCancelConfirm}>
        <DialogContent className={isDarkMode ? "border-slate-700 bg-slate-900 text-slate-100" : "border-slate-200 bg-white text-slate-900"}>
          <DialogHeader>
            <DialogTitle>{t("workspace.quiz.aiConfig.structureCancelEditAction", "Hủy chỉnh sửa")}</DialogTitle>
            <DialogDescription className={isDarkMode ? "text-slate-300" : "text-slate-600"}>
              {t("workspace.quiz.aiConfig.structureCancelConfirm", "Mọi thay đổi của bạn sẽ bị hủy.")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowStructureCancelConfirm(false)}
              className={isDarkMode ? "border-slate-600 text-slate-200" : ""}
            >
              {t("workspace.quiz.cancel")}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setShowStructureCancelConfirm(false);
                handleCancelStructureEdit();
              }}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {t("workspace.quiz.confirm", "Xác nhận")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CreateQuizAiFormContent;
