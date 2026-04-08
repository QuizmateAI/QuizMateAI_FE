import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, CheckCircle2, ClipboardCheck, Loader2, Timer } from "lucide-react";
import { QUESTION_TYPE_ID_MAP } from "@/api/QuizAPI";
import MixedMathText from "@/Components/math/MixedMathText";

const BLOOM_KEYS = ["remember", "understand", "apply", "analyze", "evaluate"];

function getBloomKey(bloomId) {
  const n = Number(bloomId);
  if (!Number.isInteger(n) || n < 1) return "remember";
  return BLOOM_KEYS[n - 1] || "remember";
}

function GroupQuizReviewPanel({ isDarkMode, sections = [], questionsMap = {}, answersMap = {}, loading = false }) {
  const { t } = useTranslation();

  const flatItems = useMemo(() => {
    const out = [];
    (sections || []).forEach((section, sIdx) => {
      const qs = questionsMap[section.sectionId] || [];
      qs.forEach((question) => {
        out.push({ section, sIdx, question });
      });
    });
    return out;
  }, [sections, questionsMap]);

  const renderAnswers = (question, answers) => {
    const typeName = QUESTION_TYPE_ID_MAP[question.questionTypeId] || "multipleChoice";
    const correctTextAnswers = (answers || [])
      .filter((ans) => ans?.isCorrect)
      .map((ans) => (typeof ans?.content === "string" ? ans.content.trim() : ""))
      .filter(Boolean);
    const fallbackTextAnswers = (answers || [])
      .map((ans) => (typeof ans?.content === "string" ? ans.content.trim() : ""))
      .filter(Boolean);
    const textAnswersToDisplay = correctTextAnswers.length > 0 ? correctTextAnswers : fallbackTextAnswers;

    if (typeName === "shortAnswer" || typeName === "fillBlank") {
      return (
        <div
          className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
            isDarkMode ? "border border-emerald-800/50 bg-emerald-950/30" : "border border-emerald-200 bg-emerald-50"
          }`}
        >
          <span
            className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${
              isDarkMode ? "bg-emerald-800 text-emerald-300" : "bg-emerald-200 text-emerald-700"
            }`}
          >
            {t("workspace.quiz.correctAnswerLabel", "Correct answer")}
          </span>
          <span className={`flex-1 ${isDarkMode ? "text-emerald-300" : "text-emerald-700"}`}>
            {textAnswersToDisplay.length ? (
              <MixedMathText>{textAnswersToDisplay.join(" / ")}</MixedMathText>
            ) : (
              "-"
            )}
          </span>
          <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${isDarkMode ? "text-emerald-400" : "text-emerald-600"}`} />
        </div>
      );
    }

    if (typeName === "matching") {
      const correctAns = (answers || []).find((answer) => answer.isCorrect);
      let pairs = [];
      if (correctAns?.content) {
        try {
          pairs = JSON.parse(correctAns.content);
        } catch {
          pairs = [];
        }
      }

      if (!Array.isArray(pairs) || pairs.length === 0) {
        return (
          <span className={`text-xs ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
            {t("workspace.quiz.detail.matchingNoData", "No matching data available")}
          </span>
        );
      }

      return (
        <div className="space-y-1.5">
          {pairs.map((pair, pairIndex) => (
            <div
              key={pairIndex}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                isDarkMode ? "border border-emerald-800/50 bg-emerald-950/30" : "border border-emerald-200 bg-emerald-50"
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                  isDarkMode ? "bg-emerald-800 text-emerald-300" : "bg-emerald-200 text-emerald-700"
                }`}
              >
                {pairIndex + 1}
              </span>
              <span className={`font-semibold ${isDarkMode ? "text-emerald-300" : "text-emerald-700"}`}>
                <MixedMathText>{pair.leftKey}</MixedMathText>
              </span>
              <span className={`shrink-0 ${isDarkMode ? "text-emerald-600" : "text-emerald-400"}`}>{"->"}</span>
              <span className={isDarkMode ? "text-emerald-300" : "text-emerald-700"}>
                <MixedMathText>{pair.rightKey}</MixedMathText>
              </span>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-1.5">
        {(answers || []).map((answer, answerIndex) => (
          <div
            key={answer.answerId ?? answerIndex}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
              answer.isCorrect
                ? isDarkMode
                  ? "border border-emerald-800/50 bg-emerald-950/30"
                  : "border border-emerald-200 bg-emerald-50"
                : isDarkMode
                  ? "bg-slate-800/50"
                  : "bg-gray-50"
            }`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                answer.isCorrect
                  ? isDarkMode
                    ? "bg-emerald-800 text-emerald-300"
                    : "bg-emerald-200 text-emerald-700"
                  : isDarkMode
                    ? "bg-slate-700 text-slate-400"
                    : "bg-gray-200 text-gray-500"
              }`}
            >
              {typeName === "trueFalse"
                ? String(answer.content || "").slice(0, 1).toUpperCase()
                : String.fromCharCode(65 + answerIndex)}
            </span>
            <span
              className={`flex-1 ${
                answer.isCorrect
                  ? isDarkMode
                    ? "text-emerald-300"
                    : "text-emerald-700"
                  : isDarkMode
                    ? "text-slate-300"
                    : "text-gray-700"
              }`}
            >
              <MixedMathText>{answer.content}</MixedMathText>
            </span>
            {answer.isCorrect && (
              <CheckCircle2 className={`h-4 w-4 shrink-0 ${isDarkMode ? "text-emerald-400" : "text-emerald-600"}`} />
            )}
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className={`mb-2 h-8 w-8 animate-spin ${isDarkMode ? "text-slate-500" : "text-gray-400"}`} />
        <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
          {t("workspace.quiz.detail.loadingDetail", "Loading quiz details...")}
        </p>
      </div>
    );
  }

  if (!sections.length || flatItems.length === 0) {
    return (
      <div className={`rounded-xl border py-12 text-center ${isDarkMode ? "border-slate-800 bg-slate-900/40 text-slate-400" : "border-slate-200 bg-slate-50 text-gray-500"}`}>
        <BookOpen className="mx-auto mb-2 h-10 w-10 opacity-30" />
        <p className="text-sm">{t("workspace.quiz.detail.noQuestionsToCheck", "No questions to check yet.")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      <div
        className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
          isDarkMode ? "border-blue-900/50 bg-blue-950/20" : "border-blue-200 bg-blue-50/80"
        }`}
      >
        <ClipboardCheck className={`mt-0.5 h-5 w-5 shrink-0 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`} />
        <p className={`text-sm leading-relaxed ${isDarkMode ? "text-blue-100" : "text-blue-950"}`}>
          {t(
            "workspace.quiz.detail.reviewHint",
            "Each card shows question type, difficulty, cognitive level, and all answer options. Correct options are highlighted.",
          )}
        </p>
      </div>

      {flatItems.map((item, globalIdx) => {
        const { section, sIdx, question } = item;
        const answers = answersMap[question.questionId] || [];
        const typeName = QUESTION_TYPE_ID_MAP[question.questionTypeId] || "multipleChoice";

        return (
          <article
            key={`${section.sectionId}-${question.questionId}`}
            className={`overflow-hidden rounded-2xl border shadow-sm ${
              isDarkMode ? "border-slate-700 bg-slate-900/60" : "border-slate-200 bg-white"
            }`}
          >
            <div
              className={`flex flex-wrap items-center gap-2 border-b px-4 py-2.5 text-[11px] ${
                isDarkMode ? "border-slate-800 bg-slate-950/50" : "border-slate-100 bg-slate-50"
              }`}
            >
              <span className={`font-semibold uppercase tracking-wide ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
                {t("workspace.quiz.detail.config", "Config")}
              </span>
              <span
                className={`rounded-full px-2.5 py-1 font-medium ${
                  isDarkMode ? "border border-violet-800/50 bg-violet-950/60 text-violet-200" : "border border-violet-200 bg-violet-50 text-violet-800"
                }`}
              >
                {t(`workspace.quiz.types.${typeName}`)}
              </span>
              {question.difficulty && (
                <span
                  className={`rounded-full px-2.5 py-1 ${
                    isDarkMode ? "bg-slate-800 text-slate-300" : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {t(`workspace.quiz.difficultyLevels.${String(question.difficulty).toLowerCase()}`)}
                </span>
              )}
              {question.bloomId ? (
                <span
                  className={`rounded-full px-2.5 py-1 ${
                    isDarkMode ? "bg-slate-800 text-slate-300" : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {t(`workspace.quiz.bloomLevels.${getBloomKey(question.bloomId)}`)}
                </span>
              ) : null}
              {question.duration > 0 && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${isDarkMode ? "bg-slate-800 text-slate-300" : "bg-gray-100 text-gray-700"}`}>
                  <Timer className="h-3 w-3" />
                  {question.duration}s
                </span>
              )}
            </div>

            <div className="px-4 py-4">
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                    isDarkMode ? "bg-blue-950/60 text-blue-300" : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {globalIdx + 1}
                </span>
                <div className="min-w-0 flex-1 space-y-4">
                  <p className={`text-[10px] uppercase tracking-wider ${isDarkMode ? "text-slate-500" : "text-gray-500"}`}>
                    {t("workspace.quiz.detail.section", "Section")} {sIdx + 1}
                    {section?.content ? ` · ${section.content}` : ""}
                  </p>
                  <div
                    className={`whitespace-pre-wrap text-sm font-medium leading-relaxed ${
                      isDarkMode ? "text-slate-100" : "text-gray-900"
                    }`}
                  >
                    <MixedMathText>{question.content}</MixedMathText>
                  </div>

                  <div>
                    <p className={`mb-2 text-xs font-semibold ${isDarkMode ? "text-slate-400" : "text-gray-600"}`}>
                      {t("workspace.quiz.detail.answersAndOptions", "Answers & options")}
                    </p>
                    {renderAnswers(question, answers)}
                  </div>

                  {question.explanation ? (
                    <div
                      className={`rounded-lg border px-3 py-2 text-xs italic ${
                        isDarkMode ? "border-amber-900/40 bg-amber-950/20 text-amber-200" : "border-amber-200 bg-amber-50 text-amber-900"
                      }`}
                    >
                      <span className="font-semibold not-italic">{t("workspace.quiz.explanation", "Explanation")}:</span>{" "}
                      <MixedMathText className="not-italic">{question.explanation}</MixedMathText>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default GroupQuizReviewPanel;
