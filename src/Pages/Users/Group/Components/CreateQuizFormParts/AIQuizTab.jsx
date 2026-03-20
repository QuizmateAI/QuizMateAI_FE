import React from "react";
import { Loader2, FileText, CheckSquare, Sliders, Sparkles, BrainCircuit } from "lucide-react";
import { AI_OUTPUT_LANGUAGES } from "./aiConfigUtils";

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
  aiTimerMode,
  setAiTimerMode,
  aiDuration,
  setAiDuration,
  aiEasyDuration,
  setAiEasyDuration,
  aiMediumDuration,
  setAiMediumDuration,
  aiHardDuration,
  setAiHardDuration,
  fieldErrors,
  setFieldErrors,
}) {
  const requiredMark = <span className="text-red-500 ml-1">*</span>;

  const normalizeIntegerInput = (value) => {
    if (value === "") return "";
    const digits = String(value).replace(/\D/g, "");
    if (!digits) return "";
    const normalized = digits.replace(/^0+(?=\d)/, "");
    return Number(normalized || 0);
  };

  const applyMinOnBlur = (value, setter, minValue = 1) => {
    const next = Number(value);
    setter(Number.isFinite(next) && next >= minValue ? next : minValue);
  };

  return (
    <div className="space-y-5 pb-4">
      <div className={`text-xs px-3 py-2 rounded-lg ${isDarkMode ? "bg-amber-950/30 text-amber-300 border border-amber-900/40" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
        {t("workspace.quiz.validation.requiredFieldsHint")}
      </div>

      <div className={`p-4 rounded-xl border ${isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-gray-100 shadow-sm"}`}>
        <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>
          <FileText className="w-4 h-4 text-blue-500" /> {t("General Info")}
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
                setFieldErrors(prev => ({ ...prev, aiName: "" }));
              }} 
            />
            {fieldErrors.aiName && (
              <p className="text-xs text-red-500 mt-1">{fieldErrors.aiName}</p>
            )}
          </div>
          <div>
            <label className={labelCls}>{t("workspace.quiz.aiConfig.customPromptLabel", "Vui lòng nhập yêu cầu của bạn")}</label>
            <textarea 
              className={`${inputCls} min-h-[60px] resize-none`}
              placeholder={t("workspace.quiz.aiConfig.promptPlaceholder")} 
              value={aiPrompt} 
              onChange={(e) => {
                setAiPrompt(e.target.value);
              }} 
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t("workspace.quiz.intent")}</label>
              <select className={selectCls} value={aiQuizIntent} onChange={(e) => setAiQuizIntent(e.target.value)}>
                {quizIntents.map((intent) => (
                  <option key={intent} value={intent}>{t(`workspace.quiz.intentLabels.${intent}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Output Language</label>
              <select className={selectCls} value={aiOutputLanguage} onChange={(e) => setAiOutputLanguage(e.target.value)}>
                {AI_OUTPUT_LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className={`p-4 rounded-xl border ${isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-gray-100 shadow-sm"}`}>
        <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>
          <CheckSquare className="w-4 h-4 text-green-500" /> {t("Select Materials")} {requiredMark}
        </h3>
        {loadingMetadata ? (
          <div className="flex items-center gap-2 text-xs text-slate-500"><Loader2 className="w-3 h-3 animate-spin" /> {t("Loading materials...")}</div>
        ) : materials.length > 0 ? (
          <div className="max-h-40 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {materials.map((mat) => (
              <label key={mat.id || mat.materialId} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${selectedMaterialIds.includes(mat.id || mat.materialId)
                ? (isDarkMode ? "bg-blue-900/20 border-blue-500/50" : "bg-blue-50 border-blue-200")
                : (isDarkMode ? "border-slate-800 hover:bg-slate-800" : "border-gray-200 hover:bg-gray-50")}`}>
                <input type="checkbox" checked={selectedMaterialIds.includes(mat.id || mat.materialId)} onChange={() => onToggleMaterial(mat.id || mat.materialId)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4" />
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium truncate ${isDarkMode ? "text-slate-300" : "text-gray-700"}`}>{mat.fileName || mat.title || "Untitled"}</p>
                  <p className="text-[10px] text-slate-500 truncate">{mat.description || t("No description")}</p>
                </div>
              </label>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic">{t("No materials found in this workspace.")}</p>
        )}
        {fieldErrors.selectedMaterialIds && (
          <p className="text-xs text-red-500 mt-2">{fieldErrors.selectedMaterialIds}</p>
        )}
      </div>

      <div className={`p-4 rounded-xl border ${isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-gray-100 shadow-sm"}`}>
        <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>
          <Sliders className="w-4 h-4 text-gray-500" /> {t("Settings")}
        </h3>
        <div className={`grid ${aiTimerMode ? "grid-cols-2" : "grid-cols-1"} gap-3`}>
          <div>
            <label className={labelCls}>{t("Total Questions")}{requiredMark}</label>
            <input
              type="number"
              className={`${inputCls} ${fieldErrors.aiTotalQuestions ? "border-red-400" : ""}`}
              value={aiTotalQuestions}
              onChange={(e) => {
                setAiTotalQuestions(normalizeIntegerInput(e.target.value));
                setFieldErrors(prev => ({ ...prev, aiTotalQuestions: "" }));
              }}
              onBlur={() => applyMinOnBlur(aiTotalQuestions, setAiTotalQuestions, 1)}
              min={1}
            />
                        {fieldErrors.aiTotalQuestions && (
                          <p className="text-xs text-red-500 mt-1">{fieldErrors.aiTotalQuestions}</p>
                        )}
          </div>
          {aiTimerMode && (
            <div>
              <label className={labelCls}>{t("workspace.quiz.aiConfig.timeMinutes")}{requiredMark}</label>
              <input
                type="number"
                className={`${inputCls} ${fieldErrors.aiDuration ? "border-red-400" : ""}`}
                value={aiDuration}
                onChange={(e) => {
                  setAiDuration(normalizeIntegerInput(e.target.value));
                  setFieldErrors(prev => ({ ...prev, aiDuration: "" }));
                }}
                onBlur={() => applyMinOnBlur(aiDuration, setAiDuration, 1)}
                min={1}
              />
                            {fieldErrors.aiDuration && (
                              <p className="text-xs text-red-500 mt-1">{fieldErrors.aiDuration}</p>
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
              className={`text-left rounded-lg border px-3 py-2 transition-all ${aiTimerMode
                ? (isDarkMode ? "border-blue-500 bg-blue-950/30 text-blue-300" : "border-blue-400 bg-blue-50 text-blue-700")
                : (isDarkMode ? "border-slate-700 bg-slate-800/40 text-slate-300 hover:border-slate-500" : "border-gray-200 bg-white text-gray-700 hover:border-gray-300")
              }`}
            >
              <p className="text-xs font-medium">{t("workspace.quiz.aiConfig.examTypeTimed")}</p>
              <p className={`text-[11px] mt-1 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>{t("workspace.quiz.aiConfig.examTypeHintTimed")}</p>
            </button>
            <button
              type="button"
              onClick={() => setAiTimerMode(false)}
              className={`text-left rounded-lg border px-3 py-2 transition-all ${!aiTimerMode
                ? (isDarkMode ? "border-emerald-500 bg-emerald-950/25 text-emerald-300" : "border-emerald-400 bg-emerald-50 text-emerald-700")
                : (isDarkMode ? "border-slate-700 bg-slate-800/40 text-slate-300 hover:border-slate-500" : "border-gray-200 bg-white text-gray-700 hover:border-gray-300")
              }`}
            >
              <p className="text-xs font-medium">{t("workspace.quiz.aiConfig.examTypeSequential")}</p>
              <p className={`text-[11px] mt-1 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>{t("workspace.quiz.aiConfig.examTypeHintSequential")}</p>
            </button>
          </div>
          {!aiTimerMode && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div>
                <label className={labelCls}>{t("workspace.quiz.aiConfig.easyDuration")} (s)</label>
                <input
                  type="number"
                  className={`${inputCls} ${fieldErrors.aiDurations ? "border-red-400" : ""}`}
                  value={aiEasyDuration}
                  onChange={(e) => {
                    setAiEasyDuration(normalizeIntegerInput(e.target.value));
                    setFieldErrors(prev => ({ ...prev, aiDurations: "" }));
                  }}
                  onBlur={() => {
                    if (!aiEasyDuration || Number(aiEasyDuration) <= 0) {
                      setAiEasyDuration(10);
                    }
                  }}
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
                    setFieldErrors(prev => ({ ...prev, aiDurations: "" }));
                  }}
                  onBlur={() => {
                    if (!aiMediumDuration || Number(aiMediumDuration) <= 0) {
                      setAiMediumDuration(20);
                    }
                  }}
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
                    setFieldErrors(prev => ({ ...prev, aiDurations: "" }));
                  }}
                  onBlur={() => {
                    if (!aiHardDuration || Number(aiHardDuration) <= 0) {
                      setAiHardDuration(30);
                    }
                  }}
                  min={1}
                />
                            {fieldErrors.aiDurations && (
                              <p className="text-xs text-red-500 mt-2">{fieldErrors.aiDurations}</p>
                            )}
              </div>
            </div>
          )}
        </div>
        <div className="mt-3">
          <label className={labelCls}>{t("workspace.quiz.aiConfig.examType")}</label>
          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => setAiTimerMode(true)}
              className={`text-left rounded-lg border px-3 py-2 transition-all ${aiTimerMode
                ? (isDarkMode ? "border-blue-500 bg-blue-950/30 text-blue-300" : "border-blue-400 bg-blue-50 text-blue-700")
                : (isDarkMode ? "border-slate-700 bg-slate-800/40 text-slate-300 hover:border-slate-500" : "border-gray-200 bg-white text-gray-700 hover:border-gray-300")
              }`}
            >
              <p className="text-xs font-medium">{t("workspace.quiz.aiConfig.examTypeTimed")}</p>
              <p className={`text-[11px] mt-1 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>{t("workspace.quiz.aiConfig.examTypeHintTimed")}</p>
            </button>
            <button
              type="button"
              onClick={() => setAiTimerMode(false)}
              className={`text-left rounded-lg border px-3 py-2 transition-all ${!aiTimerMode
                ? (isDarkMode ? "border-emerald-500 bg-emerald-950/25 text-emerald-300" : "border-emerald-400 bg-emerald-50 text-emerald-700")
                : (isDarkMode ? "border-slate-700 bg-slate-800/40 text-slate-300 hover:border-slate-500" : "border-gray-200 bg-white text-gray-700 hover:border-gray-300")
              }`}
            >
              <p className="text-xs font-medium">{t("workspace.quiz.aiConfig.examTypeSequential")}</p>
              <p className={`text-[11px] mt-1 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>{t("workspace.quiz.aiConfig.examTypeHintSequential")}</p>
            </button>
          </div>
        </div>
      </div>

      <div className={`p-4 rounded-xl border ${isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-gray-100 shadow-sm"}`}>
        <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>
          <Sliders className="w-4 h-4 text-amber-500" /> {t("Difficulty Level")} {requiredMark}
        </h3>
        <select className={selectCls} value={selectedDifficultyId} onChange={onDifficultyChange}>
          {difficultyDefs.map((d) => (
            <option key={d.id} value={d.id}>{d.difficultyName} ({d.easyRatio}-{d.mediumRatio}-{d.hardRatio})</option>
          ))}
          <option value="CUSTOM">{t("workspace.quiz.difficultyLevels.custom")}</option>
        </select>

        {selectedDifficultyId === "CUSTOM" && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {["easy", "medium", "hard"].map((level) => (
              <div key={level}>
                <label className={`text-[10px] uppercase font-bold mb-1 block ${isDarkMode ? "text-slate-500" : "text-gray-500"}`}>
                  {level} ({questionUnit ? t("workspace.quiz.aiConfig.countUnit") : "%"})
                </label>
                <input
                  type="number"
                  className={inputCls}
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`p-4 rounded-xl border ${isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-gray-100 shadow-sm"}`}>
          <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>
            <Sparkles className="w-4 h-4 text-purple-500" /> {t("Question Types")} {requiredMark}
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
              return (
                <div key={qt.questionTypeId} className={`flex items-center gap-2 text-xs ${isDarkMode ? "text-slate-300" : "text-gray-700"}`}>
                  <input type="checkbox" checked={isSelected} onChange={() => onToggleQType(qt.questionTypeId)} className="rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                  <span className="flex-1 truncate" title={qt.description}>{qt.questionType}</span>
                  {isSelected && (
                    <div className="flex items-center gap-1">
                      <input type="number" className={`w-12 p-1 text-center border rounded ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`} value={currentRatio} onChange={(e) => onQTypeRatioChange(qt.questionTypeId, e.target.value)} placeholder="%" />
                      <span>{questionTypeUnit ? t("workspace.quiz.aiConfig.countUnit") : "%"}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className={`p-4 rounded-xl border ${isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-gray-100 shadow-sm"}`}>
          <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>
            <BrainCircuit className="w-4 h-4 text-teal-500" /> {t("Bloom Skills")} {requiredMark}
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
            {bloomSkills.map((bs) => {
              const isSelected = selectedBloomSkills.some((x) => x.bloomId === bs.bloomId);
              const currentRatio = selectedBloomSkills.find((x) => x.bloomId === bs.bloomId)?.ratio || 0;
              return (
                <div key={bs.bloomId} className={`flex items-center gap-2 text-xs ${isDarkMode ? "text-slate-300" : "text-gray-700"}`}>
                  <input type="checkbox" checked={isSelected} onChange={() => onToggleBloom(bs.bloomId)} className="rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
                  <span className="flex-1 truncate" title={bs.description}>{bs.bloomName}</span>
                  {isSelected && (
                    <div className="flex items-center gap-1">
                      <input type="number" className={`w-12 p-1 text-center border rounded ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`} value={currentRatio} onChange={(e) => onBloomRatioChange(bs.bloomId, e.target.value)} placeholder="%" />
                      <span>{bloomUnit ? t("workspace.quiz.aiConfig.countUnit") : "%"}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}

export default AIQuizTab;
