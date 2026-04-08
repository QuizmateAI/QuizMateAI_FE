import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft, ClipboardList, Timer, BarChart3, Clock, Loader2, Edit3, Star,
  ChevronDown, ChevronRight, Target, BookOpen, Hash, CheckCircle2, Users
} from "lucide-react";
import { Button } from "@/Components/ui/button";
import {
  getSectionsByQuiz, getQuestionsBySection, getAnswersByQuestion,
  toggleStarQuestion, QUESTION_TYPE_ID_MAP
} from "@/api/QuizAPI";
import MixedMathText from "@/Components/math/MixedMathText";

// Cấu hình màu badge trạng thái (giống quiz)
const STATUS_STYLES = {
  ACTIVE: { light: "bg-emerald-100 text-emerald-700", dark: "bg-emerald-950/50 text-emerald-400" },
  DRAFT: { light: "bg-amber-100 text-amber-700", dark: "bg-amber-950/50 text-amber-400" },
  COMPLETED: { light: "bg-blue-100 text-blue-700", dark: "bg-blue-950/50 text-blue-400" },
  INACTIVE: { light: "bg-slate-100 text-slate-500", dark: "bg-slate-800 text-slate-400" },
};

// Hàm format ngày giờ
function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * Component hiển thị chi tiết Mock Test — giao diện tím (purple) để phân biệt với Quiz (xanh dương)
 * Cấu trúc giống QuizDetailView: sections → questions → answers
 */
function MockTestDetailView({ isDarkMode, quiz, onBack, onEdit, hideEditButton = false, contextType = "WORKSPACE" }) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";

  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState([]);
  const [questionsMap, setQuestionsMap] = useState({});
  const [answersMap, setAnswersMap] = useState({});
  const [expandedSections, setExpandedSections] = useState({});
  const [expandedQuestions, setExpandedQuestions] = useState({});
  const [starringId, setStarringId] = useState(null);

  // Tải toàn bộ dữ liệu chi tiết: sections → questions → answers
  const fetchFullDetail = useCallback(async () => {
    if (!quiz?.quizId) return;
    setLoading(true);
    try {
      const sectRes = await getSectionsByQuiz(quiz.quizId);
      const sectionList = sectRes.data || [];
      setSections(sectionList);

      if (sectionList.length > 0) {
        setExpandedSections({ [sectionList[0].sectionId]: true });
      }

      const qMap = {};
      const aMap = {};
      for (const section of sectionList) {
        const qRes = await getQuestionsBySection(section.sectionId);
        const questions = qRes.data || [];
        qMap[section.sectionId] = questions;

        for (const question of questions) {
          const aRes = await getAnswersByQuestion(question.questionId);
          aMap[question.questionId] = aRes.data || [];
        }
      }
      setQuestionsMap(qMap);
      setAnswersMap(aMap);
    } catch (err) {
      console.error("Lỗi khi tải chi tiết mock test:", err);
    } finally {
      setLoading(false);
    }
  }, [quiz?.quizId]);

  useEffect(() => {
    fetchFullDetail();
  }, [fetchFullDetail]);

  const toggleSection = (sectionId) => {
    setExpandedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const toggleQuestion = (questionId) => {
    setExpandedQuestions((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  const handleToggleStar = async (questionId, sectionId) => {
    if (starringId) return;
    setStarringId(questionId);
    try {
      const res = await toggleStarQuestion(questionId);
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

  const ss = STATUS_STYLES[quiz?.status] || STATUS_STYLES.DRAFT;

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
          {!hideEditButton && onEdit && (
            <Button onClick={() => onEdit?.(quiz)} className="bg-purple-600 hover:bg-purple-700 text-white rounded-full h-9 px-4 flex items-center gap-2 transition-all active:scale-95">
              <Edit3 className="w-4 h-4" />
              <span className="text-sm">{t("workspace.mockTest.detail.edit")}</span>
            </Button>
          )}
          {!hideEditButton && contextType === "GROUP" && (
            <Button
              className="bg-violet-600 hover:bg-violet-700 text-white rounded-full h-9 px-4 flex items-center gap-2 transition-all active:scale-95"
              onClick={() => {
                alert(t("workspace.quiz.detail.assignComingSoon", "Group assignment will be available soon."));
              }}
            >
              <Users className="w-4 h-4" />
              <span className="text-sm">{t("workspace.quiz.detail.assign", "Assign")}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Nội dung chi tiết */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Thông tin tổng quan — viền/nền tím */}
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
                {t(`workspace.quiz.statusLabels.${quiz?.status}`)}
              </span>
            </div>
          </div>

          {/* Thẻ thông tin dạng grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {quiz?.duration > 0 && (
              <InfoChip icon={Timer} label={t("workspace.quiz.timeDuration")} value={`${quiz.duration} ${t("workspace.quiz.minutes")}`} isDarkMode={isDarkMode} accent="purple" />
            )}
            {quiz?.overallDifficulty && (
              <InfoChip icon={BarChart3} label={t("workspace.quiz.overallDifficulty")} value={t(`workspace.quiz.difficultyLevels.${quiz.overallDifficulty.toLowerCase()}`)} isDarkMode={isDarkMode} accent="purple" />
            )}
            {quiz?.passScore != null && (
              <InfoChip icon={Target} label={t("workspace.quiz.passingScore")} value={quiz.passScore} isDarkMode={isDarkMode} accent="purple" />
            )}
            {quiz?.maxAttempt != null && (
              <InfoChip icon={Hash} label={t("workspace.quiz.maxAttempt")} value={quiz.maxAttempt} isDarkMode={isDarkMode} accent="purple" />
            )}
          </div>

          {/* Ngày tạo */}
          <div className={`flex items-center gap-2 mt-3 text-xs ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
            <Clock className="w-3 h-3" />
            <span>{t("workspace.quiz.detail.createdAt")}: {formatDate(quiz?.createdAt)}</span>
            {quiz?.updatedAt && (
              <>
                <span>•</span>
                <span>{t("workspace.quiz.detail.updatedAt")}: {formatDate(quiz.updatedAt)}</span>
              </>
            )}
          </div>
        </div>

        {/* Danh sách sections + questions */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className={`w-8 h-8 animate-spin mb-2 ${isDarkMode ? "text-purple-500" : "text-purple-400"}`} />
            <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>{t("workspace.quiz.detail.loadingDetail")}</p>
          </div>
        ) : sections.length === 0 ? (
          <div className={`text-center py-8 text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
            {t("workspace.quiz.detail.noSections", "No sections available")}
          </div>
        ) : (
          sections.map((section, sIdx) => {
            const isExpanded = expandedSections[section.sectionId];
            const questions = questionsMap[section.sectionId] || [];

            return (
              <div key={section.sectionId} className={`rounded-xl border overflow-hidden ${isDarkMode ? "border-purple-900/40" : "border-purple-200"}`}>
                {/* Section header — nền tím nhạt */}
                <button
                  onClick={() => toggleSection(section.sectionId)}
                  className={`w-full px-4 py-3 flex items-center justify-between transition-colors ${isDarkMode ? "bg-purple-950/20 hover:bg-purple-950/40" : "bg-purple-50/50 hover:bg-purple-100/50"}`}
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <BookOpen className={`w-4 h-4 ${isDarkMode ? "text-purple-400" : "text-purple-500"}`} />
                    <span className={`text-sm font-medium ${isDarkMode ? "text-slate-200" : "text-gray-700"}`}>
                      {t("workspace.quiz.detail.section", "Section")} {sIdx + 1}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${isDarkMode ? "bg-purple-900/50 text-purple-400" : "bg-purple-100 text-purple-600"}`}>
                      {questions.length} {t("workspace.quiz.detail.questions")}
                    </span>
                  </div>
                </button>

                {/* Danh sách câu hỏi */}
                {isExpanded && (
                  <div className={`divide-y ${isDarkMode ? "divide-slate-800" : "divide-purple-100"}`}>
                    {questions.length === 0 ? (
                      <div className={`px-4 py-6 text-center text-sm ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
                        {t("workspace.quiz.detail.noQuestions")}
                      </div>
                    ) : (
                      questions.map((question, qIdx) => {
                        const answers = answersMap[question.questionId] || [];
                        const isQExpanded = expandedQuestions[question.questionId];
                        const typeName = QUESTION_TYPE_ID_MAP[question.questionTypeId] || "multipleChoice";

                        return (
                          <div key={question.questionId} className={`px-4 py-3 ${isDarkMode ? "bg-slate-900/50" : "bg-white"}`}>
                            <div className="flex items-start gap-3">
                              {/* Số thứ tự — màu tím */}
                              <span className={`text-xs font-bold mt-0.5 shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${isDarkMode ? "bg-purple-950/50 text-purple-400" : "bg-purple-100 text-purple-600"}`}>
                                {qIdx + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <p className={`text-sm font-medium whitespace-pre-wrap ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>
                                    <MixedMathText>{question.content}</MixedMathText>
                                  </p>
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

                                {/* Meta info: type, difficulty, bloom, duration — badge tím */}
                                <div className={`flex items-center gap-2 mt-1.5 flex-wrap text-[11px] ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
                                  <span className={`px-2 py-0.5 rounded-full ${isDarkMode ? "bg-purple-950/40 text-purple-400" : "bg-purple-50 text-purple-600"}`}>
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

                                {/* Answers */}
                                {isQExpanded && (
                                  <div className="mt-3 space-y-1.5">
                                    {typeName === "matching" ? (() => {
                                      const correctAns = answers.find((a) => a.isCorrect);
                                      let pairs = [];
                                      if (correctAns?.content) {
                                        try { pairs = JSON.parse(correctAns.content); } catch { pairs = []; }
                                      }
                                      if (!Array.isArray(pairs) || pairs.length === 0) {
                                        return (
                                          <span className={`text-xs ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
                                            {t("workspace.quiz.detail.matchingNoData", "No matching data available")}
                                          </span>
                                        );
                                      }
                                      return pairs.map((pair, pIdx) => (
                                        <div key={pIdx} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                                          isDarkMode ? "bg-emerald-950/30 border border-emerald-800/50" : "bg-emerald-50 border border-emerald-200"
                                        }`}>
                                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                            isDarkMode ? "bg-emerald-800 text-emerald-300" : "bg-emerald-200 text-emerald-700"
                                          }`}>{pIdx + 1}</span>
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
                                    })() : answers.map((ans, aIdx) => (
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
                                          {String.fromCharCode(65 + aIdx)}
                                        </span>
                                        <span className={`flex-1 ${
                                          ans.isCorrect
                                            ? isDarkMode ? "text-emerald-300" : "text-emerald-700"
                                            : isDarkMode ? "text-slate-300" : "text-gray-700"
                                        }`}>
                                          <MixedMathText>{ans.content}</MixedMathText>
                                        </span>
                                        {ans.isCorrect && <CheckCircle2 className={`w-4 h-4 shrink-0 ${isDarkMode ? "text-emerald-400" : "text-emerald-600"}`} />}
                                      </div>
                                    ))}

                                    {/* Giải thích */}
                                    {question.explanation && (
                                      <div className={`mt-2 px-3 py-2 rounded-lg text-xs italic ${isDarkMode ? "bg-amber-950/20 text-amber-400 border border-amber-900/30" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                                        <span className="font-semibold not-italic">{t("workspace.quiz.explanation")}:</span>{" "}
                                        <MixedMathText className="not-italic">{question.explanation}</MixedMathText>
                                      </div>
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
    </div>
  );
}

// Component chip thông tin — sắc tím
function InfoChip({ icon: Icon, label, value, isDarkMode, accent = "purple" }) {
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
