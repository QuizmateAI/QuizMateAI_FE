import React, { useEffect, useRef, useState } from "react";
import { Loader2, FileText, CheckSquare, Sliders, Sparkles, BrainCircuit, Info, CheckCircle2, ListTree, Wand2, Tags } from "lucide-react";
import { AI_OUTPUT_LANGUAGES } from "./aiConfigUtils";
import SubTopicAPI from "@/api/SubTopicAPI";
import PlanGatedFeature from "@/components/plan/PlanGatedFeature";
import {
  QUESTION_TYPE_LABEL_FALLBACKS,
  getBloomSkillLabel,
  getQuizDifficultyLabel,
  getQuizQuestionTypeLabel,
  isAdvancedQuizQuestionType,
} from "@/lib/quizQuestionTypes";

const AI_MINIMUM_SECONDS_PER_QUESTION = 30;

function AIQuizTab({
  t,
  isDarkMode,
  labelCls,
  inputCls,
  selectCls,
  aiName,
  setAiName,
  aiPrompt,
  setAiPrompt,
  aiQuizIntent,
  setAiQuizIntent,
  quizIntents,
  aiOutputLanguage,
  setAiOutputLanguage,
  loadingMetadata,
  materials,
  selectedMaterialIds,
  onToggleMaterial,
  selectedDifficultyId,
  onDifficultyChange,
  difficultyDefs,
  customDifficulty,
  setCustomDifficulty,
  questionUnit,
  setQuestionUnit,
  questionTypeUnit,
  setQuestionTypeUnit,
  qTypes,
  selectedQTypes,
  onToggleQType,
  onQTypeRatioChange,
  bloomUnit,
  setBloomUnit,
  bloomSkills,
  selectedBloomSkills,
  onToggleBloom,
  onBloomRatioChange,
  aiTotalQuestions,
  setAiTotalQuestions,
  minTotalQuestions,
  maxTotalQuestions,
  aiTimerMode,
  setAiTimerMode,
  aiDuration,
  setAiDuration,
  aiDurationSyncNotice,
  setAiDurationSyncNotice,
  aiEasyDuration,
  setAiEasyDuration,
  aiMediumDuration,
  setAiMediumDuration,
  aiHardDuration,
  setAiHardDuration,
  fieldErrors,
  setFieldErrors,
  sectionRefs,
  minimumDurationMinutes,
  structurePreview,
  structurePreviewLoading,
  structurePreviewError,
  onPreviewStructure,
  hasAdvanceQuizConfig = false,
  // Optional topic focus picker. Selected IDs are prompt focus only.
  workspaceId,
  selectedSubTopicIds = [],
  onSelectedSubTopicIdsChange,
}) {
  const requiredMark = <span className="ml-1 text-red-500">*</span>;

  // === Topic focus picker state ===
  const [subTopics, setSubTopics] = useState([]);
  const [loadingSubTopics, setLoadingSubTopics] = useState(false);
  const [subTopicError, setSubTopicError] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!selectedMaterialIds || selectedMaterialIds.length === 0 || !workspaceId) {
      setSubTopics([]);
      setSubTopicError(null);
      return undefined;
    }
    setLoadingSubTopics(true);
    setSubTopicError(null);
    debounceRef.current = setTimeout(async () => {
      try {
        const resp = await SubTopicAPI.getByMaterials(selectedMaterialIds, workspaceId);
        const data = resp?.data ?? resp ?? [];
        setSubTopics(Array.isArray(data) ? data : []);
      } catch (err) {
        setSubTopicError(err?.message || "Khong tai duoc chu de con.");
        setSubTopics([]);
      } finally {
        setLoadingSubTopics(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [selectedMaterialIds, workspaceId]);

  const toggleSubTopic = (id) => {
    if (typeof onSelectedSubTopicIdsChange !== "function") return;
    const cur = Array.isArray(selectedSubTopicIds) ? selectedSubTopicIds : [];
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    onSelectedSubTopicIdsChange(next);
  };

  const getQuestionTypeLabel = React.useCallback((questionType) => {
    const normalizedType = String(questionType || "").toUpperCase();
    const fallbackLabel = QUESTION_TYPE_LABEL_FALLBACKS[normalizedType] || questionType || "-";
    return getQuizQuestionTypeLabel(normalizedType, t) || fallbackLabel;
  }, [t]);
  const getDifficultyLabel = React.useCallback((difficulty) => getQuizDifficultyLabel(difficulty, t), [t]);
  const getBloomLabel = React.useCallback((bloomSkill) => getBloomSkillLabel(bloomSkill, t), [t]);

  const normalizeIntegerInput = (value) => {
    if (value === "") return "";
    const digits = String(value).replace(/\D/g, "");
    if (!digits) return "";
    const normalized = digits.replace(/^0+(?=\d)/, "");
    return Number(normalized || 0);
  };

  const applyRangeOnBlur = (value, setter, minValue = 1, maxValue = Number.POSITIVE_INFINITY) => {
    const next = Number(value);
    if (!Number.isFinite(next)) {
      setter(minValue);
      return;
    }

    setter(Math.min(Math.max(next, minValue), maxValue));
  };
  const applyMinOnBlur = (value, setter, minValue = 1) => applyRangeOnBlur(value, setter, minValue);
  const hasValidTotalQuestions = Number(aiTotalQuestions) >= minTotalQuestions
    && Number(aiTotalQuestions) <= maxTotalQuestions;
  const hasDurationMinimumMismatch = aiTimerMode
    && hasValidTotalQuestions
    && Number(aiDuration) > 0
    && Number(aiDuration) < minimumDurationMinutes;
  const durationMetaBaseClass = "mt-2 inline-flex max-w-full items-start gap-2 rounded-lg border px-3 py-2 text-[11px] font-medium leading-relaxed";
  const durationHintClass = isDarkMode
    ? `${durationMetaBaseClass} border-slate-700 bg-slate-800/70 text-slate-300`
    : `${durationMetaBaseClass} border-slate-200 bg-slate-50 text-slate-600`;
  const durationSyncClass = isDarkMode
    ? `${durationMetaBaseClass} border-cyan-500/30 bg-cyan-500/10 text-cyan-200`
    : `${durationMetaBaseClass} border-blue-200 bg-blue-50 text-blue-700`;

  const getSectionClassName = (errorKeys = []) => {
    const hasError = errorKeys.some((key) => fieldErrors[key]);
    const defaultClasses = isDarkMode
      ? "bg-slate-900/50 border-slate-800"
      : "bg-white border-gray-100 shadow-sm";

    if (!hasError) {
      return `p-4 rounded-xl border transition-colors ${defaultClasses}`;
    }

    return `p-4 rounded-xl border transition-colors ${
      isDarkMode
        ? "bg-red-950/10 border-red-500/60"
        : "bg-red-50/70 border-red-300 shadow-sm"
    }`;
  };

  return (
    <div className="space-y-5 pb-4">
      <div className={`rounded-lg border px-3 py-2 text-xs ${isDarkMode ? "border-amber-900/40 bg-amber-950/30 text-amber-300" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
        {t("workspace.quiz.validation.requiredFieldsHint")}
      </div>

      <div ref={sectionRefs?.general} className={getSectionClassName(["aiName", "aiPrompt"])}>
        <h3 className={`mb-3 flex items-center gap-2 text-sm font-semibold ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>
          <FileText className="h-4 w-4 text-blue-500" />
          {t("workspace.quiz.aiConfig.generalInfo")}
        </h3>
        <div className="space-y-3">
          <div>
            <label className={labelCls}>{t("workspace.quiz.name")}{requiredMark}</label>
            <input
              className={`${inputCls} ${fieldErrors.aiName ? "border-red-400" : ""}`}
              placeholder={t("workspace.quiz.namePlaceholder")}
              value={aiName}
              onChange={(e) => {
                setAiName(e.target.value);
                setFieldErrors((prev) => ({ ...prev, aiName: "" }));
              }}
            />
            {fieldErrors.aiName && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.aiName}</p>
            )}
          </div>

          <div>
            <label className={labelCls}>{t("workspace.quiz.aiConfig.customPromptLabel", "Please enter your request")}</label>
            <textarea
              className={`${inputCls} min-h-[72px] resize-none ${fieldErrors.aiPrompt ? "border-red-400" : ""}`}
              placeholder={t("workspace.quiz.aiConfig.promptPlaceholder")}
              value={aiPrompt}
              onChange={(e) => {
                setAiPrompt(e.target.value);
                setFieldErrors((prev) => ({ ...prev, aiPrompt: "" }));
              }}
            />
            {fieldErrors.aiPrompt && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.aiPrompt}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className={labelCls}>{t("workspace.quiz.intent")}</label>
              <select className={selectCls} value={aiQuizIntent} onChange={(e) => setAiQuizIntent(e.target.value)}>
                {quizIntents.map((intent) => (
                  <option key={intent} value={intent}>{t(`workspace.quiz.intentLabels.${intent}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>{t("workspace.quiz.aiConfig.outputLanguage", "Output Language")}</label>
              <select className={selectCls} value={aiOutputLanguage} onChange={(e) => setAiOutputLanguage(e.target.value)}>
                {AI_OUTPUT_LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className={getSectionClassName()}>
        <h3 className={`mb-3 flex items-center gap-2 text-sm font-semibold ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>
          <CheckSquare className="h-4 w-4 text-green-500" />
          {t("workspace.quiz.aiConfig.selectedMaterials")}
        </h3>
        {loadingMetadata ? (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Loader2 className="h-3 w-3 animate-spin" />
            {t("workspace.quiz.aiConfig.loadingMetadata")}
          </div>
        ) : materials.length > 0 ? (
          <div className="max-h-40 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
            {materials.map((mat) => {
              const materialId = mat.id || mat.materialId;
              const isSelected = selectedMaterialIds.includes(materialId);
              return (
                <label
                  key={materialId}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 transition-all ${
                    isSelected
                      ? (isDarkMode ? "border-blue-500/50 bg-blue-900/20" : "border-blue-200 bg-blue-50")
                      : (isDarkMode ? "border-slate-800 hover:bg-slate-800" : "border-gray-200 hover:bg-gray-50")
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleMaterial(materialId)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-xs font-medium ${isDarkMode ? "text-slate-300" : "text-gray-700"}`}>
                      {mat.fileName || mat.title || "Untitled"}
                    </p>
                    <p className="truncate text-[10px] text-slate-500">
                      {mat.description || t("No description")}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        ) : (
          <p className="text-xs italic text-slate-500">{t("workspace.quiz.aiConfig.noSelectedMaterials")}</p>
        )}
      </div>

        {/* Topic focus picker. Chi hien khi co material da chon. */}
      {selectedMaterialIds && selectedMaterialIds.length > 0 && typeof onSelectedSubTopicIdsChange === "function" && (
        <div className={getSectionClassName()}>
          <h3 className={`mb-3 flex items-center gap-2 text-sm font-semibold ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>
            <Tags className="h-4 w-4 text-purple-500" />
            {t("workspace.quiz.aiConfig.subTopicLabel")}
          </h3>
          {loadingSubTopics ? (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              {t("workspace.quiz.aiConfig.subTopicLoading")}
            </div>
          ) : subTopicError ? (
            <p className="text-xs italic text-red-500">{subTopicError}</p>
          ) : subTopics.length === 0 ? (
            <p className="text-xs italic text-slate-500">
              {t("workspace.quiz.aiConfig.subTopicEmpty")}
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {subTopics.map((st) => {
                  const id = st.subTopicId || st.id;
                  const isSel = (selectedSubTopicIds || []).includes(id);
                  return (
                    <button
                      type="button"
                      key={id}
                      onClick={() => toggleSubTopic(id)}
                      className={`rounded-full border px-3 py-1 text-xs transition-all ${
                        isSel
                          ? (isDarkMode ? "border-purple-400 bg-purple-900/30 text-purple-200" : "border-purple-500 bg-purple-50 text-purple-700")
                          : (isDarkMode ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-gray-200 text-gray-600 hover:bg-gray-50")
                      }`}
                      title={st.description || ""}
                    >
                      {st.title}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      <div ref={sectionRefs?.settings} className={getSectionClassName(["aiTotalQuestions", "aiDuration", "aiDurations"])}>
        <h3 className={`mb-3 flex items-center gap-2 text-sm font-semibold ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>
          <Sliders className="h-4 w-4 text-gray-500" />
          {t("workspace.quiz.aiConfig.settings")}
        </h3>
        <div className={`grid gap-3 ${aiTimerMode ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
          <div>
            <label className={labelCls}>{t("workspace.quiz.aiConfig.totalQuestions")}{requiredMark}</label>
            <input
              type="number"
              className={`${inputCls} ${fieldErrors.aiTotalQuestions ? "border-red-400" : ""}`}
              value={aiTotalQuestions}
              onChange={(e) => {
                const normalizedValue = normalizeIntegerInput(e.target.value);
                setAiTotalQuestions(normalizedValue === "" ? "" : Math.min(normalizedValue, maxTotalQuestions));
                setFieldErrors((prev) => ({ ...prev, aiTotalQuestions: "", aiDuration: "" }));
              }}
              onBlur={() => applyRangeOnBlur(aiTotalQuestions, setAiTotalQuestions, minTotalQuestions, maxTotalQuestions)}
              min={minTotalQuestions}
              max={maxTotalQuestions}
            />
            {fieldErrors.aiTotalQuestions && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.aiTotalQuestions}</p>
            )}
            {!fieldErrors.aiTotalQuestions && (
              <p className={`mt-1 text-[11px] ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                {t("workspace.quiz.validation.totalQuestionsRangeHint", {
                  min: minTotalQuestions,
                  max: maxTotalQuestions,
                })}
              </p>
            )}
          </div>

          {aiTimerMode && (
            <div>
              <label className={labelCls}>{t("workspace.quiz.aiConfig.timeMinutes")}{requiredMark}</label>
              <input
                type="number"
                className={`${inputCls} ${(fieldErrors.aiDuration || hasDurationMinimumMismatch) ? "border-red-400" : ""}`}
                value={aiDuration}
                onChange={(e) => {
                  setAiDuration(normalizeIntegerInput(e.target.value));
                  setFieldErrors((prev) => ({ ...prev, aiDuration: "" }));
                  setAiDurationSyncNotice("");
                }}
                onBlur={() => applyMinOnBlur(aiDuration, setAiDuration, 1)}
                min={1}
              />
              {fieldErrors.aiDuration ? (
                <p className="mt-1 text-xs text-red-500">{fieldErrors.aiDuration}</p>
              ) : hasDurationMinimumMismatch ? (
                <p className="mt-1 text-xs text-red-500">
                  {t("workspace.quiz.validation.minimumTimePerQuestion", {
                    defaultValue: `Mỗi câu cần tối thiểu 30 giây. Với ${aiTotalQuestions} câu, thời gian phải từ ${minimumDurationMinutes} phút.`,
                    count: Number(aiTotalQuestions) || 0,
                    minutes: minimumDurationMinutes,
                    seconds: AI_MINIMUM_SECONDS_PER_QUESTION,
                  })}
                </p>
              ) : null}
              {!fieldErrors.aiDuration && !hasDurationMinimumMismatch && aiDurationSyncNotice && (
                <div className={durationSyncClass}>
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span className="break-words">{aiDurationSyncNotice}</span>
                </div>
              )}
              {!fieldErrors.aiDuration && !hasDurationMinimumMismatch && !aiDurationSyncNotice && hasValidTotalQuestions && (
                <div className={durationHintClass}>
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span className="break-words">
                    {t("workspace.quiz.validation.minimumTimePerQuestionHint", {
                      defaultValue: `Tối thiểu ${minimumDurationMinutes} phút (30 giây/câu).`,
                      minutes: minimumDurationMinutes,
                      seconds: AI_MINIMUM_SECONDS_PER_QUESTION,
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
              <p className={`mt-1 text-[11px] ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                {t("workspace.quiz.aiConfig.examTypeHintTimed")}
              </p>
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
              <p className={`mt-1 text-[11px] ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                {t("workspace.quiz.aiConfig.examTypeHintSequential")}
              </p>
            </button>
          </div>

          {!aiTimerMode && (
            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
              <div>
                <label className={labelCls}>{t("workspace.quiz.aiConfig.easyDuration")} (s)</label>
                <input
                  type="number"
                  className={`${inputCls} ${fieldErrors.aiDurations ? "border-red-400" : ""}`}
                  value={aiEasyDuration}
                  onChange={(e) => {
                    setAiEasyDuration(normalizeIntegerInput(e.target.value));
                    setFieldErrors((prev) => ({ ...prev, aiDurations: "" }));
                  }}
                  onBlur={() => applyMinOnBlur(aiEasyDuration, setAiEasyDuration, 10)}
                  min={1}
                />
              </div>
              <div>
                <label className={labelCls}>{t("workspace.quiz.aiConfig.mediumDuration")} (s)</label>
                <input
                  type="number"
                  className={`${inputCls} ${fieldErrors.aiDurations ? "border-red-400" : ""}`}
                  value={aiMediumDuration}
                  onChange={(e) => {
                    setAiMediumDuration(normalizeIntegerInput(e.target.value));
                    setFieldErrors((prev) => ({ ...prev, aiDurations: "" }));
                  }}
                  onBlur={() => applyMinOnBlur(aiMediumDuration, setAiMediumDuration, 10)}
                  min={1}
                />
              </div>
              <div>
                <label className={labelCls}>{t("workspace.quiz.aiConfig.hardDuration")} (s)</label>
                <input
                  type="number"
                  className={`${inputCls} ${fieldErrors.aiDurations ? "border-red-400" : ""}`}
                  value={aiHardDuration}
                  onChange={(e) => {
                    setAiHardDuration(normalizeIntegerInput(e.target.value));
                    setFieldErrors((prev) => ({ ...prev, aiDurations: "" }));
                  }}
                  onBlur={() => applyMinOnBlur(aiHardDuration, setAiHardDuration, 10)}
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

      <div ref={sectionRefs?.difficulty} className={getSectionClassName(["aiDifficulty"])}>
        <h3 className={`mb-3 flex items-center gap-2 text-sm font-semibold ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>
          <Sliders className="h-4 w-4 text-amber-500" />
          {t("workspace.quiz.aiConfig.difficultyLevel")}
        </h3>
        <select className={selectCls} value={selectedDifficultyId} onChange={onDifficultyChange}>
          {difficultyDefs.map((difficulty) => (
            <option key={difficulty.id} value={difficulty.id}>
              {difficulty.difficultyName} ({difficulty.easyRatio}-{difficulty.mediumRatio}-{difficulty.hardRatio})
            </option>
          ))}
          <option value="CUSTOM">{t("workspace.quiz.difficultyLevels.custom")}</option>
        </select>

        {selectedDifficultyId === "CUSTOM" && (
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
            {["easy", "medium", "hard"].map((level) => (
              <div key={level}>
                <label className={`mb-1 block text-[10px] font-bold uppercase ${isDarkMode ? "text-slate-500" : "text-gray-500"}`}>
                  {level} ({questionUnit ? t("workspace.quiz.aiConfig.countUnit") : "%"})
                </label>
                <input
                  type="number"
                  className={`${inputCls} ${fieldErrors.aiDifficulty ? "border-red-400" : ""}`}
                  value={customDifficulty[level]}
                  onChange={(e) => {
                    const raw = Math.max(0, Number(e.target.value) || 0);
                    const parsed = questionUnit ? Math.round(raw) : raw;
                    setCustomDifficulty((prev) => ({ ...prev, [level]: parsed }));
                  }}
                />
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 flex items-center gap-2">
          <input
            id="difficulty-unit-toggle"
            type="checkbox"
            checked={questionUnit}
            disabled={selectedDifficultyId !== "CUSTOM"}
            onChange={(e) => setQuestionUnit(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="difficulty-unit-toggle" className={`text-xs ${isDarkMode ? "text-slate-400" : "text-gray-600"}`}>
            {t("workspace.quiz.aiConfig.difficultyUnitByCount")}
          </label>
        </div>

        {fieldErrors.aiDifficulty && (
          <p className="mt-2 text-xs text-red-500">{fieldErrors.aiDifficulty}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div ref={sectionRefs?.questionTypes} className={getSectionClassName(["selectedQTypes"])}>
          <h3 className={`mb-3 flex items-center gap-2 text-sm font-semibold ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>
            <Sparkles className="h-4 w-4 text-purple-500" />
            {t("workspace.quiz.aiConfig.questionTypes")}
            {requiredMark}
          </h3>
          <div className="mb-2 flex items-center gap-2">
            <input
              id="qtype-unit-toggle"
              type="checkbox"
              checked={questionTypeUnit}
              onChange={(e) => setQuestionTypeUnit(e.target.checked)}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <label htmlFor="qtype-unit-toggle" className={`text-[11px] ${isDarkMode ? "text-slate-400" : "text-gray-600"}`}>
              {t("workspace.quiz.aiConfig.questionTypeUnitByCount")}
            </label>
          </div>
          <div className="space-y-2">
            {qTypes.map((qt) => {
              const isSelected = selectedQTypes.some((x) => x.questionTypeId === qt.questionTypeId);
              const currentRatio = selectedQTypes.find((x) => x.questionTypeId === qt.questionTypeId)?.ratio || 0;
              const questionTypeRow = (
                <div key={qt.questionTypeId} className={`flex items-center gap-2 text-xs ${isDarkMode ? "text-slate-300" : "text-gray-700"}`}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleQType(qt.questionTypeId)}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="flex-1 truncate" title={qt.description}>{getQuestionTypeLabel(qt.questionType)}</span>
                  {isSelected && (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        className={`w-12 rounded border p-1 text-center ${isDarkMode ? "border-slate-700 bg-slate-800" : "border-gray-200 bg-white"}`}
                        value={currentRatio}
                        onChange={(e) => onQTypeRatioChange(qt.questionTypeId, e.target.value)}
                        placeholder="%"
                      />
                      <span>{questionTypeUnit ? t("workspace.quiz.aiConfig.countUnit") : "%"}</span>
                    </div>
                  )}
                </div>
              );

              if (!isAdvancedQuizQuestionType(qt.questionType) || hasAdvanceQuizConfig) {
                return questionTypeRow;
              }

              return (
                <PlanGatedFeature
                  key={qt.questionTypeId}
                  allowed={false}
                  featureName={t("workspace.quiz.aiConfig.advancedConfig", "Advanced quiz types")}
                  isDarkMode={isDarkMode}
                  className="block w-full"
                >
                  {questionTypeRow}
                </PlanGatedFeature>
              );
            })}
          </div>
          {fieldErrors.selectedQTypes && (
            <p className="mt-3 text-xs text-red-500">{fieldErrors.selectedQTypes}</p>
          )}
        </div>

        <div ref={sectionRefs?.bloomSkills} className={getSectionClassName(["selectedBloomSkills"])}>
          <h3 className={`mb-3 flex items-center gap-2 text-sm font-semibold ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>
            <BrainCircuit className="h-4 w-4 text-teal-500" />
            {t("workspace.quiz.aiConfig.bloomSkills")}
            {requiredMark}
          </h3>
          <div className="mb-2 flex items-center gap-2">
            <input
              id="bloom-unit-toggle"
              type="checkbox"
              checked={bloomUnit}
              onChange={(e) => setBloomUnit(e.target.checked)}
              className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <label htmlFor="bloom-unit-toggle" className={`text-[11px] ${isDarkMode ? "text-slate-400" : "text-gray-600"}`}>
              {t("workspace.quiz.aiConfig.bloomUnitByCount")}
            </label>
          </div>
          <div className="space-y-2">
            {bloomSkills.map((skill) => {
              const isSelected = selectedBloomSkills.some((x) => x.bloomId === skill.bloomId);
              const currentRatio = selectedBloomSkills.find((x) => x.bloomId === skill.bloomId)?.ratio || 0;

              return (
                <div key={skill.bloomId} className={`flex items-center gap-2 text-xs ${isDarkMode ? "text-slate-300" : "text-gray-700"}`}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleBloom(skill.bloomId)}
                    className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="flex-1 truncate" title={skill.description}>{skill.bloomName}</span>
                  {isSelected && (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        className={`w-12 rounded border p-1 text-center ${isDarkMode ? "border-slate-700 bg-slate-800" : "border-gray-200 bg-white"}`}
                        value={currentRatio}
                        onChange={(e) => onBloomRatioChange(skill.bloomId, e.target.value)}
                        placeholder="%"
                      />
                      <span>{bloomUnit ? t("workspace.quiz.aiConfig.countUnit") : "%"}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {fieldErrors.selectedBloomSkills && (
            <p className="mt-3 text-xs text-red-500">{fieldErrors.selectedBloomSkills}</p>
          )}
        </div>
      </div>

      <PlanGatedFeature
        allowed={hasAdvanceQuizConfig}
        featureName={t("workspace.quiz.planGate.structureTitleFallback", "Cấu trúc quiz cần gói nâng cao")}
        isDarkMode={isDarkMode}
        className="block w-full"
        toastTitle={t("workspace.quiz.planGate.title", "Cần nâng cấp gói")}
        toastDescription={t(
          "workspace.quiz.planGate.structureDescriptionFallback",
          "Cấu trúc quiz cần gói hỗ trợ cấu hình quiz nâng cao để sử dụng.",
        )}
        toastMeta={t(
          "workspace.quiz.planGate.structureMeta",
          "Bạn vẫn có thể tạo quiz bằng các tỷ lệ độ khó, loại câu hỏi và Bloom hiện có trong gói hiện tại.",
        )}
        upgradeLabel={t("workspace.quiz.planGate.upgradeAction", "Nâng cấp")}
        badgeLabel={t("workspace.quiz.planGate.vipBadge", "VIP")}
      >
      <div className={`overflow-hidden rounded-2xl border transition-all ${isDarkMode ? "border-cyan-900/40 bg-slate-900/60 shadow-2xl shadow-blue-950/20" : "border-cyan-100 bg-white shadow-2xl shadow-slate-900/5"}`}>
        <div className={`border-b px-4 py-3 ${isDarkMode ? "border-cyan-900/30 bg-gradient-to-r from-cyan-950/20 to-transparent" : "border-cyan-100 bg-gradient-to-r from-cyan-50/80 to-transparent"}`}>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`inline-flex h-8 w-8 items-center justify-center rounded-xl ${isDarkMode ? "bg-cyan-500/15 text-cyan-300" : "bg-cyan-100 text-cyan-600"}`}>
                  <ListTree className="h-4 w-4" />
                </span>
                <div>
                  <h3 className={`text-sm font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
                    {t("workspace.quiz.aiConfig.structureLabel", "Quiz structure")}
                  </h3>
                  <p className={`text-[11px] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                    {t("workspace.quiz.aiConfig.structurePreviewHint", "Click Detailed configuration to preview how AI will distribute the quiz.")}
                  </p>
                </div>
              </div>
            </div>

            {!(Array.isArray(structurePreview?.items) && structurePreview.items.length > 0) && (
              <button
                type="button"
                onClick={onPreviewStructure}
                disabled={structurePreviewLoading}
                className={`inline-flex min-w-[180px] items-center justify-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold transition-all active:scale-95 ${
                  isDarkMode
                    ? "border-cyan-500/30 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                    : "border-cyan-200 bg-white text-cyan-700 shadow-sm hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-70"
                }`}
              >
                {structurePreviewLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                {structurePreviewLoading
                  ? t("workspace.quiz.aiConfig.structurePreviewLoading", "Generating structure...")
                  : t("workspace.quiz.aiConfig.structurePreviewAction", "Detailed configuration")}
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3 p-4">
          {structurePreviewError && (
            <div className={`rounded-xl border px-3 py-2 text-xs ${isDarkMode ? "border-red-900/40 bg-red-950/25 text-red-300" : "border-red-200 bg-red-50 text-red-700"}`}>
              {structurePreviewError}
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <div className={`rounded-xl border px-4 py-3 ${isDarkMode ? "border-cyan-900/40 bg-cyan-950/15" : "border-cyan-100 bg-cyan-50/70"}`}>
              <p className={`text-[11px] uppercase tracking-[0.22em] ${isDarkMode ? "text-cyan-300/80" : "text-cyan-700/70"}`}>
                {t("workspace.quiz.aiConfig.totalQuestions")}
              </p>
              <p className={`mt-1 text-2xl font-semibold leading-none ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                {Number(structurePreview?.totalQuestion) || 0}
              </p>
            </div>
            <div className={`rounded-xl border px-4 py-3 ${isDarkMode ? "border-slate-800 bg-slate-900/40" : "border-slate-200 bg-white"}`}>
              <p className={`text-[11px] uppercase tracking-[0.22em] ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                {t("workspace.quiz.aiConfig.structureLabel", "Quiz structure")}
              </p>
              <p className={`mt-1 text-2xl font-semibold leading-none ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
                {Array.isArray(structurePreview?.items) ? structurePreview.items.length : 0}
              </p>
            </div>
          </div>

          {Array.isArray(structurePreview?.items) && structurePreview.items.length > 0 ? (
            <div className="space-y-2">
              {structurePreview.items.map((item, index) => (
                <div
                  key={`${item.difficulty || "NA"}-${item.questionType || "NA"}-${item.bloomSkill || "NA"}-${index}`}
                  className={`group relative overflow-hidden rounded-2xl border px-4 py-4 transition-all duration-200 hover:-translate-y-0.5 ${
                    isDarkMode
                      ? "border-slate-800 bg-slate-900/60 hover:border-cyan-700/40"
                      : "border-slate-200 bg-white hover:border-cyan-200 hover:shadow-lg hover:shadow-slate-900/5"
                  }`}
                >
                  <div className={`absolute inset-y-0 left-0 w-1 ${isDarkMode ? "bg-cyan-400/80" : "bg-cyan-500"}`} />
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-[11px] font-bold ${isDarkMode ? "border-slate-800 bg-slate-950 text-cyan-200" : "border-slate-200 bg-slate-50 text-cyan-700"}`}>
                        <span className="flex flex-col items-center leading-none">
                          <span>#{index + 1}</span>
                          <span className="mt-0.5 text-[10px] font-medium opacity-80">{item.quantity || 0} câu</span>
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${item.difficulty === "HARD" ? "bg-rose-500" : item.difficulty === "MEDIUM" ? "bg-amber-500" : "bg-emerald-500"}`} />
                          <p className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                            {item.quantity || 0} {t("workspace.quiz.aiConfig.countUnit")}
                          </p>
                        </div>
                        <p className={`mt-0.5 text-[11px] ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                          {t("workspace.quiz.aiConfig.structureLabel", "Quiz structure")} #{index + 1}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs md:justify-end">
                      <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${isDarkMode ? "border-slate-800 bg-slate-950/60 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
                        <span className={`h-2 w-2 rounded-full ${item.difficulty === "HARD" ? "bg-rose-500" : item.difficulty === "MEDIUM" ? "bg-amber-500" : "bg-emerald-500"}`} />
                        {t("workspace.quiz.aiConfig.structureDifficulty", "Difficulty")} <strong>{getDifficultyLabel(item.difficulty)}</strong>
                      </span>
                      <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${isDarkMode ? "border-slate-800 bg-slate-950/60 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
                        {t("workspace.quiz.aiConfig.structureQuestionType", "Question type")} <strong>{getQuestionTypeLabel(item.questionType)}</strong>
                      </span>
                      <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${isDarkMode ? "border-slate-800 bg-slate-950/60 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
                        {t("workspace.quiz.aiConfig.structureBloom", "Bloom")} <strong>{getBloomLabel(item.bloomSkill)}</strong>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={`rounded-2xl border px-4 py-8 text-sm ${isDarkMode ? "border-slate-700 bg-slate-800/40 text-slate-400" : "border-slate-200 bg-white text-slate-600"}`}>
              <div className="flex flex-col items-center justify-center gap-3 text-center">
                <p>{t("workspace.quiz.aiConfig.structurePreviewHint", "Click Detailed configuration to preview how AI will distribute the quiz.")}</p>
                <button
                  type="button"
                  onClick={onPreviewStructure}
                  disabled={structurePreviewLoading}
                  className={`inline-flex min-w-[190px] items-center justify-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold transition-all active:scale-95 ${
                    isDarkMode
                      ? "border-cyan-500/30 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                      : "border-cyan-200 bg-white text-cyan-700 shadow-sm hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-70"
                  }`}
                >
                  {structurePreviewLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                  {t("workspace.quiz.aiConfig.structureFetchAction", "Fetch detailed configuration")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      </PlanGatedFeature>
    </div>
  );
}

export default AIQuizTab;
