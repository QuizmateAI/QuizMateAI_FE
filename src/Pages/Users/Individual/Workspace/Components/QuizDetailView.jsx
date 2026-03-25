import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft, BadgeCheck, Timer, BarChart3, Clock, Loader2, Edit3, Star,
  ChevronDown, ChevronRight, Target, BookOpen, Hash, CheckCircle2, Play, ClipboardCheck, History, Info, List, Users
} from "lucide-react";
import { Button } from "@/Components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/Components/ui/dialog";
import {
  getSectionsByQuiz, getQuestionsBySection, getAnswersByQuestion, toggleStarQuestion, QUESTION_TYPE_ID_MAP, updateQuiz, getQuizFull, getQuizHistory
} from "@/api/QuizAPI";
import { useToast } from "@/context/ToastContext";
import { hasQuizCompleted } from "@/Utils/quizAttemptTracker";

// Cấu hình màu badge trạng thái quiz
const STATUS_STYLES = {
  ACTIVE: { light: "bg-emerald-100 text-emerald-700", dark: "bg-emerald-950/50 text-emerald-400" },
  DRAFT: { light: "bg-amber-100 text-amber-700", dark: "bg-amber-950/50 text-amber-400" },
  COMPLETED: { light: "bg-blue-100 text-blue-700", dark: "bg-blue-950/50 text-blue-400" },
  INACTIVE: { light: "bg-slate-100 text-slate-500", dark: "bg-slate-800 text-slate-400" },
};

const INTENT_STYLES = {
  PRE_LEARNING: { light: "bg-purple-100 text-purple-700", dark: "bg-purple-950/50 text-purple-400" },
  POST_LEARNING: { light: "bg-cyan-100 text-cyan-700", dark: "bg-cyan-950/50 text-cyan-400" },
  PRACTICE: { light: "bg-orange-100 text-orange-700", dark: "bg-orange-950/50 text-orange-400" },
};

// Hàm format ngày giờ
function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function getDurationInMinutes(quiz) {
  const rawDuration = Number(quiz?.duration) || 0;
  if (!rawDuration) return 0;

  const createVia = String(quiz?.createVia || '').toUpperCase();
  const isAiQuiz = createVia === 'AI';

  const rawTimerMode = quiz?.timerMode;
  const isTotalTimerMode = rawTimerMode === true
    || rawTimerMode === "true"
    || rawTimerMode === 1
    || rawTimerMode === "1"
    || rawTimerMode === "TOTAL";

  if (isAiQuiz) {
    // AI quizzes store quiz.duration in seconds.
    // Legacy FE bug may have multiplied once more before BE conversion.
    const normalizedSeconds = rawDuration >= 36000
      ? Math.floor(rawDuration / 60)
      : rawDuration;
    return Math.max(1, Math.round(normalizedSeconds / 60));
  }

  // Legacy FE bug sent minutes as seconds into durationInMinute, and BE converted again.
  // Example: 15 -> FE sends 900 -> BE stores 54000 seconds.
  const normalizedDurationInSeconds = isTotalTimerMode && rawDuration >= 36000
    ? Math.floor(rawDuration / 60)
    : rawDuration;

  // Total-mode duration is stored as seconds by BE (e.g. 900 = 15 minutes).
  if (isTotalTimerMode) {
    return Math.max(1, Math.round(normalizedDurationInSeconds / 60));
  }

  return rawDuration;
}

// Component hiển thị chi tiết quiz — bao gồm sessions, questions, answers
function QuizDetailView({ isDarkMode, quiz, onBack, onEdit, contextType: _contextType = "WORKSPACE", contextId: _contextId, hideEditButton = false }) {
  const { t, i18n } = useTranslation();
  const { showSuccess, showError } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";

  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState([]);
  const [questionsMap, setQuestionsMap] = useState({}); // sectionId -> questions[]
  const [answersMap, setAnswersMap] = useState({}); // questionId -> answers[]
  const [expandedSections, setExpandedSections] = useState({});
  const [expandedQuestions, setExpandedQuestions] = useState({});
  const [starringId, setStarringId] = useState(null);
  const [activating, setActivating] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(quiz?.status || "DRAFT");
  const [confirmDialog, setConfirmDialog] = useState({ open: false, mode: null });
  const [quizMeta, setQuizMeta] = useState(null);
  
  // Tab states
  const [activeTab, setActiveTab] = useState("overview"); // overview, questions, history
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const canViewAnswers = hasQuizCompleted(quiz?.quizId) || currentStatus === "DRAFT";

  useEffect(() => {
    setCurrentStatus(quizMeta?.status || quiz?.status || "DRAFT");
  }, [quizMeta?.status, quiz?.status]);

  // Lấy toàn bộ dữ liệu quiz chi tiết: sections → questions → answers
  const fetchFullDetail = useCallback(async () => {
    if (!quiz?.quizId) return;
    setLoading(true);
    setQuizMeta(null);
    try {
      // Nếu quiz chỉ có quizId (thiếu metadata như khi back từ kết quả), fetch thông tin đầy đủ
      if (!quiz?.title) {
        const fullRes = await getQuizFull(quiz.quizId);
        if (fullRes?.data) {
          setQuizMeta(fullRes.data);
          setCurrentStatus(fullRes.data.status || "DRAFT");
        }
      }

      // Bước 1: Lấy sections
      const sectRes = await getSectionsByQuiz(quiz.quizId);
      const sectionList = sectRes.data || [];
      setSections(sectionList);

      // Tự động mở rộng section đầu tiên
      if (sectionList.length > 0) {
        setExpandedSections({ [sectionList[0].sectionId]: true });
      }

      // Bước 2: Lấy questions cho mỗi section
      const qMap = {};
      const aMap = {};
      for (const section of sectionList) {
        const qRes = await getQuestionsBySection(section.sectionId);
        const questions = qRes.data || [];
        qMap[section.sectionId] = questions;

        // Chỉ lấy đáp án sau khi user đã hoàn thành bài để tránh lộ đáp án sớm.
        if (canViewAnswers) {
          for (const question of questions) {
            const aRes = await getAnswersByQuestion(question.questionId);
            aMap[question.questionId] = aRes.data || [];
          }
        }
      }
      setQuestionsMap(qMap);
      setAnswersMap(aMap);
    } catch (err) {
      console.error("Lỗi khi tải chi tiết quiz:", err);
    } finally {
      setLoading(false);
    }
  }, [quiz?.quizId, canViewAnswers]);

  useEffect(() => {
    fetchFullDetail();
  }, [fetchFullDetail]);

  const fetchHistoryData = useCallback(async () => {
    if (!quiz?.quizId) return;
    setLoadingHistory(true);
    try {
      const res = await getQuizHistory(quiz.quizId);
      setHistory(res?.data || []);
    } catch (err) {
      console.error("Lỗi khi tải lịch sử quiz:", err);
    } finally {
      setLoadingHistory(false);
    }
  }, [quiz?.quizId]);

  useEffect(() => {
    if (activeTab === "history" && history.length === 0) {
      fetchHistoryData();
    }
  }, [activeTab, fetchHistoryData, history.length]);

  // Toggle mở rộng/thu gọn section
  const toggleSection = (sectionId) => {
    setExpandedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  // Toggle mở rộng/thu gọn câu hỏi (hiển thị answers)
  const toggleQuestion = (questionId) => {
    setExpandedQuestions((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  // Đánh dấu/bỏ dấu sao câu hỏi
  const handleToggleStar = async (questionId, sectionId) => {
    if (starringId) return;
    setStarringId(questionId);
    try {
      const res = await toggleStarQuestion(questionId);
      // Lấy giá trị isStarred mới từ API response, fallback sang đảo ngược nếu không có
      const newStarValue = res?.data?.isStarred;
      setQuestionsMap((prev) => ({
        ...prev,
        [sectionId]: prev[sectionId]?.map((q) => {
          if (q.questionId !== questionId) return q;
          return { ...q, isStarred: newStarValue !== undefined ? newStarValue : !q.isStarred };
        }),
      }));
    } catch (err) {
      console.error("Lỗi toggle star:", err);
    } finally {
      setStarringId(null);
    }
  };

  const handleActivateQuiz = async () => {
    if (!quiz?.quizId || activating) return;
    setActivating(true);
    try {
      const res = await updateQuiz(quiz.quizId, { status: "ACTIVE" });
      const nextStatus = res?.data?.status || "ACTIVE";
      setCurrentStatus(nextStatus);
      showSuccess(t("workspace.quiz.activateSuccess", "Kích hoạt quiz thành công"));
    } catch (err) {
      showError(err?.message || t("workspace.quiz.activateFail", "Kích hoạt quiz thất bại"));
    } finally {
      setActivating(false);
    }
  };

  const effectiveQuiz = quizMeta || quiz;
  const effectiveContextType = String(effectiveQuiz?.contextType || "").toUpperCase();
  const isRoadmapRouteSource = /\/workspace\/\d+\/roadmap(?:\/|$)/.test(location.pathname);
  const isRoadmapQuizSource = ["ROADMAP", "PHASE", "KNOWLEDGE"].includes(effectiveContextType) || isRoadmapRouteSource;
  const resultSourceState = {
    sourceView: isRoadmapQuizSource ? "roadmap" : "quiz-panel",
    sourceWorkspaceId: Number(effectiveQuiz?.workspaceId) || null,
    sourcePhaseId: Number(effectiveQuiz?.phaseId) || null,
  };
  const isActiveQuiz = currentStatus === "ACTIVE";
  const canActivate = currentStatus === "DRAFT" || currentStatus === "INACTIVE";
  const ss = STATUS_STYLES[currentStatus] || STATUS_STYLES.DRAFT;
  const is = INTENT_STYLES[effectiveQuiz?.quizIntent] || {};
  const durationInMinutes = getDurationInMinutes(effectiveQuiz);

  return (
    <div className={`h-full flex flex-col ${fontClass}`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b flex items-center justify-between ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <div className="flex items-center gap-3">
          <button onClick={onBack} className={`p-1.5 rounded-lg transition-all active:scale-95 ${isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-gray-100 text-gray-600"}`}>
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <BadgeCheck className="w-5 h-5 text-blue-500" />
            <p className={`text-base font-medium truncate max-w-[300px] ${isDarkMode ? "text-slate-100" : "text-gray-800"}`}>{effectiveQuiz?.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!hideEditButton && !isActiveQuiz && (
            <>
              {onEdit && (
                <Button onClick={() => onEdit?.(effectiveQuiz)} className="bg-[#2563EB] hover:bg-blue-700 text-white rounded-full h-9 px-4 flex items-center gap-2 transition-all active:scale-95">
                  <Edit3 className="w-4 h-4" />
                  <span className="text-sm">{t("workspace.quiz.detail.edit")}</span>
                </Button>
              )}
              {canActivate && (
                <Button
                  onClick={handleActivateQuiz}
                  disabled={activating}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full h-9 px-4 flex items-center gap-2 transition-all active:scale-95"
                >
                  {activating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span className="text-sm">{t("workspace.quiz.activate", "Kích hoạt")}</span>
                </Button>
              )}
            </>
          )}
          {!hideEditButton && _contextType === "GROUP" && (
            <Button
              className="bg-violet-600 hover:bg-violet-700 text-white rounded-full h-9 px-4 flex items-center gap-2 transition-all active:scale-95"
              onClick={() => {
                alert(t("workspace.quiz.detail.assign", "Tính năng giao bài (Assign) cho nhóm sẽ sớm ra mắt!"));
              }}
            >
              <Users className="w-4 h-4" />
              <span className="text-sm">{t("workspace.quiz.detail.assign", "Assign")}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className={`px-4 pt-3 flex items-center gap-4 border-b ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "overview"
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300"
          }`}
        >
          <Info className="w-4 h-4" /> {t("workspace.quiz.tabs.overview", "Tổng quan")}
        </button>
        <button
          onClick={() => setActiveTab("questions")}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "questions"
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300"
          }`}
        >
          <List className="w-4 h-4" /> {t("workspace.quiz.tabs.questions", "Câu hỏi")}
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "history"
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300"
          }`}
        >
          <History className="w-4 h-4" /> {t("workspace.quiz.tabs.history", "Lịch sử làm bài")}
        </button>
      </div>

      {/* Nội dung chi tiết */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <>
            {/* Thông tin tổng quan quiz */}
            <div className={`rounded-xl p-4 border ${isDarkMode ? "bg-slate-800/50 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
              <div className="flex items-start justify-between mb-3">
                <h3 className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>{effectiveQuiz?.title}</h3>
                <div className="flex items-center gap-2">
                  {effectiveQuiz?.quizIntent && (
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${isDarkMode ? is.dark || "" : is.light || ""}`}>
                      {t(`workspace.quiz.intentLabels.${effectiveQuiz.quizIntent}`)}
                    </span>
                  )}
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${isDarkMode ? ss.dark : ss.light}`}>
                    {t(`workspace.quiz.statusLabels.${currentStatus}`)}
                  </span>
                  {typeof effectiveQuiz?.timerMode === "boolean" && (
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${effectiveQuiz.timerMode
                      ? (isDarkMode ? "bg-blue-950/40 text-blue-300" : "bg-blue-100 text-blue-700")
                      : (isDarkMode ? "bg-emerald-950/40 text-emerald-300" : "bg-emerald-100 text-emerald-700")
                    }`}>
                      {effectiveQuiz.timerMode
                        ? t("workspace.quiz.examModeType1", "Exam giới hạn thời gian tổng")
                        : t("workspace.quiz.examModeType2", "Exam theo từng câu")}
                    </span>
                  )}
                </div>
              </div>

              {effectiveQuiz?.description && (
                <p className={`text-sm mb-4 ${isDarkMode ? "text-slate-300" : "text-gray-600"}`}>
                  {effectiveQuiz.description}
                </p>
              )}

              {/* Thẻ thông tin dạng grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {durationInMinutes > 0 && (
                  <InfoChip icon={Timer} label={t("workspace.quiz.timeDuration")} value={`${durationInMinutes} ${t("workspace.quiz.minutes")}`} isDarkMode={isDarkMode} />
                )}
                {effectiveQuiz?.overallDifficulty && (
                  <InfoChip icon={BarChart3} label={t("workspace.quiz.overallDifficulty")} value={t(`workspace.quiz.difficultyLevels.${effectiveQuiz.overallDifficulty.toLowerCase()}`)} isDarkMode={isDarkMode} />
                )}
                {effectiveQuiz?.passScore != null && (
                  <InfoChip icon={Target} label={t("workspace.quiz.passingScore")} value={effectiveQuiz.passScore} isDarkMode={isDarkMode} />
                )}
                {effectiveQuiz?.maxAttempt != null && (
                  <InfoChip icon={Hash} label={t("workspace.quiz.maxAttempt")} value={effectiveQuiz.maxAttempt} isDarkMode={isDarkMode} />
                )}
                {sections.length > 0 && (
                  <InfoChip icon={BookOpen} label={t("workspace.quiz.tabs.questions", "Câu hỏi")} value={sections.reduce((acc, s) => acc + (questionsMap[s.sectionId]?.length || 0), 0)} isDarkMode={isDarkMode} />
                )}
              </div>

              {/* Action Buttons in Overview */}
              {isActiveQuiz && (
                <div className={`mt-4 pt-4 border-t flex flex-row items-center gap-3 ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
                  {!isRoadmapQuizSource ? (
                    <Button onClick={() => setConfirmDialog({ open: true, mode: 'practice' })} variant="outline"
                      className={`flex-1 h-10 px-4 flex items-center justify-center gap-2 rounded-xl transition-all active:scale-95 ${isDarkMode ? "border-blue-800/60 bg-blue-900/20 text-blue-400 hover:bg-blue-900/40" : "border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100"}`}>
                      <Play className="w-4 h-4" />
                      <span className="font-medium">{t("workspace.quiz.practice", "Practice mode")}</span>
                    </Button>
                  ) : null}
                  <Button onClick={() => setConfirmDialog({ open: true, mode: 'exam' })} className="flex-1 h-10 px-4 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all active:scale-95 shadow-sm">
                    <ClipboardCheck className="w-4 h-4" />
                    <span className="font-medium">{t("workspace.quiz.exam", "Exam mode")}</span>
                  </Button>
                </div>
              )}

              {/* Ngày tạo */}
              <div className={`flex items-center gap-2 mt-3 text-xs ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
                <Clock className="w-3 h-3" />
                <span>{t("workspace.quiz.detail.createdAt", "Ngày tạo")}: {formatDate(effectiveQuiz?.createdAt)}</span>
                {effectiveQuiz?.updatedAt && (
                  <>
                    <span>•</span>
                    <span>{t("workspace.quiz.detail.updatedAt", "Cập nhật")}: {formatDate(effectiveQuiz.updatedAt)}</span>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {/* Questions Tab */}
        {activeTab === "questions" && (
          <div className="space-y-4">
            {/* Danh sách sections + questions */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className={`w-8 h-8 animate-spin mb-2 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`} />
                <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>{t("workspace.quiz.detail.loadingDetail", "Đang tải dữ liệu...")}</p>
              </div>
            ) : sections.length === 0 ? (
              <div className={`text-center py-8 text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                {t("workspace.quiz.detail.noSections", "Không có section nào")}
              </div>
            ) : (
              sections.map((section, sIdx) => {
            const isExpanded = expandedSections[section.sectionId];
            const questions = questionsMap[section.sectionId] || [];

            return (
              <div key={section.sectionId} className={`rounded-xl border overflow-hidden ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
                {/* Section header */}
                <button
                  onClick={() => toggleSection(section.sectionId)}
                  className={`w-full px-4 py-3 flex items-center justify-between transition-colors ${isDarkMode ? "bg-slate-800/30 hover:bg-slate-800/60" : "bg-slate-100/50 hover:bg-slate-100"}`}
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <BookOpen className={`w-4 h-4 ${isDarkMode ? "text-blue-400" : "text-blue-500"}`} />
                    <span className={`text-sm font-medium ${isDarkMode ? "text-slate-200" : "text-gray-700"}`}>
                      {t("workspace.quiz.detail.section", "Section")} {sIdx + 1}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${isDarkMode ? "bg-slate-700 text-slate-400" : "bg-gray-200 text-gray-500"}`}>
                      {questions.length} {t("workspace.quiz.detail.questions")}
                    </span>
                  </div>
                </button>

                {/* Danh sách câu hỏi của section */}
                {isExpanded && (
                  <div className={`divide-y ${isDarkMode ? "divide-slate-800" : "divide-slate-200"}`}>
                    {questions.length === 0 ? (
                      <div className={`px-4 py-6 text-center text-sm ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
                        {t("workspace.quiz.detail.noQuestions")}
                      </div>
                    ) : (
                      questions.map((question, qIdx) => {
                        const answers = answersMap[question.questionId] || [];
                        const correctTextAnswers = answers
                          .filter((ans) => ans?.isCorrect)
                          .map((ans) => (typeof ans?.content === "string" ? ans.content.trim() : ""))
                          .filter(Boolean);
                        const fallbackTextAnswers = answers
                          .map((ans) => (typeof ans?.content === "string" ? ans.content.trim() : ""))
                          .filter(Boolean);
                        const textAnswersToDisplay = correctTextAnswers.length > 0
                          ? correctTextAnswers
                          : fallbackTextAnswers;
                        const isQExpanded = expandedQuestions[question.questionId];
                        const typeName = QUESTION_TYPE_ID_MAP[question.questionTypeId] || "multipleChoice";

                        return (
                          <div key={question.questionId} className={`px-4 py-3 ${isDarkMode ? "bg-slate-900/50" : "bg-white"}`}>
                            {/* Question header */}
                            <div className="flex items-start gap-3">
                              <span className={`text-xs font-bold mt-0.5 shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${isDarkMode ? "bg-blue-950/50 text-blue-400" : "bg-blue-100 text-blue-600"}`}>
                                {qIdx + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <p className={`text-sm font-medium ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>{question.content}</p>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      onClick={() => handleToggleStar(question.questionId, section.sectionId)}
                                      disabled={starringId === question.questionId}
                                      className={`p-1 rounded transition-all ${question.isStarred
                                        ? "text-yellow-500"
                                        : isDarkMode ? "text-slate-500 hover:text-yellow-400" : "text-gray-300 hover:text-yellow-500"
                                      }`}
                                    >
                                      <Star className={`w-3.5 h-3.5 ${question.isStarred ? "fill-current" : ""}`} />
                                    </button>
                                    <button
                                      onClick={() => toggleQuestion(question.questionId)}
                                      className={`p-1 rounded transition-all ${isDarkMode ? "text-slate-400 hover:text-slate-200" : "text-gray-400 hover:text-gray-600"}`}
                                    >
                                      {isQExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                    </button>
                                  </div>
                                </div>

                                {/* Meta info: type, difficulty, bloom, duration */}
                                <div className={`flex items-center gap-2 mt-1.5 flex-wrap text-[11px] ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
                                  <span className={`px-2 py-0.5 rounded-full ${isDarkMode ? "bg-slate-800 text-slate-400" : "bg-gray-100 text-gray-500"}`}>
                                    {t(`workspace.quiz.types.${typeName}`)}
                                  </span>
                                  {question.difficulty && (
                                    <span className={`px-2 py-0.5 rounded-full ${isDarkMode ? "bg-slate-800 text-slate-400" : "bg-gray-100 text-gray-500"}`}>
                                      {t(`workspace.quiz.difficultyLevels.${question.difficulty.toLowerCase()}`)}
                                    </span>
                                  )}
                                  {question.bloomId && (
                                    <span className={`px-2 py-0.5 rounded-full ${isDarkMode ? "bg-slate-800 text-slate-400" : "bg-gray-100 text-gray-500"}`}>
                                      {t(`workspace.quiz.bloomLevels.${["remember","understand","apply","analyze","evaluate"][question.bloomId - 1] || "remember"}`)}
                                    </span>
                                  )}
                                  {question.duration > 0 && (
                                    <span className="flex items-center gap-1">
                                      <Timer className="w-3 h-3" />{question.duration}s
                                    </span>
                                  )}
                                </div>

                                {/* Answers — hiển thị khi mở rộng */}
                                {isQExpanded && (
                                  <div className="mt-3 space-y-1.5">
                                    {!canViewAnswers ? (
                                      <div className={`px-3 py-2 rounded-lg text-xs ${isDarkMode ? "bg-slate-800/60 text-slate-400" : "bg-gray-100 text-gray-600"}`}>
                                        {t("workspace.quiz.answerLocked", "Hoàn thành bài quiz để xem đáp án và giải thích.")}
                                      </div>
                                    ) : (
                                      <>
                                        {(typeName === "shortAnswer" || typeName === "fillBlank") ? (
                                          <div className={`flex items-start gap-2 px-3 py-2 rounded-lg text-sm ${
                                            isDarkMode ? "bg-emerald-950/30 border border-emerald-800/50" : "bg-emerald-50 border border-emerald-200"
                                          }`}>
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                                              isDarkMode ? "bg-emerald-800 text-emerald-300" : "bg-emerald-200 text-emerald-700"
                                            }`}>
                                              {t("workspace.quiz.correctAnswerLabel", "Đáp án đúng")}
                                            </span>
                                            <span className={`flex-1 ${isDarkMode ? "text-emerald-300" : "text-emerald-700"}`}>
                                              {textAnswersToDisplay.length ? textAnswersToDisplay.join(" / ") : "-"}
                                            </span>
                                            <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${isDarkMode ? "text-emerald-400" : "text-emerald-600"}`} />
                                          </div>
                                        ) : (
                                          answers.map((ans, aIdx) => (
                                            <div key={ans.answerId} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                                              ans.isCorrect
                                                ? isDarkMode ? "bg-emerald-950/30 border border-emerald-800/50" : "bg-emerald-50 border border-emerald-200"
                                                : isDarkMode ? "bg-slate-800/50" : "bg-gray-50"
                                            }`}>
                                              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                                ans.isCorrect
                                                  ? isDarkMode ? "bg-emerald-800 text-emerald-300" : "bg-emerald-200 text-emerald-700"
                                                  : isDarkMode ? "bg-slate-700 text-slate-400" : "bg-gray-200 text-gray-500"
                                              }`}>
                                                {typeName === "trueFalse" ? ans.content.slice(0, 1).toUpperCase() : String.fromCharCode(65 + aIdx)}
                                              </span>
                                              <span className={`flex-1 ${
                                                ans.isCorrect
                                                  ? isDarkMode ? "text-emerald-300" : "text-emerald-700"
                                                  : isDarkMode ? "text-slate-300" : "text-gray-700"
                                              }`}>{ans.content}</span>
                                              {ans.isCorrect && <CheckCircle2 className={`w-4 h-4 shrink-0 ${isDarkMode ? "text-emerald-400" : "text-emerald-600"}`} />}
                                            </div>
                                          ))
                                        )}

                                        {/* Giải thích */}
                                        {question.explanation && (
                                          <div className={`mt-2 px-3 py-2 rounded-lg text-xs italic ${isDarkMode ? "bg-amber-950/20 text-amber-400 border border-amber-900/30" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                                            <span className="font-semibold not-italic">{t("workspace.quiz.explanation")}:</span> {question.explanation}
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div className="space-y-4">
            {loadingHistory ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className={`w-8 h-8 animate-spin mb-2 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`} />
                <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>{t("workspace.quiz.history.loading", "Đang tải lịch sử...")}</p>
              </div>
            ) : history.length === 0 ? (
              <div className={`text-center py-12 text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
                {t("workspace.quiz.history.empty", "Chưa có lịch sử làm bài nào.")}
              </div>
            ) : (
              <div className="grid gap-4">
                {history.map((attempt) => (
                  <div key={attempt.attemptId} className={`rounded-xl p-4 border transition-colors cursor-pointer ${
                    isDarkMode ? "bg-slate-800/50 border-slate-800 hover:bg-slate-800/80" : "bg-white border-slate-200 hover:bg-slate-50"
                  }`} onClick={() => navigate(`/quiz/result/${attempt.attemptId}`, { state: { quizId: effectiveQuiz?.quizId, returnToQuizPath: `${location.pathname}${location.search || ""}`, ...resultSourceState } })}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${attempt.status === 'COMPLETED' ? (isDarkMode ? "bg-emerald-900/30 text-emerald-400" : "bg-emerald-100 text-emerald-600") : (isDarkMode ? "bg-amber-900/30 text-amber-400" : "bg-amber-100 text-amber-600")}`}>
                          {attempt.status === 'COMPLETED' ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                        </div>
                        <div>
                          <h4 className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                            {t("workspace.quiz.history.attempt", "Lần làm bài")} #{attempt.attemptId}
                          </h4>
                          <p className={`text-xs mt-0.5 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                            {formatDate(attempt.startedAt)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        
                        <div className="flex gap-2 justify-end mt-1">
                          <span className={`text-[10px] px-2 py-0.5 rounded-md ${
                            attempt.isPracticeMode 
                              ? (isDarkMode ? "bg-blue-900/30 text-blue-400" : "bg-blue-100 text-blue-700") 
                              : (isDarkMode ? "bg-emerald-900/30 text-emerald-400" : "bg-emerald-100 text-emerald-700")
                          }`}>
                            {attempt.isPracticeMode ? t("workspace.quiz.practice", "Practice") : t("workspace.quiz.exam", "Exam")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirm dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, mode: null })}>
        <DialogContent className={isDarkMode ? "bg-slate-800 border-slate-700 text-white" : ""}>
          <DialogHeader>
            <DialogTitle>{confirmDialog.mode === 'practice' ? t("workspace.quiz.practice", "Practice") : t("workspace.quiz.exam", "Exam")}</DialogTitle>
            <DialogDescription className={isDarkMode ? "text-slate-400" : ""}>
              {confirmDialog.mode === 'practice'
                ? t("workspace.quiz.confirmPractice", "Are you sure you want to start this quiz in Practice mode? You can review answers as you go.")
                : t("workspace.quiz.confirmExam", "Are you sure you want to start this quiz in Exam mode? Timer will begin immediately.")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmDialog({ open: false, mode: null })}>{t("common.cancel", "Cancel")}</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => { navigate(`/quiz/${confirmDialog.mode}/${quiz?.quizId}`, { state: { returnToQuizPath: `${location.pathname}${location.search || ""}`, ...resultSourceState } }); setConfirmDialog({ open: false, mode: null }); }}>
              {t("common.confirm", "Confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Component chip thông tin dùng lại
function InfoChip({ icon: Icon, label, value, isDarkMode }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isDarkMode ? "bg-slate-900/50" : "bg-white"}`}>
      <Icon className={`w-4 h-4 shrink-0 ${isDarkMode ? "text-slate-400" : "text-gray-400"}`} />
      <div>
        <p className={`text-[10px] ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>{label}</p>
        <p className={`text-xs font-medium ${isDarkMode ? "text-slate-200" : "text-gray-700"}`}>{value}</p>
      </div>
    </div>
  );
}

export default QuizDetailView;
