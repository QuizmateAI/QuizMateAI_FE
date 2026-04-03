import {
  BrainCircuit,
  CheckCircle2,
  CheckSquare,
  FileText,
  Info,
  Loader2,
  Lock,
  Sliders,
  Sparkles,
  Unlock,
} from "lucide-react";
import bloomTaxonomyImage from "@/assets/blooms-taxonomy-1536x926.jpg";
import { QUIZ_TITLE_MAX_LENGTH } from "../quizTitleConfig";

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
    getQuestionTypeLabel,
    t,
    fontClass,
    isDarkMode,
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
    setAiTimerMode,
    setBloomUnit,
    setQuestionTypeUnit,
    setQuestionUnit,
  } = handlers;

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

              return (
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
    </div>
  );
}

export default CreateQuizAiFormContent;
