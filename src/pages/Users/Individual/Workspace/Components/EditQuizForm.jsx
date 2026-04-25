import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import ListSpinner from "@/components/ui/ListSpinner";
import { Plus, Trash2, Loader2, BadgeCheck, ArrowLeft, Save, X, MapPin, ArrowUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  getSectionsByQuiz, getQuestionsBySection, getAnswersByQuestion,
  updateQuiz, updateQuestion, updateAnswer, deleteQuestion, deleteAnswer,
  createQuestion, createAnswer, QUESTION_TYPE_ID_MAP
} from "@/api/QuizAPI";
import { QUIZ_TITLE_MAX_LENGTH, normalizeQuizTitleInput } from "./quizTitleConfig";

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

const convertSecondsToMinutes = (seconds) => {
  const numeric = Number(seconds);
  if (!Number.isFinite(numeric) || numeric <= 0) return 1;
  return Math.max(1, Math.ceil(numeric / 60));
};

// Form chỉnh sửa Quiz — tải dữ liệu hiện có và cho phép cập nhật
// presentationMode "createAligned" — cùng lớp layout/header/footer với màn Tạo Quiz (studio).
function EditQuizForm({
  isDarkMode = false,
  quiz,
  onBack,
  onSave,
  contextType = "WORKSPACE",
  contextId,
  presentationMode = "default",
  quizTitleMaxLength = QUIZ_TITLE_MAX_LENGTH,
}) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // State thông tin quiz
  const [name, setName] = useState(quiz?.title || "");
  const [duration, setDuration] = useState(convertSecondsToMinutes(quiz?.duration));
  const [timerMode, setTimerMode] = useState(quiz?.timerMode ?? true);
  const [overallDifficulty, setOverallDifficulty] = useState(
    quiz?.overallDifficulty ? REVERSE_DIFFICULTY[quiz.overallDifficulty] || "medium" : "medium"
  );
  const [status, setStatus] = useState(quiz?.status || "ACTIVE");
  const resolvedQuizTitleMaxLength = Number(quizTitleMaxLength);
  const hasQuizTitleMaxLength = Number.isFinite(resolvedQuizTitleMaxLength) && resolvedQuizTitleMaxLength > 0;

  // State section và questions — lưu sectionId gốc để liên kết
  const [sectionId, setSectionId] = useState(null);
  const [questions, setQuestions] = useState([]);
  // Track các question/answer đã xóa để gọi API delete
  const [deletedQuestionIds, setDeletedQuestionIds] = useState([]);
  const [deletedAnswerIds, setDeletedAnswerIds] = useState([]);
  const [jumpTarget, setJumpTarget] = useState("");

  // Tải dữ liệu quiz hiện có: sections → questions → answers
  const loadExistingData = useCallback(async () => {
    if (!quiz?.quizId) return;
    setLoading(true);
    try {
      // Lấy section gốc (ROOT)
      const sectRes = await getSectionsByQuiz(quiz.quizId);
      const sectionList = sectRes.data || [];
      const rootSection = sectionList.find((s) => s.sectionType === "ROOT") || sectionList[0];
      if (!rootSection) {
        setLoading(false);
        return;
      }
      setSectionId(rootSection.sectionId);

      // Lấy questions
      const qRes = await getQuestionsBySection(rootSection.sectionId);
      const questionList = qRes.data || [];

      // Lấy answers cho mỗi question và chuyển đổi sang format frontend
      const formattedQuestions = [];
      for (const q of questionList) {
        const aRes = await getAnswersByQuestion(q.questionId);
        const answers = aRes.data || [];
        const typeName = QUESTION_TYPE_ID_MAP[q.questionTypeId] || "multipleChoice";

        const formatted = {
          questionId: q.questionId, // Giữ ID gốc để update
          isNew: false,
          type: typeName,
          text: q.content || "",
          difficulty: q.difficulty ? REVERSE_DIFFICULTY[q.difficulty] || "medium" : "medium",
          bloomId: q.bloomId || 1,
          duration: q.duration || 0,
          explanation: q.explanation || "",
          starred: q.isStarred ?? false,
        };

        // Chuyển đổi answers dựa theo loại câu hỏi
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
          formatted._tfAnswers = answers; // Lưu để update sau
        } else {
          // fillBlank, shortAnswer
          const correctAns = answers.find((a) => a.isCorrect);
          formatted.correctAnswer = correctAns?.content || "";
          formatted._singleAnswer = correctAns; // Lưu để update sau
        }

        formattedQuestions.push(formatted);
      }
      setQuestions(formattedQuestions);
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu quiz:", err);
      setError(t("workspace.quiz.edit.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [quiz?.quizId, t]);

  useEffect(() => {
    loadExistingData();
  }, [loadExistingData]);

  // Thêm câu hỏi mới (chưa có trên server)
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

  // Xóa câu hỏi — lưu ID vào danh sách xóa nếu đã tồn tại trên server
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

  // Thêm đáp án cho câu hỏi
  const addAnswer = (qIdx) => {
    setQuestions((prev) => prev.map((q, i) =>
      i === qIdx ? { ...q, answers: [...(q.answers || []), { answerId: null, isNew: true, text: "", correct: false }] } : q
    ));
  };

  // Xóa đáp án — lưu ID vào danh sách xóa nếu đã tồn tại
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

  // Xử lý lưu quiz — gọi API cập nhật quiz, questions, answers
  const handleSave = async () => {
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const trimmedName = String(name ?? "").trim();

      if (!trimmedName) {
        setError(t("workspace.quiz.validation.nameRequired"));
        setSubmitting(false);
        return;
      }
      if (hasQuizTitleMaxLength && trimmedName.length > resolvedQuizTitleMaxLength) {
        setError(t("editQuizForm.nameMaxLength", {
          max: resolvedQuizTitleMaxLength,
          defaultValue: `Quiz title must be at most ${resolvedQuizTitleMaxLength} characters.`,
        }));
        setSubmitting(false);
        return;
      }

      // Bước 1: Cập nhật thông tin quiz chung
      await updateQuiz(quiz.quizId, {
        workspaceId: contextType === 'WORKSPACE' ? Number(contextId) : null,
        roadmapId: contextType === 'ROADMAP' ? Number(contextId) : null,
        phaseId: contextType === 'PHASE' ? Number(contextId) : null,
        knowledgeId: contextType === 'KNOWLEDGE' ? Number(contextId) : null,
        title: trimmedName,
        duration: Math.max(1, Number(duration) || 1) * 60,
        timerMode,
        status,
        maxAttempt: 0,
        passScore: 0,
        createVia: quiz.createVia || "MANUAL",
        overallDifficulty: DIFFICULTY_MAP[overallDifficulty] || null,
      });

      // Bước 2: Xóa các answers đã đánh dấu xóa
      for (const aId of deletedAnswerIds) {
        try { await deleteAnswer(aId); } catch (e) { console.warn("Lỗi xóa answer:", aId, e); }
      }

      // Bước 3: Xóa các questions đã đánh dấu xóa
      for (const qId of deletedQuestionIds) {
        try { await deleteQuestion(qId); } catch (e) { console.warn("Lỗi xóa question:", qId, e); }
      }

      // Bước 4: Cập nhật/tạo mới từng question
      for (const q of questions) {
        const questionTypeId = QUESTION_TYPE_MAP[q.type] || 1;
        const difficulty = DIFFICULTY_MAP[q.difficulty] || "MEDIUM";

        if (q.isNew) {
          // Tạo question mới
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

          // Tạo answers cho question mới
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
          // Cập nhật question đã tồn tại
          await updateQuestion(q.questionId, {
            questionTypeId,
            bloomId: q.bloomId || 1,
            duration: q.duration || 0,
            difficulty,
            content: q.text,
            explanation: q.explanation || "",
          });

          // Cập nhật/tạo answers
          if (q.type === "multipleChoice" || q.type === "multipleSelect") {
            for (const ans of (q.answers || [])) {
              if (ans.isNew) {
                await createAnswer({ questionId: q.questionId, content: ans.text, isCorrect: ans.correct });
              } else if (ans.answerId) {
                await updateAnswer(ans.answerId, { content: ans.text, isCorrect: ans.correct });
              }
            }
          } else if (q.type === "trueFalse") {
            // Cập nhật 2 answer True/False
            for (const tfAns of (q._tfAnswers || [])) {
              const isCorrect = (tfAns.content === "True" && q.correctAnswer === "true") || (tfAns.content === "False" && q.correctAnswer !== "true");
              await updateAnswer(tfAns.answerId, { content: tfAns.content, isCorrect });
            }
          } else {
            // fillBlank, shortAnswer — cập nhật đáp án duy nhất
            if (q._singleAnswer?.answerId) {
              await updateAnswer(q._singleAnswer.answerId, { content: q.correctAnswer || "", isCorrect: true });
            }
          }
        }
      }

      setSuccess(t("workspace.quiz.edit.saveSuccess"));
      setDeletedQuestionIds([]);
      setDeletedAnswerIds([]);

      // Gọi callback cha
      onSave?.({ quizId: quiz.quizId, title: name });
    } catch (err) {
      console.error("Lỗi khi lưu quiz:", err);
      setError(err.message || t("workspace.quiz.edit.saveFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = `w-full rounded-lg border px-3 py-2 text-sm outline-none transition-all ${
    isDarkMode ? "bg-slate-800 border-slate-700 text-white focus:border-blue-500 placeholder:text-slate-500"
              : "bg-white border-gray-300 text-gray-900 focus:border-blue-500 placeholder:text-gray-400"
  }`;
  const selectCls = `${inputCls} appearance-none cursor-pointer`;
  const labelCls = `block text-xs font-medium mb-1 ${isDarkMode ? "text-slate-400" : "text-gray-600"} ${fontClass}`;
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

  const jumpToQuestion = (value) => {
    const v = Number(value);
    if (!Number.isFinite(v) || v < 1 || v > questions.length) return;
    setJumpTarget(String(v));
    scrollToQuestion(v - 1);
  };

  const scrollToQuestion = (idx) => {
    document.getElementById(`quiz-q-${idx}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  if (loading) {
    return <ListSpinner variant="section" />;
  }

  const aligned = presentationMode === "createAligned";
  const headerPad = aligned ? "px-3" : "px-4";
  const scrollPad = aligned ? "p-3 space-y-3" : "p-4 space-y-4";
  const titleKey = aligned ? "workspace.quiz.createTitle" : "workspace.quiz.edit.title";
  const descKey = aligned ? "workspace.quiz.challengeDraftDesc" : "workspace.quiz.edit.desc";
  const amberHintClass = aligned
    ? `rounded-lg border px-3 py-2 text-xs ${isDarkMode ? "border-amber-900/40 bg-amber-950/30 text-amber-300" : "border-amber-200 bg-amber-50 text-amber-700"}`
    : `text-xs px-3 py-2 rounded-lg ${isDarkMode ? "bg-amber-950/30 text-amber-300 border border-amber-900/40" : "bg-amber-50 text-amber-700 border border-amber-200"}`;
  const footerPad = aligned ? "px-3 py-2.5" : "px-4 py-3";
  const cancelLabelKey = aligned ? "workspace.quiz.cancel" : "workspace.quiz.edit.cancel";

  return (
    <div id="create-quiz-header" className="flex h-full flex-col scroll-mt-20">
      {/* Header */}
      <div className={`${headerPad} flex h-12 shrink-0 items-center gap-3 border-b transition-colors duration-300 ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <button
          type="button"
          onClick={onBack}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${isDarkMode ? "text-slate-300 hover:bg-slate-800" : "text-gray-600 hover:bg-gray-100"}`}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className={`flex items-center gap-2 ${aligned ? "min-w-0 flex-1" : ""}`}>
          <BadgeCheck className="h-5 w-5 shrink-0 text-blue-500" />
          <p className={`text-base font-medium ${isDarkMode ? "text-slate-100" : "text-gray-800"} ${fontClass}`}>
            {t(titleKey)}
          </p>
        </div>
      </div>

      {/* Form chỉnh sửa */}
      <div id="create-quiz-scroll-root" className={`flex-1 overflow-y-auto ${scrollPad}`}>
        <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
          {t(descKey)}
        </p>

        <div className={`${amberHintClass} ${fontClass}`}>
          {t("workspace.quiz.validation.requiredFieldsHint")}
        </div>

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

        {/* Tên Quiz */}
        <div>
          <label className={labelCls}>{t("workspace.quiz.name")}{requiredMark}</label>
          <input
            className={inputCls}
            placeholder={t("workspace.quiz.namePlaceholder")}
            value={name}
            maxLength={hasQuizTitleMaxLength ? resolvedQuizTitleMaxLength : undefined}
            onChange={(e) => setName(normalizeQuizTitleInput(e.target.value, quizTitleMaxLength))}
          />
          {hasQuizTitleMaxLength ? (
            <p className={`mt-1 text-[11px] ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
              {t("editQuizForm.nameMaxLengthHint", {
                max: resolvedQuizTitleMaxLength,
                defaultValue: `Maximum ${resolvedQuizTitleMaxLength} characters.`,
              })}
            </p>
          ) : null}
        </div>

        <div>
          <label className={labelCls}>{t("workspace.quiz.overallDifficulty")}{requiredMark}</label>
          <select className={selectCls} value={overallDifficulty} onChange={(e) => setOverallDifficulty(e.target.value)}>
            {DIFFICULTY_LEVELS.map((d) => <option key={d} value={d}>{t(`workspace.quiz.difficultyLevels.${d}`)}</option>)}
          </select>
        </div>

        {/* Status */}
        <div>
          <label className={labelCls}>{t("workspace.quiz.edit.status")}</label>
          <select className={selectCls} value={status} onChange={(e) => setStatus(e.target.value)}>
            {["ACTIVE", "DRAFT"].map((s) => (
              <option key={s} value={s}>{t(`workspace.quiz.statusLabels.${s}`)}</option>
            ))}
          </select>
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

        {/* Duration — hiển thị theo phút, gửi BE theo giây */}
        <div className="grid grid-cols-1 gap-3">
          {timerMode && (
            <div>
              <label className={labelCls}>{t("workspace.quiz.timeDuration")}{requiredMark} (min)</label>
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
        </div>

        {/* Danh sách câu hỏi */}
        <div className="space-y-3">
          <h4 className={`text-sm font-semibold ${isDarkMode ? "text-slate-200" : "text-gray-700"} ${fontClass}`}>
            {t("workspace.quiz.edit.questionsSection")} ({questions.length})
          </h4>

          {questions.length > 0 && (
            <div className={`rounded-lg border p-3 space-y-2 ${isDarkMode ? "border-slate-700 bg-slate-800/30" : "border-blue-200 bg-blue-50/30"}`}>
              <div className="flex items-center gap-2 min-w-0">
                <span className={`text-xs font-semibold ${isDarkMode ? "text-blue-300" : "text-blue-700"} ${fontClass}`}>
                  {t("workspace.quiz.navigator.title")}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {questions.map((q, idx) => {
                  const difficultyBorder = q.difficulty === "easy"
                    ? (isDarkMode ? "border-green-500/60" : "border-green-400")
                    : q.difficulty === "hard"
                      ? (isDarkMode ? "border-red-500/60" : "border-red-400")
                      : (isDarkMode ? "border-amber-500/60" : "border-amber-400");

                  return (
                    <button
                      key={q.questionId || `q-nav-${idx}`}
                      type="button"
                      onClick={() => scrollToQuestion(idx)}
                      className={`w-8 h-8 rounded-lg text-[11px] font-semibold border-2 flex items-center justify-center transition-all active:scale-95 ${difficultyBorder} ${isDarkMode ? "bg-slate-800 text-slate-200 hover:bg-slate-700" : "bg-white text-gray-700 hover:bg-gray-100"}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
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
                  value={jumpTarget}
                  onChange={(e) => setJumpTarget(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      jumpToQuestion(e.currentTarget.value);
                    }
                  }}
                />
                <select
                  className={`text-xs rounded-md border px-2 py-1.5 min-w-[110px] ${isDarkMode ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-white border-gray-300 text-gray-700"}`}
                  value={jumpTarget}
                  onChange={(e) => jumpToQuestion(e.target.value)}
                >
                  <option value="">{t("editQuizForm.selectQuestion", { defaultValue: "Select a question" })}</option>
                  {questions.map((q, idx) => (
                    <option key={q.questionId || `jump-${idx}`} value={idx + 1}>
                      {t("editQuizForm.questionOption", { defaultValue: "Question {{number}}", number: idx + 1 })}
                    </option>
                  ))}
                </select>
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

          {questions.map((q, qIdx) => (
            <div id={`quiz-q-${qIdx}`} key={q.questionId || `new-${qIdx}`} className={`rounded-lg border p-3 space-y-2 ${
              q.isNew
                ? isDarkMode ? "border-blue-800/50 bg-blue-950/20" : "border-blue-200 bg-blue-50/30"
                : isDarkMode ? "border-slate-800 bg-slate-900/50" : "border-gray-200 bg-gray-50"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>#{qIdx + 1}</span>
                  {q.isNew && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${isDarkMode ? "bg-blue-900/50 text-blue-400" : "bg-blue-100 text-blue-600"}`}>
                      {t("workspace.quiz.edit.newTag")}
                    </span>
                  )}
                </div>
                <button type="button" onClick={() => removeQuestion(qIdx)} className="p-1 hover:bg-red-100 dark:hover:bg-red-950/30 rounded transition-all active:scale-95">
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                </button>
              </div>

              {/* Loại câu hỏi + Độ khó + Bloom */}
              <div className="grid grid-cols-3 gap-2">
                <select className={selectCls} value={q.type} onChange={(e) => updateQuestionField(qIdx, "type", e.target.value)}>
                  {QUESTION_TYPES.map((qt) => <option key={qt} value={qt}>{t(`workspace.quiz.types.${qt}`)}</option>)}
                </select>
                <select className={selectCls} value={q.difficulty} onChange={(e) => updateQuestionField(qIdx, "difficulty", e.target.value)}>
                  {DIFFICULTY_LEVELS.map((d) => <option key={d} value={d}>{t(`workspace.quiz.difficultyLevels.${d}`)}</option>)}
                </select>
                <select className={selectCls} value={q.bloomId} onChange={(e) => updateQuestionField(qIdx, "bloomId", Number(e.target.value))}>
                  {BLOOM_LEVELS.map((b) => <option key={b.id} value={b.id}>{t(`workspace.quiz.bloomLevels.${b.key}`)}</option>)}
                </select>
              </div>

              {/* Nội dung câu hỏi */}
              <input className={inputCls} placeholder={t("workspace.quiz.questionText")} value={q.text} onChange={(e) => updateQuestionField(qIdx, "text", e.target.value)} />

              {/* Duration (chỉ khi timerMode=false) + Explanation */}
              <div className={`grid ${!timerMode ? "grid-cols-2" : ""} gap-2`}>
                {!timerMode && (
                  <div>
                    <label className={labelCls}>{t("workspace.quiz.questionDuration")}</label>
                    <input type="number" className={inputCls} value={q.duration} onChange={(e) => updateQuestionField(qIdx, "duration", Number(e.target.value))} min={0} placeholder="0" />
                  </div>
                )}
                <div>
                  <label className={labelCls}>{t("workspace.quiz.explanation")}</label>
                  <input className={inputCls} placeholder={t("workspace.quiz.explanationPlaceholder")} value={q.explanation} onChange={(e) => updateQuestionField(qIdx, "explanation", e.target.value)} />
                </div>
              </div>

              {/* Đáp án cho multiple choice / multiple select */}
              {(q.type === "multipleChoice" || q.type === "multipleSelect") && (
                <div className="space-y-1.5 pl-2">
                  {(q.answers || []).map((a, aIdx) => (
                    <div key={a.answerId || `new-ans-${aIdx}`} className="flex items-center gap-2">
                      <input type={q.type === "multipleSelect" ? "checkbox" : "radio"} name={`edit-q-${qIdx}`} checked={a.correct}
                        onChange={() => {
                          const newAnswers = q.answers.map((ans, ai) => ({
                            ...ans,
                            correct: q.type === "multipleSelect" ? (ai === aIdx ? !ans.correct : ans.correct) : ai === aIdx,
                          }));
                          updateQuestionField(qIdx, "answers", newAnswers);
                        }}
                      />
                      <input className={`${inputCls} flex-1`} placeholder={`${t("workspace.quiz.answers")} ${aIdx + 1}`} value={a.text}
                        onChange={(e) => {
                          const newAnswers = [...q.answers];
                          newAnswers[aIdx] = { ...newAnswers[aIdx], text: e.target.value };
                          updateQuestionField(qIdx, "answers", newAnswers);
                        }}
                      />
                      <button type="button" onClick={() => removeAnswer(qIdx, aIdx)} className="p-1 hover:bg-red-100 dark:hover:bg-red-950/30 rounded transition-all">
                        <Trash2 className="w-3 h-3 text-red-400" />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => addAnswer(qIdx)} className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-1">
                    <Plus className="w-3 h-3" /> {t("workspace.quiz.addAnswer")}
                  </button>
                </div>
              )}
              {q.type === "trueFalse" && (
                <select className={selectCls} value={q.correctAnswer || "true"}
                  onChange={(e) => updateQuestionField(qIdx, "correctAnswer", e.target.value)}>
                  <option value="true">{t("common.boolean.true")}</option>
                  <option value="false">{t("common.boolean.false")}</option>
                </select>
              )}
              {(q.type === "fillBlank" || q.type === "shortAnswer") && (
                <input className={inputCls} placeholder={t("workspace.quiz.correctAnswer")} value={q.correctAnswer || ""}
                  onChange={(e) => updateQuestionField(qIdx, "correctAnswer", e.target.value)} />
              )}
            </div>
          ))}

          <Button variant="outline" onClick={addQuestion} className={`w-full ${isDarkMode ? "border-slate-700 text-slate-300" : ""}`}>
            <Plus className="w-4 h-4 mr-2" /> {t("workspace.quiz.addQuestion")}
          </Button>
        </div>
      </div>

      {/* Nút lưu cố định dưới cùng */}
      <div className={`${footerPad} flex shrink-0 justify-end gap-2 border-t transition-colors duration-300 ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <Button variant="outline" onClick={onBack} className={isDarkMode ? "border-slate-700 text-slate-300" : ""}>
          {t(cancelLabelKey)}
        </Button>
        <Button onClick={handleSave} disabled={submitting} className="bg-[#2563EB] hover:bg-blue-700 text-white">
          {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          <Save className="w-4 h-4 mr-1" />
          {submitting ? t("workspace.quiz.edit.saving") : t("workspace.quiz.edit.save")}
        </Button>
      </div>
    </div>
  );
}

export default EditQuizForm;
