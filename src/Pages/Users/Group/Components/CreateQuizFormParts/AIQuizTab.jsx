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
}) {
  return (
    <div className="space-y-5 pb-4">
      <div className={`p-4 rounded-xl border ${isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-gray-100 shadow-sm"}`}>
        <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>
          <FileText className="w-4 h-4 text-blue-500" /> {t("General Info")}
        </h3>
        <div className="space-y-3">
          <div>
            <label className={labelCls}>{t("workspace.quiz.name")}</label>
            <input className={inputCls} placeholder={t("workspace.quiz.namePlaceholder")} value={aiName} onChange={(e) => setAiName(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>{t("Prompt (Optional)")}</label>
            <textarea className={`${inputCls} min-h-[60px] resize-none`} placeholder={t("workspace.quiz.aiConfig.promptPlaceholder")} value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} />
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
          <CheckSquare className="w-4 h-4 text-green-500" /> {t("Select Materials")}
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
      </div>

      <div className={`p-4 rounded-xl border ${isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-gray-100 shadow-sm"}`}>
        <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>
          <Sliders className="w-4 h-4 text-gray-500" /> {t("Settings")}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>{t("Total Questions")}</label>
            <input type="number" className={inputCls} value={aiTotalQuestions} onChange={(e) => setAiTotalQuestions(Number(e.target.value))} min={1} />
          </div>
          <div>
            <label className={labelCls}>{t("workspace.quiz.aiConfig.timeMinutes")}</label>
            <input type="number" className={inputCls} value={aiDuration} onChange={(e) => setAiDuration(Number(e.target.value))} min={1} />
          </div>
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
            <p className={`text-[11px] mt-2 ${isDarkMode ? "text-amber-400" : "text-amber-700"}`}>
              {t("workspace.quiz.aiConfig.perQuestionDurationHint")}
            </p>
          )}
        </div>
      </div>

      <div className={`p-4 rounded-xl border ${isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-gray-100 shadow-sm"}`}>
        <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>
          <Sliders className="w-4 h-4 text-amber-500" /> {t("Difficulty Level")}
        </h3>
        <select className={selectCls} value={selectedDifficultyId} onChange={onDifficultyChange}>
          {difficultyDefs.map((d) => (
            <option key={d.id} value={d.id}>{d.difficultyName} ({d.easyRatio}-{d.mediumRatio}-{d.hardRatio})</option>
          ))}
          <option value="CUSTOM">{t("Custom (Self-config)")}</option>
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
            <Sparkles className="w-4 h-4 text-purple-500" /> {t("Question Types")}
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
            <BrainCircuit className="w-4 h-4 text-teal-500" /> {t("Bloom Skills")}
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
