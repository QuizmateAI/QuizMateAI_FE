import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft, ClipboardList, Timer, BarChart3, Clock, Loader2, Star,
  ChevronDown, ChevronRight, Target, BookOpen, Hash, CheckCircle2, Users, ClipboardCheck,
  Info, List, History, Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getQuizFull, toggleStarQuestion, QUESTION_TYPE_ID_MAP, getQuizHistory, publishGroupQuiz
} from "@/api/QuizAPI";
import { buildMockTestExamPath, buildQuizResultPath } from "@/lib/routePaths";
import { hasQuizCompleted } from "@/utils/quizAttemptTracker";
import MixedMathText from "@/components/math/MixedMathText";

// Cấu hình màu badge trạng thái (giống quiz)
const STATUS_STYLES = {
  ACTIVE: { light: "bg-emerald-100 text-emerald-700", dark: "bg-emerald-950/50 text-emerald-400" },
  DRAFT: { light: "bg-amber-100 text-amber-700", dark: "bg-amber-950/50 text-amber-400" },
  COMPLETED: { light: "bg-blue-100 text-blue-700", dark: "bg-blue-950/50 text-blue-400" },
  PROCESSING: { light: "bg-violet-100 text-violet-700", dark: "bg-violet-950/50 text-violet-300" },
  ERROR: { light: "bg-rose-100 text-rose-700", dark: "bg-rose-950/50 text-rose-300" },
  INACTIVE: { light: "bg-slate-100 text-slate-500", dark: "bg-slate-800 text-slate-400" },
};

// duration từ BE là giây → chuyển sang phút để hiển thị
function getDurationInMinutes(durationSeconds) {
  const raw = Number(durationSeconds) || 0;
  if (!raw) return 0;
  // Legacy: nếu lưu nhầm phút * 60 hai lần (>= 36000 giây = 600 phút), chia thêm 1 lần
  const normalizedSeconds = raw >= 36000 ? Math.floor(raw / 60) : raw;
  return Math.max(1, Math.round(normalizedSeconds / 60));
}

// Hàm format ngày giờ
function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function unwrapQuizFullPayload(response) {
  return response?.data?.data ?? response?.data ?? null;
}

function getSectionChildren(section) {
  return Array.isArray(section?.children) ? section.children : [];
}

function getSectionQuestions(section) {
  return Array.isArray(section?.questions) ? section.questions : [];
}

function getSectionKey(section, fallbackKey) {
  return String(section?.sectionId ?? fallbackKey);
}

function getSectionTitle(section, fallbackTitle) {
  const content = typeof section?.content === "string" ? section.content.trim() : "";
  if (content) return content;

  const title = typeof section?.title === "string" ? section.title.trim() : "";
  if (title) return title;

  return fallbackTitle;
}

function isQuestionGroupSection(section) {
  const sectionType = String(section?.sectionType || "").trim().toUpperCase();
  return sectionType === "QUESTION_GROUP" || sectionType === "GROUP_QUESTION";
}

function isRootSection(section) {
  return String(section?.sectionType || "").trim().toUpperCase() === "ROOT";
}

function getSectionSharedContext(section) {
  return typeof section?.sharedContext === "string" ? section.sharedContext.trim() : "";
}

function countSectionQuestions(section) {
  return getSectionQuestions(section).length + getSectionChildren(section).reduce(
    (total, child) => total + countSectionQuestions(child),
    0,
  );
}

function normalizeDisplaySections(sectionList) {
  return (Array.isArray(sectionList) ? sectionList : []).flatMap((section) => {
    if (!section) return [];
    if (!isRootSection(section)) return [section];

    const children = getSectionChildren(section);
    if (children.length > 0) return children;

    if (getSectionQuestions(section).length > 0) {
      return [{ ...section, sectionType: "SECTION", content: "", title: "" }];
    }

    return [];
  });
}

function isTruthyQuizFlag(value) {
  if (value === true || value === 1) return true;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes";
  }
  return false;
}

function hasCompletedAttemptRecord(attempt) {
  if (!attempt || typeof attempt !== "object") return false;

  const status = String(attempt.status || attempt.attemptStatus || attempt.state || "").toUpperCase();
  if (["COMPLETED", "SUBMITTED", "GRADED", "PASSED", "FAILED"].includes(status)) {
    return true;
  }

  return Boolean(
    attempt.completedAt
    || attempt.submittedAt
    || attempt.finishedAt
    || attempt.endedAt
    || attempt.score != null
    || attempt.totalScore != null
    || attempt.correctCount != null,
  );
}

function hasCompletedAttemptHistory(history) {
  return Array.isArray(history) && history.some(hasCompletedAttemptRecord);
}

function updateQuestionInSectionTree(sectionList, questionId, updater) {
  if (!Array.isArray(sectionList) || sectionList.length === 0) {
    return sectionList;
  }

  let changed = false;

  const nextSections = sectionList.map((section) => {
    let sectionChanged = false;

    const questions = getSectionQuestions(section);
    let questionsChanged = false;
    const nextQuestions = questions.map((question) => {
      if (question.questionId !== questionId) return question;
      questionsChanged = true;
      return updater(question);
    });

    if (questionsChanged) {
      sectionChanged = true;
    }

    const children = getSectionChildren(section);
    const nextChildren = updateQuestionInSectionTree(children, questionId, updater);
    if (nextChildren !== children) {
      sectionChanged = true;
    }

    if (!sectionChanged) {
      return section;
    }

    changed = true;
    return {
      ...section,
      ...(questionsChanged ? { questions: nextQuestions } : {}),
      ...(nextChildren !== children ? { children: nextChildren } : {}),
    };
  });

  return changed ? nextSections : sectionList;
}

/**
 * Component hiển thị chi tiết Mock Test — giao diện tím (purple) để phân biệt với Quiz (xanh dương)
 * Cấu trúc giống QuizDetailView: sections → questions → answers
 */
function MockTestDetailView({ isDarkMode, quiz: quizProp, onBack, onEdit, hideEditButton = false, contextType = "WORKSPACE", isGroupLeader = false }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";

  // When restored from URL, quizProp may only have { quizId }. Merge with fetched metadata.
  const [quizMeta, setQuizMeta] = useState(null);
  const quiz = quizMeta ?? quizProp;

  const quizStatus = String(quiz?.status || "").toUpperCase();
  const isReadyToTake = quizStatus === "ACTIVE" || quizStatus === "COMPLETED";

  const handleTakeExam = useCallback(() => {
    if (!quiz?.quizId) return;
    // MockTest v2: dedicated section-by-section page (separate from shared ExamQuizPage).
    navigate(buildMockTestExamPath(quiz.quizId), {
      state: {
        returnToQuizPath: `${location.pathname}${location.search || ""}`,
        quizId: quiz.quizId,
      },
    });
  }, [navigate, quiz?.quizId, location.pathname, location.search]);

  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState([]);
  const [expandedSections, setExpandedSections] = useState({});
  const [expandedQuestions, setExpandedQuestions] = useState({});
  const [starringId, setStarringId] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyProbeDone, setHistoryProbeDone] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const localQuizCompleted = hasQuizCompleted(quiz?.quizId);
  const hasQuizPayloadCompleted =
    isTruthyQuizFlag(quiz?.myPassed)
    || isTruthyQuizFlag(quizMeta?.myPassed);
  const hasHistoryCompleted = hasCompletedAttemptHistory(history);
  const hasCurrentUserCompletedQuiz = localQuizCompleted || hasQuizPayloadCompleted || hasHistoryCompleted;

  const canViewAnswers =
    quizStatus === "DRAFT"
    || hasCurrentUserCompletedQuiz
    || (contextType === "GROUP" && Boolean(isGroupLeader));

  const handlePublish = useCallback(async () => {
    if (!quiz?.quizId) return;
    setIsPublishing(true);
    try {
      await publishGroupQuiz(quiz.quizId);
      setQuizMeta((prev) => ({ ...(prev ?? quizProp), status: 'ACTIVE' }));
    } catch (err) {
      console.error('Lỗi khi xuất bản đề thi thử:', err);
    } finally {
      setIsPublishing(false);
    }
  }, [quiz?.quizId, quizProp]);

  const fetchHistoryData = useCallback(async () => {
    if (!quiz?.quizId) return;
    setLoadingHistory(true);
    try {
      const res = await getQuizHistory(quiz.quizId);
      setHistory(res?.data || []);
    } catch (err) {
      console.error("Lỗi khi tải lịch sử mock test:", err);
    } finally {
      setLoadingHistory(false);
    }
  }, [quiz?.quizId]);

  useEffect(() => {
    setHistory([]);
    setHistoryProbeDone(false);
  }, [quiz?.quizId]);

  useEffect(() => {
    if (activeTab !== "history" || historyProbeDone) {
      return;
    }

    fetchHistoryData().finally(() => {
      setHistoryProbeDone(true);
    });
  }, [activeTab, fetchHistoryData, historyProbeDone]);

  useEffect(() => {
    if (historyProbeDone || loadingHistory) {
      return;
    }

    if (quizStatus === "DRAFT" || (contextType === "GROUP" && Boolean(isGroupLeader))) {
      return;
    }

    if (hasCurrentUserCompletedQuiz) {
      return;
    }

    fetchHistoryData().finally(() => {
      setHistoryProbeDone(true);
    });
  }, [
    contextType,
    fetchHistoryData,
    hasCurrentUserCompletedQuiz,
    historyProbeDone,
    isGroupLeader,
    loadingHistory,
    quizStatus,
  ]);

  // Tải toàn bộ dữ liệu chi tiết bằng payload full quiz đã có tree children
  const fetchFullDetail = useCallback(async () => {
    if (!quizProp?.quizId) return;
    setLoading(true);
    try {
      const response = await getQuizFull(quizProp.quizId);
      const quizFull = unwrapQuizFullPayload(response);
      const nextSections = normalizeDisplaySections(quizFull?.sections);

      // If quizProp is a partial stub (URL restore), populate metadata from API
      if (!quizProp?.title && quizFull) {
        setQuizMeta(quizFull);
      }

      setSections(nextSections);
      setExpandedQuestions({});
      const firstSection = nextSections[0];
      setExpandedSections(firstSection ? { [getSectionKey(firstSection, "root-0")]: true } : {});
    } catch (err) {
      console.error("Lỗi khi tải chi tiết mock test:", err);
    } finally {
      setLoading(false);
    }
  }, [quizProp?.quizId, quizProp?.title]);

  useEffect(() => {
    fetchFullDetail();
  }, [fetchFullDetail]);

  const toggleSection = (sectionId) => {
    setExpandedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const toggleQuestion = (questionId) => {
    setExpandedQuestions((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  const handleToggleStar = async (questionId) => {
    if (starringId) return;
    setStarringId(questionId);
    try {
      const res = await toggleStarQuestion(questionId);
      const newStarValue = res?.data?.isStarred;
      setSections((prev) => updateQuestionInSectionTree(prev, questionId, (question) => ({
        ...question,
        isStarred: newStarValue !== undefined ? newStarValue : !question.isStarred,
      })));
    } catch (err) {
      console.error("Lỗi toggle star:", err);
    } finally {
      setStarringId(null);
    }
  };

  const ss = STATUS_STYLES[quiz?.status] || STATUS_STYLES.DRAFT;

  const renderQuestionItem = (question, questionIndex, sectionId) => {
    const answers = Array.isArray(question?.answers) ? question.answers : [];
    const isQExpanded = expandedQuestions[question.questionId];
    const typeName = QUESTION_TYPE_ID_MAP[question.questionTypeId] || "multipleChoice";

    return (
      <div key={question.questionId} className={`px-4 py-3 ${isDarkMode ? "bg-slate-900/50" : "bg-white"}`}>
        <div className="flex items-start gap-3">
          <span className={`text-xs font-bold mt-0.5 shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${isDarkMode ? "bg-purple-950/50 text-purple-400" : "bg-purple-100 text-purple-600"}`}>
            {questionIndex + 1}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className={`text-sm font-medium whitespace-pre-wrap ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>
                <MixedMathText>{question.content}</MixedMathText>
              </p>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleToggleStar(question.questionId)}
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

            <div className={`flex items-center gap-2 mt-1.5 flex-wrap text-[11px] ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
              <span className={`px-2 py-0.5 rounded-full ${isDarkMode ? "bg-purple-950/40 text-purple-400" : "bg-purple-50 text-purple-600"}`}>
                {t(`mockTestForms.common.type${typeName.charAt(0).toUpperCase() + typeName.slice(1)}`, typeName)}
              </span>
              {question.difficulty && (
                <span className={`px-2 py-0.5 rounded-full ${isDarkMode ? "bg-slate-800 text-slate-400" : "bg-gray-100 text-gray-500"}`}>
                  {t(`mockTestForms.common.difficulty${question.difficulty.charAt(0) + question.difficulty.slice(1).toLowerCase()}`, question.difficulty.toLowerCase())}
                </span>
              )}
              {question.bloomId && (() => {
                const bloomKey = ["remember","understand","apply","analyze","evaluate"][question.bloomId - 1] || "remember";
                return (
                  <span className={`px-2 py-0.5 rounded-full ${isDarkMode ? "bg-slate-800 text-slate-400" : "bg-gray-100 text-gray-500"}`}>
                    {t(`mockTestForms.common.bloom${bloomKey.charAt(0).toUpperCase() + bloomKey.slice(1)}`, bloomKey)}
                  </span>
                );
              })()}
              {question.duration > 0 && (
                <span className="flex items-center gap-1">
                  <Timer className="w-3 h-3" />{question.duration}s
                </span>
              )}
            </div>

            {isQExpanded && (
              <div className="mt-3 space-y-1.5">
                {!canViewAnswers ? (
                  <div className={`flex items-start gap-2 rounded-lg px-3 py-3 text-sm ${
                    isDarkMode ? "bg-slate-800/50 text-slate-400" : "bg-slate-50 text-slate-500"
                  }`}>
                    <Lock className="mt-0.5 w-4 h-4 shrink-0" />
                    <span>{t("mockTestForms.detail.answersLocked", "Làm bài để xem đáp án và giải thích.")}</span>
                  </div>
                ) : (
                  <>
                    {typeName === "matching" ? (() => {
                      const correctAns = answers.find((answer) => answer.isCorrect);
                      let pairs = [];
                      if (correctAns?.content) {
                        try { pairs = JSON.parse(correctAns.content); } catch { pairs = []; }
                      }
                      if (!Array.isArray(pairs) || pairs.length === 0) {
                        return (
                          <span className={`text-xs ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
                            {t("mockTestForms.detail.matchingNoData", "No matching data available")}
                          </span>
                        );
                      }
                      return pairs.map((pair, pairIndex) => (
                        <div key={pairIndex} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                          isDarkMode ? "bg-emerald-950/30 border border-emerald-800/50" : "bg-emerald-50 border border-emerald-200"
                        }`}>
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                            isDarkMode ? "bg-emerald-800 text-emerald-300" : "bg-emerald-200 text-emerald-700"
                          }`}>{pairIndex + 1}</span>
                          <span className={`font-semibold ${isDarkMode ? "text-emerald-300" : "text-emerald-700"}`}>
                            <MixedMathText>{pair.leftKey}</MixedMathText>
                          </span>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${isDarkMode ? "text-emerald-600" : "text-emerald-400"}`}>
                            <path d="M5 12h14M13 6l6 6-6 6" />
                          </svg>
                          <span className={isDarkMode ? "text-emerald-300" : "text-emerald-700"}>
                            <MixedMathText>{pair.rightKey}</MixedMathText>
                          </span>
                        </div>
                      ));
                    })() : answers.map((answer, answerIndex) => (
                      <div key={answer.answerId} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                        answer.isCorrect
                          ? isDarkMode ? "bg-emerald-950/30 border border-emerald-800/50" : "bg-emerald-50 border border-emerald-200"
                          : isDarkMode ? "bg-slate-800/50" : "bg-gray-50"
                      }`}>
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          answer.isCorrect
                            ? isDarkMode ? "bg-emerald-800 text-emerald-300" : "bg-emerald-200 text-emerald-700"
                            : isDarkMode ? "bg-slate-700 text-slate-400" : "bg-gray-200 text-gray-500"
                        }`}>
                          {String.fromCharCode(65 + answerIndex)}
                        </span>
                        <span className={`flex-1 ${
                          answer.isCorrect
                            ? isDarkMode ? "text-emerald-300" : "text-emerald-700"
                            : isDarkMode ? "text-slate-300" : "text-gray-700"
                        }`}>
                          <MixedMathText>{answer.content}</MixedMathText>
                        </span>
                        {answer.isCorrect && (
                          <CheckCircle2 className={`w-4 h-4 shrink-0 ${isDarkMode ? "text-emerald-400" : "text-emerald-600"}`} />
                        )}
                      </div>
                    ))}

                    {question.explanation && (
                      <div className={`mt-2 px-3 py-2 rounded-lg text-xs italic ${isDarkMode ? "bg-amber-950/20 text-amber-400 border border-amber-900/30" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                        <span className="font-semibold not-italic">{t("mockTestForms.common.explanation", "Explanation")}:</span>{" "}
                        <MixedMathText className="not-italic">{question.explanation}</MixedMathText>
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
  };

  const renderSharedContext = (sharedContext) => {
    if (!sharedContext) return null;

    return (
      <div className={`rounded-lg border px-4 py-3 text-sm leading-6 ${
        isDarkMode
          ? "border-purple-900/40 bg-slate-950/40 text-slate-300"
          : "border-purple-100 bg-purple-50/40 text-gray-700"
      }`}>
        <p className={`mb-2 text-xs font-semibold uppercase tracking-wide ${
          isDarkMode ? "text-purple-300" : "text-purple-600"
        }`}>
          {t("mockTestForms.detail.sharedContext", "Shared context")}
        </p>
        <MixedMathText as="div">{sharedContext}</MixedMathText>
      </div>
    );
  };

  const renderSectionNode = (section, sectionIndex, depth = 0, pathLabel = `${sectionIndex + 1}`) => {
    const sectionKey = getSectionKey(section, `section-${pathLabel}`);
    const isExpanded = expandedSections[sectionKey];
    const childSections = normalizeDisplaySections(getSectionChildren(section));
    const questions = getSectionQuestions(section);
    const totalQuestions = countSectionQuestions(section);
    const isQuestionGroup = isQuestionGroupSection(section);
    const sharedContext = getSectionSharedContext(section);
    const isSharedContextGroup = isQuestionGroup && Boolean(sharedContext);
    const sectionTitle = getSectionTitle(
      section,
      `${t("mockTestForms.detail.section", "Section")} ${pathLabel}`,
    );

    if (isSharedContextGroup) {
      return (
        <div
          key={sectionKey}
          className={`rounded-xl border overflow-hidden ${isDarkMode ? "border-purple-900/40" : "border-purple-200"}`}
          style={depth > 0 ? { marginLeft: `${Math.min(depth, 3) * 16}px` } : undefined}
        >
          <div className={`px-4 py-3 flex items-center justify-between ${isDarkMode ? "bg-purple-950/20" : "bg-purple-50/50"}`}>
            <div className="flex items-center gap-2 min-w-0">
              <BookOpen className={`w-4 h-4 shrink-0 ${isDarkMode ? "text-purple-400" : "text-purple-500"}`} />
              <span className={`text-sm font-medium truncate ${isDarkMode ? "text-slate-200" : "text-gray-700"}`}>
                {sectionTitle}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${isDarkMode ? "bg-purple-900/50 text-purple-400" : "bg-purple-100 text-purple-600"}`}>
                {totalQuestions} {t("mockTestForms.detail.questions", "questions")}
              </span>
            </div>
          </div>

          <div className={`space-y-3 px-3 py-3 ${isDarkMode ? "bg-slate-950/30" : "bg-white"}`}>
            {renderSharedContext(sharedContext)}

            {childSections.length > 0 && (
              <div className="space-y-3">
                {childSections.map((childSection, childIndex) => renderSectionNode(childSection, childIndex, depth + 1, `${pathLabel}.${childIndex + 1}`))}
              </div>
            )}

            {questions.length > 0 ? (
              <div className={`overflow-hidden rounded-lg divide-y ${isDarkMode ? "divide-slate-800" : "divide-purple-100"}`}>
                {questions.map((question, questionIndex) => renderQuestionItem(question, questionIndex, section.sectionId))}
              </div>
            ) : childSections.length === 0 ? (
              <div className={`px-4 py-6 text-center text-sm ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
                {t("mockTestForms.detail.noQuestions", "No questions in this section.")}
              </div>
            ) : null}
          </div>
        </div>
      );
    }

    return (
      <div
        key={sectionKey}
        className={`rounded-xl border overflow-hidden ${isDarkMode ? "border-purple-900/40" : "border-purple-200"}`}
        style={depth > 0 ? { marginLeft: `${Math.min(depth, 3) * 16}px` } : undefined}
      >
        <button
          onClick={() => toggleSection(sectionKey)}
          className={`w-full px-4 py-3 flex items-center justify-between transition-colors ${isDarkMode ? "bg-purple-950/20 hover:bg-purple-950/40" : "bg-purple-50/50 hover:bg-purple-100/50"}`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {isExpanded ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
            <BookOpen className={`w-4 h-4 shrink-0 ${isDarkMode ? "text-purple-400" : "text-purple-500"}`} />
            <span className={`text-sm font-medium truncate ${isDarkMode ? "text-slate-200" : "text-gray-700"}`}>
              {sectionTitle}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${isDarkMode ? "bg-purple-900/50 text-purple-400" : "bg-purple-100 text-purple-600"}`}>
              {totalQuestions} {t("mockTestForms.detail.questions", "questions")}
            </span>
          </div>
        </button>

        {isExpanded && (
          <div className={`divide-y ${isDarkMode ? "divide-slate-800" : "divide-purple-100"}`}>
            {childSections.length > 0 && (
              <div className={`px-3 py-3 space-y-3 ${isDarkMode ? "bg-slate-950/30" : "bg-white"}`}>
                {childSections.map((childSection, childIndex) => renderSectionNode(childSection, childIndex, depth + 1, `${pathLabel}.${childIndex + 1}`))}
              </div>
            )}

            {questions.length > 0 ? (
              questions.map((question, questionIndex) => renderQuestionItem(question, questionIndex, section.sectionId))
            ) : childSections.length === 0 ? (
              <div className={`px-4 py-6 text-center text-sm ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
                {t("mockTestForms.detail.noQuestions", "No questions in this section.")}
              </div>
            ) : null}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`h-full flex flex-col ${fontClass}`}>
      {/* Header — màu tím thay vì xanh */}
      <div className={`px-4 py-3 border-b flex items-center justify-between ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <div className="flex items-center gap-3">
          <button onClick={onBack} className={`p-1.5 rounded-lg transition-all active:scale-95 ${isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-gray-100 text-gray-600"}`}>
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-purple-500" />
            <p className={`text-base font-medium truncate max-w-[300px] ${isDarkMode ? "text-slate-100" : "text-gray-800"}`}>{quiz?.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {contextType === "GROUP" && quizStatus === "DRAFT" && (
            <Button
              onClick={handlePublish}
              disabled={isPublishing}
              className="bg-violet-600 hover:bg-violet-700 text-white rounded-full h-9 px-4 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-60"
            >
              {isPublishing
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Users className="w-4 h-4" />}
              <span className="text-sm">{t("mockTestForms.detail.publish", "Xuất bản")}</span>
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
              ? "border-purple-500 text-purple-600 dark:text-purple-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300"
          }`}
        >
          <Info className="w-4 h-4" /> {t("mockTestForms.detail.tabOverview", "Tổng quan")}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("questions")}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "questions"
              ? "border-purple-500 text-purple-600 dark:text-purple-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300"
          }`}
        >
          <List className="w-4 h-4" /> {t("mockTestForms.detail.tabQuestions", "Câu hỏi")}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "history"
              ? "border-purple-500 text-purple-600 dark:text-purple-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300"
          }`}
        >
          <History className="w-4 h-4" /> {t("mockTestForms.detail.tabHistory", "Lịch sử làm bài")}
        </button>
      </div>

      {/* Nội dung chi tiết */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Overview Tab */}
        {activeTab === "overview" && (
        <div className={`rounded-xl p-4 border ${isDarkMode ? "bg-purple-950/20 border-purple-900/40" : "bg-purple-50/50 border-purple-200"}`}>
          <div className="flex items-start justify-between mb-3">
            <h3 className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>{quiz?.title}</h3>
            <div className="flex items-center gap-2">
              {quiz?.roadmapName && (
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${isDarkMode ? "bg-purple-950/50 text-purple-400" : "bg-purple-100 text-purple-700"}`}>
                  {quiz.roadmapName}
                </span>
              )}
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${isDarkMode ? ss.dark : ss.light}`}>
                {t(`mockTestForms.common.status${(quiz?.status || "").charAt(0) + (quiz?.status || "").slice(1).toLowerCase()}`, quiz?.status)}
              </span>
            </div>
          </div>

          {/* Thẻ thông tin dạng grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {quiz?.duration > 0 && (
              <InfoChip icon={Timer} label={t("mockTestForms.common.timeDuration", "Duration (minutes)")} value={`${getDurationInMinutes(quiz.duration)} ${t("mockTestForms.detail.minutes", "min")}`} isDarkMode={isDarkMode} />
            )}
            {quiz?.overallDifficulty && (
              <InfoChip icon={BarChart3} label={t("mockTestForms.common.overallDifficulty", "Overall difficulty")} value={t(`mockTestForms.common.difficulty${quiz.overallDifficulty.charAt(0) + quiz.overallDifficulty.slice(1).toLowerCase()}`, quiz.overallDifficulty.toLowerCase())} isDarkMode={isDarkMode} />
            )}
            {quiz?.passScore != null && (
              <InfoChip icon={Target} label={t("mockTestForms.common.passingScore", "Passing score")} value={quiz.passScore} isDarkMode={isDarkMode} />
            )}
            {quiz?.maxAttempt != null && (
              <InfoChip icon={Hash} label={t("mockTestForms.common.maxAttempt", "Max attempts")} value={quiz.maxAttempt} isDarkMode={isDarkMode} />
            )}
          </div>

          {/* Action Button — Làm bài (full width, không có Luyện tập) */}
          {isReadyToTake && (
            <div className={`mt-4 pt-4 border-t ${isDarkMode ? "border-purple-900/40" : "border-purple-200"}`}>
              <Button
                onClick={handleTakeExam}
                className="h-10 w-full px-4 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all active:scale-95 shadow-sm"
              >
                <ClipboardCheck className="w-4 h-4" />
                <span className="font-medium">{t("mockTestForms.detail.take", "Làm bài")}</span>
              </Button>
            </div>
          )}

          {/* Ngày tạo */}
          <div className={`flex items-center gap-2 mt-3 text-xs ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
            <Clock className="w-3 h-3" />
            <span>{t("mockTestForms.detail.createdAt", "Created")}: {formatDate(quiz?.createdAt)}</span>
            {quiz?.updatedAt && (
              <>
                <span>•</span>
                <span>{t("mockTestForms.detail.updatedAt", "Updated")}: {formatDate(quiz.updatedAt)}</span>
              </>
            )}
          </div>
        </div>
        )}

        {/* Questions Tab — Danh sách sections + questions */}
        {activeTab === "questions" && (
        <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className={`w-8 h-8 animate-spin mb-2 ${isDarkMode ? "text-purple-500" : "text-purple-400"}`} />
            <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>{t("mockTestForms.detail.loadingDetail", "Loading details...")}</p>
          </div>
        ) : sections.length === 0 ? (
          <div className={`text-center py-8 text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
            {t("mockTestForms.detail.noSections", "No sections available")}
          </div>
        ) : (
          <>
            {!canViewAnswers && (
              <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm border ${
                isDarkMode
                  ? "bg-slate-800/60 border-slate-700 text-slate-400"
                  : "bg-slate-50 border-slate-200 text-slate-500"
              }`}>
                <Lock className="w-4 h-4 shrink-0" />
                <span>{t("mockTestForms.detail.answersLocked", "Làm bài để xem đáp án và giải thích.")}</span>
              </div>
            )}
            {sections.map((section, sectionIndex) => renderSectionNode(section, sectionIndex))}
          </>
        )}
        </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div className="space-y-4">
            {loadingHistory ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className={`w-8 h-8 animate-spin mb-2 ${isDarkMode ? "text-purple-500" : "text-purple-400"}`} />
                <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                  {t("mockTestForms.detail.historyLoading", "Đang tải lịch sử...")}
                </p>
              </div>
            ) : history.length === 0 ? (
              <div className={`text-center py-12 text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
                {t("mockTestForms.detail.historyEmpty", "Chưa có lần làm bài nào.")}
              </div>
            ) : (
              <div className="grid gap-4">
                {history.map((attempt) => (
                  <div
                    key={attempt.attemptId}
                    className={`rounded-xl p-4 border transition-colors cursor-pointer ${
                      isDarkMode ? "bg-slate-800/50 border-slate-800 hover:bg-slate-800/80" : "bg-white border-slate-200 hover:bg-slate-50"
                    }`}
                    onClick={() => navigate(buildQuizResultPath(attempt.attemptId), {
                      state: {
                        quizId: quiz?.quizId,
                        returnToQuizPath: `${location.pathname}${location.search || ""}`,
                      },
                    })}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          attempt.status === "COMPLETED"
                            ? (isDarkMode ? "bg-emerald-900/30 text-emerald-400" : "bg-emerald-100 text-emerald-600")
                            : (isDarkMode ? "bg-amber-900/30 text-amber-400" : "bg-amber-100 text-amber-600")
                        }`}>
                          {attempt.status === "COMPLETED" ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                        </div>
                        <div>
                          <h4 className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                            {t("mockTestForms.detail.historyAttempt", "Lần làm")} #{attempt.attemptId}
                          </h4>
                          <p className={`text-xs mt-0.5 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                            {formatDate(attempt.startedAt)}
                          </p>
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
    </div>
  );
}

// Component chip thông tin — sắc tím
function InfoChip({ icon: Icon, label, value, isDarkMode }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isDarkMode ? "bg-slate-900/50" : "bg-white"}`}>
      <Icon className={`w-4 h-4 shrink-0 ${isDarkMode ? "text-purple-400" : "text-purple-500"}`} />
      <div>
        <p className={`text-[10px] ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>{label}</p>
        <p className={`text-xs font-medium ${isDarkMode ? "text-slate-200" : "text-gray-700"}`}>{value}</p>
      </div>
    </div>
  );
}

export default MockTestDetailView;
