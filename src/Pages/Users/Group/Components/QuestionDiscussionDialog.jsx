import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  Lock,
  Loader2,
  MessageSquare,
  Reply,
  Send,
  Sparkles,
  Timer,
  Trash2,
  X,
} from "lucide-react";
import i18n from "@/i18n";
import { QUESTION_TYPE_ID_MAP } from "@/api/QuizAPI";
import MixedMathText from "@/Components/math/MixedMathText";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/Components/ui/dialog";
import { cn } from "@/lib/utils";
import { useUserProfile } from "@/context/UserProfileContext";
import { getUserDisplayParts } from "@/Utils/userProfile";
import {
  deleteMessage,
  getThreadMessages,
  postMessage,
} from "@/api/GroupDiscussionAPI";
import {
  buildDiscussionMessageMap,
  formatDiscussionPreview,
  getDiscussionReplyDepth,
  getDiscussionReplyPreview,
  normalizeDiscussionMessageId,
} from "./groupDiscussionReplyUtils";

const BLOOM_KEYS = ["remember", "understand", "apply", "analyze", "evaluate"];

function getBloomKey(bloomId) {
  const n = Number(bloomId);
  if (!Number.isInteger(n) || n < 1) return "remember";
  return BLOOM_KEYS[n - 1] || "remember";
}

function renderAnswerPreview(question, answers, isDarkMode, t) {
  const typeName = QUESTION_TYPE_ID_MAP[question?.questionTypeId] || "multipleChoice";
  const normalizedAnswers = Array.isArray(answers) ? answers : [];
  const correctTextAnswers = normalizedAnswers
    .filter((answer) => answer?.isCorrect)
    .map((answer) => (typeof answer?.content === "string" ? answer.content.trim() : ""))
    .filter(Boolean);
  const fallbackTextAnswers = normalizedAnswers
    .map((answer) => (typeof answer?.content === "string" ? answer.content.trim() : ""))
    .filter(Boolean);
  const textAnswersToDisplay = correctTextAnswers.length > 0 ? correctTextAnswers : fallbackTextAnswers;

  if (typeName === "shortAnswer" || typeName === "fillBlank") {
    return (
      <div
        className={cn(
          "flex items-start gap-2 rounded-2xl px-3 py-3 text-sm",
          isDarkMode ? "border border-emerald-800/50 bg-emerald-950/30" : "border border-emerald-200 bg-emerald-50",
        )}
      >
        <span
          className={cn(
            "shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold",
            isDarkMode ? "bg-emerald-800 text-emerald-300" : "bg-emerald-200 text-emerald-700",
          )}
        >
          {t("workspace.quiz.correctAnswerLabel", "Correct answer")}
        </span>
        <span className={cn("flex-1", isDarkMode ? "text-emerald-300" : "text-emerald-700")}>
          {textAnswersToDisplay.length ? <MixedMathText>{textAnswersToDisplay.join(" / ")}</MixedMathText> : "-"}
        </span>
        <CheckCircle2 className={cn("mt-0.5 h-4 w-4 shrink-0", isDarkMode ? "text-emerald-400" : "text-emerald-600")} />
      </div>
    );
  }

  if (typeName === "matching") {
    const correctAnswer = normalizedAnswers.find((answer) => answer?.isCorrect);
    let pairs = [];
    if (correctAnswer?.content) {
      try {
        pairs = JSON.parse(correctAnswer.content);
      } catch {
        pairs = [];
      }
    }

    if (!Array.isArray(pairs) || pairs.length === 0) {
      return (
        <div className={cn("rounded-2xl px-3 py-3 text-xs", isDarkMode ? "bg-slate-800/60 text-slate-500" : "bg-slate-50 text-slate-500")}>
          {t("workspace.quiz.detail.matchingNoData", "No matching data available")}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {pairs.map((pair, pairIndex) => (
          <div
            key={`${pair.leftKey}-${pair.rightKey}-${pairIndex}`}
            className={cn(
              "flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm",
              isDarkMode ? "border border-emerald-800/50 bg-emerald-950/30" : "border border-emerald-200 bg-emerald-50",
            )}
          >
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                isDarkMode ? "bg-emerald-800 text-emerald-300" : "bg-emerald-200 text-emerald-700",
              )}
            >
              {pairIndex + 1}
            </span>
            <span className={cn("font-semibold", isDarkMode ? "text-emerald-300" : "text-emerald-700")}>
              <MixedMathText>{pair.leftKey}</MixedMathText>
            </span>
            <span className={cn("shrink-0", isDarkMode ? "text-emerald-600" : "text-emerald-400")}>{"->"}</span>
            <span className={isDarkMode ? "text-emerald-300" : "text-emerald-700"}>
              <MixedMathText>{pair.rightKey}</MixedMathText>
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {normalizedAnswers.map((answer, answerIndex) => (
        <div
          key={answer.answerId ?? answerIndex}
          className={cn(
            "flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm",
            answer.isCorrect
              ? isDarkMode
                ? "border border-emerald-800/50 bg-emerald-950/30"
                : "border border-emerald-200 bg-emerald-50"
              : isDarkMode
                ? "bg-slate-900/70"
                : "bg-slate-50",
          )}
        >
          <span
            className={cn(
              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
              answer.isCorrect
                ? isDarkMode
                  ? "bg-emerald-800 text-emerald-300"
                  : "bg-emerald-200 text-emerald-700"
                : isDarkMode
                  ? "bg-slate-700 text-slate-400"
                  : "bg-gray-200 text-gray-500",
            )}
          >
            {typeName === "trueFalse"
              ? String(answer.content || "").slice(0, 1).toUpperCase()
              : String.fromCharCode(65 + answerIndex)}
          </span>
          <span
            className={cn(
              "flex-1",
              answer.isCorrect
                ? isDarkMode
                  ? "text-emerald-300"
                  : "text-emerald-700"
                : isDarkMode
                  ? "text-slate-300"
                  : "text-gray-700",
            )}
          >
            <MixedMathText>{answer.content}</MixedMathText>
          </span>
          {answer.isCorrect && (
            <CheckCircle2 className={cn("h-4 w-4 shrink-0", isDarkMode ? "text-emerald-400" : "text-emerald-600")} />
          )}
        </div>
      ))}
    </div>
  );
}

function relativeTime(iso) {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return i18n.t("questionDiscussion.shared.relativeTime.justNow", "just now");
  if (diff < 3600) return i18n.t("questionDiscussion.shared.relativeTime.minutesAgo", "{{count}} minutes ago", { count: Math.floor(diff / 60) });
  if (diff < 86400) return i18n.t("questionDiscussion.shared.relativeTime.hoursAgo", "{{count}} hours ago", { count: Math.floor(diff / 3600) });
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function getInitials(name) {
  const parts = String(name || "?").trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0][0] || "?").toUpperCase();
}

function getAvatarBg(role, id) {
  if (role === "LEADER") return "bg-blue-600";
  const palette = ["bg-emerald-500", "bg-violet-500", "bg-orange-500", "bg-teal-500", "bg-rose-500"];
  return palette[Number(id || 0) % palette.length];
}

function getProfileAvatar(profile) {
  return profile?.avatarUrl || profile?.avatar || "";
}

function ThreadAvatar({ src, name, role, userId, className = "" }) {
  const [failed, setFailed] = useState(false);
  const avatarSrc = typeof src === "string" ? src.trim() : "";
  const showImage = avatarSrc && !failed;

  return (
    <div
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-bold text-white",
        showImage ? "bg-transparent" : getAvatarBg(role, userId),
        className,
      )}
    >
      {showImage ? (
        <img
          src={avatarSrc}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        getInitials(name)
      )}
    </div>
  );
}

function ThreadMessageRow({ msg, canDelete, onDelete, onReply, replyPreview, depth, isDarkMode }) {
  const { t } = useTranslation();
  const [pendingDelete, setPendingDelete] = useState(false);
  const resetRef = useRef(null);
  const authorDisplay = getUserDisplayParts({
    fullName: msg.authorName,
    username: msg.authorUserName,
  }, msg.authorName || t("questionDiscussion.shared.userFallback", "User"));
  const replyAuthorDisplay = getUserDisplayParts({
    fullName: replyPreview?.authorName,
    username: replyPreview?.authorUserName,
  }, replyPreview?.authorName || t("questionDiscussion.shared.userFallback", "User"));

  const handleDeleteClick = () => {
    if (pendingDelete) {
      clearTimeout(resetRef.current);
      onDelete(msg.id);
      setPendingDelete(false);
      return;
    }

    setPendingDelete(true);
    resetRef.current = setTimeout(() => setPendingDelete(false), 3000);
  };

  useEffect(() => () => clearTimeout(resetRef.current), []);

  return (
    <div
      className={cn(
        "flex gap-3",
        depth > 0 && (isDarkMode ? "border-l border-slate-800 pl-3" : "border-l border-slate-200 pl-3"),
      )}
      style={depth > 0 ? { marginLeft: `${Math.min(depth, 2) * 18}px` } : undefined}
    >
      <ThreadAvatar
        src={msg.authorAvatar}
        name={msg.authorName}
        role={msg.authorRole}
        userId={msg.authorId}
      />

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-1.5">
          <span className={cn("text-sm font-semibold", isDarkMode ? "text-slate-100" : "text-gray-900")}>
            {authorDisplay.name}
          </span>
          {authorDisplay.hasUsernameSuffix ? (
            <span className={cn("text-[11px]", isDarkMode ? "text-slate-500" : "text-gray-400")}>
              #{authorDisplay.username}
            </span>
          ) : null}
          <span className={cn("text-xs", isDarkMode ? "text-slate-500" : "text-gray-400")}>
            {relativeTime(msg.createdAt)}
          </span>
        </div>

        {replyPreview ? (
          <div
            className={cn(
              "mb-1.5 flex items-start gap-2 rounded-2xl border-l-2 px-3 py-2 text-xs",
              isDarkMode ? "border-blue-700 bg-slate-900/80 text-slate-400" : "border-blue-300 bg-slate-50 text-slate-500",
            )}
          >
            <Reply className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", isDarkMode ? "text-blue-300" : "text-blue-600")} />
            <div className="min-w-0">
              <p className={cn("font-medium", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                {replyPreview.missing
                  ? t("questionDiscussion.reply.originalUnavailable", "Original comment unavailable")
                  : t("questionDiscussion.reply.replyingTo", {
                    name: replyAuthorDisplay.name,
                    defaultValue: "Replying to {{name}}",
                  })}
              </p>
              {!replyPreview.missing ? (
                <p className="truncate">
                  {formatDiscussionPreview(replyPreview.body) || t("questionDiscussion.reply.emptyBody", "No content")}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <div
            className={cn(
              "inline-block max-w-full rounded-2xl px-3 py-2 text-sm leading-relaxed",
              isDarkMode ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-800",
            )}
          >
            <span className="whitespace-pre-wrap break-words">{msg.body}</span>
          </div>

          {canDelete ? (
            pendingDelete ? (
              <button
                type="button"
                onClick={handleDeleteClick}
                className="inline-flex self-center items-center gap-1 rounded-full bg-red-500 px-2 py-1 text-[11px] font-medium text-white"
              >
                <Trash2 className="h-3 w-3" />
                {t("questionDiscussion.shared.delete", "Delete")}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDeleteClick}
                className={cn(
                  "self-center rounded-full p-1 transition-colors",
                  isDarkMode ? "text-slate-500 hover:bg-slate-800 hover:text-red-300" : "text-slate-400 hover:bg-slate-100 hover:text-red-500",
                )}
                title={t("questionDiscussion.shared.deleteCommentTitle", "Delete comment")}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )
            ) : null}
        </div>

        <div className="mt-1.5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => onReply(msg)}
            className={cn(
              "inline-flex items-center gap-1 text-[11px] font-medium transition-colors",
              isDarkMode ? "text-slate-500 hover:text-blue-300" : "text-slate-500 hover:text-blue-700",
            )}
          >
            <Reply className="h-3 w-3" />
            {t("questionDiscussion.reply.action", "Reply")}
          </button>
        </div>
      </div>
    </div>
  );
}

function LockedDiscussionNotice({ isDarkMode }) {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-4 text-sm",
        isDarkMode ? "border-slate-800 bg-slate-900/70 text-slate-400" : "border-slate-200 bg-slate-50 text-slate-600",
      )}
    >
      {t("questionDiscussion.dialog.lockedNotice", "Complete the quiz to join the discussion for this question.")}
    </div>
  );
}

function useQuestionDiscussionThread({
  workspaceId,
  quizId,
  questionId,
  isLeader,
  hasAttempted,
  onMessageCountChange,
}) {
  const { t } = useTranslation();
  const { profile } = useUserProfile();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [replyTarget, setReplyTarget] = useState(null);
  const textareaRef = useRef(null);
  const bottomRef = useRef(null);
  const onMessageCountChangeRef = useRef(onMessageCountChange);
  const canAccess = isLeader || hasAttempted;
  const messageMap = useMemo(() => buildDiscussionMessageMap(messages), [messages]);

  useEffect(() => {
    onMessageCountChangeRef.current = onMessageCountChange;
  }, [onMessageCountChange]);

  useEffect(() => {
    onMessageCountChangeRef.current?.(messages.length);
  }, [messages.length]);

  useEffect(() => {
    if (!canAccess || !workspaceId || !quizId || !questionId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getThreadMessages(workspaceId, quizId, questionId)
      .then(({ messages: nextMessages }) => {
        if (!cancelled) {
          setMessages(nextMessages || []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMessages([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [canAccess, workspaceId, quizId, questionId]);

  useEffect(() => {
    if (!loading && messages.length > 0) {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }
  }, [loading, messages.length]);

  useEffect(() => {
    if (replyTarget?.id && !messageMap.has(replyTarget.id)) {
      setReplyTarget(null);
    }
  }, [messageMap, replyTarget]);

  const handlePost = useCallback(async () => {
    const body = draft.trim();
    if (!body || posting || !canAccess) return;
    const parentMessageId = replyTarget?.id && Number.isFinite(Number(replyTarget.id))
      ? Number(replyTarget.id)
      : null;

    setPosting(true);
    try {
      const nextMessage = await postMessage(workspaceId, quizId, questionId, {
        body,
        parentMessageId,
      });
      setMessages((prev) => [...prev, nextMessage]);
      setDraft("");
      setReplyTarget(null);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    } catch {
      //
    } finally {
      setPosting(false);
    }
  }, [canAccess, draft, posting, questionId, quizId, replyTarget, workspaceId]);

  const handleDelete = useCallback(async (messageId) => {
    try {
      await deleteMessage(workspaceId, quizId, questionId, messageId);
      setMessages((prev) => prev.filter((message) => message.id !== messageId));
      setReplyTarget((prev) => (prev?.id === normalizeDiscussionMessageId(messageId) ? null : prev));
    } catch {
      //
    }
  }, [questionId, quizId, workspaceId]);

  const handleReply = useCallback((message) => {
    const messageId = normalizeDiscussionMessageId(message?.id ?? message?.messageId);
    if (!messageId) {
      return;
    }

    setReplyTarget({
      id: messageId,
      authorName: message?.authorName || null,
      authorUserName: message?.authorUserName || null,
      body: formatDiscussionPreview(message?.body),
    });

    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  }, []);

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handlePost();
    }
  };

  const handleInput = (event) => {
    const element = event.target;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 80)}px`;
  };

  return {
    profile,
    messages,
    messageMap,
    loading,
    draft,
    posting,
    canAccess,
    replyTarget,
    textareaRef,
    bottomRef,
    setDraft,
    setReplyTarget,
    handleDelete,
    handleInput,
    handleKeyDown,
    handlePost,
    handleReply,
  };
}

export default function QuestionDiscussionDialog({
  open,
  onOpenChange,
  isDarkMode = false,
  workspaceId,
  quizId,
  question,
  questionIndex = 1,
  answers = [],
  isLeader = false,
  hasAttempted = false,
  canViewAnswers = false,
  commentCount = 0,
  onMessageCountChange,
  sectionLabel = "",
}) {
  const { t } = useTranslation();
  const {
    profile: discussionProfile,
    messages: discussionMessages,
    messageMap: discussionMessageMap,
    loading: discussionLoading,
    draft: discussionDraft,
    posting: discussionPosting,
    canAccess: discussionCanAccess,
    replyTarget: discussionReplyTarget,
    textareaRef,
    bottomRef,
    setDraft: setDiscussionDraft,
    setReplyTarget: setDiscussionReplyTarget,
    handleDelete: handleDiscussionDelete,
    handleInput: handleDiscussionInput,
    handleKeyDown: handleDiscussionKeyDown,
    handlePost: handleDiscussionPost,
    handleReply: handleDiscussionReply,
  } = useQuestionDiscussionThread({
    workspaceId,
    quizId,
    questionId: question?.questionId,
    isLeader,
    hasAttempted,
    onMessageCountChange,
  });

  if (!question) return null;

  const typeName = QUESTION_TYPE_ID_MAP[question.questionTypeId] || "multipleChoice";
  const composerNameFallback = t("questionDiscussion.shared.composerNameFallback", "you");
  const composerDisplayName = String(
    discussionProfile?.fullName ?? discussionProfile?.name ?? composerNameFallback,
  ).trim() || composerNameFallback;
  const visibleCommentCount = discussionLoading ? commentCount : discussionMessages.length;
  const discussionReplyDisplay = discussionReplyTarget
    ? getUserDisplayParts({
      fullName: discussionReplyTarget.authorName,
      username: discussionReplyTarget.authorUserName,
    }, discussionReplyTarget.authorName || t("questionDiscussion.shared.userFallback", "User"))
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex w-[min(960px,calc(100vw-1rem))] max-h-[92vh] flex-col gap-0 overflow-hidden rounded-[28px] border p-0 sm:max-w-3xl",
          isDarkMode ? "border-slate-700 bg-slate-950 text-slate-100" : "border-slate-200 bg-white text-slate-900",
        )}
      >
        <div
          className={cn(
            "relative overflow-hidden border-b px-5 pb-5 pt-5",
            isDarkMode ? "border-slate-800 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_34%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))]" : "border-slate-200 bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.18),transparent_30%),linear-gradient(180deg,#ffffff,#f8fbff)]",
          )}
        >
          <DialogHeader className="space-y-0 text-left">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm",
                  isDarkMode ? "bg-blue-500/15 text-blue-300 ring-1 ring-blue-400/20" : "bg-blue-100 text-blue-600 ring-1 ring-blue-200/90",
                )}
              >
                <MessageSquare className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle className={cn("text-lg font-semibold tracking-tight", isDarkMode ? "text-slate-50" : "text-slate-900")}>
                    {t("questionDiscussion.shared.threadTitle", "Discussion for question {{index}}", { index: questionIndex })}
                  </DialogTitle>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold",
                      isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600",
                    )}
                  >
                    {t("questionDiscussion.dialog.commentCount", "{{count}} comments", { count: visibleCommentCount })}
                  </span>
                </div>
                <DialogDescription className={cn("mt-2 text-sm leading-relaxed", isDarkMode ? "text-slate-400" : "text-slate-600")}>
                  {t("questionDiscussion.dialog.headerDescription", "Open a dedicated thread for this question so members can discuss answers, solutions, and anything unclear.")}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <div className="space-y-4">
              <section
                className={cn(
                  "rounded-[24px] border px-4 py-4",
                  isDarkMode ? "border-slate-800 bg-slate-900/75" : "border-slate-200 bg-slate-50/80",
                )}
              >
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-1 font-semibold",
                    isDarkMode ? "bg-blue-950/70 text-blue-300" : "bg-blue-100 text-blue-700",
                  )}
                >
                  {t("questionDiscussion.dialog.questionBadge", "Question {{index}}", { index: questionIndex })}
                </span>
                {sectionLabel ? (
                  <span className={cn("rounded-full px-2.5 py-1", isDarkMode ? "bg-slate-800 text-slate-400" : "bg-white text-slate-500")}>
                    {sectionLabel}
                  </span>
                ) : null}
                <span className={cn("rounded-full px-2.5 py-1", isDarkMode ? "bg-slate-800 text-slate-300" : "bg-white text-slate-600")}>
                  {t(`workspace.quiz.types.${typeName}`)}
                </span>
                {question.difficulty ? (
                  <span className={cn("rounded-full px-2.5 py-1", isDarkMode ? "bg-slate-800 text-slate-300" : "bg-white text-slate-600")}>
                    {t(`workspace.quiz.difficultyLevels.${String(question.difficulty).toLowerCase()}`)}
                  </span>
                ) : null}
                {question.bloomId ? (
                  <span className={cn("rounded-full px-2.5 py-1", isDarkMode ? "bg-slate-800 text-slate-300" : "bg-white text-slate-600")}>
                    {t(`workspace.quiz.bloomLevels.${getBloomKey(question.bloomId)}`)}
                  </span>
                ) : null}
                {Number(question.duration) > 0 ? (
                  <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1", isDarkMode ? "bg-slate-800 text-slate-300" : "bg-white text-slate-600")}>
                    <Timer className="h-3 w-3" />
                    {question.duration}s
                  </span>
                ) : null}
              </div>

              <div
                className={cn(
                  "mt-4 rounded-[20px] border px-4 py-4 text-sm leading-7",
                  isDarkMode ? "border-slate-800 bg-slate-950/65 text-slate-100" : "border-slate-200 bg-white text-slate-900",
                )}
              >
                <MixedMathText>{question.content}</MixedMathText>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("text-xs font-semibold uppercase tracking-wide", isDarkMode ? "text-slate-500" : "text-slate-500")}>
                    {t("questionDiscussion.dialog.answersAndExplanation", "Answers and explanation")}
                  </span>
                  {canViewAnswers ? (
                    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]", isDarkMode ? "bg-emerald-950/60 text-emerald-300" : "bg-emerald-100 text-emerald-700")}>
                      <Sparkles className="h-3 w-3" />
                      {t("questionDiscussion.dialog.canViewNow", "Available to view now")}
                    </span>
                  ) : (
                    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]", isDarkMode ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500")}>
                      <Lock className="h-3 w-3" />
                      {t("questionDiscussion.dialog.lockedUntilFinish", "Locked until you finish the quiz")}
                    </span>
                  )}
                </div>

                {canViewAnswers ? (
                  renderAnswerPreview(question, answers, isDarkMode, t)
                ) : (
                  <div className={cn("flex items-start gap-2 rounded-2xl px-3 py-3 text-sm", isDarkMode ? "bg-slate-900/70 text-slate-400" : "bg-white text-slate-600")}>
                    <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{t("workspace.quiz.answerLocked", "Finish the quiz to view answers and explanations.")}</span>
                  </div>
                )}
              </div>

              {question.explanation ? (
                <div className={cn("mt-4 rounded-[20px] border px-4 py-3 text-sm leading-6", isDarkMode ? "border-amber-900/40 bg-amber-950/20 text-amber-100" : "border-amber-200 bg-amber-50 text-amber-900")}>
                  <span className="font-semibold">{t("questionDiscussion.dialog.explanationLabel", "Explanation:")}</span>{" "}
                  <MixedMathText>{question.explanation}</MixedMathText>
                </div>
              ) : null}
              </section>

              <section
                className={cn(
                  "rounded-[24px] border px-4 py-4",
                  isDarkMode ? "border-slate-800 bg-slate-900/75" : "border-slate-200 bg-white",
                )}
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full",
                        isDarkMode ? "bg-blue-500/15 text-blue-300" : "bg-blue-50 text-blue-600",
                      )}
                    >
                      <MessageSquare className="h-4 w-4" />
                    </div>
                    <div>
                      <p className={cn("text-sm font-semibold", isDarkMode ? "text-slate-100" : "text-slate-900")}>
                        {t("questionDiscussion.dialog.commentsPerQuestion", "Comments for this question")}
                      </p>
                      <p className={cn("text-xs", isDarkMode ? "text-slate-500" : "text-slate-500")}>
                        {t("questionDiscussion.dialog.commentsPerQuestionSubtitle", "The question and its comments live in the same discussion thread.")}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                      isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600",
                    )}
                  >
                    {t("questionDiscussion.dialog.commentCount", "{{count}} comments", { count: visibleCommentCount })}
                  </span>
                </div>

                {!discussionCanAccess ? (
                  <LockedDiscussionNotice isDarkMode={isDarkMode} />
                ) : discussionLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className={cn("h-5 w-5 animate-spin", isDarkMode ? "text-blue-300" : "text-blue-500")} />
                  </div>
                ) : discussionMessages.length === 0 ? (
                  <p className={cn("text-sm", isDarkMode ? "text-slate-500" : "text-slate-500")}>
                    {t("questionDiscussion.shared.emptyState", "No comments yet. Start the discussion for this question.")}
                  </p>
                ) : (
                  <div className="space-y-4">
                    {discussionMessages.map((message) => (
                      <ThreadMessageRow
                        key={message.id}
                        msg={message}
                        canDelete={isLeader || Number(message.authorId) === Number(discussionProfile?.userId ?? discussionProfile?.id ?? 0)}
                        onDelete={handleDiscussionDelete}
                        onReply={handleDiscussionReply}
                        replyPreview={getDiscussionReplyPreview(discussionMessageMap, message)}
                        depth={getDiscussionReplyDepth(discussionMessageMap, message)}
                        isDarkMode={isDarkMode}
                      />
                    ))}
                    <div ref={bottomRef} />
                  </div>
                )}
              </section>
            </div>
          </div>

          {discussionCanAccess ? (
            <div
              className={cn(
                "shrink-0 border-t px-5 py-4",
                isDarkMode ? "border-slate-800 bg-slate-950/90" : "border-slate-200 bg-white/95",
              )}
            >
              {discussionReplyTarget ? (
                <div
                  className={cn(
                    "mb-3 flex items-start justify-between gap-3 rounded-2xl border px-3 py-2",
                    isDarkMode ? "border-blue-900/60 bg-blue-950/20" : "border-blue-200 bg-blue-50",
                  )}
                >
                  <div className="min-w-0">
                    <p className={cn("text-xs font-semibold", isDarkMode ? "text-blue-300" : "text-blue-700")}>
                      {t("questionDiscussion.reply.replyingTo", {
                        name: discussionReplyDisplay?.name || t("questionDiscussion.shared.userFallback", "User"),
                        defaultValue: "Replying to {{name}}",
                      })}
                    </p>
                    <p className={cn("mt-0.5 truncate text-xs", isDarkMode ? "text-slate-400" : "text-slate-600")}>
                      {discussionReplyTarget.body || t("questionDiscussion.reply.emptyBody", "No content")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDiscussionReplyTarget(null)}
                    className={cn(
                      "rounded-full p-1 transition-colors",
                      isDarkMode ? "text-slate-500 hover:bg-slate-800 hover:text-slate-300" : "text-slate-400 hover:bg-white hover:text-slate-600",
                    )}
                    title={t("questionDiscussion.reply.cancel", "Cancel reply")}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : null}

              <div className="flex items-center gap-3">
                <ThreadAvatar
                  src={getProfileAvatar(discussionProfile)}
                  name={discussionProfile?.fullName ?? discussionProfile?.name ?? "?"}
                  role={isLeader ? "LEADER" : "MEMBER"}
                  userId={discussionProfile?.userId ?? discussionProfile?.id ?? 0}
                />

                <div
                  className={cn(
                    "flex flex-1 items-end gap-3 overflow-hidden rounded-[24px] border px-4 py-2.5 transition-colors",
                    isDarkMode
                      ? "border-slate-700/80 bg-[#303236] focus-within:border-slate-500"
                      : "border-slate-200 bg-[#f1f2f4] focus-within:border-slate-300",
                  )}
                >
                  <textarea
                    ref={textareaRef}
                    value={discussionDraft}
                    onChange={(event) => setDiscussionDraft(event.target.value)}
                    onKeyDown={handleDiscussionKeyDown}
                    onInput={handleDiscussionInput}
                    placeholder={discussionReplyTarget
                      ? t("questionDiscussion.reply.placeholder", {
                        name: discussionReplyDisplay?.name || t("questionDiscussion.shared.userFallback", "User"),
                        defaultValue: "Reply to {{name}}",
                      })
                      : t("questionDiscussion.shared.composerPlaceholder", "Bình luận dưới tên {{name}}", { name: composerDisplayName })}
                    rows={1}
                    className={cn(
                      "min-h-[22px] max-h-24 flex-1 resize-none bg-transparent py-1 text-sm leading-5 outline-none",
                      isDarkMode ? "text-slate-100 placeholder:text-slate-400" : "text-slate-800 placeholder:text-slate-500",
                    )}
                    style={{ scrollbarWidth: "none" }}
                  />

                  <button
                    type="button"
                    disabled={!discussionDraft.trim() || discussionPosting}
                    onClick={handleDiscussionPost}
                    className={cn(
                      "mb-0.5 shrink-0 rounded-full p-2 transition-all",
                      discussionDraft.trim()
                        ? isDarkMode
                          ? "bg-blue-500/15 text-blue-300 hover:bg-blue-500/25"
                          : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                        : isDarkMode
                          ? "cursor-not-allowed bg-slate-700/70 text-slate-500"
                          : "cursor-not-allowed bg-slate-300/70 text-slate-500",
                    )}
                    title={t("questionDiscussion.shared.sendTitle", "Send (Enter)")}
                  >
                    {discussionPosting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
