import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/Components/ui/button";
import { Plus, Trash2, Loader2, ClipboardList, ArrowLeft, RefreshCw, Rocket, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { createFullQuiz, getQuizzesByScope } from "@/api/QuizAPI";
import { getRoadmapsByWorkspace } from "@/api/RoadmapAPI";
import { Checkbox } from "@/Components/ui/checkbox";
import useWorkspaceMaterialSelection from "./useWorkspaceMaterialSelection";

// Danh sách dạng câu hỏi và độ khó
const QUESTION_TYPES = ["multipleChoice", "multipleSelect", "trueFalse", "fillBlank", "shortAnswer"];
const DIFFICULTY_LEVELS = ["easy", "medium", "hard"];
const BLOOM_LEVELS = [
  { id: 1, key: "remember" },
  { id: 2, key: "understand" },
  { id: 3, key: "apply" },
  { id: 4, key: "analyze" },
  { id: 5, key: "evaluate" },
];

/**
 * Form tạo Mock Test — tạo quiz với contextType=ROADMAP
 * Mỗi roadmap chỉ được có tối đa 1 mock test
 */
function CreateMockTestForm({
  isDarkMode = false,
  onCreateMockTest,
  onBack,
  contextType = "WORKSPACE",
  contextId,
  sources,
  selectedSourceIds,
  onToggleMaterialSelection,
}) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const [tab, setTab] = useState("manual");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Chọn roadmap
  const [roadmaps, setRoadmaps] = useState([]);
  const [selectedRoadmapId, setSelectedRoadmapId] = useState("");
  const [roadmapLoading, setRoadmapLoading] = useState(false);

  // Real-time roadmap check
  const [roadmapHasMockTest, setRoadmapHasMockTest] = useState(false);
  const [checkingRoadmap, setCheckingRoadmap] = useState(false);

  // State quiz
  const [name, setName] = useState("");
  const [duration, setDuration] = useState(60);
  const [passingScore, setPassingScore] = useState(7.5);
  const [maxAttempt, setMaxAttempt] = useState(1);
  const [timerMode, setTimerMode] = useState(true);
  const [overallDifficulty, setOverallDifficulty] = useState("medium");
  const [questions, setQuestions] = useState([]);

  // State AI
  const [aiName, setAiName] = useState("");
  const [aiDifficulty, setAiDifficulty] = useState("medium");
  const [aiTotalQuestions, setAiTotalQuestions] = useState(30);
  const [aiDuration, setAiDuration] = useState(60);
  const [aiPrompt, setAiPrompt] = useState("");

  const {
    allSelected,
    clearSelectedSources,
    materialsError,
    materialsLoading,
    normalizedSources,
    selectAllSources,
    selectedIdSet,
    selectedIds: effectiveSelectedSourceIds,
    toggleSourceSelection,
  } = useWorkspaceMaterialSelection({
    contextId,
    onToggleMaterialSelection,
    selectedSourceIds,
    sources,
    t,
  });

  const selectedSourceItems = useMemo(
    () => normalizedSources.filter((item) => selectedIdSet.has(item.id)),
    [normalizedSources, selectedIdSet],
  );

  // Tải danh sách roadmap
  const loadRoadmaps = useCallback(async () => {
    if (!contextId) return;
    setRoadmapLoading(true);
    try {
      const res = await getRoadmapsByWorkspace(contextId, 0, 100);
      setRoadmaps(res.data?.content || res.data || []);
    } catch (e) {
      console.error("Lỗi tải roadmaps:", e);
    } finally {
      setRoadmapLoading(false);
    }
  }, [contextId]);

  useEffect(() => { loadRoadmaps(); }, [loadRoadmaps]);

  // Khi chọn roadmap → kiểm tra real-time đã có mock test chưa
  const handleRoadmapSelect = useCallback(async (roadmapId) => {
    setSelectedRoadmapId(roadmapId);
    setRoadmapHasMockTest(false);
    if (!roadmapId) return;
    setCheckingRoadmap(true);
    try {
      const res = await getQuizzesByScope("ROADMAP", Number(roadmapId));
      const existing = res.data || [];
      setRoadmapHasMockTest(existing.length > 0);
    } catch (e) {
      console.error("Lỗi kiểm tra roadmap:", e);
    } finally {
      setCheckingRoadmap(false);
    }
  }, []);

  // Quản lý câu hỏi
  const addQuestion = () => {
    setQuestions(prev => [...prev, {
      type: "multipleChoice", text: "", difficulty: "medium", bloomId: 1, duration: 0, explanation: "",
      answers: [{ text: "", correct: false }, { text: "", correct: false }],
    }]);
  };
  const removeQuestion = (idx) => setQuestions(prev => prev.filter((_, i) => i !== idx));
  const updateQuestion = (idx, field, value) => setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  const addAnswer = (qIdx) => setQuestions(prev => prev.map((q, i) =>
    i === qIdx ? { ...q, answers: [...q.answers, { text: "", correct: false }] } : q
  ));

  // Submit
  const handleSubmit = async (quizStatus = "ACTIVE") => {
    setSubmitting(true);
    setError("");
    try {
      if (tab === "manual") {
        if (!name.trim()) { setError(t("workspace.quiz.validation.nameRequired")); setSubmitting(false); return; }
        if (!selectedRoadmapId) { setError(t("workspace.mockTest.validation.roadmapRequired")); setSubmitting(false); return; }

        // Kiểm tra giới hạn: mỗi roadmap chỉ được 1 mock test
        try {
          const existingRes = await getQuizzesByScope("ROADMAP", Number(selectedRoadmapId));
          const existing = existingRes.data || [];
          if (existing.length > 0) {
            setError(t("workspace.mockTest.validation.mockTestLimit"));
            setSubmitting(false);
            return;
          }
        } catch (e) {
          console.error("Lỗi kiểm tra giới hạn mock test:", e);
        }

        const result = await createFullQuiz({
          workspaceId: contextType === 'WORKSPACE' ? contextId : null,
          roadmapId: Number(selectedRoadmapId),
          phaseId: null,
          knowledgeId: null,
          title: name,
          duration,
          quizIntent: "REVIEW",
          timerMode,
          passingScore,
          maxAttempt,
          overallDifficulty,
          questions,
          status: quizStatus,
        });
        await onCreateMockTest?.({ quizId: result.quizId, title: result.title, ...result });
      } else {
        const data = {
          mode: "ai",
          name: aiName,
          difficulty: aiDifficulty,
          totalQuestions: aiTotalQuestions,
          duration: aiDuration,
          prompt: aiPrompt,
          materialIds: effectiveSelectedSourceIds,
        };
        await onCreateMockTest?.(data);
      }
    } catch (err) {
      console.error("Lỗi khi tạo mock test:", err);
      setError(err.message || t("workspace.quiz.validation.createFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = `w-full rounded-lg border px-3 py-2 text-sm outline-none transition-all ${
    isDarkMode ? "bg-slate-800 border-slate-700 text-white focus:border-blue-500 placeholder:text-slate-500"
              : "bg-white border-gray-300 text-gray-900 focus:border-blue-500 placeholder:text-gray-400"
  }`;
  const selectCls = `${inputCls} appearance-none cursor-pointer`;
  const tabCls = (key) => `flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
    tab === key
      ? isDarkMode ? "bg-slate-800 text-purple-300" : "bg-white text-purple-700 shadow-sm"
      : isDarkMode ? "text-slate-400 hover:text-slate-200" : "text-gray-500 hover:text-gray-700"
  }`;
  const labelCls = `block text-xs font-medium mb-1 ${isDarkMode ? "text-slate-400" : "text-gray-600"} ${fontClass}`;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={`px-4 h-12 border-b flex items-center gap-3 shrink-0 transition-colors duration-300 ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <button type="button" onClick={onBack} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-gray-100 text-gray-600"}`}>
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-purple-500" />
          <p className={`text-base font-medium ${isDarkMode ? "text-slate-100" : "text-gray-800"} ${fontClass}`}>
            {t("workspace.mockTest.createTitle")}
          </p>
        </div>
      </div>

      {/* Nội dung form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
          {t("workspace.mockTest.createDesc")}
        </p>

        {/* Tab */}
        <div className={`flex gap-1 rounded-lg p-1 ${isDarkMode ? "bg-slate-800" : "bg-gray-100"}`}>
          <button type="button" onClick={() => setTab("manual")} className={tabCls("manual")}>{t("workspace.quiz.tabManual")}</button>
          <button type="button" onClick={() => setTab("ai")} className={tabCls("ai")}>{t("workspace.quiz.tabAI")}</button>
        </div>

        <div className={`rounded-xl border p-3 space-y-3 ${isDarkMode ? "border-slate-800 bg-slate-900/40" : "border-gray-200 bg-white"}`}>
          <div className="flex items-start justify-between gap-2">
            <p className={`text-xs font-semibold ${isDarkMode ? "text-slate-200" : "text-gray-800"} ${fontClass}`}>
              {t("workspace.quiz.aiConfig.selectedMaterials")}
            </p>
            {normalizedSources.length > 0 && (
              <span className={`text-[11px] ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                {t("workspace.quiz.aiConfig.materialsSelectedSummary", {
                  selected: selectedSourceItems.length,
                  total: normalizedSources.length,
                })}
              </span>
            )}
          </div>

          {materialsLoading && (
            <div className={`flex items-center gap-2 text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {t("workspace.quiz.aiConfig.materialsLoading", "Đang tải danh sách tài liệu...")}
            </div>
          )}

          {materialsError && !materialsLoading && (
            <div className={`text-xs px-3 py-2 rounded-lg ${isDarkMode ? "bg-red-950/20 text-red-400 border border-red-900/30" : "bg-red-50 text-red-700 border border-red-200"}`}>
              {materialsError}
            </div>
          )}

          {normalizedSources.length > 0 && !materialsLoading && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className={`h-7 px-3 text-[11px] ${isDarkMode ? "border-slate-700 text-slate-300" : "border-gray-200 text-gray-700"}`}
                  onClick={selectAllSources}
                  disabled={allSelected}
                >
                  {t("workspace.sources.selectAll")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className={`h-7 px-3 text-[11px] ${isDarkMode ? "border-slate-700 text-slate-300" : "border-gray-200 text-gray-700"}`}
                  onClick={clearSelectedSources}
                  disabled={selectedSourceItems.length === 0}
                >
                  {t("workspace.sources.deselectAll")}
                </Button>
              </div>

              <div className={`max-h-36 overflow-y-auto rounded-lg border ${isDarkMode ? "border-slate-800 divide-y divide-slate-800" : "border-gray-200 divide-y divide-gray-100"}`}>
                {normalizedSources.map((item) => (
                  <label key={item.id} className={`flex items-start gap-3 px-3 py-2 text-xs cursor-pointer ${isDarkMode ? "hover:bg-slate-800/40" : "hover:bg-gray-50"}`}>
                    <Checkbox
                      checked={selectedIdSet.has(item.id)}
                      onCheckedChange={(checked) => toggleSourceSelection(item.id, checked === true)}
                      className={`mt-0.5 ${isDarkMode ? "border-slate-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600" : "border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"}`}
                    />
                    <span className={`min-w-0 flex-1 break-words ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>
                      {item.name || t("workspace.quiz.aiConfig.materialFallback", { id: item.id })}
                    </span>
                  </label>
                ))}
              </div>
            </>
          )}

          {normalizedSources.length === 0 && !materialsLoading && (
            <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
              {t("workspace.quiz.aiConfig.workspaceMaterialsEmpty")}
            </p>
          )}
        </div>

        {tab === "manual" ? (
          <div className="space-y-4">
            {/* Tên mock test */}
            <div>
              <label className={labelCls}>{t("workspace.mockTest.name")}</label>
              <input className={inputCls} placeholder={t("workspace.mockTest.namePlaceholder")} value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            {/* Chọn roadmap */}
            <div className={`rounded-lg border p-3 space-y-3 ${isDarkMode ? "border-purple-800/50 bg-purple-950/20" : "border-purple-200 bg-purple-50/30"}`}>
              <div className="flex items-center gap-2 mb-1">
                <ClipboardList className={`w-4 h-4 ${isDarkMode ? "text-purple-400" : "text-purple-600"}`} />
                <span className={`text-xs font-semibold ${isDarkMode ? "text-purple-300" : "text-purple-700"} ${fontClass}`}>
                  {t("workspace.mockTest.selectRoadmap")}
                </span>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-medium ${isDarkMode ? "text-slate-400" : "text-gray-600"} ${fontClass}`}>
                    {t("workspace.quiz.contextSelector.selectRoadmap")}
                  </span>
                  <button type="button" onClick={loadRoadmaps} className={`p-1 rounded transition-all active:scale-95 ${isDarkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-200 text-gray-500"}`}>
                    <RefreshCw className={`w-3 h-3 ${roadmapLoading ? "animate-spin" : ""}`} />
                  </button>
                </div>
                <select className={selectCls} value={selectedRoadmapId} onChange={(e) => handleRoadmapSelect(e.target.value)} disabled={roadmapLoading}>
                  <option value="">{roadmapLoading ? t("workspace.quiz.contextSelector.loading") : t("workspace.quiz.contextSelector.placeholder")}</option>
                  {roadmaps.map((rm) => (
                    <option key={rm.roadmapId || rm.id} value={rm.roadmapId || rm.id}>
                      {rm.title || rm.name || t("workspace.roadmap.fallbackName", { id: rm.roadmapId || rm.id })}
                    </option>
                  ))}
                </select>
              </div>

              {/* Real-time warning khi roadmap đã có mock test */}
              {checkingRoadmap && (
                <div className="flex items-center gap-2 mt-1">
                  <Loader2 className="w-3 h-3 animate-spin text-purple-500" />
                  <span className={`text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>{t("common.checking")}</span>
                </div>
              )}
              {roadmapHasMockTest && !checkingRoadmap && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${isDarkMode ? "bg-red-950/30 text-red-400" : "bg-red-50 text-red-600"}`}>
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {t("workspace.mockTest.validation.roadmapAlreadyHas")}
                </div>
              )}

              <p className={`text-[10px] ${isDarkMode ? "text-purple-400/60" : "text-purple-500/70"} ${fontClass}`}>
                {t("workspace.mockTest.onePerRoadmap")}
              </p>
            </div>

            {/* Cấu hình */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{t("workspace.quiz.overallDifficulty")}</label>
                <select className={selectCls} value={overallDifficulty} onChange={(e) => setOverallDifficulty(e.target.value)}>
                  {DIFFICULTY_LEVELS.map((d) => <option key={d} value={d}>{t(`workspace.quiz.difficultyLevels.${d}`)}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>{t("workspace.quiz.maxAttempt")}</label>
                <input type="number" className={inputCls} value={maxAttempt} onChange={(e) => setMaxAttempt(Number(e.target.value))} min={1} />
              </div>
            </div>

            {/* Timer Mode */}
            <div className="flex items-center gap-3">
              <label className={`flex items-center gap-2 cursor-pointer ${fontClass}`}>
                <input type="checkbox" checked={timerMode} onChange={(e) => setTimerMode(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                <span className={`text-xs ${isDarkMode ? "text-slate-300" : "text-gray-600"}`}>{t("workspace.quiz.timerMode")}</span>
              </label>
              <span className={`text-[10px] ${isDarkMode ? "text-slate-500" : "text-gray-400"} ${fontClass}`}>
                {timerMode ? t("workspace.quiz.timerModeHintOn") : t("workspace.quiz.timerModeHintOff")}
              </span>
            </div>

            <div className={`grid ${timerMode ? "grid-cols-2" : "grid-cols-1"} gap-3`}>
              {timerMode && (
                <div>
                  <label className={labelCls}>{t("workspace.quiz.timeDuration")}</label>
                  <input type="number" className={inputCls} value={duration} onChange={(e) => setDuration(Number(e.target.value))} min={1} />
                </div>
              )}
              <div>
                <label className={labelCls}>{t("workspace.quiz.passingScore")}</label>
                <input type="number" className={inputCls} value={passingScore} onChange={(e) => setPassingScore(Number(e.target.value))} min={0} max={10} step={0.5} />
              </div>
            </div>

            {/* Lỗi */}
            {error && (
              <div className={`text-xs px-3 py-2 rounded-lg ${isDarkMode ? "bg-red-950/30 text-red-400" : "bg-red-50 text-red-600"}`}>
                {error}
              </div>
            )}

            {/* Danh sách câu hỏi */}
            <div className="space-y-3">
              {questions.map((q, qIdx) => (
                <div key={qIdx} className={`rounded-lg border p-3 space-y-2 ${isDarkMode ? "border-slate-800 bg-slate-900/50" : "border-gray-200 bg-gray-50"}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>#{qIdx + 1}</span>
                    <button onClick={() => removeQuestion(qIdx)} className="p-1 hover:bg-red-100 dark:hover:bg-red-950/30 rounded transition-all active:scale-95">
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <select className={selectCls} value={q.type} onChange={(e) => updateQuestion(qIdx, "type", e.target.value)}>
                      {QUESTION_TYPES.map((qt) => <option key={qt} value={qt}>{t(`workspace.quiz.types.${qt}`)}</option>)}
                    </select>
                    <select className={selectCls} value={q.difficulty} onChange={(e) => updateQuestion(qIdx, "difficulty", e.target.value)}>
                      {DIFFICULTY_LEVELS.map((d) => <option key={d} value={d}>{t(`workspace.quiz.difficultyLevels.${d}`)}</option>)}
                    </select>
                    <select className={selectCls} value={q.bloomId} onChange={(e) => updateQuestion(qIdx, "bloomId", Number(e.target.value))}>
                      {BLOOM_LEVELS.map((b) => <option key={b.id} value={b.id}>{t(`workspace.quiz.bloomLevels.${b.key}`)}</option>)}
                    </select>
                  </div>

                  <input className={inputCls} placeholder={t("workspace.quiz.questionText")} value={q.text} onChange={(e) => updateQuestion(qIdx, "text", e.target.value)} />

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

                  {/* Đáp án */}
                  {(q.type === "multipleChoice" || q.type === "multipleSelect") && (
                    <div className="space-y-1.5 pl-2">
                      {q.answers.map((a, aIdx) => (
                        <div key={aIdx} className="flex items-center gap-2">
                          <input type={q.type === "multipleSelect" ? "checkbox" : "radio"} name={`mt-q-${qIdx}`} checked={a.correct}
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
                      <button onClick={() => addAnswer(qIdx)} className="text-xs text-purple-500 hover:underline flex items-center gap-1 mt-1">
                        <Plus className="w-3 h-3" /> {t("workspace.quiz.addAnswer")}
                      </button>
                    </div>
                  )}
                  {q.type === "trueFalse" && (
                    <select className={selectCls} value={q.correctAnswer || "true"}
                      onChange={(e) => updateQuestion(qIdx, "correctAnswer", e.target.value)}>
                      <option value="true">{t("common.boolean.true")}</option>
                      <option value="false">{t("common.boolean.false")}</option>
                    </select>
                  )}
                  {(q.type === "fillBlank" || q.type === "shortAnswer") && (
                    <input className={inputCls} placeholder={t("workspace.quiz.correctAnswer")} value={q.correctAnswer || ""}
                      onChange={(e) => updateQuestion(qIdx, "correctAnswer", e.target.value)} />
                  )}
                </div>
              ))}
              <Button variant="outline" onClick={addQuestion} className={`w-full ${isDarkMode ? "border-slate-700 text-slate-300" : ""}`}>
                <Plus className="w-4 h-4 mr-2" /> {t("workspace.quiz.addQuestion")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className={labelCls}>{t("workspace.mockTest.name")}</label>
              <input className={inputCls} placeholder={t("workspace.mockTest.namePlaceholder")} value={aiName} onChange={(e) => setAiName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{t("workspace.quiz.difficulty")}</label>
                <select className={selectCls} value={aiDifficulty} onChange={(e) => setAiDifficulty(e.target.value)}>
                  {DIFFICULTY_LEVELS.map((d) => <option key={d} value={d}>{t(`workspace.quiz.difficultyLevels.${d}`)}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>{t("workspace.quiz.aiConfig.totalQuestions")}</label>
                <input type="number" className={inputCls} value={aiTotalQuestions} onChange={(e) => setAiTotalQuestions(Number(e.target.value))} min={1} />
              </div>
            </div>
            <div>
              <label className={labelCls}>{t("workspace.quiz.timeDuration")}</label>
              <input type="number" className={inputCls} value={aiDuration} onChange={(e) => setAiDuration(Number(e.target.value))} min={1} />
            </div>
            <div>
              <label className={labelCls}>{t("workspace.quiz.aiConfig.additionalPrompt")}</label>
              <textarea className={`${inputCls} min-h-[80px] resize-none`} placeholder={t("workspace.quiz.aiConfig.promptPlaceholder")} value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={`px-4 py-3 border-t flex justify-end gap-2 shrink-0 transition-colors duration-300 ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <Button variant="outline" onClick={onBack} className={isDarkMode ? "border-slate-700 text-slate-300" : ""}>
          {t("workspace.quiz.cancel")}
        </Button>
        <Button onClick={() => handleSubmit("ACTIVE")} disabled={submitting || roadmapHasMockTest} className="bg-purple-600 hover:bg-purple-700 text-white">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Rocket className="w-4 h-4 mr-2" />}
          {tab === "manual"
            ? (submitting ? t("workspace.quiz.creating") : t("workspace.quiz.createActive"))
            : (submitting ? t("workspace.quiz.generating") : t("workspace.quiz.generateAI"))
          }
        </Button>
      </div>
    </div>
  );
}

export default CreateMockTestForm;
