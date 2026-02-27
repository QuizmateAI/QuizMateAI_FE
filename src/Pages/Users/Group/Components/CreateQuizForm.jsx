import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Loader2, BadgeCheck, ArrowLeft, MapPin, RefreshCw, Save, Rocket } from "lucide-react";
import { useTranslation } from "react-i18next";
import { createFullQuiz, getQuizzesByContext } from "@/api/QuizAPI";
import { getRoadmapsByGroup, getPhasesByRoadmap, getKnowledgesByPhase } from "@/api/RoadmapAPI";

// Danh sách dạng câu hỏi và độ khó
const QUESTION_TYPES = ["multipleChoice", "multipleSelect", "trueFalse", "fillBlank", "shortAnswer"];
const DIFFICULTY_LEVELS = ["easy", "medium", "hard"];
const QUIZ_INTENTS = ["PRE_LEARNING", "POST_LEARNING", "REVIEW"];
const BLOOM_LEVELS = [
  { id: 1, key: "remember" },
  { id: 2, key: "understand" },
  { id: 3, key: "apply" },
  { id: 4, key: "analyze" },
  { id: 5, key: "evaluate" },
];
// Form tạo Quiz cho Group — hiển thị inline trong ChatPanel thay vì popup
// Quiz chỉ tạo trong KNOWLEDGE context (cascade: roadmap → phase → knowledge)
function CreateQuizForm({ isDarkMode = false, onCreateQuiz, onBack, contextType: defaultContextType = "GROUP", contextId: defaultContextId }) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const [tab, setTab] = useState("manual");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // State quản lý vị trí tạo quiz — luôn dùng KNOWLEDGE context
  const [selectedContextType] = useState("KNOWLEDGE");
  const [selectedContextId, setSelectedContextId] = useState("");
  const [contextLoading, setContextLoading] = useState(false);

  // Dữ liệu cascade dropdown: roadmap → phase → knowledge (từ group hiện tại)
  const [roadmaps, setRoadmaps] = useState([]);
  const [phases, setPhases] = useState([]);
  const [knowledges, setKnowledges] = useState([]);
  const [selectedRoadmapId, setSelectedRoadmapId] = useState("");
  const [selectedPhaseId, setSelectedPhaseId] = useState("");

  // Tải danh sách roadmap từ group hiện tại
  const loadRoadmaps = useCallback(async () => {
    if (!defaultContextId) return;
    setContextLoading(true);
    try {
      const res = await getRoadmapsByGroup(defaultContextId, 0, 100);
      setRoadmaps(res.data?.content || res.data || []);
    } catch (e) {
      console.error("Lỗi tải roadmaps:", e);
    } finally {
      setContextLoading(false);
    }
  }, [defaultContextId]);

  // Tự động tải roadmaps khi mount (luôn cần cho cascade KNOWLEDGE)
  useEffect(() => {
    loadRoadmaps();
  }, [loadRoadmaps]);

  // Khi chọn roadmap — tải phases cho PHASE/KNOWLEDGE
  const handleRoadmapSelect = useCallback(async (roadmapId) => {
    setSelectedRoadmapId(roadmapId);
    setPhases([]);
    setKnowledges([]);
    setSelectedPhaseId("");
    if (!roadmapId) { setSelectedContextId(""); return; }
    setContextLoading(true);
    try {
      const res = await getPhasesByRoadmap(roadmapId, 0, 100);
      setPhases(res.data?.content || res.data || []);
    } catch (e) {
      console.error("Lỗi tải phases:", e);
    } finally {
      setContextLoading(false);
    }
  }, [selectedContextType]);

  // Khi chọn phase — tải knowledges (luôn KNOWLEDGE context)
  const handlePhaseSelect = useCallback(async (phaseId) => {
    setSelectedPhaseId(phaseId);
    setKnowledges([]);
    setSelectedContextId("");
    if (!phaseId) return;
    setContextLoading(true);
    try {
      const res = await getKnowledgesByPhase(phaseId, 0, 100);
      setKnowledges(res.data?.content || res.data || []);
    } catch (e) {
      console.error("Lỗi tải knowledges:", e);
    } finally {
      setContextLoading(false);
    }
  }, []);

  // Khi chọn knowledge — set contextId
  const handleKnowledgeSelect = (knowledgeId) => {
    setSelectedContextId(knowledgeId);
  };

  // Hàm reload cho từng cấp dropdown
  const reloadRoadmaps = () => {
    setSelectedRoadmapId("");
    setPhases([]);
    setKnowledges([]);
    setSelectedPhaseId("");
    loadRoadmaps();
  };

  const reloadPhases = async () => {
    if (!selectedRoadmapId) return;
    setSelectedPhaseId("");
    setKnowledges([]);
    setSelectedContextId("");
    setContextLoading(true);
    try {
      const res = await getPhasesByRoadmap(selectedRoadmapId, 0, 100);
      setPhases(res.data?.content || res.data || []);
    } catch (e) {
      console.error("Lỗi tải phases:", e);
    } finally {
      setContextLoading(false);
    }
  };

  const reloadKnowledges = async () => {
    if (!selectedPhaseId) return;
    setSelectedContextId("");
    setContextLoading(true);
    try {
      const res = await getKnowledgesByPhase(selectedPhaseId, 0, 100);
      setKnowledges(res.data?.content || res.data || []);
    } catch (e) {
      console.error("Lỗi tải knowledges:", e);
    } finally {
      setContextLoading(false);
    }
  };

  // State cho tab Manual
  const [name, setName] = useState("");
  const [duration, setDuration] = useState(30);
  const [passingScore, setPassingScore] = useState(7.5);
  const [maxAttempt, setMaxAttempt] = useState(3);
  const [quizIntent, setQuizIntent] = useState("PRE_LEARNING");
  const [timerMode, setTimerMode] = useState(true);
  const [overallDifficulty, setOverallDifficulty] = useState("medium");
  const [questions, setQuestions] = useState([]);

  // State cho tab AI
  const [aiName, setAiName] = useState("");
  const [aiDifficulty, setAiDifficulty] = useState("medium");
  const [aiTotalQuestions, setAiTotalQuestions] = useState(20);
  const [aiDuration, setAiDuration] = useState(30);
  const [aiPrompt, setAiPrompt] = useState("");

  // Thêm câu hỏi mới (manual)
  const addQuestion = () => {
    setQuestions((prev) => [...prev, {
      type: "multipleChoice", text: "", difficulty: "medium", bloomId: 1, duration: 0, explanation: "",
      answers: [{ text: "", correct: false }, { text: "", correct: false }],
    }]);
  };

  // Xóa câu hỏi
  const removeQuestion = (idx) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  // Cập nhật câu hỏi
  const updateQuestion = (idx, field, value) => {
    setQuestions((prev) => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  };

  // Thêm đáp án
  const addAnswer = (qIdx) => {
    setQuestions((prev) => prev.map((q, i) =>
      i === qIdx ? { ...q, answers: [...q.answers, { text: "", correct: false }] } : q
    ));
  };

  // Xử lý submit — gọi API tạo quiz hoàn chỉnh (multi-step)
  const handleSubmit = async (quizStatus = "ACTIVE") => {
    setSubmitting(true);
    setError("");
    try {
      if (tab === "manual") {
        // Validate cơ bản
        if (!name.trim()) {
          setError(t("workspace.quiz.validation.nameRequired"));
          setSubmitting(false);
          return;
        }

        // Kiểm tra giới hạn: mỗi PHASE chỉ được 1 POST_LEARNING quiz
        if (selectedContextType === "PHASE" && quizIntent === "POST_LEARNING" && selectedContextId) {
          try {
            const existingRes = await getQuizzesByContext("PHASE", Number(selectedContextId));
            const existingQuizzes = existingRes.data || [];
            const hasPostLearning = existingQuizzes.some(q => q.quizIntent === "POST_LEARNING");
            if (hasPostLearning) {
              setError(t("workspace.quiz.validation.postLearningLimit"));
              setSubmitting(false);
              return;
            }
          } catch (e) {
            console.error("Lỗi kiểm tra giới hạn quiz:", e);
          }
        }

        // Gọi API tạo quiz hoàn chỉnh (multi-step: quiz → session → questions → answers)
        const result = await createFullQuiz({
          contextType: selectedContextType,
          contextId: Number(selectedContextId),
          title: name,
          duration,
          quizIntent,
          timerMode,
          passingScore,
          maxAttempt,
          overallDifficulty,
          questions,
          status: quizStatus,
        });

        // Thông báo component cha quiz đã được tạo thành công
        await onCreateQuiz?.({ quizId: result.quizId, title: result.title, ...result });
      } else {
        // Tab AI — vẫn gọi callback component cha (chưa có API AI)
        const data = {
          mode: "ai",
          name: aiName,
          difficulty: aiDifficulty,
          totalQuestions: aiTotalQuestions,
          duration: aiDuration,
          prompt: aiPrompt,
        };
        await onCreateQuiz?.(data);
      }
    } catch (err) {
      console.error("Lỗi khi tạo quiz:", err);
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
      ? isDarkMode ? "bg-slate-800 text-blue-300" : "bg-white text-blue-700 shadow-sm"
      : isDarkMode ? "text-slate-400 hover:text-slate-200" : "text-gray-500 hover:text-gray-700"
  }`;

  const labelCls = `block text-xs font-medium mb-1 ${isDarkMode ? "text-slate-400" : "text-gray-600"} ${fontClass}`;

  return (
    <div className="flex flex-col h-full">
      {/* Header với nút quay lại */}
      <div className={`px-4 h-12 border-b flex items-center gap-3 shrink-0 transition-colors duration-300 ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <button type="button" onClick={onBack} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-gray-100 text-gray-600"}`}>
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <BadgeCheck className="w-5 h-5 text-blue-500" />
          <p className={`text-base font-medium ${isDarkMode ? "text-slate-100" : "text-gray-800"} ${fontClass}`}>
            {t("workspace.quiz.createTitle")}
          </p>
        </div>
      </div>

      {/* Nội dung form cuộn được */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
          {t("workspace.quiz.createDesc")}
        </p>

        {/* Tab chọn chế độ */}
        <div className={`flex gap-1 rounded-lg p-1 ${isDarkMode ? "bg-slate-800" : "bg-gray-100"}`}>
          <button type="button" onClick={() => setTab("manual")} className={tabCls("manual")}>{t("workspace.quiz.tabManual")}</button>
          <button type="button" onClick={() => setTab("ai")} className={tabCls("ai")}>{t("workspace.quiz.tabAI")}</button>
        </div>

        {tab === "manual" ? (
          <div className="space-y-4">
            <div>
              <label className={labelCls}>{t("workspace.quiz.name")}</label>
              <input className={inputCls} placeholder={t("workspace.quiz.namePlaceholder")} value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            {/* Chọn kiến thức (cascade: roadmap → phase → knowledge) */}
            <div className={`rounded-lg border p-3 space-y-3 ${isDarkMode ? "border-slate-700 bg-slate-800/30" : "border-blue-200 bg-blue-50/30"}`}>
              <div className="flex items-center gap-2 mb-1">
                <MapPin className={`w-4 h-4 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`} />
                <span className={`text-xs font-semibold ${isDarkMode ? "text-blue-300" : "text-blue-700"} ${fontClass}`}>
                  {t("workspace.quiz.contextSelector.selectKnowledge")}
                </span>
              </div>

              {/* Chọn roadmap */}
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
              </div>

              {/* Chọn phase */}
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
                </div>
              )}

              {/* Chọn knowledge */}
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
                </div>
              )}
            </div>

            {/* Cấu hình Quiz Intent và Timer */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{t("workspace.quiz.intent")}</label>
                <select className={selectCls} value={quizIntent} onChange={(e) => setQuizIntent(e.target.value)}>
                  {QUIZ_INTENTS.map((intent) => <option key={intent} value={intent}>{t(`workspace.quiz.intentLabels.${intent}`)}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>{t("workspace.quiz.overallDifficulty")}</label>
                <select className={selectCls} value={overallDifficulty} onChange={(e) => setOverallDifficulty(e.target.value)}>
                  {DIFFICULTY_LEVELS.map((d) => <option key={d} value={d}>{t(`workspace.quiz.difficultyLevels.${d}`)}</option>)}
                </select>
              </div>
            </div>

            {/* Toggle Timer Mode */}
            <div className="flex items-center gap-3">
              <label className={`flex items-center gap-2 cursor-pointer ${fontClass}`}>
                <input type="checkbox" checked={timerMode} onChange={(e) => setTimerMode(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <span className={`text-xs ${isDarkMode ? "text-slate-300" : "text-gray-600"}`}>{t("workspace.quiz.timerMode")}</span>
              </label>
              <span className={`text-[10px] ${isDarkMode ? "text-slate-500" : "text-gray-400"} ${fontClass}`}>
                {timerMode ? t("workspace.quiz.timerModeHintOn") : t("workspace.quiz.timerModeHintOff")}
              </span>
            </div>

            <div className={`grid ${timerMode ? "grid-cols-3" : "grid-cols-2"} gap-3`}>
              {/* Thời lượng tổng — chỉ hiện khi timerMode=true */}
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
              <div>
                <label className={labelCls}>{t("workspace.quiz.maxAttempt")}</label>
                <input type="number" className={inputCls} value={maxAttempt} onChange={(e) => setMaxAttempt(Number(e.target.value))} min={1} />
              </div>
            </div>

            {/* Thông báo lỗi */}
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

                  {/* Loại câu hỏi + Độ khó + Bloom */}
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

                  {/* Nội dung câu hỏi */}
                  <input className={inputCls} placeholder={t("workspace.quiz.questionText")} value={q.text} onChange={(e) => updateQuestion(qIdx, "text", e.target.value)} />

                  {/* Thời gian mỗi câu (giây) — chỉ hiện khi timerMode=false */}
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

                  {/* Đáp án cho multiple choice / multiple select */}
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
                    <select className={selectCls} value={q.correctAnswer || "true"}
                      onChange={(e) => updateQuestion(qIdx, "correctAnswer", e.target.value)}>
                      <option value="true">True</option>
                      <option value="false">False</option>
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
              <label className={labelCls}>{t("workspace.quiz.name")}</label>
              <input className={inputCls} placeholder={t("workspace.quiz.namePlaceholder")} value={aiName} onChange={(e) => setAiName(e.target.value)} />
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

      {/* Nút hành động cố định dưới cùng */}
      <div className={`px-4 py-3 border-t flex justify-end gap-2 shrink-0 transition-colors duration-300 ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <Button variant="outline" onClick={onBack} className={isDarkMode ? "border-slate-700 text-slate-300" : ""}>
          {t("workspace.quiz.cancel")}
        </Button>
        {tab === "manual" && (
          <Button variant="outline" onClick={() => handleSubmit("DRAFT")} disabled={submitting}
            className={`${isDarkMode ? "border-slate-600 text-slate-300 hover:bg-slate-800" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            {t("workspace.quiz.saveDraft")}
          </Button>
        )}
        <Button onClick={() => handleSubmit("ACTIVE")} disabled={submitting} className="bg-[#2563EB] hover:bg-blue-700 text-white">
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

export default CreateQuizForm;