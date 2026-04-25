/**
 * GroupDiscussionPanel — General quiz-level discussion with smart /question tagging.
 *
 * Features:
 *  - Full-width chat UI (no question sidebar — too long for 100+ questions)
 *  - Type "/" to trigger smart question autocomplete (IDE-style)
 *  - Tagged questions render as clickable chips → navigate to that question
 *  - Leader can delete any message; members can delete their own
 */

import React, {
  startTransition,
  useDeferredValue,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { Trans, useTranslation } from 'react-i18next';
import {
  MessageSquare,
  Send,
  Trash2,
  MessageCircle,
  Hash,
  Loader2,
  BookOpen,
  ArrowRight,
  AtSign,
  X,
  Lock,
  MoreHorizontal,
  Reply,
} from 'lucide-react';
import i18n from '@/i18n';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUserProfile } from '@/context/UserProfileContext';
import { useWebSocket } from '@/hooks/useWebSocket';
import { getUserDisplayParts } from '@/utils/userProfile';
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
  matchesDiscussionRealtimeThread,
  normalizeDiscussionMessageId,
  removeDiscussionMessage,
  upsertDiscussionMessage,
} from './groupDiscussionReplyUtils';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relativeTime(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return i18n.t('groupDiscussionPanel.relative.justNow', 'just now');
  if (diff < 3600) {
    const count = Math.floor(diff / 60);
    return i18n.t('groupDiscussionPanel.relative.minutesAgo', { count, defaultValue: '{{count}} minute(s) ago' });
  }
  if (diff < 86400) {
    const count = Math.floor(diff / 3600);
    return i18n.t('groupDiscussionPanel.relative.hoursAgo', { count, defaultValue: '{{count}} hour(s) ago' });
  }
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function truncateText(text, maxLen = 50) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  return clean.length > maxLen ? `${clean.slice(0, maxLen)}…` : clean;
}

function normalizeInlineText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function buildDraftTagMarker(question) {
  const questionText = normalizeInlineText(question?.content || question?.questionText || '');
  return questionText
    ? `[#${question.index}] ${questionText}`
    : `[#${question.index}]`;
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

/** Parse message body: split text and [[q:ID:INDEX]] tokens. */
function parseBody(body) {
  return String(body || '').split(/(\[\[q:\d+:\d+\]\])/);
}

/** Encode draft tags: replace [[#N]] display markers with [[q:ID:N]] tokens. */
function encodeDraftTags(draft, draftTags) {
  let encoded = draft;
  for (const [marker, tag] of Object.entries(draftTags)) {
    encoded = encoded.split(marker).join(`[[q:${tag.questionId}:${tag.index}]]`);
  }
  return encoded;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** A clickable question chip rendered inside a message. */
function QuestionChip({ questionId, questionIndex, questionsById, onNavigate, isDarkMode }) {
  const { t } = useTranslation();
  const q = questionsById[String(questionId)];
  const label = q
    ? `#${questionIndex} · ${truncateText(q.content || q.questionText || '', 38)}`
    : `#${questionIndex}`;

  return (
    <button
      type="button"
      onClick={() => onNavigate?.(Number(questionId), Number(questionIndex))}
      title={t('groupDiscussionPanel.viewQuestionTooltip', 'View this question')}
      className={cn(
        'mx-0.5 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold shadow-sm transition-colors',
        isDarkMode
          ? 'border-blue-800/60 bg-blue-900/40 text-blue-200 hover:bg-blue-800/60'
          : 'border-blue-200 bg-white text-blue-700 hover:border-blue-300 hover:bg-blue-50',
      )}
    >
      <Hash className="w-3 h-3 shrink-0" />
      <span className="max-w-[180px] truncate">{label}</span>
      <ArrowRight className="w-3 h-3 shrink-0 opacity-50" />
    </button>
  );
}

/** Role badge */
function RoleBadge({ role, isDarkMode }) {
  if (role === 'LEADER') {
    return (
      <span className={cn(
        'rounded-full px-2 py-0.5 text-[10px] font-semibold',
        isDarkMode ? 'bg-blue-900/60 text-blue-300' : 'bg-blue-100 text-blue-700',
      )}>
        Leader
      </span>
    );
  }
  if (role === 'CONTRIBUTOR') {
    return (
      <span className={cn(
        'rounded-full px-2 py-0.5 text-[10px] font-semibold',
        isDarkMode ? 'bg-violet-900/60 text-violet-300' : 'bg-violet-100 text-violet-700',
      )}>
        Contributor
      </span>
    );
  }
  return null;
}

function UserAvatar({ src, name, role, userId, sizeClass = 'w-8 h-8', textClass = 'text-xs', className = '' }) {
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

/** Single message row. */
function MessageItem({
  msg,
  canDelete,
  onDelete,
  onReply,
  replyPreview,
  depth,
  questionsById,
  onNavigate,
  isDarkMode,
}) {
  const { t } = useTranslation();
  const [pendingDelete, setPendingDelete] = useState(false);
  const cancelRef = useRef(null);
  const authorDisplay = getUserDisplayParts({
    fullName: msg.authorName,
    username: msg.authorUserName,
  }, msg.authorName || t('groupDiscussionPanel.defaultUserName', 'User'));
  const replyAuthorDisplay = getUserDisplayParts({
    fullName: replyPreview?.authorName,
    username: replyPreview?.authorUserName,
  }, replyPreview?.authorName || t('groupDiscussionPanel.defaultUserName', 'User'));

  const handleDeleteClick = () => {
    if (pendingDelete) {
      clearTimeout(cancelRef.current);
      onDelete(msg.id);
      setPendingDelete(false);
    } else {
      setPendingDelete(true);
      cancelRef.current = setTimeout(() => setPendingDelete(false), 3000);
    }
  };

  useEffect(() => () => clearTimeout(cancelRef.current), []);

  const parts = parseBody(msg.body);

  return (
    <article
      className={cn(
        'flex gap-4',
        depth > 0 && (isDarkMode ? 'border-l border-slate-800/80 pl-5' : 'border-l border-slate-200 pl-5'),
      )}
      style={depth > 0 ? { marginLeft: `${Math.min(depth, 2) * 18}px` } : undefined}
    >
      <UserAvatar
        src={msg.authorAvatar}
        name={msg.authorName}
        role={msg.authorRole}
        userId={msg.authorId}
        sizeClass="h-10 w-10"
        textClass="text-xs"
        className={cn(
          'mt-0.5 ring-4',
          isDarkMode ? 'ring-slate-900' : 'ring-white shadow-sm',
        )}
      />

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={cn('text-[15px] font-semibold', isDarkMode ? 'text-slate-100' : 'text-slate-900')}>
            {authorDisplay.name}
          </span>
          {authorDisplay.hasUsernameSuffix && (
            <span className={cn('text-[11px] font-normal', isDarkMode ? 'text-slate-500' : 'text-slate-400')}>
              #{authorDisplay.username}
            </span>
          )}
          <RoleBadge role={msg.authorRole} isDarkMode={isDarkMode} />
          <span className={cn('text-[11px]', isDarkMode ? 'text-slate-500' : 'text-slate-400')}>
            {relativeTime(msg.createdAt)}
          </span>
        </div>

        {/* Body with question chips */}
        {replyPreview && (
          <div
            className={cn(
              'mt-2.5 flex items-start gap-2 rounded-2xl border px-3 py-2.5 text-xs',
              isDarkMode
                ? 'border-slate-800 bg-slate-950/70 text-slate-400'
                : 'border-orange-200 bg-orange-50/70 text-slate-500',
            )}
          >
            <Reply className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', isDarkMode ? 'text-blue-400' : 'text-orange-500')} />
            <div className="min-w-0">
              <p className={cn('font-medium', isDarkMode ? 'text-slate-300' : 'text-slate-700')}>
                {replyPreview.missing
                  ? t('groupDiscussionPanel.reply.originalUnavailable', 'Original comment unavailable')
                  : t('groupDiscussionPanel.reply.replyingTo', {
                    name: replyAuthorDisplay.name,
                    defaultValue: 'Replying to {{name}}',
                  })}
              </p>
              {!replyPreview.missing && (
                <p className="truncate">
                  {truncateText(replyPreview.body, 80) || t('groupDiscussionPanel.reply.emptyBody', 'No content')}
                </p>
              )}
            </div>
          </div>
        )}
        <div className={cn(
          'mt-2.5 max-w-full text-[15px] leading-7',
          isDarkMode ? 'text-slate-200' : 'text-slate-800',
        )}>
          {parts.map((part, i) => {
            const match = part.match(/^\[\[q:(\d+):(\d+)\]\]$/);
            if (match) {
              return (
                <QuestionChip
                  key={i}
                  questionId={match[1]}
                  questionIndex={match[2]}
                  questionsById={questionsById}
                  onNavigate={onNavigate}
                  isDarkMode={isDarkMode}
                />
              );
            }
            return part ? <span key={i} className="whitespace-pre-wrap break-words">{part}</span> : null;
          })}
        </div>

        <div className={cn(
          'mt-3 flex items-center gap-4 text-[12px]',
          isDarkMode ? 'text-slate-500' : 'text-slate-500',
        )}>
          <button
            type="button"
            onClick={() => onReply(msg)}
            className={cn(
              'inline-flex items-center gap-1 font-medium transition-colors',
              isDarkMode ? 'hover:text-blue-300' : 'hover:text-slate-800',
            )}
          >
            <Reply className="h-3 w-3" />
            {t('groupDiscussionPanel.reply.action', 'Reply')}
          </button>
          {pendingDelete ? (
            <button
              onClick={handleDeleteClick}
              className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2.5 py-1 text-white transition-colors hover:bg-red-600"
            >
              <Trash2 className="w-3 h-3" />
              {t('groupDiscussionPanel.confirmDelete', 'Confirm')}
            </button>
          ) : canDelete ? (
            <button
              onClick={handleDeleteClick}
              className={cn(
                'inline-flex items-center gap-1 transition-colors',
                isDarkMode ? 'hover:text-red-300' : 'hover:text-red-500',
              )}
              title={t('groupDiscussionPanel.deleteCommentTooltip', 'Delete comment')}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

/** Empty thread state */
function EmptyThread({ isDarkMode }) {
  const { t } = useTranslation();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 py-20 text-center select-none">
      <div className={cn(
        'flex h-16 w-16 items-center justify-center rounded-3xl border',
        isDarkMode ? 'border-slate-800 bg-slate-950/80' : 'border-orange-100 bg-orange-50',
      )}>
        <MessageCircle className={cn('h-7 w-7', isDarkMode ? 'text-blue-400' : 'text-orange-500')} />
      </div>
      <div>
        <p className={cn('text-base font-semibold', isDarkMode ? 'text-slate-200' : 'text-slate-800')}>
          {t('groupDiscussionPanel.empty.title', 'No comments yet')}
        </p>
        <p className={cn('mx-auto mt-2 max-w-sm text-sm leading-6', isDarkMode ? 'text-slate-500' : 'text-slate-500')}>
          <Trans
            i18nKey="groupDiscussionPanel.empty.description"
            ns="group"
            defaults="Start the discussion! Use <1>/</1> to tag a specific question."
            components={[
              <span key="text" />,
              <kbd key="kbd" className={cn(
                'rounded-md border px-1.5 py-0.5 text-[11px] font-mono',
                isDarkMode ? 'border-slate-700 bg-slate-800 text-slate-300' : 'border-slate-200 bg-white text-slate-600',
              )} />,
            ]}
          />
        </p>
      </div>
    </div>
  );
}

function LockedState({ isDarkMode }) {
  const { t } = useTranslation();
  return (
    <div className={cn(
      'flex h-full flex-col overflow-hidden rounded-[28px] border',
      isDarkMode
        ? 'border-slate-800 bg-slate-900'
        : 'border-slate-200 bg-[#fcfcfb] shadow-[0_24px_60px_-36px_rgba(15,23,42,0.35)]',
    )}>
      <div className={cn(
        'flex shrink-0 items-center gap-3 border-b px-6 py-5',
        isDarkMode ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-white/90',
      )}>
        <div className={cn(
          'flex h-11 w-11 items-center justify-center rounded-full',
          isDarkMode ? 'bg-blue-500/15 text-blue-300' : 'bg-orange-100 text-orange-600',
        )}>
          <MessageSquare className="h-4 w-4" />
        </div>
        <div>
          <p className={cn('text-sm font-semibold', isDarkMode ? 'text-slate-100' : 'text-slate-900')}>
            {t('groupDiscussionPanel.header.title', 'General discussion')}
          </p>
          <p className={cn('mt-1 text-xs', isDarkMode ? 'text-slate-500' : 'text-slate-500')}>
            {t('groupDiscussionPanel.header.subtitle', 'A shared thread for the whole group, with replies and question tags in one place.')}
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <div className={cn(
          'max-w-md rounded-[26px] border px-5 py-5',
          isDarkMode ? 'border-slate-800 bg-slate-950/70' : 'border-slate-200 bg-white',
        )}>
          <div className="flex items-start gap-3">
            <div className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl',
              isDarkMode ? 'bg-slate-800' : 'bg-orange-50',
            )}>
              <Lock className={cn('h-4 w-4', isDarkMode ? 'text-slate-400' : 'text-orange-500')} />
            </div>
            <div>
              <p className={cn('text-sm font-semibold', isDarkMode ? 'text-slate-200' : 'text-slate-800')}>
                {t('groupDiscussionPanel.locked.title', 'Complete the quiz to join the discussion')}
              </p>
              <p className={cn('mt-1 text-sm leading-6', isDarkMode ? 'text-slate-500' : 'text-slate-500')}>
                {t('groupDiscussionPanel.locked.description', 'Finish the attempt first to exchange with other group members.')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Slash-command suggestion item */
function SuggestionItem({ question, isActive, onSelect, isDarkMode }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onSelect(question); }}
      className={cn(
        'flex w-full items-center gap-3 px-3 py-3 text-left transition-colors',
        isActive
          ? isDarkMode ? 'bg-blue-800/40 text-blue-200' : 'bg-orange-50 text-slate-800'
          : isDarkMode ? 'text-slate-300 hover:bg-slate-700/50' : 'text-slate-700 hover:bg-slate-50',
      )}
    >
      <span className={cn(
        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
        isActive
          ? isDarkMode ? 'bg-blue-700 text-blue-200' : 'bg-orange-100 text-orange-700'
          : isDarkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500',
      )}>
        {question.index}
      </span>
      <span className="text-xs leading-snug line-clamp-2 flex-1">{truncateText(question.content || '', 65)}</span>
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * GroupDiscussionPanel — General (quiz-level) discussion with /question tagging.
 *
 * Props:
 *  isDarkMode          boolean
 *  workspaceId         number
 *  quizId              number
 *  isLeader            boolean
 *  hasAttempted        boolean
 *  allQuestions        Array<{questionId, content, index}> — flat sorted list
 *  questionsById       Record<string, question>
 *  onNavigateToQuestion (questionId: number, questionIndex: number) => void
 */
export default function GroupDiscussionPanel({
  isDarkMode = false,
  workspaceId,
  quizId,
  isLeader = false,
  hasAttempted = false,
  allQuestions = [],
  questionsById = {},
  onNavigateToQuestion,
}) {
  const { t } = useTranslation();
  const { profile } = useUserProfile();

  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [replyTarget, setReplyTarget] = useState(null);

  // ── Draft & tag state
  const [draft, setDraft] = useState('');
  /** Map of display marker → { questionId, index } */
  const [draftTags, setDraftTags] = useState({});
  const [posting, setPosting] = useState(false);

  // ── Slash command state
  const [slashQuery, setSlashQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const [slashRange, setSlashRange] = useState(null); // { start, end } in draft

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const canAccess = isLeader || hasAttempted;
  const messageMap = useMemo(() => buildDiscussionMessageMap(messages), [messages]);
  const deferredSlashQuery = useDeferredValue(slashQuery);

  // ── Filtered suggestions
  const filteredSuggestions = useMemo(() => {
    if (!showSuggestions) return [];
    const q = deferredSlashQuery.toLowerCase().trim();
    return allQuestions
      .filter((question) => {
        if (!q) return true;
        const text = String(question.content || '').toLowerCase();
        const idx = String(question.index);
        return text.includes(q) || idx.includes(q);
      });
  }, [allQuestions, deferredSlashQuery, showSuggestions]);

  // ── Load messages
  const loadMessages = useCallback(async () => {
    if (!canAccess || !workspaceId || !quizId) {
      setLoadingMessages(false);
      setMessages([]);
      return;
    }
    setLoadingMessages(true);
    try {
      const { messages: msgs } = await getThreadMessages(workspaceId, quizId, null);
      setMessages(msgs);
    } catch {
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, [canAccess, workspaceId, quizId]);

  useEffect(() => { void loadMessages(); }, [loadMessages]);

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  useEffect(() => {
    if (replyTarget?.id && !messageMap.has(replyTarget.id)) {
      setReplyTarget(null);
    }
  }, [messageMap, replyTarget]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 100)}px`;
  }, [draft]);

  const handleDiscussionRealtime = useCallback((event = {}) => {
    const eventType = String(event?.type || '').trim().toUpperCase();
    if (!workspaceId || Number(event?.workspaceId) !== Number(workspaceId)) {
      return;
    }

    if (eventType === 'SOCKET_RESTORED') {
      void loadMessages();
      return;
    }

    if (!matchesDiscussionRealtimeThread(event, quizId, null)) {
      return;
    }

    if (eventType === 'DISCUSSION_MESSAGE_CREATED' && event?.message) {
      startTransition(() => {
        setMessages((current) => upsertDiscussionMessage(current, event.message));
      });
      return;
    }

    if (eventType === 'DISCUSSION_MESSAGE_DELETED') {
      const deletedMessageId = event?.messageId ?? event?.deletedMessageId;
      startTransition(() => {
        setMessages((current) => removeDiscussionMessage(current, deletedMessageId));
        setReplyTarget((current) => (
          current?.id === normalizeDiscussionMessageId(deletedMessageId)
            ? null
            : current
        ));
      });
    }
  }, [loadMessages, quizId, workspaceId]);

  const { isConnected: isDiscussionSocketConnected } = useWebSocket({
    workspaceId,
    enabled: canAccess && Boolean(workspaceId) && Boolean(quizId),
    onDiscussionUpdate: handleDiscussionRealtime,
  });

  // ── Input change: detect slash command
  const handleInputChange = useCallback((e) => {
    const value = e.target.value;
    const cursor = e.target.selectionStart;
    setDraft(value);

    // Find the last '/' before cursor that's either at start or after a space
    const textBeforeCursor = value.slice(0, cursor);
    const slashMatch = textBeforeCursor.match(/(?:^|[\s\n])\/([^\s]*)$/);

    if (slashMatch) {
      const query = slashMatch[1];
      const slashStart = textBeforeCursor.lastIndexOf('/');
      setSlashQuery(query);
      setSlashRange({ start: slashStart, end: cursor });
      setShowSuggestions(true);
      setActiveSuggestion(0);
    } else {
      setShowSuggestions(false);
      setSlashRange(null);
    }
  }, []);

  // ── Select a suggestion from the dropdown
  const handleSelectSuggestion = useCallback((question) => {
    if (!slashRange || !textareaRef.current) return;

    const marker = buildDraftTagMarker(question);
    const before = draft.slice(0, slashRange.start).replace(/[ \t]+$/, '');
    const after = draft.slice(slashRange.end).replace(/^[ \t]+/, '');
    const prefix = before
      ? before.endsWith('\n')
        ? before
        : `${before}\n`
      : '';
    const suffix = after ? `\n${after}` : '\n';
    const newDraft = `${prefix}${marker}${suffix}`;

    setDraft(newDraft);
    setDraftTags((prev) => ({
      ...prev,
      [marker]: {
        questionId: question.questionId,
        index: question.index,
        content: normalizeInlineText(question.content || question.questionText || ''),
      },
    }));
    setShowSuggestions(false);
    setSlashRange(null);
    setSlashQuery('');

    // Restore focus + position cursor after marker
    requestAnimationFrame(() => {
      const ta = textareaRef.current;
      if (!ta) return;
      ta.focus();
      const pos = prefix.length + marker.length + 1;
      ta.setSelectionRange(pos, pos);
    });
  }, [draft, slashRange]);

  // ── Post message
  const handlePost = useCallback(async () => {
    const rawBody = draft.trim();
    if (!rawBody || posting || !canAccess) return;

    const encodedBody = encodeDraftTags(rawBody, draftTags);
    const parentMessageId = replyTarget?.id && Number.isFinite(Number(replyTarget.id))
      ? Number(replyTarget.id)
      : null;

    setPosting(true);
    try {
      const msg = await postMessage(workspaceId, quizId, null, {
        body: encodedBody,
        parentMessageId,
      });
      startTransition(() => {
        setMessages((current) => upsertDiscussionMessage(current, msg));
        setDraft('');
        setDraftTags({});
        setReplyTarget(null);
      });
    } catch {
      // upstream handles errors
    } finally {
      setPosting(false);
    }
  }, [draft, draftTags, posting, canAccess, replyTarget, workspaceId, quizId]);

  // ── Keyboard navigation in suggestions + send
  const handleKeyDown = useCallback((e) => {
    if (showSuggestions && filteredSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSuggestion((i) => Math.min(i + 1, filteredSuggestions.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSuggestion((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSelectSuggestion(filteredSuggestions[activeSuggestion]);
        return;
      }
      if (e.key === 'Escape') {
        setShowSuggestions(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handlePost();
    }
  }, [showSuggestions, filteredSuggestions, activeSuggestion, handleSelectSuggestion, handlePost]);

  // ── Delete message
  const handleDelete = useCallback(async (messageId) => {
    try {
      await deleteMessage(workspaceId, quizId, null, messageId);
      startTransition(() => {
        setMessages((current) => removeDiscussionMessage(current, messageId));
        setReplyTarget((current) => (current?.id === normalizeDiscussionMessageId(messageId) ? null : current));
      });
    } catch {
      // ignore
    }
  }, [workspaceId, quizId]);

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

  const currentUserId = profile?.userId ?? profile?.id ?? 0;
  const replyTargetDisplay = replyTarget
    ? getUserDisplayParts({
      fullName: replyTarget.authorName,
      username: replyTarget.authorUserName,
    }, replyTarget.authorName || t('groupDiscussionPanel.defaultUserName', 'User'))
    : null;

  // ── Render ────────────────────────────────────────────────────────────────

  if (!canAccess) {
    return <LockedState isDarkMode={isDarkMode} />;
  }

  return (
    <div className={cn(
      'flex h-full flex-col overflow-hidden rounded-[28px] border',
      isDarkMode
        ? 'border-slate-800 bg-slate-900'
        : 'border-slate-200 bg-[#fcfcfb] shadow-[0_24px_60px_-36px_rgba(15,23,42,0.35)]',
    )}>
      {/* Header */}
      <div className={cn(
        'flex shrink-0 items-start justify-between gap-4 border-b px-6 py-5',
        isDarkMode ? 'border-slate-800 bg-slate-950/70' : 'border-slate-200 bg-white/90',
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            'flex h-11 w-11 items-center justify-center rounded-full',
            isDarkMode ? 'bg-blue-500/15 text-blue-300' : 'bg-orange-100 text-orange-600',
          )}>
            <MessageSquare className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className={cn('text-base font-semibold', isDarkMode ? 'text-slate-100' : 'text-slate-900')}>
                {t('groupDiscussionPanel.header.title', 'General discussion')}
              </p>
              <span className={cn(
                'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold',
                isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600',
              )}>
                {messages.length}
              </span>
              <span className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold',
                isDiscussionSocketConnected
                  ? isDarkMode
                    ? 'bg-emerald-950/50 text-emerald-300'
                    : 'bg-emerald-100 text-emerald-700'
                  : isDarkMode
                    ? 'bg-slate-800 text-slate-400'
                    : 'bg-slate-100 text-slate-500',
              )}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {isDiscussionSocketConnected
                  ? t('groupDiscussionPanel.header.live', 'Live')
                  : t('groupDiscussionPanel.header.offline', 'Offline')}
              </span>
            </div>
            <p className={cn('mt-1 text-sm', isDarkMode ? 'text-slate-500' : 'text-slate-500')}>
              {t('groupDiscussionPanel.header.subtitle', 'A shared thread for the whole group, with replies and question tags in one place.')}
            </p>
          </div>
        </div>

        {/* Hint */}
        <div className={cn(
          'hidden items-center gap-1.5 text-[11px] sm:flex',
          isDarkMode ? 'text-slate-500' : 'text-slate-400',
        )}>
          <AtSign className="w-3 h-3" />
          <span>{t('groupDiscussionPanel.header.hintPrefix', 'Press')} <kbd className={cn(
            'rounded-md border px-1.5 py-0.5 text-[10px] font-mono',
            isDarkMode ? 'border-slate-700 bg-slate-800 text-slate-300' : 'border-slate-200 bg-white text-slate-600',
          )}>/</kbd> {t('groupDiscussionPanel.header.hintSuffix', 'to tag a question')}</span>
        </div>
      </div>

      {/* Messages */}
      <div className={cn(
        'flex-1 overflow-y-auto px-6 py-6',
        isDarkMode ? 'bg-slate-900' : 'bg-[#fcfcfb]',
      )}>
        {loadingMessages ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className={cn('w-5 h-5 animate-spin', isDarkMode ? 'text-blue-400' : 'text-orange-500')} />
          </div>
        ) : messages.length === 0 ? (
          <EmptyThread isDarkMode={isDarkMode} />
        ) : (
          <div className="mx-auto max-w-5xl space-y-8">
            {messages.map((msg) => (
              <MessageItem
                key={msg.id}
                msg={msg}
                canDelete={isLeader || Number(msg.authorId) === Number(currentUserId)}
                onDelete={handleDelete}
                onReply={handleReply}
                replyPreview={getDiscussionReplyPreview(messageMap, msg)}
                depth={getDiscussionReplyDepth(messageMap, msg)}
                questionsById={questionsById}
                onNavigate={onNavigateToQuestion}
                isDarkMode={isDarkMode}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Slash-command suggestions dropdown (above input) */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="px-6 pb-2">
          <div className={cn(
            'mx-auto max-w-4xl overflow-hidden rounded-[24px] border shadow-lg',
            isDarkMode
              ? 'border-slate-700 bg-slate-800 shadow-black/40'
              : 'border-slate-200 bg-white shadow-slate-900/10',
          )}>
            {/* Dropdown header */}
            <div className={cn(
              'flex items-center justify-between border-b px-3 py-2',
              isDarkMode ? 'border-slate-700 bg-slate-900/50' : 'border-slate-100 bg-slate-50/80',
            )}>
              <span className={cn('flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider', isDarkMode ? 'text-slate-500' : 'text-slate-400')}>
                <BookOpen className="w-3 h-3" />
                {slashQuery
                  ? t('groupDiscussionPanel.suggestions.questionsWithQuery', { query: slashQuery, defaultValue: 'Questions · "{{query}}"' })
                  : t('groupDiscussionPanel.suggestions.questions', 'Questions')}
              </span>
              <span className={cn('text-[10px]', isDarkMode ? 'text-slate-600' : 'text-slate-400')}>
                {t('groupDiscussionPanel.suggestions.shortcuts', '↑↓ navigate · Enter confirm · Esc close')}
              </span>
            </div>

            <div className={cn('max-h-52 divide-y overflow-y-auto', isDarkMode ? 'divide-slate-700/60' : 'divide-slate-100')}>
              {filteredSuggestions.map((q, i) => (
                <SuggestionItem
                  key={q.questionId}
                  question={q}
                  isActive={i === activeSuggestion}
                  onSelect={handleSelectSuggestion}
                  isDarkMode={isDarkMode}
                />
              ))}
            </div>

            {allQuestions.length > 8 && (
              <div className={cn(
                'bg-gray-50/50 px-3 py-1.5 text-center text-[10px]',
                isDarkMode ? 'bg-slate-900/30 text-slate-600' : 'text-slate-400',
              )}>
                {filteredSuggestions.length < allQuestions.length
                  ? t('groupDiscussionPanel.suggestions.countFiltered', { shown: filteredSuggestions.length, total: allQuestions.length, defaultValue: '{{shown}} / {{total}} questions' })
                  : t('groupDiscussionPanel.suggestions.countTotal', { total: allQuestions.length, defaultValue: '{{total}} questions' })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className={cn(
        'shrink-0 border-t px-6 py-5',
        isDarkMode ? 'border-slate-800 bg-slate-950/90' : 'border-slate-200 bg-white/95',
      )}>
        {replyTarget && (
          <div
            className={cn(
              'mx-auto mb-3 flex max-w-4xl items-start justify-between gap-3 rounded-2xl border px-3 py-2.5',
              isDarkMode ? 'border-blue-900/60 bg-blue-950/20' : 'border-blue-200 bg-blue-50/80',
            )}
          >
            <div className="min-w-0">
              <p className={cn('text-xs font-semibold', isDarkMode ? 'text-blue-300' : 'text-blue-700')}>
                {t('groupDiscussionPanel.reply.replyingTo', {
                  name: replyTargetDisplay?.name || t('groupDiscussionPanel.defaultUserName', 'User'),
                  defaultValue: 'Replying to {{name}}',
                })}
              </p>
              <p className={cn('mt-0.5 truncate text-xs', isDarkMode ? 'text-slate-400' : 'text-gray-600')}>
                {truncateText(replyTarget.body, 90) || t('groupDiscussionPanel.reply.emptyBody', 'No content')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setReplyTarget(null)}
              className={cn(
                'rounded-full p-1 transition-colors',
                isDarkMode ? 'text-slate-500 hover:bg-slate-800 hover:text-slate-300' : 'text-gray-400 hover:bg-white hover:text-gray-600',
              )}
              title={t('groupDiscussionPanel.reply.cancel', 'Cancel reply')}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className={cn(
          'mx-auto flex max-w-4xl items-end gap-3 rounded-[30px] border px-4 py-3 shadow-[0_18px_36px_-28px_rgba(15,23,42,0.45)] transition-all',
          showSuggestions
            ? isDarkMode ? 'border-blue-600/60 bg-slate-800/80' : 'border-blue-300 bg-orange-50/80'
            : isDarkMode ? 'border-slate-700 bg-slate-800/70' : 'border-slate-200 bg-[#f6f7fb]',
        )}>
          <UserAvatar
            src={getProfileAvatar(profile)}
            name={profile?.fullName ?? profile?.name ?? '?'}
            role={isLeader ? 'LEADER' : 'MEMBER'}
            userId={currentUserId}
            sizeClass="h-8 w-8"
            textClass="text-xs"
            className="mb-1 ring-4 ring-white"
          />

          <textarea
            ref={textareaRef}
            value={draft}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={replyTarget
              ? t('groupDiscussionPanel.input.replyPlaceholder', {
                name: replyTargetDisplay?.name || t('groupDiscussionPanel.defaultUserName', 'User'),
                defaultValue: 'Reply to {{name}}… Press Enter to send',
              })
              : t('groupDiscussionPanel.input.placeholder', 'Write a comment… Use / to tag a question · Enter to send')}
            rows={1}
            className={cn(
              'min-h-[36px] max-h-[100px] flex-1 resize-none bg-transparent text-sm leading-relaxed outline-none',
              isDarkMode ? 'text-slate-200 placeholder:text-slate-500' : 'text-slate-800 placeholder:text-slate-400',
            )}
            style={{ scrollbarWidth: 'none' }}
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
            }}
          />

          <Button
            type="button"
            size="icon"
            disabled={!draft.trim() || posting}
            onClick={handlePost}
            className={cn(
              'h-10 w-10 shrink-0 rounded-full',
              draft.trim()
                ? isDarkMode ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-orange-500 hover:bg-orange-600 text-white'
                : isDarkMode ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-slate-300 text-slate-500 cursor-not-allowed',
            )}
          >
            {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </Button>
        </div>

        <p className={cn('mx-auto mt-2 max-w-4xl text-[10px] text-center sm:text-right', isDarkMode ? 'text-slate-600' : 'text-slate-400')}>
          {t('groupDiscussionPanel.input.footerPrefix', 'Enter to send · Shift+Enter for new line ·')} {isLeader
            ? t('groupDiscussionPanel.input.leaderCanDelete', 'Leader can delete any comment')
            : t('groupDiscussionPanel.input.memberCanDelete', 'You can only delete your own comments')}
        </p>
      </div>
    </div>
  );
}
