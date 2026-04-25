import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Loader2, GraduationCap, ArrowLeft, RefreshCw, Rocket, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { createFullQuiz, getQuizzesByScope } from "@/api/QuizAPI";
import { getRoadmapsByWorkspace, getPhasesByRoadmap } from "@/api/RoadmapAPI";
import { Checkbox } from "@/components/ui/checkbox";
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
 * Form tạo Post-learning — tạo quiz với contextType=PHASE
 * Mỗi phase chỉ được có tối đa 1 post-learning
 */
function CreatePostLearningForm({
  isDarkMode = false,
  onCreatePostLearning,
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

  // Chọn roadmap → phase
  const [roadmaps, setRoadmaps] = useState([]);
  const [selectedRoadmapId, setSelectedRoadmapId] = useState("");
  const [roadmapLoading, setRoadmapLoading] = useState(false);
  const [phases, setPhases] = useState([]);
  const [selectedPhaseId, setSelectedPhaseId] = useState("");
  const [phaseLoading, setPhaseLoading] = useState(false);

  // Real-time phase check
  const [phaseHasPostLearning, setPhaseHasPostLearning] = useState(false);
  const [checkingPhase, setCheckingPhase] = useState(false);

  // State quiz
  const [name, setName] = useState("");
  const [duration, setDuration] = useState(30);
  const [passingScore, setPassingScore] = useState(7.5);
  const [maxAttempt, setMaxAttempt] = useState(1);
  const [timerMode, setTimerMode] = useState(true);
  const [overallDifficulty, setOverallDifficulty] = useState("medium");
  const [questions, setQuestions] = useState([]);

  // State AI
  const [aiName, setAiName] = useState("");
  const [aiDifficulty, setAiDifficulty] = useState("medium");
  const [aiTotalQuestions, setAiTotalQuestions] = useState(20);
  const [aiDuration, setAiDuration] = useState(30);
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
      setRoadmaps(res?.data?.data?.content || res?.data?.content || []);
    } catch (e) {
      console.error("Lỗi tải roadmaps:", e);
    } finally {
      setRoadmapLoading(false);
    }
  }, [contextId]);

  useEffect(() => { loadRoadmaps(); }, [loadRoadmaps]);

  // Khi chọn roadmap → tải phases
  const handleRoadmapSelect = useCallback(async (roadmapId) => {
    setSelectedRoadmapId(roadmapId);
    setSelectedPhaseId("");
    setPhases([]);
    setPhaseHasPostLearning(false);
    if (!roadmapId) return;
    setPhaseLoading(true);
    try {
      const res = await getPhasesByRoadmap(Number(roadmapId), 0, 100);
      const content = res?.data?.data?.content || res?.data?.content || [];
      setPhases(content);
    } catch (e) {
      console.error("Lỗi tải phases:", e);
    } finally {
      setPhaseLoading(false);
    }
  }, []);

  // Khi chọn phase → kiểm tra real-time đã có post-learning chưa
  const handlePhaseSelect = useCallback(async (phaseId) => {
    setSelectedPhaseId(phaseId);
    setPhaseHasPostLearning(false);
    if (!phaseId) return;
    setCheckingPhase(true);
    try {
      const res = await getQuizzesByScope("PHASE", Number(phaseId));
      const existing = res.data || [];
      setPhaseHasPostLearning(existing.length > 0);
    } catch (e) {
      console.error("Lỗi kiểm tra phase:", e);
    } finally {
      setCheckingPhase(false);
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
        if (!name.trim()) { setError(t("mockTestForms.common.nameRequired", "Please enter a name.")); setSubmitting(false); return; }
        if (!selectedPhaseId) { setError(t("mockTestForms.postLearning.phaseRequired", "Please select a phase.")); setSubmitting(false); return; }

        // Kiểm tra giới hạn: mỗi phase chỉ được 1 post-learning
        try {
          const existingRes = await getQuizzesByScope("PHASE", Number(selectedPhaseId));
          const existing = existingRes.data || [];
          if (existing.length > 0) {
            setError(t("mockTestForms.postLearning.postLearningLimit", "This phase already has a post-learning quiz. Only one is allowed per phase."));
            setSubmitting(false);
            return;
          }
        } catch (e) {
          console.error("Lỗi kiểm tra giới hạn post-learning:", e);
        }

        const result = await createFullQuiz({
          workspaceId: contextType === 'WORKSPACE' ? contextId : null,
          roadmapId: null,
          phaseId: Number(selectedPhaseId),
          knowledgeId: null,
          title: name,
          duration,
          quizIntent: "POST_LEARNING",
          timerMode,
          passingScore,
          maxAttempt,
          overallDifficulty,
          questions,
          status: quizStatus,
        });
        await onCreatePostLearning?.({ quizId: result.quizId, title: result.title, ...result });
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
        await onCreatePostLearning?.(data);
      }
    } catch (err) {
      console.error("Lỗi khi tạo post-learning:", err);
      setError(err.message || t("mockTestForms.common.createFailed", "Failed to create. Please try again."));
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
      ? isDarkMode ? "bg-slate-800 text-orange-300" : "bg-white text-orange-700 shadow-sm"
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
          <GraduationCap className="w-5 h-5 text-orange-500" />
          <p className={`text-base font-medium ${isDarkMode ? "text-slate-100" : "text-gray-800"} ${fontClass}`}>
            {t("mockTestForms.postLearning.title", "Create Post-learning")}
          </p>
        </div>
      </div>

      {/* Nội dung form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
          {t("mockTestForms.postLearning.desc", "Create a post-learning quiz covering a specific phase.")}
        </p>

        {/* Tab */}
        <div className={`flex gap-1 rounded-lg p-1 ${isDarkMode ? "bg-slate-800" : "bg-gray-100"}`}>
          <button type="button" onClick={() => setTab("manual")} className={tabCls("manual")}>{t("mockTestForms.common.tabManual", "Manual")}</button>
          <button type="button" onClick={() => setTab("ai")} className={tabCls("ai")}>{t("mockTestForms.common.tabAI", "AI")}</button>
        </div>

        <div className={`rounded-xl border p-3 space-y-3 ${isDarkMode ? "border-slate-800 bg-slate-900/40" : "border-gray-200 bg-white"}`}>
          <div className="flex items-start justify-between gap-2">
            <p className={`text-xs font-semibold ${isDarkMode ? "text-slate-200" : "text-gray-800"} ${fontClass}`}>
              {t("mockTestForms.common.selectedMaterials", "Selected materials")}
            </p>
            {normalizedSources.length > 0 && (
              <span className={`text-[11px] ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                {t("mockTestForms.common.materialsSelectedSummary", "{{selected}}/{{total}} selected", {
                  selected: selectedSourceItems.length,
                  total: normalizedSources.length,
                })}
              </span>
            )}
          </div>

          {materialsLoading && (
            <div className={`flex items-center gap-2 text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {t("mockTestForms.common.materialsLoading", "Loading materials...")}
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
                  {t("mockTestForms.common.selectAll", "Select all")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className={`h-7 px-3 text-[11px] ${isDarkMode ? "border-slate-700 text-slate-300" : "border-gray-200 text-gray-700"}`}
                  onClick={clearSelectedSources}
                  disabled={selectedSourceItems.length === 0}
                >
                  {t("mockTestForms.common.deselectAll", "Deselect all")}
                </Button>
              </div>

              <div className={`max-h-36 overflow-y-auto rounded-lg border ${isDarkMode ? "border-slate-800 divide-y divide-slate-800" : "border-gray-200 divide-y divide-gray-100"}`}>
                {normalizedSources.map((item) => (
                  <label key={item.id} className={`flex items-start gap-3 px-3 py-2 text-xs cursor-pointer ${isDarkMode ? "hover:bg-slate-800/40" : "hover:bg-gray-50"}`}>
                    <Checkbox
                      checked={selectedIdSet.has(item.id)}
                      onCheckedChange={(checked) => toggleSourceSelection(item.id, checked === true)}
                      className={`mt-0.5 ${isDarkMode ? "border-slate-500 data-[state=checked]:bg-orange-600 data-[state=checked]:border-orange-600" : "border-gray-300 data-[state=checked]:bg-orange-600 data-[state=checked]:border-orange-600"}`}
                    />
                    <span className={`min-w-0 flex-1 break-words ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>
                      {item.name || t("mockTestForms.common.materialFallback", "Material #{{id}}", { id: item.id })}
                    </span>
                  </label>
                ))}
              </div>
            </>
          )}

          {normalizedSources.length === 0 && !materialsLoading && (
            <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
              {t("mockTestForms.common.workspaceMaterialsEmpty", "No materials available in this workspace.")}
            </p>
          )}
        </div>

        {tab === "manual" ? (
          <div className="space-y-4">
            {/* Tên post-learning */}
            <div>
              <label className={labelCls}>{t("mockTestForms.postLearning.name", "Post-learning Name")}</label>
              <input className={inputCls} placeholder={t("mockTestForms.postLearning.namePlaceholder", "Enter post-learning name...")} value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            {/* Chọn roadmap → phase */}
            <div className={`rounded-lg border p-3 space-y-3 ${isDarkMode ? "border-orange-800/50 bg-orange-950/20" : "border-orange-200 bg-orange-50/30"}`}>
              <div className="flex items-center gap-2 mb-1">
                <GraduationCap className={`w-4 h-4 ${isDarkMode ? "text-orange-400" : "text-orange-600"}`} />
                <span className={`text-xs font-semibold ${isDarkMode ? "text-orange-300" : "text-orange-700"} ${fontClass}`}>
                  {t("mockTestForms.postLearning.selectPhaseTitle", "Select Phase")}
                </span>
              </div>

              {/* Roadmap selector */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-medium ${isDarkMode ? "text-slate-400" : "text-gray-600"} ${fontClass}`}>
                    {t("mockTestForms.common.contextSelectRoadmap", "Select a roadmap")}
                  </span>
                  <button type="button" onClick={loadRoadmaps} className={`p-1 rounded transition-all active:scale-95 ${isDarkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-200 text-gray-500"}`}>
                    <RefreshCw className={`w-3 h-3 ${roadmapLoading ? "animate-spin" : ""}`} />
                  </button>
                </div>
                <select className={selectCls} value={selectedRoadmapId} onChange={(e) => handleRoadmapSelect(e.target.value)} disabled={roadmapLoading}>
                  <option value="">{roadmapLoading ? t("mockTestForms.common.contextLoading", "Loading...") : t("mockTestForms.common.contextPlaceholder", "-- Select --")}</option>
                  {roadmaps.map((rm) => (
                    <option key={rm.roadmapId || rm.id} value={rm.roadmapId || rm.id}>
                      {rm.title || rm.name || t("mockTestForms.common.roadmapFallback", "Roadmap #{{id}}", { id: rm.roadmapId || rm.id })}
                    </option>
                  ))}
                </select>
              </div>

              {/* Phase selector */}
              {selectedRoadmapId && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-medium ${isDarkMode ? "text-slate-400" : "text-gray-600"} ${fontClass}`}>
                      {t("mockTestForms.common.contextSelectPhase", "Select a phase")}
                    </span>
                    {checkingPhase && <Loader2 className="w-3 h-3 animate-spin text-orange-500" />}
                  </div>
                  <select className={selectCls} value={selectedPhaseId} onChange={(e) => handlePhaseSelect(e.target.value)} disabled={phaseLoading}>
                    <option value="">{phaseLoading ? t("mockTestForms.common.contextLoading", "Loading...") : t("mockTestForms.common.contextPlaceholder", "-- Select --")}</option>
                    {phases.map((ph) => (
                      <option key={ph.phaseId || ph.id} value={ph.phaseId || ph.id}>
                        {ph.title || ph.name || t("mockTestForms.common.phaseFallback", "Phase #{{id}}", { id: ph.phaseId || ph.id })}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Real-time warning khi phase đã có post-learning */}
              {phaseHasPostLearning && !checkingPhase && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${isDarkMode ? "bg-red-950/30 text-red-400" : "bg-red-50 text-red-600"}`}>
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {t("mockTestForms.postLearning.phaseAlreadyHas", "This phase already has a post-learning quiz. Please choose another phase.")}
                </div>
              )}

              <p className={`text-[10px] ${isDarkMode ? "text-orange-400/60" : "text-orange-500/70"} ${fontClass}`}>
                {t("mockTestForms.postLearning.onePerPhase", "Each phase can have at most one post-learning quiz.")}
              </p>
            </div>

            {/* Cấu hình */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{t("mockTestForms.common.overallDifficulty", "Overall difficulty")}</label>
                <select className={selectCls} value={overallDifficulty} onChange={(e) => setOverallDifficulty(e.target.value)}>
                  {DIFFICULTY_LEVELS.map((d) => <option key={d} value={d}>{t(`mockTestForms.common.difficulty${d.charAt(0).toUpperCase() + d.slice(1)}`, d)}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>{t("mockTestForms.common.maxAttempt", "Max attempts")}</label>
                <input type="number" className={inputCls} value={maxAttempt} onChange={(e) => setMaxAttempt(Number(e.target.value))} min={1} />
              </div>
            </div>

            {/* Timer Mode */}
            <div className="flex items-center gap-3">
              <label className={`flex items-center gap-2 cursor-pointer ${fontClass}`}>
                <input type="checkbox" checked={timerMode} onChange={(e) => setTimerMode(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500" />
                <span className={`text-xs ${isDarkMode ? "text-slate-300" : "text-gray-600"}`}>{t("mockTestForms.common.timerMode", "Timer mode")}</span>
              </label>
              <span className={`text-[10px] ${isDarkMode ? "text-slate-500" : "text-gray-400"} ${fontClass}`}>
                {timerMode ? t("mockTestForms.common.timerModeHintOn", "Enabled: one overall duration for the test") : t("mockTestForms.common.timerModeHintOff", "Disabled: set duration per question")}
              </span>
            </div>

            <div className={`grid ${timerMode ? "grid-cols-2" : "grid-cols-1"} gap-3`}>
              {timerMode && (
                <div>
                  <label className={labelCls}>{t("mockTestForms.common.timeDuration", "Duration (minutes)")}</label>
                  <input type="number" className={inputCls} value={duration} onChange={(e) => setDuration(Number(e.target.value))} min={1} />
                </div>
              )}
              <div>
                <label className={labelCls}>{t("mockTestForms.common.passingScore", "Passing score")}</label>
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
                      {QUESTION_TYPES.map((qt) => <option key={qt} value={qt}>{t(`mockTestForms.common.type${qt.charAt(0).toUpperCase() + qt.slice(1)}`, qt)}</option>)}
                    </select>
                    <select className={selectCls} value={q.difficulty} onChange={(e) => updateQuestion(qIdx, "difficulty", e.target.value)}>
                      {DIFFICULTY_LEVELS.map((d) => <option key={d} value={d}>{t(`mockTestForms.common.difficulty${d.charAt(0).toUpperCase() + d.slice(1)}`, d)}</option>)}
                    </select>
                    <select className={selectCls} value={q.bloomId} onChange={(e) => updateQuestion(qIdx, "bloomId", Number(e.target.value))}>
                      {BLOOM_LEVELS.map((b) => <option key={b.id} value={b.id}>{t(`mockTestForms.common.bloom${b.key.charAt(0).toUpperCase() + b.key.slice(1)}`, b.key)}</option>)}
                    </select>
                  </div>

                  <input className={inputCls} placeholder={t("mockTestForms.common.questionText", "Question text")} value={q.text} onChange={(e) => updateQuestion(qIdx, "text", e.target.value)} />

                  <div className={`grid ${!timerMode ? "grid-cols-2" : ""} gap-2`}>
                    {!timerMode && (
                      <div>
                        <label className={labelCls}>{t("mockTestForms.common.questionDuration", "Question duration (s)")}</label>
                        <input type="number" className={inputCls} value={q.duration} onChange={(e) => updateQuestion(qIdx, "duration", Number(e.target.value))} min={0} placeholder="0" />
                      </div>
                    )}
                    <div>
                      <label className={labelCls}>{t("mockTestForms.common.explanation", "Explanation")}</label>
                      <input className={inputCls} placeholder={t("mockTestForms.common.explanationPlaceholder", "Enter an explanation...")} value={q.explanation} onChange={(e) => updateQuestion(qIdx, "explanation", e.target.value)} />
                    </div>
                  </div>

                  {/* Đáp án */}
                  {(q.type === "multipleChoice" || q.type === "multipleSelect") && (
                    <div className="space-y-1.5 pl-2">
                      {q.answers.map((a, aIdx) => (
                        <div key={aIdx} className="flex items-center gap-2">
                          <input type={q.type === "multipleSelect" ? "checkbox" : "radio"} name={`pl-q-${qIdx}`} checked={a.correct}
                            onChange={() => {
                              const newAnswers = q.answers.map((ans, ai) => ({
                                ...ans,
                                correct: q.type === "multipleSelect" ? (ai === aIdx ? !ans.correct : ans.correct) : ai === aIdx,
                              }));
                              updateQuestion(qIdx, "answers", newAnswers);
                            }}
                          />
                          <input className={`${inputCls} flex-1`} placeholder={`${t("mockTestForms.common.answers", "Answer")} ${aIdx + 1}`} value={a.text}
                            onChange={(e) => {
                              const newAnswers = [...q.answers];
                              newAnswers[aIdx] = { ...newAnswers[aIdx], text: e.target.value };
                              updateQuestion(qIdx, "answers", newAnswers);
                            }}
                          />
                        </div>
                      ))}
                      <button onClick={() => addAnswer(qIdx)} className="text-xs text-orange-500 hover:underline flex items-center gap-1 mt-1">
                        <Plus className="w-3 h-3" /> {t("mockTestForms.common.addAnswer", "Add answer")}
                      </button>
                    </div>
                  )}
                  {q.type === "trueFalse" && (
                    <select className={selectCls} value={q.correctAnswer || "true"}
                      onChange={(e) => updateQuestion(qIdx, "correctAnswer", e.target.value)}>
                      <option value="true">{t("mockTestForms.common.booleanTrue", "True")}</option>
                      <option value="false">{t("mockTestForms.common.booleanFalse", "False")}</option>
                    </select>
                  )}
                  {(q.type === "fillBlank" || q.type === "shortAnswer") && (
                    <input className={inputCls} placeholder={t("mockTestForms.common.correctAnswer", "Correct answer")} value={q.correctAnswer || ""}
                      onChange={(e) => updateQuestion(qIdx, "correctAnswer", e.target.value)} />
                  )}
                </div>
              ))}
              <Button variant="outline" onClick={addQuestion} className={`w-full ${isDarkMode ? "border-slate-700 text-slate-300" : ""}`}>
                <Plus className="w-4 h-4 mr-2" /> {t("mockTestForms.common.addQuestion", "Add question")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className={labelCls}>{t("mockTestForms.postLearning.name", "Post-learning Name")}</label>
              <input className={inputCls} placeholder={t("mockTestForms.postLearning.namePlaceholder", "Enter post-learning name...")} value={aiName} onChange={(e) => setAiName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{t("mockTestForms.common.difficulty", "Difficulty")}</label>
                <select className={selectCls} value={aiDifficulty} onChange={(e) => setAiDifficulty(e.target.value)}>
                  {DIFFICULTY_LEVELS.map((d) => <option key={d} value={d}>{t(`mockTestForms.common.difficulty${d.charAt(0).toUpperCase() + d.slice(1)}`, d)}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>{t("mockTestForms.common.totalQuestions", "Total questions")}</label>
                <input type="number" className={inputCls} value={aiTotalQuestions} onChange={(e) => setAiTotalQuestions(Number(e.target.value))} min={1} />
              </div>
            </div>
            <div>
              <label className={labelCls}>{t("mockTestForms.common.timeDuration", "Duration (minutes)")}</label>
              <input type="number" className={inputCls} value={aiDuration} onChange={(e) => setAiDuration(Number(e.target.value))} min={1} />
            </div>
            <div>
              <label className={labelCls}>{t("mockTestForms.common.additionalPrompt", "Additional prompt")}</label>
              <textarea className={`${inputCls} min-h-[80px] resize-none`} placeholder={t("mockTestForms.common.promptPlaceholder", "Add extra instructions for the AI...")} value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={`px-4 py-3 border-t flex justify-end gap-2 shrink-0 transition-colors duration-300 ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <Button variant="outline" onClick={onBack} className={isDarkMode ? "border-slate-700 text-slate-300" : ""}>
          {t("mockTestForms.common.cancel", "Cancel")}
        </Button>
        <Button onClick={() => handleSubmit("ACTIVE")} disabled={submitting || phaseHasPostLearning} className="bg-orange-500 hover:bg-orange-600 text-white">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Rocket className="w-4 h-4 mr-2" />}
          {tab === "manual"
            ? (submitting ? t("mockTestForms.common.creating", "Creating...") : t("mockTestForms.common.createActive", "Create"))
            : (submitting ? t("mockTestForms.common.generating", "Generating...") : t("mockTestForms.common.generateAI", "Generate with AI"))
          }
        </Button>
      </div>
    </div>
  );
}

export default CreatePostLearningForm;
