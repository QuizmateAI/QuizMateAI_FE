import React, { useMemo, useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { BookOpen, CheckCircle2, ClipboardCheck, Loader2, Timer, BadgeCheck, Trash2 } from "lucide-react";
import { QUESTION_TYPE_ID_MAP, deleteQuestion } from "@/api/QuizAPI";
import {
  getMyQuizReviewContributor,
  setQuizReviewCompleteOk,
} from "@/api/ChallengeAPI";
import MixedMathText from "@/Components/math/MixedMathText";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/Components/ui/dialog";
import { Button } from "@/Components/ui/button";

const BLOOM_KEYS = ["remember", "understand", "apply", "analyze", "evaluate"];

function getBloomKey(bloomId) {
  const n = Number(bloomId);
  if (!Number.isInteger(n) || n < 1) return "remember";
  return BLOOM_KEYS[n - 1] || "remember";
}

function GroupQuizReviewPanel({
  isDarkMode,
  sections = [],
  questionsMap = {},
  answersMap = {},
  loading = false,
  quizId,
  workspaceId,
  isLeader = false,
  isReviewer = false,
  onQuestionDeleted,
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [reviewCompleteOkAt, setReviewCompleteOkAt] = useState(null);
  const [ackLoading, setAckLoading] = useState(false);
  const [confirmReviewOpen, setConfirmReviewOpen] = useState(false);
  const [deleteLoadingQuestionId, setDeleteLoadingQuestionId] = useState(null);
  const [pendingDeleteQuestion, setPendingDeleteQuestion] = useState(null);

  const canInteract = isLeader || isReviewer;
  const canDeleteQuestions = isLeader || isReviewer;

  const fetchMyReviewRow = useCallback(async () => {
    if (!quizId || !workspaceId || !isReviewer) return;
    try {
      const res = await getMyQuizReviewContributor(workspaceId, quizId);
      const row = res.data?.data ?? res.data;
      setReviewCompleteOkAt(row?.reviewCompleteOkAt ?? null);
    } catch {
      setReviewCompleteOkAt(null);
    }
  }, [quizId, workspaceId, isReviewer]);

  useEffect(() => {
    fetchMyReviewRow();
  }, [fetchMyReviewRow]);

  const invalidateChallengeCaches = useCallback(() => {
    queryClient.invalidateQueries({
      predicate: (q) => Array.isArray(q.queryKey)
        && q.queryKey[0] === "challenge-detail"
        && (workspaceId == null || q.queryKey[1] === workspaceId),
    });
  }, [queryClient, workspaceId]);

  const submitReviewConfirmation = useCallback(async () => {
    if (!quizId || !workspaceId || !isReviewer) return;
    setAckLoading(true);
    try {
      const res = await setQuizReviewCompleteOk(workspaceId, quizId, true);
      const row = res.data?.data ?? res.data;
      setReviewCompleteOkAt(row?.reviewCompleteOkAt ?? null);
      invalidateChallengeCaches();
      setConfirmReviewOpen(false);
    } catch {
      /* toast / global */
    } finally {
      setAckLoading(false);
    }
  }, [quizId, workspaceId, isReviewer, invalidateChallengeCaches]);

  const confirmDeleteQuestion = useCallback(async () => {
    const questionId = pendingDeleteQuestion?.questionId;
    if (!questionId) return;
    setDeleteLoadingQuestionId(questionId);
    try {
      await deleteQuestion(questionId);
      invalidateChallengeCaches();
      setPendingDeleteQuestion(null);
      await onQuestionDeleted?.();
    } catch {
      /* toast / global */
    } finally {
      setDeleteLoadingQuestionId(null);
    }
  }, [pendingDeleteQuestion, invalidateChallengeCaches, onQuestionDeleted]);

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
          {canInteract
            ? t(
                "workspace.quiz.detail.reviewHintCheckTab",
                "Xem từng câu. Khi cả đề đã ổn, xác nhận ở cuối trang (nếu bạn là reviewer được mời).",
              )
            : t(
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
                  <div className="flex items-start justify-between gap-3">
                    <p className={`text-[10px] uppercase tracking-wider ${isDarkMode ? "text-slate-500" : "text-gray-500"}`}>
                      {t("workspace.quiz.detail.section", "Section")} {sIdx + 1}
                      {section?.content ? ` · ${section.content}` : ""}
                    </p>
                    {canDeleteQuestions ? (
                      <button
                        type="button"
                        onClick={() => setPendingDeleteQuestion({ questionId: question.questionId, content: question.content })}
                        disabled={deleteLoadingQuestionId === question.questionId}
                        className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50 ${
                          isDarkMode ? "text-red-300 hover:bg-red-500/15" : "text-red-600 hover:bg-red-50"
                        }`}
                      >
                        {deleteLoadingQuestionId === question.questionId ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        {t("workspace.quiz.reviewDeleteQuestion", "Xóa câu hỏi")}
                      </button>
                    ) : null}
                  </div>
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

                  <div
                    className={`flex flex-wrap items-center gap-2 rounded-[20px] border px-3 py-2.5 text-xs ${
                      isDarkMode ? "border-slate-800 bg-slate-950/70" : "border-slate-200 bg-slate-50/80"
                    }`}
                  >
                    <span className={`rounded-full px-2.5 py-1 ${isDarkMode ? "bg-slate-900 text-slate-400" : "bg-white text-slate-500"}`}>
                      {answers.length} đáp án
                    </span>
                    {question.explanation ? (
                      <span className={`rounded-full px-2.5 py-1 ${isDarkMode ? "bg-slate-900 text-slate-400" : "bg-white text-slate-500"}`}>
                        Có lời giải
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </article>
        );
      })}

      {isReviewer && !loading && flatItems.length > 0 && (
        <div
          className={`mt-6 rounded-2xl border px-4 py-4 ${
            isDarkMode ? "border-emerald-800/50 bg-emerald-950/25" : "border-emerald-200 bg-emerald-50/90"
          }`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              <BadgeCheck className={`mt-0.5 h-5 w-5 shrink-0 ${isDarkMode ? "text-emerald-400" : "text-emerald-700"}`} />
              <div>
                <p className={`text-sm font-semibold ${isDarkMode ? "text-emerald-100" : "text-emerald-950"}`}>
                  {t("workspace.quiz.reviewQuizOkTitle", "Xác nhận toàn bộ đề")}
                </p>
                <p className={`mt-0.5 text-xs ${isDarkMode ? "text-emerald-200/85" : "text-emerald-900/80"}`}>
                  {t(
                    "workspace.quiz.reviewQuizOkHint",
                    "Khi đã xem hết và thấy đề ổn, bấm xác nhận bên dưới.",
                  )}
                </p>
                {reviewCompleteOkAt ? (
                  <p className={`mt-2 text-xs ${isDarkMode ? "text-emerald-300/90" : "text-emerald-800"}`}>
                    {t("workspace.quiz.reviewQuizOkDoneAt", "Đã xác nhận lúc {{time}}", {
                      time: new Date(reviewCompleteOkAt).toLocaleString(),
                    })}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:shrink-0">
              {!reviewCompleteOkAt ? (
                <button
                  type="button"
                  disabled={ackLoading}
                  onClick={() => setConfirmReviewOpen(true)}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
                    isDarkMode ? "bg-emerald-600 hover:bg-emerald-500" : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {ackLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {t("workspace.quiz.reviewQuizOkButton", "Tôi xác nhận — đề này ổn")}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <Dialog open={confirmReviewOpen} onOpenChange={setConfirmReviewOpen}>
        <DialogContent
          className={isDarkMode ? "border-slate-700 bg-slate-900 text-slate-100" : ""}
          hideClose={false}
        >
          <DialogHeader>
            <DialogTitle className={isDarkMode ? "text-white" : ""}>
              {t("workspace.quiz.reviewQuizOkConfirmTitle", "Xác nhận đề đã ổn?")}
            </DialogTitle>
            <DialogDescription className={isDarkMode ? "text-slate-400" : ""}>
              {t(
                "workspace.quiz.reviewQuizOkConfirmDescription",
                "Sau khi xác nhận bạn không thể hoàn tác. Chỉ bấm tiếp tục khi đã xem kỹ toàn bộ đề.",
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={ackLoading}
              onClick={() => setConfirmReviewOpen(false)}
            >
              {t("workspace.quiz.reviewQuizOkConfirmCancel", "Hủy")}
            </Button>
            <Button
              type="button"
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={ackLoading}
              onClick={() => submitReviewConfirmation()}
            >
              {ackLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("workspace.quiz.reviewQuizOkConfirmSubmit", "Xác nhận")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(pendingDeleteQuestion)} onOpenChange={(open) => {
        if (!open && !deleteLoadingQuestionId) setPendingDeleteQuestion(null);
      }}>
        <DialogContent
          className={isDarkMode ? "border-slate-700 bg-slate-900 text-slate-100" : ""}
          hideClose={false}
        >
          <DialogHeader>
            <DialogTitle className={isDarkMode ? "text-white" : ""}>
              {t("workspace.quiz.reviewDeleteQuestionConfirmTitle", "Xóa câu hỏi này?")}
            </DialogTitle>
            <DialogDescription className={isDarkMode ? "text-slate-400" : ""}>
              {t(
                "workspace.quiz.reviewDeleteQuestionConfirmDescription",
                "Câu hỏi sẽ bị xóa khỏi quiz challenge. Chỉ tiếp tục nếu câu hỏi này thực sự không đạt yêu cầu review.",
              )}
            </DialogDescription>
          </DialogHeader>
          {pendingDeleteQuestion?.content ? (
            <div className={`rounded-lg border px-3 py-2 text-sm ${isDarkMode ? "border-slate-700 bg-slate-800/70 text-slate-200" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
              <MixedMathText>{pendingDeleteQuestion.content}</MixedMathText>
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={Boolean(deleteLoadingQuestionId)}
              onClick={() => setPendingDeleteQuestion(null)}
            >
              {t("workspace.quiz.reviewDeleteQuestionConfirmCancel", "Hủy")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={Boolean(deleteLoadingQuestionId)}
              onClick={() => confirmDeleteQuestion()}
            >
              {deleteLoadingQuestionId ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("workspace.quiz.reviewDeleteQuestionConfirmSubmit", "Xóa câu hỏi")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default GroupQuizReviewPanel;
