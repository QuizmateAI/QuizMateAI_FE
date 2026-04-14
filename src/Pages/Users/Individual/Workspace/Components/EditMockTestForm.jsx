import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/Components/ui/button";
import ListSpinner from "@/Components/ui/ListSpinner";
import { Plus, Trash2, Loader2, ClipboardList, ArrowLeft, Save, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  getSectionsByQuiz, getQuestionsBySection, getAnswersByQuestion,
  updateQuiz, updateQuestion, updateAnswer, deleteQuestion, deleteAnswer,
  createQuestion, createAnswer, QUESTION_TYPE_ID_MAP
} from "@/api/QuizAPI";

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

// Map loại câu hỏi frontend sang backend
const QUESTION_TYPE_MAP = {
  multipleChoice: 1, multipleSelect: 2, shortAnswer: 3, trueFalse: 4, fillBlank: 5,
};
const DIFFICULTY_MAP = { easy: "EASY", medium: "MEDIUM", hard: "HARD" };
const REVERSE_DIFFICULTY = { EASY: "easy", MEDIUM: "medium", HARD: "hard" };

/**
 * Form chỉnh sửa Mock Test — giao diện tím (purple) để phân biệt với EditQuizForm (xanh dương)
 * Logic hoàn toàn giống EditQuizForm, chỉ khác màu sắc + icon
 */
function EditMockTestForm({ isDarkMode = false, quiz, onBack, onSave, contextType = "ROADMAP", contextId }) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // State thông tin quiz
  const [name, setName] = useState(quiz?.title || "");
  // quiz.duration từ BE là giây → chuyển sang phút cho input
  const [duration, setDuration] = useState(() => {
    const raw = Number(quiz?.duration) || 0;
    if (!raw) return 60;
    const normalizedSeconds = raw >= 36000 ? Math.floor(raw / 60) : raw;
    return Math.max(1, Math.round(normalizedSeconds / 60));
  });
  const [passingScore, setPassingScore] = useState(quiz?.passScore || 7.5);
  const [maxAttempt, setMaxAttempt] = useState(quiz?.maxAttempt || 1);
  const [timerMode, setTimerMode] = useState(quiz?.timerMode ?? true);
  const [overallDifficulty, setOverallDifficulty] = useState(
    quiz?.overallDifficulty ? REVERSE_DIFFICULTY[quiz.overallDifficulty] || "medium" : "medium"
  );
  const [status, setStatus] = useState(quiz?.status || "ACTIVE");

  // State section và questions
  const [sectionId, setSectionId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [deletedQuestionIds, setDeletedQuestionIds] = useState([]);
  const [deletedAnswerIds, setDeletedAnswerIds] = useState([]);

  // Tải dữ liệu mock test hiện có: sections → questions → answers
  const loadExistingData = useCallback(async () => {
    if (!quiz?.quizId) return;
    setLoading(true);
    try {
      const sectRes = await getSectionsByQuiz(quiz.quizId);
      const sectionList = sectRes.data || [];
      const rootSection = sectionList.find((s) => s.sectionType === "ROOT") || sectionList[0];
      if (!rootSection) {
        setLoading(false);
        return;
      }
      setSectionId(rootSection.sectionId);

      const qRes = await getQuestionsBySection(rootSection.sectionId);
      const questionList = qRes.data || [];

      const formattedQuestions = [];
      for (const q of questionList) {
        const aRes = await getAnswersByQuestion(q.questionId);
        const answers = aRes.data || [];
        const typeName = QUESTION_TYPE_ID_MAP[q.questionTypeId] || "multipleChoice";

        const formatted = {
          questionId: q.questionId,
          isNew: false,
          type: typeName,
          text: q.content || "",
          difficulty: q.difficulty ? REVERSE_DIFFICULTY[q.difficulty] || "medium" : "medium",
          bloomId: q.bloomId || 1,
          duration: q.duration || 0,
          explanation: q.explanation || "",
          starred: q.isStarred ?? false,
        };

        if (typeName === "multipleChoice" || typeName === "multipleSelect") {
          formatted.answers = answers.map((a) => ({
            answerId: a.answerId,
            isNew: false,
            text: a.content || "",
            correct: a.isCorrect || false,
          }));
        } else if (typeName === "trueFalse") {
          const trueAns = answers.find((a) => a.content === "True");
          formatted.correctAnswer = trueAns?.isCorrect ? "true" : "false";
          formatted._tfAnswers = answers;
        } else {
          const correctAns = answers.find((a) => a.isCorrect);
          formatted.correctAnswer = correctAns?.content || "";
          formatted._singleAnswer = correctAns;
        }

        formattedQuestions.push(formatted);
      }
      setQuestions(formattedQuestions);
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu mock test:", err);
      setError(t("mockTestForms.edit.loadFailed", "Failed to load mock test data."));
    } finally {
      setLoading(false);
    }
  }, [quiz?.quizId, t]);

  useEffect(() => {
    loadExistingData();
  }, [loadExistingData]);

  // Thêm câu hỏi mới
  const addQuestion = () => {
    setQuestions((prev) => [...prev, {
      questionId: null,
      isNew: true,
      type: "multipleChoice", text: "", difficulty: "medium", bloomId: 1, duration: 0, explanation: "",
      answers: [
        { answerId: null, isNew: true, text: "", correct: false },
        { answerId: null, isNew: true, text: "", correct: false },
      ],
    }]);
  };

  // Xóa câu hỏi
  const removeQuestion = (idx) => {
    const q = questions[idx];
    if (q.questionId && !q.isNew) {
      setDeletedQuestionIds((prev) => [...prev, q.questionId]);
    }
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  // Cập nhật câu hỏi
  const updateQuestionField = (idx, field, value) => {
    setQuestions((prev) => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  };

  // Thêm đáp án
  const addAnswer = (qIdx) => {
    setQuestions((prev) => prev.map((q, i) =>
      i === qIdx ? { ...q, answers: [...(q.answers || []), { answerId: null, isNew: true, text: "", correct: false }] } : q
    ));
  };

  // Xóa đáp án
  const removeAnswer = (qIdx, aIdx) => {
    const q = questions[qIdx];
    const ans = q.answers?.[aIdx];
    if (ans?.answerId && !ans.isNew) {
      setDeletedAnswerIds((prev) => [...prev, ans.answerId]);
    }
    setQuestions((prev) => prev.map((qi, i) =>
      i === qIdx ? { ...qi, answers: qi.answers.filter((_, ai) => ai !== aIdx) } : qi
    ));
  };

  // Xử lý lưu mock test
  const handleSave = async () => {
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      if (!name.trim()) {
        setError(t("mockTestForms.common.nameRequired", "Please enter a name."));
        setSubmitting(false);
        return;
      }

      // Bước 1: Cập nhật thông tin quiz chung — contextType luôn là ROADMAP
      await updateQuiz(quiz.quizId, {
        workspaceId: contextType === 'WORKSPACE' ? Number(contextId) : null,
        roadmapId: Number(quiz.roadmapId || contextId),
        phaseId: null,
        knowledgeId: null,
        title: name,
        duration: (Number(duration) || 0) * 60,
        quizIntent: "MOCK_TEST",
        timerMode,
        status,
        maxAttempt: maxAttempt || null,
        passScore: passingScore || null,
        createVia: quiz.createVia || "MANUAL",
        overallDifficulty: DIFFICULTY_MAP[overallDifficulty] || null,
      });

      // Bước 2: Xóa answers đã đánh dấu
      for (const aId of deletedAnswerIds) {
        try { await deleteAnswer(aId); } catch (e) { console.warn("Lỗi xóa answer:", aId, e); }
      }

      // Bước 3: Xóa questions đã đánh dấu
      for (const qId of deletedQuestionIds) {
        try { await deleteQuestion(qId); } catch (e) { console.warn("Lỗi xóa question:", qId, e); }
      }

      // Bước 4: Cập nhật/tạo mới từng question
      for (const q of questions) {
        const questionTypeId = QUESTION_TYPE_MAP[q.type] || 1;
        const difficulty = DIFFICULTY_MAP[q.difficulty] || "MEDIUM";

        if (q.isNew) {
          const qRes = await createQuestion({
            quizSectionId: sectionId,
            questionTypeId,
            bloomId: q.bloomId || 1,
            duration: q.duration || 0,
            difficulty,
            content: q.text,
            explanation: q.explanation || "",
          });
          const newQuestionId = qRes.data?.questionId;

          if (q.type === "multipleChoice" || q.type === "multipleSelect") {
            for (const ans of (q.answers || [])) {
              await createAnswer({ questionId: newQuestionId, content: ans.text, isCorrect: ans.correct });
            }
          } else if (q.type === "trueFalse") {
            await createAnswer({ questionId: newQuestionId, content: "True", isCorrect: q.correctAnswer === "true" });
            await createAnswer({ questionId: newQuestionId, content: "False", isCorrect: q.correctAnswer !== "true" });
          } else {
            await createAnswer({ questionId: newQuestionId, content: q.correctAnswer || "", isCorrect: true });
          }
        } else {
          await updateQuestion(q.questionId, {
            questionTypeId,
            bloomId: q.bloomId || 1,
            duration: q.duration || 0,
            difficulty,
            content: q.text,
            explanation: q.explanation || "",
          });

          if (q.type === "multipleChoice" || q.type === "multipleSelect") {
            for (const ans of (q.answers || [])) {
              if (ans.isNew) {
                await createAnswer({ questionId: q.questionId, content: ans.text, isCorrect: ans.correct });
              } else if (ans.answerId) {
                await updateAnswer(ans.answerId, { content: ans.text, isCorrect: ans.correct });
              }
            }
          } else if (q.type === "trueFalse") {
            for (const tfAns of (q._tfAnswers || [])) {
              const isCorrect = (tfAns.content === "True" && q.correctAnswer === "true") || (tfAns.content === "False" && q.correctAnswer !== "true");
              await updateAnswer(tfAns.answerId, { content: tfAns.content, isCorrect });
            }
          } else {
            if (q._singleAnswer?.answerId) {
              await updateAnswer(q._singleAnswer.answerId, { content: q.correctAnswer || "", isCorrect: true });
            }
          }
        }
      }

      setSuccess(t("mockTestForms.edit.saveSuccess", "Mock test updated successfully!"));
      setDeletedQuestionIds([]);
      setDeletedAnswerIds([]);
      onSave?.({ quizId: quiz.quizId, title: name });
    } catch (err) {
      console.error("Lỗi khi lưu mock test:", err);
      setError(err.message || t("mockTestForms.edit.saveFailed", "Failed to save mock test. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = `w-full rounded-lg border px-3 py-2 text-sm outline-none transition-all ${
    isDarkMode ? "bg-slate-800 border-slate-700 text-white focus:border-purple-500 placeholder:text-slate-500"
              : "bg-white border-gray-300 text-gray-900 focus:border-purple-500 placeholder:text-gray-400"
  }`;
  const selectCls = `${inputCls} appearance-none cursor-pointer`;
  const labelCls = `block text-xs font-medium mb-1 ${isDarkMode ? "text-slate-400" : "text-gray-600"} ${fontClass}`;

  if (loading) {
    return <ListSpinner variant="section" />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header — icon tím */}
      <div className={`px-4 h-12 border-b flex items-center gap-3 shrink-0 transition-colors duration-300 ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <button type="button" onClick={onBack} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-gray-100 text-gray-600"}`}>
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-purple-500" />
          <p className={`text-base font-medium ${isDarkMode ? "text-slate-100" : "text-gray-800"} ${fontClass}`}>
            {t("mockTestForms.edit.title", "Edit Mock Test")}
          </p>
        </div>
      </div>

      {/* Form chỉnh sửa */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
          {t("mockTestForms.edit.desc", "Update mock test information, questions and answers.")}
        </p>

        {/* Thông báo lỗi/thành công */}
        {error && (
          <div className={`text-xs px-3 py-2 rounded-lg flex items-center gap-2 ${isDarkMode ? "bg-red-950/30 text-red-400" : "bg-red-50 text-red-600"}`}>
            <X className="w-3.5 h-3.5 shrink-0" />{error}
          </div>
        )}
        {success && (
          <div className={`text-xs px-3 py-2 rounded-lg flex items-center gap-2 ${isDarkMode ? "bg-emerald-950/30 text-emerald-400" : "bg-emerald-50 text-emerald-600"}`}>
            <Save className="w-3.5 h-3.5 shrink-0" />{success}
          </div>
        )}

        {/* Tên Mock Test */}
        <div>
          <label className={labelCls}>{t("mockTestForms.edit.name", "Mock Test Name")}</label>
          <input className={inputCls} placeholder={t("mockTestForms.edit.namePlaceholder", "Enter mock test name...")} value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        {/* Difficulty + Status */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>{t("mockTestForms.common.overallDifficulty", "Overall difficulty")}</label>
            <select className={selectCls} value={overallDifficulty} onChange={(e) => setOverallDifficulty(e.target.value)}>
              {DIFFICULTY_LEVELS.map((d) => <option key={d} value={d}>{t(`mockTestForms.common.difficulty${d.charAt(0).toUpperCase() + d.slice(1)}`, d)}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>{t("mockTestForms.edit.status", "Status")}</label>
            <select className={selectCls} value={status} onChange={(e) => setStatus(e.target.value)}>
              {["ACTIVE", "DRAFT"].map((s) => (
                <option key={s} value={s}>{t(`mockTestForms.common.status${s.charAt(0) + s.slice(1).toLowerCase()}`, s)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Toggle Timer Mode */}
        <div className="flex items-center gap-3">
          <label className={`flex items-center gap-2 cursor-pointer ${fontClass}`}>
            <input type="checkbox" checked={timerMode} onChange={(e) => setTimerMode(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
            <span className={`text-xs ${isDarkMode ? "text-slate-300" : "text-gray-600"}`}>{t("mockTestForms.common.timerMode", "Timer mode")}</span>
          </label>
          <span className={`text-[10px] ${isDarkMode ? "text-slate-500" : "text-gray-400"} ${fontClass}`}>
            {timerMode ? t("mockTestForms.common.timerModeHintOn", "Enabled: one overall duration for the test") : t("mockTestForms.common.timerModeHintOff", "Disabled: set duration per question")}
          </span>
        </div>

        {/* Duration + PassScore + MaxAttempt */}
        <div className={`grid ${timerMode ? "grid-cols-3" : "grid-cols-2"} gap-3`}>
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
          <div>
            <label className={labelCls}>{t("mockTestForms.common.maxAttempt", "Max attempts")}</label>
            <input type="number" className={inputCls} value={maxAttempt} onChange={(e) => setMaxAttempt(Number(e.target.value))} min={1} />
          </div>
        </div>

        {/* Danh sách câu hỏi */}
        <div className="space-y-3">
          <h4 className={`text-sm font-semibold ${isDarkMode ? "text-slate-200" : "text-gray-700"} ${fontClass}`}>
            {t("mockTestForms.edit.questionsSection", "Questions")} ({questions.length})
          </h4>

          {questions.map((q, qIdx) => (
            <div key={q.questionId || `new-${qIdx}`} className={`rounded-lg border p-3 space-y-2 ${
              q.isNew
                ? isDarkMode ? "border-purple-800/50 bg-purple-950/20" : "border-purple-200 bg-purple-50/30"
                : isDarkMode ? "border-slate-800 bg-slate-900/50" : "border-gray-200 bg-gray-50"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>#{qIdx + 1}</span>
                  {q.isNew && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${isDarkMode ? "bg-purple-900/50 text-purple-400" : "bg-purple-100 text-purple-600"}`}>
                      {t("mockTestForms.edit.newTag", "NEW")}
                    </span>
                  )}
                </div>
                <button onClick={() => removeQuestion(qIdx)} className="p-1 hover:bg-red-100 dark:hover:bg-red-950/30 rounded transition-all active:scale-95">
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                </button>
              </div>

              {/* Loại câu hỏi + Độ khó + Bloom */}
              <div className="grid grid-cols-3 gap-2">
                <select className={selectCls} value={q.type} onChange={(e) => updateQuestionField(qIdx, "type", e.target.value)}>
                  {QUESTION_TYPES.map((qt) => <option key={qt} value={qt}>{t(`mockTestForms.common.type${qt.charAt(0).toUpperCase() + qt.slice(1)}`, qt)}</option>)}
                </select>
                <select className={selectCls} value={q.difficulty} onChange={(e) => updateQuestionField(qIdx, "difficulty", e.target.value)}>
                  {DIFFICULTY_LEVELS.map((d) => <option key={d} value={d}>{t(`mockTestForms.common.difficulty${d.charAt(0).toUpperCase() + d.slice(1)}`, d)}</option>)}
                </select>
                <select className={selectCls} value={q.bloomId} onChange={(e) => updateQuestionField(qIdx, "bloomId", Number(e.target.value))}>
                  {BLOOM_LEVELS.map((b) => <option key={b.id} value={b.id}>{t(`mockTestForms.common.bloom${b.key.charAt(0).toUpperCase() + b.key.slice(1)}`, b.key)}</option>)}
                </select>
              </div>

              {/* Nội dung câu hỏi */}
              <input className={inputCls} placeholder={t("mockTestForms.common.questionText", "Question text")} value={q.text} onChange={(e) => updateQuestionField(qIdx, "text", e.target.value)} />

              {/* Duration (chỉ khi timerMode=false) + Explanation */}
              <div className={`grid ${!timerMode ? "grid-cols-2" : ""} gap-2`}>
                {!timerMode && (
                  <div>
                    <label className={labelCls}>{t("mockTestForms.common.questionDuration", "Question duration (s)")}</label>
                    <input type="number" className={inputCls} value={q.duration} onChange={(e) => updateQuestionField(qIdx, "duration", Number(e.target.value))} min={0} placeholder="0" />
                  </div>
                )}
                <div>
                  <label className={labelCls}>{t("mockTestForms.common.explanation", "Explanation")}</label>
                  <input className={inputCls} placeholder={t("mockTestForms.common.explanationPlaceholder", "Enter an explanation...")} value={q.explanation} onChange={(e) => updateQuestionField(qIdx, "explanation", e.target.value)} />
                </div>
              </div>

              {/* Đáp án cho multiple choice / multiple select */}
              {(q.type === "multipleChoice" || q.type === "multipleSelect") && (
                <div className="space-y-1.5 pl-2">
                  {(q.answers || []).map((a, aIdx) => (
                    <div key={a.answerId || `new-ans-${aIdx}`} className="flex items-center gap-2">
                      <input type={q.type === "multipleSelect" ? "checkbox" : "radio"} name={`edit-mt-q-${qIdx}`} checked={a.correct}
                        onChange={() => {
                          const newAnswers = q.answers.map((ans, ai) => ({
                            ...ans,
                            correct: q.type === "multipleSelect" ? (ai === aIdx ? !ans.correct : ans.correct) : ai === aIdx,
                          }));
                          updateQuestionField(qIdx, "answers", newAnswers);
                        }}
                      />
                      <input className={`${inputCls} flex-1`} placeholder={`${t("mockTestForms.common.answers", "Answer")} ${aIdx + 1}`} value={a.text}
                        onChange={(e) => {
                          const newAnswers = [...q.answers];
                          newAnswers[aIdx] = { ...newAnswers[aIdx], text: e.target.value };
                          updateQuestionField(qIdx, "answers", newAnswers);
                        }}
                      />
                      <button onClick={() => removeAnswer(qIdx, aIdx)} className="p-1 hover:bg-red-100 dark:hover:bg-red-950/30 rounded transition-all">
                        <Trash2 className="w-3 h-3 text-red-400" />
                      </button>
                    </div>
                  ))}
                  <button onClick={() => addAnswer(qIdx)} className="text-xs text-purple-500 hover:underline flex items-center gap-1 mt-1">
                    <Plus className="w-3 h-3" /> {t("mockTestForms.common.addAnswer", "Add answer")}
                  </button>
                </div>
              )}
              {q.type === "trueFalse" && (
                <select className={selectCls} value={q.correctAnswer || "true"}
                  onChange={(e) => updateQuestionField(qIdx, "correctAnswer", e.target.value)}>
                  <option value="true">{t("mockTestForms.common.booleanTrue", "True")}</option>
                  <option value="false">{t("mockTestForms.common.booleanFalse", "False")}</option>
                </select>
              )}
              {(q.type === "fillBlank" || q.type === "shortAnswer") && (
                <input className={inputCls} placeholder={t("mockTestForms.common.correctAnswer", "Correct answer")} value={q.correctAnswer || ""}
                  onChange={(e) => updateQuestionField(qIdx, "correctAnswer", e.target.value)} />
              )}
            </div>
          ))}

          <Button variant="outline" onClick={addQuestion} className={`w-full ${isDarkMode ? "border-slate-700 text-slate-300" : ""}`}>
            <Plus className="w-4 h-4 mr-2" /> {t("mockTestForms.common.addQuestion", "Add question")}
          </Button>
        </div>
      </div>

      {/* Nút lưu cố định dưới cùng — nút tím */}
      <div className={`px-4 py-3 border-t flex justify-end gap-2 shrink-0 transition-colors duration-300 ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <Button variant="outline" onClick={onBack} className={isDarkMode ? "border-slate-700 text-slate-300" : ""}>
          {t("mockTestForms.edit.cancel", "Cancel")}
        </Button>
        <Button onClick={handleSave} disabled={submitting} className="bg-purple-600 hover:bg-purple-700 text-white">
          {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          <Save className="w-4 h-4 mr-1" />
          {submitting ? t("mockTestForms.edit.saving", "Saving...") : t("mockTestForms.edit.save", "Save Changes")}
        </Button>
      </div>
    </div>
  );
}

export default EditMockTestForm;
