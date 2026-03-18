import React from "react";
import { Button } from "@/Components/ui/button";
import { Plus, Trash2, AlertCircle, Lock, Unlock, RotateCcw, ArrowUp, Sparkles, MapPin, RefreshCw } from "lucide-react";

function ManualQuizTab({
  t,
  isDarkMode,
  fontClass,
  labelCls,
  inputCls,
  selectCls,
  name,
  setName,
  attachToRoadmap,
  setAttachToRoadmap,
  selectedRoadmapId,
  handleRoadmapSelect,
  contextLoading,
  roadmaps,
  roadmapsLoaded,
  reloadRoadmaps,
  phases,
  phasesLoaded,
  selectedPhaseId,
  handlePhaseSelect,
  reloadPhases,
  knowledges,
  knowledgesLoaded,
  selectedContextId,
  handleKnowledgeSelect,
  reloadKnowledges,
  EmptyState,
  quizIntent,
  setQuizIntent,
  QUIZ_INTENTS,
  overallDifficulty,
  setOverallDifficulty,
  DIFFICULTY_LEVELS,
  timerMode,
  setTimerMode,
  duration,
  setDuration,
  passingScore,
  setPassingScore,
  maxAttempt,
  setMaxAttempt,
  error,
  totalQuestions,
  handleTotalQuestionsChange,
  maxScore,
  handleMaxScoreChange,
  selectedStrategy,
  handleStrategyChange,
  SCORING_STRATEGIES,
  questions,
  totalScoreDisplay,
  resetAllScores,
  scrollToQuestion,
  questionValidationErrors,
  handlePointChange,
  unlockedCount,
  handleToggleLock,
  removeQuestion,
  updateQuestion,
  QUESTION_TYPES,
  BLOOM_LEVELS,
  addAnswer,
  addQuestion,
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
    <div className="space-y-4">
      <div className={`text-xs px-3 py-2 rounded-lg ${isDarkMode ? "bg-amber-950/30 text-amber-300 border border-amber-900/40" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
        {t("workspace.quiz.validation.requiredFieldsHint")}
      </div>

      <div>
        <label className={labelCls}>{t("workspace.quiz.name")}{requiredMark}</label>
        <input className={inputCls} placeholder={t("workspace.quiz.namePlaceholder")} value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className={`rounded-lg border p-3 space-y-3 ${isDarkMode ? "border-slate-700 bg-slate-900/50" : "border-gray-200 bg-gray-50"}`}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className={`text-sm font-medium ${isDarkMode ? "text-slate-100" : "text-gray-800"} ${fontClass}`}>
              {t("workspace.quiz.contextSelector.attachPrompt")}
            </p>
            <p className={`text-xs mt-1 ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
              {attachToRoadmap
                ? t("workspace.quiz.contextSelector.attachHintYes")
                : t("workspace.quiz.contextSelector.attachHintNo")}
            </p>
          </div>
          <div className={`inline-flex rounded-lg p-1 ${isDarkMode ? "bg-slate-800" : "bg-white border border-gray-200"}`}>
            <button
              type="button"
              onClick={() => setAttachToRoadmap(true)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                attachToRoadmap
                  ? isDarkMode ? "bg-blue-600 text-white" : "bg-blue-600 text-white"
                  : isDarkMode ? "text-slate-300 hover:bg-slate-700" : "text-gray-600 hover:bg-gray-100"
              } ${fontClass}`}
            >
              {t("workspace.quiz.contextSelector.attachYes")}
            </button>
            <button
              type="button"
              onClick={() => setAttachToRoadmap(false)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                !attachToRoadmap
                  ? isDarkMode ? "bg-blue-600 text-white" : "bg-blue-600 text-white"
                  : isDarkMode ? "text-slate-300 hover:bg-slate-700" : "text-gray-600 hover:bg-gray-100"
              } ${fontClass}`}
            >
              {t("workspace.quiz.contextSelector.attachNo")}
            </button>
          </div>
        </div>
      </div>

      {attachToRoadmap && (
      <div className={`rounded-lg border p-3 space-y-3 ${isDarkMode ? "border-slate-700 bg-slate-800/30" : "border-blue-200 bg-blue-50/30"}`}>
        <div className="flex items-center gap-2 mb-1">
          <MapPin className={`w-4 h-4 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`} />
          <span className={`text-xs font-semibold ${isDarkMode ? "text-blue-300" : "text-blue-700"} ${fontClass}`}>
            {t("workspace.quiz.contextSelector.title")}
          </span>
          <span className={`ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full ${isDarkMode ? "bg-amber-950/40 text-amber-400" : "bg-amber-100 text-amber-700"}`}>
            {t("workspace.quiz.contextSelector.types.KNOWLEDGE")}
          </span>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className={`text-xs font-medium ${isDarkMode ? "text-slate-400" : "text-gray-600"} ${fontClass}`}>{t("workspace.quiz.contextSelector.selectRoadmap")}</span>
            <button type="button" onClick={reloadRoadmaps} className={`p-1 rounded transition-all active:scale-95 ${isDarkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-200 text-gray-500"}`} title={t("workspace.quiz.contextSelector.reload")}>
              <RefreshCw className={`w-3 h-3 ${contextLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
          <select className={selectCls} value={selectedRoadmapId} onChange={(e) => handleRoadmapSelect(e.target.value)} disabled={contextLoading}>
            <option value="">{contextLoading ? t("workspace.quiz.contextSelector.loading") : t("workspace.quiz.contextSelector.placeholder")}</option>
            {roadmaps.map((rm) => (
              <option key={rm.roadmapId || rm.id} value={rm.roadmapId || rm.id}>
                {rm.title || rm.name || `Roadmap #${rm.roadmapId || rm.id}`}
              </option>
            ))}
          </select>
          {!contextLoading && roadmapsLoaded && roadmaps.length === 0 && (
            <EmptyState messageKey="workspace.quiz.quickCreate.emptyRoadmap" createType="roadmap" />
          )}
        </div>

        {selectedRoadmapId && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs font-medium ${isDarkMode ? "text-slate-400" : "text-gray-600"} ${fontClass}`}>{t("workspace.quiz.contextSelector.selectPhase")}</span>
              <button type="button" onClick={reloadPhases} className={`p-1 rounded transition-all active:scale-95 ${isDarkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-200 text-gray-500"}`} title={t("workspace.quiz.contextSelector.reload")}>
                <RefreshCw className={`w-3 h-3 ${contextLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
            <select className={selectCls} value={selectedPhaseId} onChange={(e) => handlePhaseSelect(e.target.value)} disabled={contextLoading}>
              <option value="">{contextLoading ? t("workspace.quiz.contextSelector.loading") : t("workspace.quiz.contextSelector.placeholder")}</option>
              {phases.map((ph) => (
                <option key={ph.phaseId || ph.id} value={ph.phaseId || ph.id}>
                  {ph.title || ph.name || `Phase #${ph.phaseId || ph.id}`}
                </option>
              ))}
            </select>
            {!contextLoading && phasesLoaded && phases.length === 0 && (
              <EmptyState messageKey="workspace.quiz.quickCreate.emptyPhase" createType="phase" />
            )}
          </div>
        )}

        {selectedPhaseId && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs font-medium ${isDarkMode ? "text-slate-400" : "text-gray-600"} ${fontClass}`}>{t("workspace.quiz.contextSelector.selectKnowledge")}</span>
              <button type="button" onClick={reloadKnowledges} className={`p-1 rounded transition-all active:scale-95 ${isDarkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-200 text-gray-500"}`} title={t("workspace.quiz.contextSelector.reload")}>
                <RefreshCw className={`w-3 h-3 ${contextLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
            <select className={selectCls} value={selectedContextId} onChange={(e) => handleKnowledgeSelect(e.target.value)} disabled={contextLoading}>
              <option value="">{contextLoading ? t("workspace.quiz.contextSelector.loading") : t("workspace.quiz.contextSelector.placeholder")}</option>
              {knowledges.map((kn) => (
                <option key={kn.knowledgeId || kn.id} value={kn.knowledgeId || kn.id}>
                  {kn.title || kn.name || `Knowledge #${kn.knowledgeId || kn.id}`}
                </option>
              ))}
            </select>
            {!contextLoading && knowledgesLoaded && knowledges.length === 0 && (
              <EmptyState messageKey="workspace.quiz.quickCreate.emptyKnowledge" createType="knowledge" />
            )}
          </div>
        )}
      </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>{t("workspace.quiz.intent")}{requiredMark}</label>
          <select className={selectCls} value={quizIntent} onChange={(e) => setQuizIntent(e.target.value)}>
            {QUIZ_INTENTS.map((intent) => <option key={intent} value={intent}>{t(`workspace.quiz.intentLabels.${intent}`)}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>{t("workspace.quiz.overallDifficulty")}{requiredMark}</label>
          <select className={selectCls} value={overallDifficulty} onChange={(e) => setOverallDifficulty(e.target.value)}>
            {DIFFICULTY_LEVELS.map((d) => <option key={d} value={d}>{t(`workspace.quiz.difficultyLevels.${d}`)}</option>)}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <label className={`flex items-center gap-2 cursor-pointer ${fontClass}`}>
          <input type="checkbox" checked={timerMode} onChange={(e) => setTimerMode(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
          <span className={`text-xs ${isDarkMode ? "text-slate-300" : "text-gray-600"}`}>{t("workspace.quiz.timerMode")}</span>
        </label>
        <span className={`text-[10px] ${isDarkMode ? "text-slate-500" : "text-gray-400"} ${fontClass}`}>
          {timerMode ? t("workspace.quiz.timerModeHintOn") : t("workspace.quiz.timerModeHintOff")}
        </span>
      </div>

      <div className={`grid ${timerMode ? "grid-cols-3" : "grid-cols-2"} gap-3`}>
        {timerMode && (
          <div>
            <label className={labelCls}>{t("workspace.quiz.timeDuration")}{requiredMark}</label>
            <input
              type="number"
              className={inputCls}
              value={duration}
              onChange={(e) => setDuration(normalizeIntegerInput(e.target.value))}
              onBlur={() => applyMinOnBlur(duration, setDuration, 1)}
              min={1}
            />
          </div>
        )}
        <div>
          <label className={labelCls}>{t("workspace.quiz.passingScore")}</label>
          <input type="number" className={inputCls} value={passingScore} onChange={(e) => setPassingScore(Number(e.target.value))} min={0} max={10} step={0.5} />
        </div>
        <div>
          <label className={labelCls}>{t("workspace.quiz.maxAttempt")}{requiredMark}</label>
          <input
            type="number"
            className={inputCls}
            value={maxAttempt}
            onChange={(e) => setMaxAttempt(normalizeIntegerInput(e.target.value))}
            onBlur={() => applyMinOnBlur(maxAttempt, setMaxAttempt, 1)}
            min={1}
          />
        </div>
      </div>

      {error && (
        <div className={`text-xs px-3 py-2 rounded-lg ${isDarkMode ? "bg-red-950/30 text-red-400" : "bg-red-50 text-red-600"}`}>
          {error}
        </div>
      )}

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>{t("workspace.quiz.totalQuestions")}{requiredMark}</label>
            <input
              type="number"
              className={inputCls}
              value={totalQuestions}
              onChange={(e) => handleTotalQuestionsChange(normalizeIntegerInput(e.target.value))}
              min={0}
              placeholder="0"
            />
          </div>
          <div>
            <label className={labelCls}>{t("workspace.quiz.maxScore")}</label>
            <input type="number" className={inputCls} value={maxScore} onChange={(e) => handleMaxScoreChange(e.target.value)} min={0} step={0.5} />
          </div>
        </div>

        <div className={`p-3 rounded-xl border transition-all ${isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-blue-50/50 border-blue-100"}`}>
          <label className={labelCls}>{t("workspace.quiz.scoringStrategy")}</label>
          <select className={selectCls} value={selectedStrategy} onChange={(e) => handleStrategyChange(e.target.value)}>
            {Object.keys(SCORING_STRATEGIES).map((key) => {
              const s = SCORING_STRATEGIES[key];
              return <option key={key} value={key}>{t(`workspace.quiz.strategyName.${key}`)} ({s.easy}-{s.medium}-{s.hard})</option>;
            })}
          </select>
          <p className={`mt-2 text-xs leading-relaxed text-left ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
            <Sparkles className="w-3 h-3 inline mr-1 text-amber-500" />
            {t(`workspace.quiz.strategyDesc.${selectedStrategy}`)}
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            {["easy", "medium", "hard"].map((d) => {
              const s = SCORING_STRATEGIES[selectedStrategy];
              const total = s.easy + s.medium + s.hard;
              const pct = Math.round((s[d] / total) * 100);
              const colors = { easy: "bg-green-500", medium: "bg-amber-500", hard: "bg-red-500" };
              return (
                <div key={d} className="flex items-center gap-1 flex-1 min-w-0">
                  <div className={`h-1.5 rounded-full transition-all duration-500 ${colors[d]}`} style={{ width: `${pct}%`, minWidth: "8px" }} />
                  <span className={`text-[10px] shrink-0 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>{t(`workspace.quiz.difficultyLevels.${d}`)} {pct}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {questions.length > 0 && (
          <div className={`rounded-lg border p-3 space-y-2 ${isDarkMode ? "border-slate-700 bg-slate-800/30" : "border-blue-200 bg-blue-50/30"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`text-xs font-semibold ${isDarkMode ? "text-blue-300" : "text-blue-700"} ${fontClass}`}>
                  {t("workspace.quiz.navigator.title")}
                </span>
                <span className={`text-[10px] shrink-0 px-1.5 py-0.5 rounded-full font-medium ${
                  totalScoreDisplay > maxScore
                    ? isDarkMode ? "bg-red-950/40 text-red-400" : "bg-red-100 text-red-600"
                    : isDarkMode ? "bg-slate-700 text-slate-300" : "bg-gray-200 text-gray-700"
                }`}>
                  {totalScoreDisplay}/{maxScore} {t("workspace.quiz.navigator.pts")}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={resetAllScores} title={t("workspace.quiz.navigator.reset")} className={`p-1 rounded transition-all active:scale-95 ${isDarkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-200 text-gray-500"}`}>
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {questions.map((q, idx) => {
                const dc = q.difficulty === "easy" ? (isDarkMode ? "border-green-500/60" : "border-green-400")
                  : q.difficulty === "hard" ? (isDarkMode ? "border-red-500/60" : "border-red-400")
                  : (isDarkMode ? "border-amber-500/60" : "border-amber-400");
                return (
                  <button key={idx} type="button" onClick={() => scrollToQuestion(idx)} className={`w-8 h-8 rounded-lg text-[11px] font-semibold border-2 flex items-center justify-center relative transition-all active:scale-95 ${dc} ${
                    q.isLocked ? (isDarkMode ? "bg-blue-500/15" : "bg-blue-50") : (isDarkMode ? "bg-slate-800" : "bg-white")
                  } ${isDarkMode ? "text-slate-200 hover:bg-slate-700" : "text-gray-700 hover:bg-gray-100"}`}>
                    {idx + 1}
                    {q.isLocked && <Lock className="w-2 h-2 absolute -top-1 -right-1 text-blue-500" />}
                  </button>
                );
              })}
            </div>
            {totalScoreDisplay > maxScore && (
              <div className={`text-[11px] px-2 py-1.5 rounded-md flex items-center gap-1.5 ${isDarkMode ? "bg-red-950/30 text-red-400" : "bg-red-50 text-red-600"}`}>
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span className={fontClass}>{t("workspace.quiz.navigator.overflow")}</span>
              </div>
            )}
          </div>
        )}

        {questions.length > 3 && (
          <div className={`sticky top-0 z-20 flex items-center justify-between px-3 py-2 mb-3 rounded-lg shadow-sm backdrop-blur-md border ${isDarkMode ? "bg-slate-900/90 border-slate-700" : "bg-white/90 border-gray-200"}`}>
            <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
              <MapPin className={`w-4 h-4 shrink-0 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`} />
              <input
                type="number"
                min={1}
                max={questions.length}
                placeholder={t("workspace.quiz.navigator.jumpTo")}
                className={`text-xs w-full bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${isDarkMode ? "text-slate-200 placeholder:text-slate-500" : "text-gray-700 placeholder:text-gray-400"} ${fontClass}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const num = Number(e.target.value);
                    if (num >= 1 && num <= questions.length) {
                      scrollToQuestion(num - 1);
                      e.target.value = "";
                    }
                  }
                }}
              />
            </div>
            <button
              type="button"
              title={t("workspace.quiz.navigator.scrollTop")}
              onClick={() => {
                const root = document.getElementById("create-quiz-scroll-root");
                if (root) root.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className={`p-1.5 rounded-full transition-all active:scale-95 ${isDarkMode ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        )}

        {questions.map((q, qIdx) => {
          const questionError = questionValidationErrors[qIdx];
          return (
            <div key={qIdx} id={`quiz-q-${qIdx}`} className={`rounded-lg border p-3 space-y-2 ${questionError
              ? (isDarkMode ? "border-red-600/70 bg-red-950/10" : "border-red-300 bg-red-50/60")
              : (isDarkMode ? "border-slate-800 bg-slate-900/50" : "border-gray-200 bg-gray-50")}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>#{qIdx + 1}</span>
                  <div className="flex items-center gap-1">
                    <input type="number" className={`w-16 rounded-md border px-1.5 py-0.5 text-xs text-center outline-none transition-all ${
                      q.isLocked
                        ? isDarkMode ? "bg-blue-950/30 border-blue-500/50 text-blue-300" : "bg-blue-50 border-blue-300 text-blue-700"
                        : isDarkMode ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-gray-100 border-gray-300 text-gray-600"
                    } ${!q.isLocked && unlockedCount <= 1 ? "cursor-not-allowed opacity-60" : ""}`}
                      value={q.point || 0} onChange={(e) => handlePointChange(qIdx, e.target.value)} step={0.01} min={0}
                      readOnly={!q.isLocked && unlockedCount <= 1}
                      title={!q.isLocked && unlockedCount <= 1 ? t("workspace.quiz.navigator.lastUnlocked") : ""} />
                    <span className={`text-[10px] ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>{t("workspace.quiz.navigator.pts")}</span>
                    <button type="button" onClick={() => handleToggleLock(qIdx)}
                      disabled={!q.isLocked && unlockedCount <= 1}
                      title={!q.isLocked && unlockedCount <= 1 ? t("workspace.quiz.navigator.lastUnlocked") : q.isLocked ? t("workspace.quiz.navigator.clickUnlock") : t("workspace.quiz.navigator.clickLock")}
                      className={`flex items-center gap-1.5 px-2 py-0.5 text-[10px] rounded transition-all border ${!q.isLocked && unlockedCount <= 1 ? "cursor-not-allowed opacity-50" : "cursor-pointer"} ${q.isLocked
                        ? (isDarkMode ? "bg-blue-950/30 border-blue-500/50 text-blue-300" : "bg-blue-50 border-blue-300 text-blue-700")
                        : (isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200" : "bg-gray-100 border-gray-300 text-gray-500 hover:text-gray-700")
                      }`}>
                      {q.isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                      <span className={fontClass}>{q.isLocked ? t("workspace.quiz.navigator.locked") : t("workspace.quiz.navigator.auto")}</span>
                    </button>
                  </div>
                </div>
                <button onClick={() => removeQuestion(qIdx)} className={`flex items-center gap-1.5 px-2 py-1 rounded transition-all active:scale-95 text-xs font-medium ${isDarkMode ? "bg-red-950/30 text-red-400 hover:bg-red-950/50" : "bg-red-50 text-red-600 hover:bg-red-100"}`}>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className={fontClass}>{t("workspace.quiz.deleteQuestion")}</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className={labelCls}>{t("workspace.quiz.questionTypeLabel")}</label>
                  <select className={selectCls} value={q.type} onChange={(e) => updateQuestion(qIdx, "type", e.target.value)}>
                    {QUESTION_TYPES.map((qt) => <option key={qt} value={qt}>{t(`workspace.quiz.types.${qt}`)}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>{t("workspace.quiz.difficultyLabel")}</label>
                  <select className={selectCls} value={q.difficulty} onChange={(e) => updateQuestion(qIdx, "difficulty", e.target.value)}>
                    {DIFFICULTY_LEVELS.map((d) => <option key={d} value={d}>{t(`workspace.quiz.difficultyLevels.${d}`)}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>{t("workspace.quiz.bloomLabel")}</label>
                  <select className={selectCls} value={q.bloomId} onChange={(e) => updateQuestion(qIdx, "bloomId", Number(e.target.value))}>
                    {BLOOM_LEVELS.map((b) => <option key={b.id} value={b.id}>{t(`workspace.quiz.bloomLevels.${b.key}`)}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls}>{t("workspace.quiz.questionTextLabel")}</label>
                <input className={inputCls} placeholder={t("workspace.quiz.questionText")} value={q.text} onChange={(e) => updateQuestion(qIdx, "text", e.target.value)} />
              </div>

              <div className={`grid ${!timerMode ? "grid-cols-2" : ""} gap-2`}>
                {!timerMode && (
                  <div>
                    <label className={labelCls}>{t("workspace.quiz.questionDuration")}</label>
                    <input type="number" className={inputCls} value={q.duration} onChange={(e) => updateQuestion(qIdx, "duration", Number(e.target.value))} min={0} placeholder="0" />
                  </div>
                )}
                <div>
                  <label className={labelCls}>{t("workspace.quiz.explanation")}</label>
                  <input className={inputCls} placeholder={t("workspace.quiz.explanationPlaceholder")} value={q.explanation} onChange={(e) => updateQuestion(qIdx, "explanation", e.target.value)} />
                </div>
              </div>

              {(q.type === "multipleChoice" || q.type === "multipleSelect") && (
                <div className="space-y-1.5 pl-2">
                  {q.answers.map((a, aIdx) => (
                    <div key={aIdx} className="flex items-center gap-2">
                      <input type={q.type === "multipleSelect" ? "checkbox" : "radio"} name={`q-${qIdx}`} checked={a.correct}
                        onChange={() => {
                          const newAnswers = q.answers.map((ans, ai) => ({
                            ...ans,
                            correct: q.type === "multipleSelect" ? (ai === aIdx ? !ans.correct : ans.correct) : ai === aIdx,
                          }));
                          updateQuestion(qIdx, "answers", newAnswers);
                        }}
                      />
                      <input className={`${inputCls} flex-1`} placeholder={`${t("workspace.quiz.answers")} ${aIdx + 1}`} value={a.text}
                        onChange={(e) => {
                          const newAnswers = [...q.answers];
                          newAnswers[aIdx] = { ...newAnswers[aIdx], text: e.target.value };
                          updateQuestion(qIdx, "answers", newAnswers);
                        }}
                      />
                    </div>
                  ))}
                  <button onClick={() => addAnswer(qIdx)} className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-1">
                    <Plus className="w-3 h-3" /> {t("workspace.quiz.addAnswer")}
                  </button>
                </div>
              )}

              {q.type === "trueFalse" && (
                <div>
                  <label className={labelCls}>{t("workspace.quiz.correctAnswerLabel")}</label>
                  <select className={selectCls} value={q.correctAnswer || "true"} onChange={(e) => updateQuestion(qIdx, "correctAnswer", e.target.value)}>
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </select>
                </div>
              )}

              {(q.type === "fillBlank" || q.type === "shortAnswer") && (
                <div>
                  <label className={labelCls}>{t("workspace.quiz.correctAnswerLabel")}</label>
                  <input className={inputCls} placeholder={t("workspace.quiz.correctAnswer")} value={q.correctAnswer || ""} onChange={(e) => updateQuestion(qIdx, "correctAnswer", e.target.value)} />
                </div>
              )}

              {questionError && (
                <div className={`text-xs px-2 py-1 rounded-md ${isDarkMode ? "bg-red-950/30 text-red-400" : "bg-red-100 text-red-700"}`}>
                  {questionError}
                </div>
              )}
            </div>
          );
        })}

        <Button variant="outline" onClick={addQuestion} className={`w-full ${isDarkMode ? "border-slate-700 text-slate-300" : ""}`}>
          <Plus className="w-4 h-4 mr-2" /> {t("workspace.quiz.addQuestion")}
        </Button>
      </div>
    </div>
  );
}

export default ManualQuizTab;
