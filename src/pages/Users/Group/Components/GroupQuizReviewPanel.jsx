import React, { useMemo, useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, BookOpen, CheckCircle2, ClipboardCheck, Loader2, RotateCcw, Timer, BadgeCheck, Trash2, ShieldAlert, Ban, Sparkles } from "lucide-react";
import { QUESTION_TYPE_ID_MAP, deleteQuestion } from "@/api/QuizAPI";
import { getCurrentUser } from "@/api/Authentication";
import {
  clearSnapshotConcern,
  deleteQuestionFromSnapshot,
  getMyQuizReviewContributor,
  listSnapshotDeletionAudits,
  raiseSnapshotConcern,
  setQuizReviewCompleteOk,
} from "@/api/ChallengeAPI";
import { banWorkspaceReviewer } from "@/api/WorkspaceReviewBanAPI";
import {
  appendGroupQuizQuestionDeletion,
  loadGroupQuizQuestionDeletionLog,
} from "@/utils/groupQuizQuestionDeletionLog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import MixedMathText from "@/components/math/MixedMathText";
import { getContentDisplayText } from "@/lib/questionContentMedia";

const BLOOM_KEYS = ["remember", "understand", "apply", "analyze", "evaluate"];

function getBloomKey(bloomId) {
  const n = Number(bloomId);
  if (!Number.isInteger(n) || n < 1) return "remember";
  return BLOOM_KEYS[n - 1] || "remember";
}

function previewQuestionSnippet(content) {
  const raw = typeof content === 'string' ? content : String(content || '');
  return String(getContentDisplayText(raw) || raw).trim().slice(0, 320);
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
  challengeSnapshotReviewMode = false,
  onQuestionDeleted,
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [reviewCompleteOkAt, setReviewCompleteOkAt] = useState(null);
  const [concernRaisedAt, setConcernRaisedAt] = useState(null);
  const [concernResolvedAt, setConcernResolvedAt] = useState(null);
  const [concernNote, setConcernNote] = useState("");
  const [concernAutoTriggered, setConcernAutoTriggered] = useState(false);
  const [ackLoading, setAckLoading] = useState(false);
  const [confirmReviewOpen, setConfirmReviewOpen] = useState(false);
  const [deleteLoadingQuestionId, setDeleteLoadingQuestionId] = useState(null);
  const [pendingDeleteQuestion, setPendingDeleteQuestion] = useState(null);
  const [deleteNote, setDeleteNote] = useState("");
  const [concernDialogOpen, setConcernDialogOpen] = useState(false);
  const [concernDraftNote, setConcernDraftNote] = useState("");
  const [concernSubmitting, setConcernSubmitting] = useState(false);
  const [concernError, setConcernError] = useState("");
  const [deletionLog, setDeletionLog] = useState([]);
  // Leader-only state: nhật ký xóa câu (BE audit) + ban dialog
  const [auditEntries, setAuditEntries] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [banDialogTarget, setBanDialogTarget] = useState(null); // { userId, userName }
  const [banNote, setBanNote] = useState("");
  const [banSubmitting, setBanSubmitting] = useState(false);
  const [banError, setBanError] = useState("");
  // Optimistic-remove: ẩn ngay câu vừa xóa khỏi UI, không phụ thuộc parent refetch.
  // Lý do: cache/in-flight ở parent + BE có thể trả về danh sách stale, khiến lần
  // xóa thứ 2 trở đi câu cũ vẫn render (phải reload mới mất).
  const [locallyDeletedQuestionIds, setLocallyDeletedQuestionIds] = useState(() => new Set());
  // Snapshot tổng câu gốc lần đầu mount panel (trước khi có xóa nào của user hiện tại).
  // Dùng để tính ngưỡng 30% auto-concern. Không cập nhật khi questionsMap đổi do xóa.
  const [initialQuestionTotal, setInitialQuestionTotal] = useState(null);
  const [autoConcernSubmitting, setAutoConcernSubmitting] = useState(false);

  // Reset khi đổi quiz để tránh leak ids giữa các đề.
  useEffect(() => {
    setLocallyDeletedQuestionIds(new Set());
    setInitialQuestionTotal(null);
  }, [quizId]);

  // Snapshot tổng câu gốc lần đầu data sẵn sàng (chỉ chạy 1 lần cho mỗi quiz).
  useEffect(() => {
    if (initialQuestionTotal != null) return;
    let total = 0;
    (sections || []).forEach((s) => {
      total += (questionsMap[s.sectionId] || []).length;
    });
    if (total > 0) setInitialQuestionTotal(total);
  }, [sections, questionsMap, initialQuestionTotal]);

  const useChallengeDeletionApi = Boolean(challengeSnapshotReviewMode || isReviewer);
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
      setConcernAutoTriggered(Boolean(row?.concernAutoTriggered));
    } catch {
      setReviewCompleteOkAt(null);
      setConcernRaisedAt(null);
      setConcernResolvedAt(null);
      setConcernNote("");
      setConcernAutoTriggered(false);
    }
  }, [quizId, workspaceId, isReviewer]);

  useEffect(() => {
    fetchMyReviewRow();
  }, [fetchMyReviewRow]);

  // Leader load nhật ký xóa từ BE (audit). Chỉ chạy khi panel này thuộc về leader.
  const fetchDeletionAudits = useCallback(async () => {
    if (!quizId || !workspaceId || !isLeader || !challengeSnapshotReviewMode) return;
    setAuditLoading(true);
    try {
      const res = await listSnapshotDeletionAudits(workspaceId, quizId);
      const data = res.data?.data ?? res.data ?? [];
      setAuditEntries(Array.isArray(data) ? data : []);
    } catch {
      setAuditEntries([]);
    } finally {
      setAuditLoading(false);
    }
  }, [quizId, workspaceId, isLeader, challengeSnapshotReviewMode]);

  useEffect(() => {
    fetchDeletionAudits();
  }, [fetchDeletionAudits]);

  useEffect(() => {
    const ws = Number(workspaceId);
    const qid = Number(quizId);
    if (!Number.isFinite(ws) || !Number.isFinite(qid)) {
      setDeletionLog([]);
      return;
    }
    setDeletionLog(loadGroupQuizQuestionDeletionLog(ws, qid));
  }, [workspaceId, quizId]);

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
    const noteTrim = deleteNote.trim();
    setDeleteLoadingQuestionId(questionId);
    try {
      if (useChallengeDeletionApi) {
        await deleteQuestionFromSnapshot(workspaceId, quizId, questionId, noteTrim);
        invalidateChallengeCaches();
      } else {
        await deleteQuestion(questionId, noteTrim);
        const actor = getCurrentUser();
        const actorLabel = String(actor?.fullName || actor?.username || actor?.email || "").trim();
        appendGroupQuizQuestionDeletion(workspaceId, quizId, {
          questionId,
          questionPreview: previewQuestionSnippet(pendingDeleteQuestion?.content),
          note: noteTrim,
          deletedAt: new Date().toISOString(),
          actorLabel,
        });
        setDeletionLog(loadGroupQuizQuestionDeletionLog(workspaceId, quizId));
      }
      // Ẩn câu khỏi UI ngay sau khi BE xác nhận xóa, không đợi parent refetch
      // (parent có cache + in-flight dedupe có thể khiến lần xóa thứ 2 không render lại).
      setLocallyDeletedQuestionIds((prev) => {
        const next = new Set(prev);
        next.add(questionId);
        return next;
      });
      setPendingDeleteQuestion(null);
      setDeleteNote("");

      // Auto-trigger concern khi reviewer xóa vượt 30% tổng câu gốc. FE đảm bảo flag
      // được bật ngay cho dù BE chưa tự auto-trigger; nếu BE cũng trigger, raiseSnapshotConcern
      // idempotent với note hiện có.
      if (
        isReviewer
        && useChallengeDeletionApi
        && !concernRaisedAt
        && !concernAutoTriggered
        && !autoConcernSubmitting
      ) {
        const nextDeletedCount = locallyDeletedQuestionIds.size + 1; // +1 vì state setter async
        const total = initialQuestionTotal ?? nextDeletedCount;
        if (total > 0 && nextDeletedCount / total >= 0.30) {
          setAutoConcernSubmitting(true);
          try {
            const percent = Math.round((nextDeletedCount / total) * 100);
            const autoNote = `Hệ thống tự đánh dấu: bạn đã xóa ${nextDeletedCount}/${total} câu (~${percent}%) — vượt ngưỡng 30%. Leader cần xem xét trước khi publish.`;
            const res = await raiseSnapshotConcern(workspaceId, quizId, autoNote);
            const row = res.data?.data ?? res.data;
            setConcernRaisedAt(row?.concernRaisedAt ?? new Date().toISOString());
            setConcernResolvedAt(null);
            setConcernNote(row?.concernNote ?? autoNote);
            setConcernAutoTriggered(true);
            setReviewCompleteOkAt(null);
          } catch {
            /* swallow — banner BE sẽ hiển thị qua fetchMyReviewRow nếu BE cũng tự trigger */
          } finally {
            setAutoConcernSubmitting(false);
          }
        }
      }

      await onQuestionDeleted?.();
      // Refetch song song: my-review-row (để bắt auto-concern khi vượt 30%)
      // và deletion audits (để leader thấy nhật ký mới ngay).
      await Promise.all([fetchMyReviewRow(), fetchDeletionAudits()]);
    } catch {
      /* toast / global */
    } finally {
      setDeleteLoadingQuestionId(null);
    }
  }, [
    pendingDeleteQuestion,
    workspaceId,
    quizId,
    canDeleteQuestions,
    deleteNote,
    invalidateChallengeCaches,
    onQuestionDeleted,
    useChallengeDeletionApi,
    fetchMyReviewRow,
    fetchDeletionAudits,
    isReviewer,
    concernRaisedAt,
    concernAutoTriggered,
    autoConcernSubmitting,
    locallyDeletedQuestionIds,
    initialQuestionTotal,
  ]);

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
      // Manual raise → BE đã reset auto flag.
      setConcernAutoTriggered(Boolean(row?.concernAutoTriggered));
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

  // Leader gọi: ban reviewer hiện đang abuse — sau khi check audit panel.
  const submitBan = useCallback(async () => {
    if (!banDialogTarget?.userId || !workspaceId) return;
    if (!banNote || banNote.trim().length < 10) {
      setBanError(t(
        "workspace.quiz.reviewBan.noteTooShort",
        "Lý do block phải có ít nhất 10 ký tự.",
      ));
      return;
    }
    setBanError("");
    setBanSubmitting(true);
    try {
      await banWorkspaceReviewer(workspaceId, banDialogTarget.userId, banNote.trim(), quizId);
      setBanDialogTarget(null);
      setBanNote("");
      // Invalidate workspace member queries để picker refresh.
      queryClient.invalidateQueries({
        predicate: (q) => Array.isArray(q.queryKey)
          && (q.queryKey[0] === "workspace-review-bans" || q.queryKey[0] === "workspace-members"),
      });
    } catch (err) {
      setBanError(err?.response?.data?.message || t(
        "workspace.quiz.reviewBan.submitFailed",
        "Không block được, thử lại sau.",
      ));
    } finally {
      setBanSubmitting(false);
    }
  }, [banDialogTarget, banNote, workspaceId, quizId, queryClient, t]);

  // Group audit entries theo reviewer để leader xem nhanh "ai xóa bao nhiêu, %".
  const auditByReviewer = useMemo(() => {
    const groups = new Map();
    (auditEntries || []).forEach((entry) => {
      const uid = entry.deletedByUserId;
      if (uid == null) return;
      const cur = groups.get(uid) || {
        userId: uid,
        userName: entry.deletedByName || `User #${uid}`,
        entries: [],
      };
      cur.entries.push(entry);
      groups.set(uid, cur);
    });
    // Sort: nhiều entries trước (nguy cơ abuse cao hơn).
    return Array.from(groups.values()).sort((a, b) => b.entries.length - a.entries.length);
  }, [auditEntries]);

  const flatItems = useMemo(() => {
    const out = [];
    (sections || []).forEach((section, sIdx) => {
      const qs = questionsMap[section.sectionId] || [];
      qs.forEach((question) => {
        if (locallyDeletedQuestionIds.has(question.questionId)) return;
        out.push({ section, sIdx, question });
      });
    });
    return out;
  }, [sections, questionsMap, locallyDeletedQuestionIds]);

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
          {!canInteract ? (
            t(
              "workspace.quiz.detail.reviewHint",
              "Each card shows question type, difficulty, cognitive level, and all answer options. Correct options are highlighted.",
            )
          ) : isReviewer ? (
            t(
              "workspace.quiz.detail.reviewHintChallengeReviewer",
              "Xem từng câu. Khi cả đề đã ổn, xác nhận ở cuối trang (bạn là reviewer được mời cho challenge).",
            )
          ) : challengeSnapshotReviewMode ? (
            t(
              "workspace.quiz.detail.reviewHintChallengeLeader",
              "Đây là đề thuộc challenge: xem từng câu và đáp án, chỉnh Compose nếu cần, Publish khi sẵn sàng — khác với quiz chia sẻ thường trong nhóm.",
            )
          ) : (
            t(
              "workspace.quiz.detail.reviewHintGroupQuizDraft",
              "Quiz nhóm đang nháp: xem từng câu và đáp án để rà soát trước khi xuất bản cho thành viên.",
            )
          )}
        </p>
      </div>

      {!useChallengeDeletionApi && deletionLog.length > 0 ? (
        <div
          className={`rounded-xl border px-4 py-3 ${
            isDarkMode ? "border-amber-900/40 bg-amber-950/20" : "border-amber-200 bg-amber-50/90"
          }`}
        >
          <p className={`text-xs font-bold uppercase tracking-wide ${isDarkMode ? "text-amber-200" : "text-amber-900"}`}>
            {t("workspace.quiz.detail.questionDeletionLogTitle", "Nhật ký đã xóa (quiz nhóm)")}
          </p>
          <p className={`mt-1 text-[11px] ${isDarkMode ? "text-amber-100/80" : "text-amber-900/80"}`}>
            {t(
              "workspace.quiz.detail.questionDeletionLogHint",
              "Lưu trên trình duyệt này để leader theo dõi. Backend ghi log đầy đủ sẽ thay thế khi có API.",
            )}
          </p>
          <ul className="mt-3 space-y-2">
            {deletionLog.map((entry) => (
              <li
                key={`${entry.questionId}-${entry.deletedAt}`}
                className={`rounded-lg border px-3 py-2 text-xs ${
                  isDarkMode ? "border-slate-700 bg-slate-900/60 text-slate-200" : "border-slate-200 bg-white text-slate-800"
                }`}
              >
                <p className="font-semibold text-[11px] text-slate-500 dark:text-slate-400">
                  {new Date(entry.deletedAt).toLocaleString()}
                  {entry.actorLabel ? ` · ${entry.actorLabel}` : ""}
                </p>
                {entry.questionPreview ? (
                  <p className="mt-1 line-clamp-2 font-medium">{entry.questionPreview}</p>
                ) : null}
                <p className={`mt-1 italic ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                  {t("workspace.quiz.detail.questionDeletionLogReason", { defaultValue: "Lý do: {{note}}", note: entry.note })}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Leader audit panel: nhật ký xóa câu hỏi (BE) + nút block reviewer abuse */}
      {isLeader && challengeSnapshotReviewMode && auditByReviewer.length > 0 ? (
        <div
          className={`rounded-xl border ${
            isDarkMode ? "border-amber-900/50 bg-amber-950/20" : "border-amber-200 bg-amber-50/90"
          }`}
        >
          <button
            type="button"
            onClick={() => setAuditOpen((v) => !v)}
            className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left ${
              isDarkMode ? "text-amber-100" : "text-amber-950"
            }`}
          >
            <span className="flex items-start gap-2">
              <Sparkles className={`mt-0.5 h-4 w-4 shrink-0 ${isDarkMode ? "text-amber-300" : "text-amber-700"}`} />
              <span>
                <span className="text-sm font-semibold">
                  {t("workspace.quiz.deletionAuditPanel.title", "Nhật ký reviewer xóa câu hỏi")}
                </span>
                <span className={`ml-2 text-[11px] ${isDarkMode ? "text-amber-200/70" : "text-amber-900/70"}`}>
                  {t("workspace.quiz.deletionAuditPanel.totalDeleted", "{{count}} câu đã bị xóa", { count: auditEntries.length })}
                </span>
              </span>
            </span>
            <span className={`text-xs ${isDarkMode ? "text-amber-200/70" : "text-amber-900/70"}`}>
              {auditOpen ? t("common.collapse", "Thu gọn") : t("common.expand", "Mở rộng")}
            </span>
          </button>
          {auditOpen && (
            <div className="space-y-3 border-t border-amber-200/30 px-4 py-3">
              {auditLoading ? (
                <p className={`text-xs ${isDarkMode ? "text-amber-200/70" : "text-amber-900/70"}`}>
                  <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
                  {t("common.loading", "Đang tải...")}
                </p>
              ) : null}
              {auditByReviewer.map((g) => {
                // Tổng câu gốc = currentTotal (flatItems.length) + tổng audit.
                const originalQuestionCount = flatItems.length + auditEntries.length;
                const percent = originalQuestionCount > 0
                  ? Math.round((g.entries.length / originalQuestionCount) * 100)
                  : 0;
                const overThreshold = percent >= 30;
                return (
                  <div
                    key={g.userId}
                    className={`rounded-lg border px-3 py-3 ${
                      overThreshold
                        ? isDarkMode ? "border-rose-700/50 bg-rose-950/30" : "border-rose-200 bg-rose-50"
                        : isDarkMode ? "border-slate-700 bg-slate-900/60" : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
                          {g.userName}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            overThreshold
                              ? isDarkMode ? "bg-rose-800/70 text-rose-100" : "bg-rose-200 text-rose-800"
                              : isDarkMode ? "bg-slate-700 text-slate-200" : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {t("workspace.quiz.deletionAuditPanel.percentDeleted", "{{deleted}}/{{total}} câu — {{percent}}%", {
                            deleted: g.entries.length,
                            total: originalQuestionCount,
                            percent,
                          })}
                        </span>
                        {overThreshold ? (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            isDarkMode ? "bg-amber-900/70 text-amber-100" : "bg-amber-200 text-amber-900"
                          }`}>
                            <ShieldAlert className="h-3 w-3" />
                            {t("workspace.quiz.deletionAuditPanel.overThreshold", "Vượt ngưỡng 30%")}
                          </span>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setBanDialogTarget({ userId: g.userId, userName: g.userName });
                          setBanNote("");
                          setBanError("");
                        }}
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                          isDarkMode ? "bg-rose-500/20 text-rose-100 ring-1 ring-rose-500/40 hover:bg-rose-500/30" : "bg-white text-rose-700 ring-1 ring-rose-300 hover:bg-rose-50"
                        }`}
                      >
                        <Ban className="h-3 w-3" />
                        {t("workspace.quiz.reviewBan.button", "Block reviewer")}
                      </button>
                    </div>
                    <ul className="mt-2 space-y-1.5">
                      {g.entries.map((entry) => (
                        <li
                          key={entry.auditId}
                          className={`rounded px-2 py-1.5 text-[11px] ${
                            isDarkMode ? "bg-slate-950/60 text-slate-300" : "bg-white text-slate-700"
                          }`}
                        >
                          <p className={`font-mono text-[10px] ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                            #{entry.questionId} · {new Date(entry.deletedAt).toLocaleString()}
                          </p>
                          {entry.questionPreview ? (
                            <p className="mt-0.5 line-clamp-2">{entry.questionPreview}</p>
                          ) : null}
                          <p className={`mt-0.5 italic ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                            {t("workspace.quiz.deletionAuditPanel.reason", "Lý do")}: {entry.note}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

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
                  {concernAutoTriggered ? (
                    <ShieldAlert className={`mt-0.5 h-5 w-5 shrink-0 ${isDarkMode ? "text-amber-300" : "text-amber-700"}`} />
                  ) : (
                    <AlertTriangle className={`mt-0.5 h-5 w-5 shrink-0 ${isDarkMode ? "text-rose-400" : "text-rose-700"}`} />
                  )}
                  <div>
                    <p className={`text-sm font-semibold ${isDarkMode ? "text-rose-100" : "text-rose-950"}`}>
                      {concernAutoTriggered
                        ? t("workspace.quiz.reviewConcern.autoTitle", "Hệ thống tự đánh dấu: Đề chưa ổn")
                        : t("workspace.quiz.reviewConcern.activeTitle", "Bạn đã báo: Đề chưa ổn")}
                    </p>
                    <p className={`mt-1 text-xs leading-relaxed ${isDarkMode ? "text-rose-200/85" : "text-rose-900/80"}`}>
                      {concernAutoTriggered
                        ? t(
                            "workspace.quiz.reviewConcern.autoHint",
                            "Bạn đã xóa quá ngưỡng cho phép trên đề này. Hệ thống đã tự gửi cảnh báo về leader; bạn KHÔNG thể tự rút — leader sẽ xem xét và xử lý.",
                          )
                        : t("workspace.quiz.reviewConcern.activeHint", "Leader đã nhận report. Trong khi chờ leader xử lý, đề này không thể publish.")}
                    </p>
                    {concernNote ? (
                      <p className={`mt-2 rounded-lg px-3 py-2 text-xs italic ${isDarkMode ? "bg-rose-900/30 text-rose-100" : "bg-rose-100/80 text-rose-900"}`}>
                        "{concernNote}"
                      </p>
                    ) : null}
                  </div>
                </div>
                {/* Auto-triggered concern: ẨN nút rút lại (BE cũng chặn). Reviewer không bypass được. */}
                {!concernAutoTriggered && (
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
                )}
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
              {t(
                useChallengeDeletionApi
                  ? "workspace.quiz.reviewDeleteQuestionConfirmTitleChallenge"
                  : "workspace.quiz.reviewDeleteQuestionConfirmTitleQuiz",
                { defaultValue: "Xóa câu hỏi này?" },
              )}
            </DialogTitle>
            <DialogDescription className={isDarkMode ? "text-slate-400" : ""}>
              {useChallengeDeletionApi
                ? t(
                  "workspace.quiz.reviewDeleteQuestionConfirmDescriptionChallenge",
                  { defaultValue: "Câu hỏi sẽ bị xóa khỏi đề challenge. Hãy ghi chú lý do để leader / co-reviewer biết." },
                )
                : t(
                  "workspace.quiz.reviewDeleteQuestionConfirmDescriptionQuiz",
                  { defaultValue: "Câu hỏi sẽ bị xóa khỏi quiz nhóm (bản nháp). Hãy ghi lý do để leader và thành viên phối hợp theo dõi." },
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

      {/* Dialog: leader block reviewer (workspace-scoped) */}
      <Dialog open={Boolean(banDialogTarget)} onOpenChange={(open) => {
        if (!open && !banSubmitting) {
          setBanDialogTarget(null);
          setBanNote("");
          setBanError("");
        }
      }}>
        <DialogContent
          className={isDarkMode ? "border-slate-700 bg-slate-900 text-slate-100" : ""}
          hideClose={false}
        >
          <DialogHeader>
            <DialogTitle className={isDarkMode ? "text-white" : ""}>
              <span className="inline-flex items-center gap-2">
                <Ban className="h-5 w-5 text-rose-500" />
                {t("workspace.quiz.reviewBan.dialogTitle", "Block reviewer khỏi workspace")}
              </span>
            </DialogTitle>
            <DialogDescription className={isDarkMode ? "text-slate-400" : ""}>
              {t(
                "workspace.quiz.reviewBan.dialogDescription",
                "User này sẽ KHÔNG xuất hiện trong picker mời reviewer cho các quiz mới. Hành động này có thể gỡ trong Workspace Settings → Reviewer bị block.",
              )}
            </DialogDescription>
          </DialogHeader>
          {banDialogTarget?.userName ? (
            <div className={`rounded-lg border px-3 py-2 text-sm ${
              isDarkMode ? "border-slate-700 bg-slate-800/70 text-slate-200" : "border-slate-200 bg-slate-50 text-slate-700"
            }`}>
              {t("workspace.quiz.reviewBan.targetLabel", "Target")}: <strong>{banDialogTarget.userName}</strong>
            </div>
          ) : null}
          <div className="space-y-1.5">
            <label className={`text-xs font-medium ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
              {t("workspace.quiz.reviewBan.noteLabel", "Lý do block (≥ 10 ký tự, bắt buộc)")}
            </label>
            <textarea
              value={banNote}
              onChange={(e) => { setBanNote(e.target.value); if (banError) setBanError(""); }}
              placeholder={t(
                "workspace.quiz.reviewBan.notePlaceholder",
                "VD: Cố tình xóa quá nhiều câu để phá đề; nhiều câu xóa không có lý do hợp lý…",
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
                {(banNote?.trim().length || 0)} / 1000
              </p>
              {banError ? (
                <p className="text-[11px] font-medium text-rose-500">{banError}</p>
              ) : null}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={banSubmitting}
              onClick={() => { setBanDialogTarget(null); setBanNote(""); setBanError(""); }}
            >
              {t("workspace.quiz.reviewBan.cancel", "Hủy")}
            </Button>
            <Button
              type="button"
              className="bg-rose-600 hover:bg-rose-700 text-white"
              disabled={banSubmitting || !banNote || banNote.trim().length < 10}
              onClick={submitBan}
            >
              {banSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
              {t("workspace.quiz.reviewBan.confirm", "Block reviewer")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default GroupQuizReviewPanel;
