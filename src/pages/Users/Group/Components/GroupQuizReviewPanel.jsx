import React, { useMemo, useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, BookOpen, CheckCircle2, ClipboardCheck, Loader2, RotateCcw, Timer, BadgeCheck, Trash2 } from "lucide-react";
import { QUESTION_TYPE_ID_MAP } from "@/api/QuizAPI";
import {
  clearSnapshotConcern,
  deleteQuestionFromSnapshot,
  getMyQuizReviewContributor,
  raiseSnapshotConcern,
  setQuizReviewCompleteOk,
} from "@/api/ChallengeAPI";
import MixedMathText from "@/components/math/MixedMathText";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
  const [concernRaisedAt, setConcernRaisedAt] = useState(null);
  const [concernResolvedAt, setConcernResolvedAt] = useState(null);
  const [concernNote, setConcernNote] = useState("");
  const [ackLoading, setAckLoading] = useState(false);
  const [confirmReviewOpen, setConfirmReviewOpen] = useState(false);
  const [deleteLoadingQuestionId, setDeleteLoadingQuestionId] = useState(null);
  const [pendingDeleteQuestion, setPendingDeleteQuestion] = useState(null);
  const [deleteNote, setDeleteNote] = useState("");
  const [concernDialogOpen, setConcernDialogOpen] = useState(false);
  const [concernDraftNote, setConcernDraftNote] = useState("");
  const [concernSubmitting, setConcernSubmitting] = useState(false);
  const [concernError, setConcernError] = useState("");

  const canInteract = isLeader || isReviewer;
  const canDeleteQuestions = isLeader || isReviewer;
  // Concern đang mở (chưa được resolve)
  const hasOpenConcern = Boolean(concernRaisedAt && !concernResolvedAt);

  const fetchMyReviewRow = useCallback(async () => {
    if (!quizId || !workspaceId || !isReviewer) return;
    try {
      const res = await getMyQuizReviewContributor(workspaceId, quizId);
      const row = res.data?.data ?? res.data;
      setReviewCompleteOkAt(row?.reviewCompleteOkAt ?? null);
      setConcernRaisedAt(row?.concernRaisedAt ?? null);
      setConcernResolvedAt(row?.concernResolvedAt ?? null);
      setConcernNote(row?.concernNote ?? "");
    } catch {
      setReviewCompleteOkAt(null);
      setConcernRaisedAt(null);
      setConcernResolvedAt(null);
      setConcernNote("");
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
    if (!questionId || !workspaceId || !quizId || !canDeleteQuestions) return;
    if (!deleteNote || deleteNote.trim().length < 5) return;
    setDeleteLoadingQuestionId(questionId);
    try {
      await deleteQuestionFromSnapshot(workspaceId, quizId, questionId, deleteNote.trim());
      invalidateChallengeCaches();
      setPendingDeleteQuestion(null);
      setDeleteNote("");
      await onQuestionDeleted?.();
    } catch {
      /* toast / global */
    } finally {
      setDeleteLoadingQuestionId(null);
    }
  }, [pendingDeleteQuestion, workspaceId, quizId, canDeleteQuestions, deleteNote, invalidateChallengeCaches, onQuestionDeleted]);

  const submitConcern = useCallback(async () => {
    if (!quizId || !workspaceId || !isReviewer) return;
    if (!concernDraftNote || concernDraftNote.trim().length < 10) {
      setConcernError(t(
        "workspace.quiz.reviewConcern.noteTooShort",
        "Note phải có ít nhất 10 ký tự để leader hiểu vấn đề.",
      ));
      return;
    }
    setConcernError("");
    setConcernSubmitting(true);
    try {
      const res = await raiseSnapshotConcern(workspaceId, quizId, concernDraftNote.trim());
      const row = res.data?.data ?? res.data;
      setConcernRaisedAt(row?.concernRaisedAt ?? new Date().toISOString());
      setConcernResolvedAt(null);
      setConcernNote(row?.concernNote ?? concernDraftNote.trim());
      // Raise concern → tự động bỏ trạng thái "confirm OK" trước đó (BE đã làm).
      setReviewCompleteOkAt(null);
      invalidateChallengeCaches();
      setConcernDialogOpen(false);
      setConcernDraftNote("");
    } catch (err) {
      setConcernError(err?.response?.data?.message || t(
        "workspace.quiz.reviewConcern.submitFailed",
        "Không gửi được report, thử lại sau.",
      ));
    } finally {
      setConcernSubmitting(false);
    }
  }, [quizId, workspaceId, isReviewer, concernDraftNote, invalidateChallengeCaches, t]);

  const withdrawConcern = useCallback(async () => {
    if (!quizId || !workspaceId || !isReviewer) return;
    setConcernSubmitting(true);
    try {
      await clearSnapshotConcern(workspaceId, quizId);
      setConcernResolvedAt(new Date().toISOString());
      invalidateChallengeCaches();
    } catch {
      /* toast / global */
    } finally {
      setConcernSubmitting(false);
    }
  }, [quizId, workspaceId, isReviewer, invalidateChallengeCaches]);

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
    const textAnswerLabel = typeName === "shortAnswer"
      ? t("workspace.quiz.expectedAnswerLabel", "Expected answer")
      : t("workspace.quiz.correctAnswerLabel", "Correct answer");
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
            {textAnswerLabel}
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
        <>
          {/* Banner concern đang mở của reviewer này */}
          {hasOpenConcern && (
            <div className={`mt-6 rounded-2xl border px-4 py-3 ${
              isDarkMode ? "border-rose-800/50 bg-rose-950/25" : "border-rose-200 bg-rose-50/90"
            }`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-2">
                  <AlertTriangle className={`mt-0.5 h-5 w-5 shrink-0 ${isDarkMode ? "text-rose-400" : "text-rose-700"}`} />
                  <div>
                    <p className={`text-sm font-semibold ${isDarkMode ? "text-rose-100" : "text-rose-950"}`}>
                      {t("workspace.quiz.reviewConcern.activeTitle", "Bạn đã báo: Đề chưa ổn")}
                    </p>
                    <p className={`mt-1 text-xs leading-relaxed ${isDarkMode ? "text-rose-200/85" : "text-rose-900/80"}`}>
                      {t("workspace.quiz.reviewConcern.activeHint", "Leader đã nhận report. Trong khi chờ leader xử lý, đề này không thể publish.")}
                    </p>
                    {concernNote ? (
                      <p className={`mt-2 rounded-lg px-3 py-2 text-xs italic ${isDarkMode ? "bg-rose-900/30 text-rose-100" : "bg-rose-100/80 text-rose-900"}`}>
                        "{concernNote}"
                      </p>
                    ) : null}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={withdrawConcern}
                  disabled={concernSubmitting}
                  className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${
                    isDarkMode ? "bg-rose-500/20 text-rose-100 ring-1 ring-rose-500/40 hover:bg-rose-500/30" : "bg-white text-rose-700 ring-1 ring-rose-300 hover:bg-rose-50"
                  }`}
                >
                  {concernSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                  {t("workspace.quiz.reviewConcern.withdraw", "Rút lại report")}
                </button>
              </div>
            </div>
          )}

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
                      "Khi đã xem hết và thấy đề ổn, bấm xác nhận bên dưới. Nếu thấy đề bất ổn, dùng nút 'Đề chưa ổn'.",
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
                {!reviewCompleteOkAt && !hasOpenConcern ? (
                  <button
                    type="button"
                    disabled={ackLoading || concernSubmitting}
                    onClick={() => {
                      setConcernDraftNote("");
                      setConcernError("");
                      setConcernDialogOpen(true);
                    }}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
                      isDarkMode ? "bg-rose-500/20 text-rose-100 ring-1 ring-rose-500/40 hover:bg-rose-500/30" : "bg-white text-rose-700 ring-1 ring-rose-300 hover:bg-rose-50"
                    }`}
                  >
                    <AlertTriangle className="h-4 w-4" />
                    {t("workspace.quiz.reviewConcern.raiseButton", "Đề chưa ổn")}
                  </button>
                ) : null}
                {!reviewCompleteOkAt && !hasOpenConcern ? (
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
        </>
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
        if (!open && !deleteLoadingQuestionId) {
          setPendingDeleteQuestion(null);
          setDeleteNote("");
        }
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
                "Câu hỏi sẽ bị xóa khỏi đề challenge. Hãy ghi chú lý do để leader / co-reviewer biết.",
              )}
            </DialogDescription>
          </DialogHeader>
          {pendingDeleteQuestion?.content ? (
            <div className={`rounded-lg border px-3 py-2 text-sm ${isDarkMode ? "border-slate-700 bg-slate-800/70 text-slate-200" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
              <MixedMathText>{pendingDeleteQuestion.content}</MixedMathText>
            </div>
          ) : null}
          <div className="space-y-1.5">
            <label className={`text-xs font-medium ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
              {t("workspace.quiz.reviewDeleteQuestionNoteLabel", "Lý do xóa (≥ 5 ký tự, bắt buộc)")}
            </label>
            <textarea
              value={deleteNote}
              onChange={(e) => setDeleteNote(e.target.value)}
              placeholder={t(
                "workspace.quiz.reviewDeleteQuestionNotePlaceholder",
                "VD: câu hỏi bị trùng với câu khác / đáp án không chính xác / sai chính tả nghiêm trọng…",
              )}
              rows={3}
              className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${
                isDarkMode
                  ? "border-slate-700 bg-slate-800 text-white placeholder-slate-500 focus:border-rose-400/60"
                  : "border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-rose-400"
              }`}
            />
            <p className={`text-[11px] ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
              {(deleteNote?.trim().length || 0)} / 1000
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={Boolean(deleteLoadingQuestionId)}
              onClick={() => { setPendingDeleteQuestion(null); setDeleteNote(""); }}
            >
              {t("workspace.quiz.reviewDeleteQuestionConfirmCancel", "Hủy")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={Boolean(deleteLoadingQuestionId) || !deleteNote || deleteNote.trim().length < 5}
              onClick={() => confirmDeleteQuestion()}
            >
              {deleteLoadingQuestionId ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("workspace.quiz.reviewDeleteQuestionConfirmSubmit", "Xóa câu hỏi")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: reviewer raise concern "đề chưa ổn" */}
      <Dialog open={concernDialogOpen} onOpenChange={(open) => {
        if (!open && !concernSubmitting) {
          setConcernDialogOpen(false);
          setConcernDraftNote("");
          setConcernError("");
        }
      }}>
        <DialogContent
          className={isDarkMode ? "border-slate-700 bg-slate-900 text-slate-100" : ""}
          hideClose={false}
        >
          <DialogHeader>
            <DialogTitle className={isDarkMode ? "text-white" : ""}>
              <span className="inline-flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-rose-500" />
                {t("workspace.quiz.reviewConcern.dialogTitle", "Báo: Đề chưa ổn")}
              </span>
            </DialogTitle>
            <DialogDescription className={isDarkMode ? "text-slate-400" : ""}>
              {t(
                "workspace.quiz.reviewConcern.dialogDescription",
                "Báo cáo này sẽ gửi đến leader. Trong khi chờ xử lý, đề sẽ KHÔNG publish được. Hãy ghi rõ chỗ chưa ổn để leader hiểu và quyết định.",
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <label className={`text-xs font-medium ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
              {t("workspace.quiz.reviewConcern.noteLabel", "Mô tả vấn đề (≥ 10 ký tự, bắt buộc)")}
            </label>
            <textarea
              value={concernDraftNote}
              onChange={(e) => { setConcernDraftNote(e.target.value); if (concernError) setConcernError(""); }}
              placeholder={t(
                "workspace.quiz.reviewConcern.notePlaceholder",
                "VD: Nhiều câu sai đáp án; mức độ khó không khớp với phạm vi đề ra; trùng lặp nội dung…",
              )}
              rows={4}
              className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${
                isDarkMode
                  ? "border-slate-700 bg-slate-800 text-white placeholder-slate-500 focus:border-rose-400/60"
                  : "border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-rose-400"
              }`}
            />
            <div className="flex items-center justify-between">
              <p className={`text-[11px] ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                {(concernDraftNote?.trim().length || 0)} / 2000
              </p>
              {concernError ? (
                <p className="text-[11px] font-medium text-rose-500">{concernError}</p>
              ) : null}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={concernSubmitting}
              onClick={() => { setConcernDialogOpen(false); setConcernDraftNote(""); setConcernError(""); }}
            >
              {t("workspace.quiz.reviewConcern.cancel", "Hủy")}
            </Button>
            <Button
              type="button"
              className="bg-rose-600 hover:bg-rose-700 text-white"
              disabled={concernSubmitting || !concernDraftNote || concernDraftNote.trim().length < 10}
              onClick={submitConcern}
            >
              {concernSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
              {t("workspace.quiz.reviewConcern.submit", "Gửi báo cáo")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default GroupQuizReviewPanel;
