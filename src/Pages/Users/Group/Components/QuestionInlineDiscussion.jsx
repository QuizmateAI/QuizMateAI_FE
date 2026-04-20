/**
 * QuestionInlineDiscussion
 *
 * Always-visible inline chat thread below each question card (Group context).
 *
 * Rules:
 *  - Member must have attempted the quiz to participate (hasAttempted prop)
 *  - Leader always has access regardless of attempt status
 *  - Enter → send · Shift+Enter → new line
 *  - First-time guideline card shown at top
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Send, Trash2, Loader2, Info, Lock, CheckCircle2, X, Smile, Camera, ImageIcon, Sparkles, Reply,
} from 'lucide-react';
import i18n from '@/i18n';
import { cn } from '@/lib/utils';
import { useUserProfile } from '@/context/UserProfileContext';
import { getUserDisplayParts } from '@/Utils/userProfile';
import {
  getThreadMessages,
  postMessage,
  deleteMessage,
} from '@/api/GroupDiscussionAPI';
import {
  buildDiscussionMessageMap,
  formatDiscussionPreview,
  getDiscussionReplyDepth,
  getDiscussionReplyPreview,
  normalizeDiscussionMessageId,
} from './groupDiscussionReplyUtils';

// ─── Storage key for dismissed guideline ─────────────────────────────────────
const GUIDE_DISMISSED_KEY = 'qm_q_discussion_guide_dismissed';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relativeTime(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return i18n.t('questionDiscussion.shared.relativeTime.justNow', 'just now');
  if (diff < 3600) return i18n.t('questionDiscussion.shared.relativeTime.minutesAgo', '{{count}} minutes ago', { count: Math.floor(diff / 60) });
  if (diff < 86400) return i18n.t('questionDiscussion.shared.relativeTime.hoursAgo', '{{count}} hours ago', { count: Math.floor(diff / 3600) });
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function getInitials(name) {
  const parts = String(name || '?').trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0][0] || '?').toUpperCase();
}

function getAvatarBg(role, id) {
  if (role === 'LEADER') return 'bg-blue-600';
  const palette = ['bg-emerald-500', 'bg-violet-500', 'bg-orange-500', 'bg-teal-500', 'bg-rose-500'];
  return palette[Number(id || 0) % palette.length];
}

function getProfileAvatar(profile) {
  return profile?.avatarUrl || profile?.avatar || '';
}

function UserAvatar({ src, name, role, userId, sizeClass = 'w-6 h-6', textClass = 'text-[10px]', className = '' }) {
  const [failed, setFailed] = useState(false);
  const avatarSrc = typeof src === 'string' ? src.trim() : '';
  const showImage = avatarSrc && !failed;

  return (
    <div className={cn(
      sizeClass,
      'rounded-full flex items-center justify-center text-white font-bold shrink-0 overflow-hidden select-none',
      showImage ? 'bg-transparent' : getAvatarBg(role, userId),
      textClass,
      className,
    )}>
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

// ─── Guideline card ───────────────────────────────────────────────────────────

function GuidelineCard({ isDarkMode, onDismiss }) {
  const { t } = useTranslation();
  return (
    <div className={cn(
      'rounded-xl border p-3 mb-3',
      isDarkMode
        ? 'bg-blue-950/30 border-blue-800/50'
        : 'bg-blue-50 border-blue-200',
    )}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <Info className={cn('w-3.5 h-3.5 shrink-0', isDarkMode ? 'text-blue-400' : 'text-blue-500')} />
          <span className={cn('text-xs font-semibold', isDarkMode ? 'text-blue-300' : 'text-blue-700')}>
            {t('questionDiscussion.inline.guide.title', 'Question discussion guide')}
          </span>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className={cn(
            'p-0.5 rounded transition-colors shrink-0',
            isDarkMode ? 'text-blue-500 hover:text-blue-300 hover:bg-blue-900/40' : 'text-blue-400 hover:text-blue-600 hover:bg-blue-100',
          )}
          title={t('questionDiscussion.inline.guide.dismissTitle', 'Dismiss guide')}
        >
          <X className="w-3 h-3" />
        </button>
      </div>
      <ul className={cn('space-y-1.5 text-[11px] leading-relaxed', isDarkMode ? 'text-blue-300/80' : 'text-blue-700/80')}>
        <li className="flex items-start gap-2">
          <span className={cn('mt-0.5 shrink-0 w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold', isDarkMode ? 'bg-blue-800/60' : 'bg-blue-200')}>↵</span>
          <span
            dangerouslySetInnerHTML={{
              __html: t('questionDiscussion.inline.guide.enterToSend', '<strong>Enter</strong> to send a quick comment'),
            }}
          />
        </li>
        <li className="flex items-start gap-2">
          <span className={cn('mt-0.5 shrink-0 w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold', isDarkMode ? 'bg-blue-800/60' : 'bg-blue-200')}>⇧</span>
          <span
            dangerouslySetInnerHTML={{
              __html: t('questionDiscussion.inline.guide.shiftEnterNewLine', '<strong>Shift + Enter</strong> to start a new line'),
            }}
          />
        </li>
        <li className="flex items-start gap-2">
          <span className={cn('mt-0.5 shrink-0 w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold', isDarkMode ? 'bg-blue-800/60' : 'bg-blue-200')}>💡</span>
          <span>{t('questionDiscussion.inline.guide.discussTopic', 'Discuss the answers, solutions, or anything unclear about this question')}</span>
        </li>
        <li className="flex items-start gap-2">
          <span className={cn('mt-0.5 shrink-0 w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold', isDarkMode ? 'bg-blue-800/60' : 'bg-blue-200')}>🗑</span>
          <span>{t('questionDiscussion.inline.guide.hoverToDelete', 'Hover over a comment to delete it (your comments only)')}</span>
        </li>
      </ul>
    </div>
  );
}

// ─── Locked state ─────────────────────────────────────────────────────────────

function LockedState({ isDarkMode }) {
  const { t } = useTranslation();
  return (
    <div className={cn(
      'rounded-xl border px-4 py-5 flex items-center gap-3',
      isDarkMode ? 'bg-slate-800/50 border-slate-700/60' : 'bg-gray-50 border-gray-200',
    )}>
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
        isDarkMode ? 'bg-slate-700' : 'bg-gray-200',
      )}>
        <Lock className={cn('w-4 h-4', isDarkMode ? 'text-slate-400' : 'text-gray-400')} />
      </div>
      <div>
        <p className={cn('text-xs font-medium', isDarkMode ? 'text-slate-300' : 'text-gray-600')}>
          {t('questionDiscussion.inline.locked.title', 'Complete the quiz to join the discussion')}
        </p>
        <p className={cn('text-[11px] mt-0.5', isDarkMode ? 'text-slate-500' : 'text-gray-400')}>
          {t('questionDiscussion.inline.locked.subtitle', 'Finish the quiz first so you can exchange ideas with other members about this question.')}
        </p>
      </div>
    </div>
  );
}

// ─── Message row ──────────────────────────────────────────────────────────────

function MessageRow({ msg, canDelete, onDelete, onReply, replyPreview, depth, isDarkMode }) {
  const { t } = useTranslation();
  const [pending, setPending] = useState(false);
  const timer = useRef(null);
  const authorDisplay = getUserDisplayParts({
    fullName: msg.authorName,
    username: msg.authorUserName,
  }, msg.authorName || t('questionDiscussion.shared.userFallback', 'User'));
  const replyAuthorDisplay = getUserDisplayParts({
    fullName: replyPreview?.authorName,
    username: replyPreview?.authorUserName,
  }, replyPreview?.authorName || t('questionDiscussion.shared.userFallback', 'User'));

  const handleDeleteClick = () => {
    if (pending) {
      clearTimeout(timer.current);
      onDelete(msg.id);
      setPending(false);
    } else {
      setPending(true);
      timer.current = setTimeout(() => setPending(false), 3000);
    }
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <div
      className={cn(
        'flex gap-2.5 group',
        depth > 0 && (isDarkMode ? 'border-l border-slate-800 pl-3' : 'border-l border-blue-100 pl-3'),
      )}
      style={depth > 0 ? { marginLeft: `${Math.min(depth, 2) * 18}px` } : undefined}
    >
      {/* Avatar */}
      <UserAvatar
        src={msg.authorAvatar}
        name={msg.authorName}
        role={msg.authorRole}
        userId={msg.authorId}
        sizeClass="w-6 h-6"
        textClass="text-[10px]"
        className="mt-0.5"
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        {replyPreview && (
          <div
            className={cn(
              'mb-1.5 flex items-start gap-2 rounded-xl border-l-2 px-2.5 py-1.5 text-[11px]',
              isDarkMode ? 'border-blue-700 bg-slate-900/80 text-slate-400' : 'border-blue-300 bg-white text-gray-500',
            )}
          >
            <Reply className={cn('mt-0.5 h-3 w-3 shrink-0', isDarkMode ? 'text-blue-400' : 'text-blue-500')} />
            <div className="min-w-0">
              <p className={cn('font-medium', isDarkMode ? 'text-slate-300' : 'text-gray-700')}>
                {replyPreview.missing
                  ? t('questionDiscussion.reply.originalUnavailable', 'Original comment unavailable')
                  : t('questionDiscussion.reply.replyingTo', {
                    name: replyAuthorDisplay.name,
                    defaultValue: 'Replying to {{name}}',
                  })}
              </p>
              {!replyPreview.missing && (
                <p className="truncate">
                  {replyPreview.body || t('questionDiscussion.reply.emptyBody', 'No content')}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
          <span className={cn('text-xs font-semibold', isDarkMode ? 'text-slate-200' : 'text-gray-800')}>
            {authorDisplay.name}
          </span>
          {authorDisplay.hasUsernameSuffix && (
            <span className={cn('text-[10px] font-normal', isDarkMode ? 'text-slate-600' : 'text-gray-400')}>
              #{authorDisplay.username}
            </span>
          )}
          {msg.authorRole === 'LEADER' && (
            <span className={cn(
              'text-[9px] font-semibold px-1.5 py-0.5 rounded-full',
              isDarkMode ? 'bg-blue-900/60 text-blue-300' : 'bg-blue-100 text-blue-700',
            )}>
              {t('questionDiscussion.shared.roles.leader', 'Leader')}
            </span>
          )}
          {msg.authorRole === 'CONTRIBUTOR' && (
            <span className={cn(
              'text-[9px] font-semibold px-1.5 py-0.5 rounded-full',
              isDarkMode ? 'bg-violet-900/60 text-violet-300' : 'bg-violet-100 text-violet-700',
            )}>
              {t('questionDiscussion.shared.roles.contributor', 'Contributor')}
            </span>
          )}
          <span className={cn('text-[10px]', isDarkMode ? 'text-slate-600' : 'text-gray-400')}>
            {relativeTime(msg.createdAt)}
          </span>
        </div>

        <div className={cn(
          'text-xs leading-relaxed whitespace-pre-wrap break-words rounded-xl px-2.5 py-1.5 inline-block max-w-full',
          isDarkMode ? 'bg-slate-800/80 text-slate-300' : 'bg-blue-50 text-gray-700',
        )}>
          {msg.body}
        </div>

        <div className="mt-1 flex items-center gap-3">
          <button
            type="button"
            onClick={() => onReply(msg)}
            className={cn(
              'inline-flex items-center gap-1 text-[10px] font-medium transition-colors',
              isDarkMode ? 'text-slate-500 hover:text-blue-300' : 'text-gray-400 hover:text-blue-600',
            )}
          >
            <Reply className="h-3 w-3" />
            {t('questionDiscussion.reply.action', 'Reply')}
          </button>
        </div>
      </div>

      {/* Delete */}
      {canDelete && (
        <div className="shrink-0 flex items-start pt-0.5">
          {pending ? (
            <button
              onClick={handleDeleteClick}
              className="flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-500 text-white hover:bg-red-600 transition-colors"
            >
              <Trash2 className="w-2.5 h-2.5" />
              {t('questionDiscussion.shared.delete', 'Delete')}
            </button>
          ) : (
            <button
              onClick={handleDeleteClick}
              className={cn(
                'p-1 rounded transition-colors opacity-0 group-hover:opacity-100',
                isDarkMode
                  ? 'text-slate-600 hover:text-red-400 hover:bg-red-950/30'
                  : 'text-gray-300 hover:text-red-400 hover:bg-red-50',
              )}
              title={t('questionDiscussion.shared.deleteCommentTitle', 'Delete comment')}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * Props:
 *  questionId      number
 *  questionIndex   number   — 1-based global index
 *  workspaceId     number
 *  quizId          number
 *  isLeader        boolean
 *  hasAttempted    boolean  — member must complete quiz first; leader bypasses
 *  isDarkMode      boolean
 */
export default function QuestionInlineDiscussion({
  questionId,
  questionIndex,
  workspaceId,
  quizId,
  isLeader = false,
  hasAttempted = false,
  isDarkMode = false,
  inDialog = false,
  hideGuide = false,
  onMessagesChange,
}) {
  const { t } = useTranslation();
  const { profile } = useUserProfile();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [replyTarget, setReplyTarget] = useState(null);
  const [showGuide, setShowGuide] = useState(
    () => !hideGuide && !localStorage.getItem(GUIDE_DISMISSED_KEY),
  );

  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const onMessagesChangeRef = useRef(onMessagesChange);
  const currentUserId = profile?.userId ?? profile?.id ?? 0;
  const messageMap = useMemo(() => buildDiscussionMessageMap(messages), [messages]);
  const composerNameFallback = t('questionDiscussion.shared.composerNameFallback', 'you');
  const composerDisplayName = String(profile?.fullName ?? profile?.name ?? composerNameFallback).trim() || composerNameFallback;
  const composerTools = [
    { key: 'emoji', icon: Smile, label: t('questionDiscussion.inline.composerTools.emoji', 'Emoji') },
    { key: 'camera', icon: Camera, label: t('questionDiscussion.inline.composerTools.camera', 'Camera') },
    { key: 'image', icon: ImageIcon, label: t('questionDiscussion.inline.composerTools.image', 'Image') },
    { key: 'gif', label: 'GIF', textOnly: true },
    { key: 'sticker', icon: Sparkles, label: t('questionDiscussion.inline.composerTools.sticker', 'Sticker') },
  ];
  const shouldShowMessageArea = loading || messages.length > 0 || !inDialog;

  // ── Access check
  const canAccess = isLeader || hasAttempted;

  // ── Load messages on mount
  useEffect(() => {
    if (!canAccess || !workspaceId || !quizId || !questionId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getThreadMessages(workspaceId, quizId, questionId)
      .then(({ messages: msgs }) => { if (!cancelled) setMessages(msgs); })
      .catch(() => { if (!cancelled) setMessages([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [canAccess, workspaceId, quizId, questionId]);

  useEffect(() => {
    if (!loading && messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [loading, messages.length]);

  useEffect(() => {
    if (replyTarget?.id && !messageMap.has(replyTarget.id)) {
      setReplyTarget(null);
    }
  }, [messageMap, replyTarget]);

  useEffect(() => {
    onMessagesChangeRef.current = onMessagesChange;
  }, [onMessagesChange]);

  useEffect(() => {
    onMessagesChangeRef.current?.(messages.length);
  }, [messages.length]);

  // ── Dismiss guideline (persisted)
  const handleDismissGuide = () => {
    setShowGuide(false);
    localStorage.setItem(GUIDE_DISMISSED_KEY, '1');
  };

  // ── Send
  const handlePost = useCallback(async () => {
    const body = draft.trim();
    if (!body || posting || !canAccess) return;
    const parentMessageId = replyTarget?.id && Number.isFinite(Number(replyTarget.id))
      ? Number(replyTarget.id)
      : null;

    setPosting(true);
    try {
      const msg = await postMessage(workspaceId, quizId, questionId, {
        body,
        parentMessageId,
      });
      setMessages((prev) => [...prev, msg]);
      setDraft('');
      setReplyTarget(null);
      // Reset textarea height
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    } catch {
      //
    } finally {
      setPosting(false);
    }
  }, [draft, posting, canAccess, questionId, quizId, replyTarget, workspaceId]);

  // ── Delete
  const handleDelete = useCallback(async (messageId) => {
    try {
      await deleteMessage(workspaceId, quizId, questionId, messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      setReplyTarget((prev) => (prev?.id === normalizeDiscussionMessageId(messageId) ? null : prev));
    } catch {
      //
    }
  }, [workspaceId, quizId, questionId]);

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

  // ── Keyboard: Enter = send, Shift+Enter = new line
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handlePost();
    }
  };

  // ── Auto-resize textarea
  const handleInput = (e) => {
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 80)}px`;
  };

  const replyTargetDisplay = replyTarget
    ? getUserDisplayParts({
      fullName: replyTarget.authorName,
      username: replyTarget.authorUserName,
    }, replyTarget.authorName || t('questionDiscussion.shared.userFallback', 'User'))
    : null;

  // ─── Render: Locked ─────────────────────────────────────────────────────────
  if (!canAccess) {
    return (
      <div className="mt-2 px-1">
        <LockedState isDarkMode={isDarkMode} />
      </div>
    );
  }

  // ─── Render: Active chat ─────────────────────────────────────────────────────
  return (
    <div className={cn(
      inDialog ? 'flex h-full min-h-0 flex-1 flex-col' : 'mt-2 overflow-hidden rounded-2xl border',
      !inDialog && (isDarkMode ? 'border-blue-900/40 bg-slate-800/30' : 'border-blue-100 bg-blue-50/30'),
    )}>
      {/* Chat header — hidden when rendered inside a dialog (dialog already has its own header) */}
      {!inDialog && (
        <div className={cn(
          'px-3 py-2 border-b flex items-center justify-between',
          isDarkMode ? 'border-blue-900/30 bg-slate-800/50' : 'border-blue-100 bg-blue-50/60',
        )}>
          <div className="flex items-center gap-1.5">
            <div className={cn('w-1.5 h-1.5 rounded-full', isDarkMode ? 'bg-blue-400' : 'bg-blue-500')} />
            <span className={cn('text-[11px] font-semibold', isDarkMode ? 'text-blue-300' : 'text-blue-600')}>
              {t('questionDiscussion.shared.threadTitle', 'Discussion for question {{index}}', { index: questionIndex })}
            </span>
            {messages.length > 0 && (
              <span className={cn(
                'text-[9px] font-bold px-1.5 py-0.5 rounded-full',
                isDarkMode ? 'bg-blue-900/60 text-blue-400' : 'bg-blue-100 text-blue-600',
              )}>
                {messages.length}
              </span>
            )}
          </div>
          {!isLeader && hasAttempted && (
            <div className="flex items-center gap-1">
              <CheckCircle2 className={cn('w-3 h-3', isDarkMode ? 'text-emerald-400' : 'text-emerald-500')} />
              <span className={cn('text-[10px]', isDarkMode ? 'text-emerald-400' : 'text-emerald-600')}>
                {t('questionDiscussion.inline.attempted', 'Attempted')}
              </span>
            </div>
          )}
        </div>
      )}

      <div
        className={cn(
          'px-3 pt-3 pb-2',
          inDialog && 'flex min-h-0 flex-1 flex-col gap-3 px-0 pt-0 pb-0',
        )}
      >
        {/* Guideline card */}
        {showGuide && (
          <GuidelineCard isDarkMode={isDarkMode} onDismiss={handleDismissGuide} />
        )}

        {/* Messages area */}
        {shouldShowMessageArea && (
          <div className={cn(
            'rounded-[22px] border px-3 py-3',
            inDialog && 'flex min-h-0 flex-1 flex-col',
            isDarkMode ? 'border-slate-800 bg-slate-950/45' : 'border-slate-200 bg-slate-50/80',
          )}>
            <div className={cn(
              'space-y-3 overflow-y-auto pr-1',
              inDialog ? 'min-h-0 flex-1 max-h-none' : 'max-h-56',
            )}>
              {loading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className={cn('w-4 h-4 animate-spin', isDarkMode ? 'text-blue-400' : 'text-blue-500')} />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-5 text-center">
                  <div className={cn(
                    'mb-2 flex h-10 w-10 items-center justify-center rounded-full',
                    isDarkMode ? 'bg-slate-800 text-slate-500' : 'bg-white text-slate-400 shadow-sm',
                  )}>
                    <Send className="h-4 w-4" />
                  </div>
                  <p className={cn('text-[11px] italic', isDarkMode ? 'text-slate-500' : 'text-gray-500')}>
                    {t('questionDiscussion.shared.emptyState', 'No comments yet. Start the discussion for this question.')}
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <MessageRow
                    key={msg.id}
                    msg={msg}
                    canDelete={isLeader || Number(msg.authorId) === Number(currentUserId)}
                    onDelete={handleDelete}
                    onReply={handleReply}
                    replyPreview={getDiscussionReplyPreview(messageMap, msg)}
                    depth={getDiscussionReplyDepth(messageMap, msg)}
                    isDarkMode={isDarkMode}
                  />
                ))
              )}
              <div ref={bottomRef} />
            </div>
          </div>
        )}

        {/* Input */}
        <div className={cn("flex shrink-0 items-end gap-3", inDialog && "mt-auto")}>
          <UserAvatar
            src={getProfileAvatar(profile)}
            name={profile?.fullName ?? profile?.name ?? '?'}
            role={isLeader ? 'LEADER' : 'MEMBER'}
            userId={currentUserId}
            sizeClass="w-9 h-9"
            textClass="text-xs"
            className={cn(
              'mb-1 ring-2 shadow-sm',
              isDarkMode ? 'ring-slate-700/70' : 'ring-white',
            )}
          />

          <div
            className={cn(
              'flex-1 overflow-hidden rounded-[26px] border px-4 py-3 transition-colors',
              isDarkMode
                ? 'border-slate-700/80 bg-[#303236] focus-within:border-slate-500'
                : 'border-slate-200 bg-[#f1f2f4] focus-within:border-slate-300',
            )}
          >
            {replyTarget && (
              <div
                className={cn(
                  'mb-3 flex items-start justify-between gap-3 rounded-2xl border px-3 py-2',
                  isDarkMode ? 'border-blue-900/60 bg-blue-950/20' : 'border-blue-200 bg-blue-50',
                )}
              >
                <div className="min-w-0">
                  <p className={cn('text-xs font-semibold', isDarkMode ? 'text-blue-300' : 'text-blue-700')}>
                    {t('questionDiscussion.reply.replyingTo', {
                      name: replyTargetDisplay?.name || t('questionDiscussion.shared.userFallback', 'User'),
                      defaultValue: 'Replying to {{name}}',
                    })}
                  </p>
                  <p className={cn('mt-0.5 truncate text-xs', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
                    {replyTarget.body || t('questionDiscussion.reply.emptyBody', 'No content')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyTarget(null)}
                  className={cn(
                    'rounded-full p-1 transition-colors',
                    isDarkMode ? 'text-slate-500 hover:bg-slate-800 hover:text-slate-300' : 'text-slate-400 hover:bg-white hover:text-slate-600',
                  )}
                  title={t('questionDiscussion.reply.cancel', 'Cancel reply')}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              onInput={handleInput}
              placeholder={replyTarget
                ? t('questionDiscussion.reply.placeholder', {
                  name: replyTargetDisplay?.name || t('questionDiscussion.shared.userFallback', 'User'),
                  defaultValue: 'Reply to {{name}}',
                })
                : t('questionDiscussion.shared.composerPlaceholder', 'Comment as {{name}}', { name: composerDisplayName })}
              rows={1}
              className={cn(
                'w-full resize-none bg-transparent text-sm leading-6 outline-none min-h-[28px] max-h-24',
                isDarkMode ? 'text-slate-100 placeholder:text-slate-400' : 'text-slate-800 placeholder:text-slate-500',
              )}
              style={{ scrollbarWidth: 'none' }}
            />

            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                {composerTools.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <span
                      key={tool.key}
                      aria-hidden="true"
                      title={tool.label}
                      className={cn(
                        'inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1.5',
                        isDarkMode ? 'text-slate-400' : 'text-slate-500',
                      )}
                    >
                      {tool.textOnly ? (
                        <span className="text-[11px] font-semibold tracking-wide">{tool.label}</span>
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </span>
                  );
                })}
              </div>

              {/* Send */}
              <button
                type="button"
                disabled={!draft.trim() || posting}
                onClick={handlePost}
                className={cn(
                  'shrink-0 rounded-full p-2.5 transition-all',
                  draft.trim()
                    ? isDarkMode
                      ? 'bg-blue-500/15 text-blue-300 hover:bg-blue-500/25'
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                    : isDarkMode
                      ? 'bg-slate-700/70 text-slate-500 cursor-not-allowed'
                      : 'bg-slate-300/70 text-slate-500 cursor-not-allowed',
                )}
                title={t('questionDiscussion.shared.sendTitle', 'Send (Enter)')}
              >
                {posting
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Send className="w-4 h-4" />
                }
              </button>
            </div>
          </div>
        </div>

        {/* Shortcut hint */}
        {!inDialog && (
          <p className={cn('mt-1.5 text-right text-[10px]', isDarkMode ? 'text-slate-700' : 'text-gray-300')}>
            {t('questionDiscussion.inline.footerShortcut', 'Enter to send · Shift+Enter for new line')}
          </p>
        )}
      </div>
    </div>
  );
}
