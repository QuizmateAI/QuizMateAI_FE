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
  Info,
  Lock,
} from 'lucide-react';
import i18n from '@/i18n';
import { Button } from '@/Components/ui/button';
import { cn } from '@/lib/utils';
import { useUserProfile } from '@/context/UserProfileContext';
import { getUserDisplayParts } from '@/Utils/userProfile';
import {
  getThreadMessages,
  postMessage,
  deleteMessage,
} from '@/api/GroupDiscussionAPI';

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
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium mx-0.5 transition-colors',
        isDarkMode
          ? 'bg-blue-900/50 text-blue-300 hover:bg-blue-800/70 border border-blue-800/60'
          : 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200',
      )}
    >
      <Hash className="w-3 h-3 shrink-0" />
      <span className="max-w-[180px] truncate">{label}</span>
      <ArrowRight className="w-3 h-3 shrink-0 opacity-60" />
    </button>
  );
}

/** Role badge */
function RoleBadge({ role, isDarkMode }) {
  if (role === 'LEADER') {
    return (
      <span className={cn(
        'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
        isDarkMode ? 'bg-blue-900/60 text-blue-300' : 'bg-blue-100 text-blue-700',
      )}>
        Leader
      </span>
    );
  }
  if (role === 'CONTRIBUTOR') {
    return (
      <span className={cn(
        'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
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
function MessageItem({ msg, canDelete, onDelete, questionsById, onNavigate, isDarkMode }) {
  const { t } = useTranslation();
  const [pendingDelete, setPendingDelete] = useState(false);
  const cancelRef = useRef(null);
  const authorDisplay = getUserDisplayParts({
    fullName: msg.authorName,
    username: msg.authorUserName,
  }, msg.authorName || t('groupDiscussionPanel.defaultUserName', 'User'));

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
    <div className="flex gap-3 group">
      <UserAvatar
        src={msg.authorAvatar}
        name={msg.authorName}
        role={msg.authorRole}
        userId={msg.authorId}
        sizeClass="w-8 h-8"
        textClass="text-xs"
        className="mt-0.5"
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap mb-1">
          <span className={cn('text-sm font-semibold', isDarkMode ? 'text-slate-100' : 'text-gray-900')}>
            {authorDisplay.name}
          </span>
          {authorDisplay.hasUsernameSuffix && (
            <span className={cn('text-[11px] font-normal', isDarkMode ? 'text-slate-500' : 'text-gray-400')}>
              #{authorDisplay.username}
            </span>
          )}
          <RoleBadge role={msg.authorRole} isDarkMode={isDarkMode} />
          <span className={cn('text-[11px]', isDarkMode ? 'text-slate-500' : 'text-gray-400')}>
            {relativeTime(msg.createdAt)}
          </span>
        </div>

        {/* Body with question chips */}
        <div className={cn(
          'text-sm leading-relaxed rounded-xl px-3 py-2 inline-block max-w-full',
          isDarkMode ? 'bg-slate-800/70 text-slate-200' : 'bg-blue-50 text-gray-800',
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
      </div>

      {/* Delete button */}
      {canDelete && (
        <div className="shrink-0 flex items-start pt-1">
          {pendingDelete ? (
            <button
              onClick={handleDeleteClick}
              className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              {t('groupDiscussionPanel.confirmDelete', 'Confirm')}
            </button>
          ) : (
            <button
              onClick={handleDeleteClick}
              className={cn(
                'p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100',
                isDarkMode
                  ? 'text-slate-500 hover:text-red-400 hover:bg-red-950/30'
                  : 'text-gray-400 hover:text-red-500 hover:bg-red-50',
              )}
              title={t('groupDiscussionPanel.deleteCommentTooltip', 'Delete comment')}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Empty thread state */
function EmptyThread({ isDarkMode }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-16 px-6 select-none">
      <div className={cn(
        'w-14 h-14 rounded-2xl flex items-center justify-center',
        isDarkMode ? 'bg-blue-950/50' : 'bg-blue-50',
      )}>
        <MessageCircle className={cn('w-7 h-7', isDarkMode ? 'text-blue-400' : 'text-blue-500')} />
      </div>
      <div>
        <p className={cn('text-sm font-medium', isDarkMode ? 'text-slate-300' : 'text-gray-700')}>
          {t('groupDiscussionPanel.empty.title', 'No comments yet')}
        </p>
        <p className={cn('text-xs mt-1 max-w-[240px]', isDarkMode ? 'text-slate-500' : 'text-gray-400')}>
          <Trans
            i18nKey="groupDiscussionPanel.empty.description"
            ns="group"
            defaults="Start the discussion! Use <1>/</1> to tag a specific question."
            components={[
              <span key="text" />,
              <kbd key="kbd" className={cn(
                'px-1 py-0.5 rounded text-[10px] font-mono',
                isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600',
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
    <div className={cn('h-full flex flex-col overflow-hidden rounded-xl', isDarkMode ? 'bg-slate-900' : 'bg-white')}>
      <div className={cn(
        'px-4 py-3 border-b flex items-center gap-2 shrink-0',
        isDarkMode ? 'border-slate-700/60' : 'border-blue-100',
      )}>
        <MessageSquare className={cn('w-4 h-4', isDarkMode ? 'text-blue-400' : 'text-blue-500')} />
        <p className={cn('text-sm font-semibold', isDarkMode ? 'text-slate-200' : 'text-gray-800')}>
          {t('groupDiscussionPanel.header.title', 'General discussion')}
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className={cn(
          'max-w-sm rounded-xl border px-4 py-5 flex items-center gap-3',
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
              {t('groupDiscussionPanel.locked.title', 'Complete the quiz to join the discussion')}
            </p>
            <p className={cn('text-[11px] mt-0.5', isDarkMode ? 'text-slate-500' : 'text-gray-400')}>
              {t('groupDiscussionPanel.locked.description', 'Finish the attempt first to exchange with other group members.')}
            </p>
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
        'w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors',
        isActive
          ? isDarkMode ? 'bg-blue-800/50 text-blue-200' : 'bg-blue-100 text-blue-800'
          : isDarkMode ? 'hover:bg-slate-700/50 text-slate-300' : 'hover:bg-blue-50 text-gray-700',
      )}
    >
      <span className={cn(
        'text-[10px] font-bold shrink-0 w-5 h-5 rounded flex items-center justify-center',
        isActive
          ? isDarkMode ? 'bg-blue-700 text-blue-200' : 'bg-blue-200 text-blue-800'
          : isDarkMode ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500',
      )}>
        {question.index}
      </span>
      <span className="text-xs leading-snug line-clamp-2 flex-1">{truncateText(question.content || '', 65)}</span>
    </button>
  );
}

const GUIDE_KEY = 'qm_general_discussion_guide_dismissed';

/** Dismissible guideline card for general discussion */
function GuidelineCard({ isDarkMode }) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(GUIDE_KEY) === '1'; } catch { return false; }
  });

  if (dismissed) return null;

  const dismiss = () => {
    try { localStorage.setItem(GUIDE_KEY, '1'); } catch (e) { /* quota */ }
    setDismissed(true);
  };

  return (
    <div className={cn(
      'mx-4 mb-2 rounded-xl border px-3 py-2.5 flex gap-2.5',
      isDarkMode
        ? 'bg-blue-950/30 border-blue-900/50 text-blue-300'
        : 'bg-blue-50 border-blue-200 text-blue-700',
    )}>
      <Info className="w-4 h-4 mt-0.5 shrink-0 opacity-80" />
      <div className="flex-1 min-w-0">
        <p className={cn('text-[11px] font-semibold mb-1', isDarkMode ? 'text-blue-200' : 'text-blue-700')}>
          {t('groupDiscussionPanel.guideline.title', 'General discussion guide')}
        </p>
        <ul className={cn('text-[11px] space-y-0.5 leading-snug', isDarkMode ? 'text-blue-300/80' : 'text-blue-600')}>
          <li><kbd className={cn('px-1 rounded font-mono text-[10px] mr-1', isDarkMode ? 'bg-blue-900 text-blue-200' : 'bg-white border border-blue-300 text-blue-700')}>Enter</kbd>{t('groupDiscussionPanel.guideline.enterHint', 'send message')}</li>
          <li><kbd className={cn('px-1 rounded font-mono text-[10px] mr-1', isDarkMode ? 'bg-blue-900 text-blue-200' : 'bg-white border border-blue-300 text-blue-700')}>Shift+Enter</kbd>{t('groupDiscussionPanel.guideline.shiftEnterHint', 'new line')}</li>
          <li>{t('groupDiscussionPanel.guideline.slashHintPrefix', 'Type')} <kbd className={cn('px-1 rounded font-mono text-[10px] mx-0.5', isDarkMode ? 'bg-blue-900 text-blue-200' : 'bg-white border border-blue-300 text-blue-700')}>/</kbd> {t('groupDiscussionPanel.guideline.slashHintSuffix', 'to tag a question — members clicking the chip will jump to that question')}</li>
          {/* Leader tip */}
          <li className="opacity-70">{t('groupDiscussionPanel.guideline.leaderHint', 'Leader can delete any comment')}</li>
        </ul>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className={cn(
          'shrink-0 p-0.5 rounded hover:bg-blue-200/40 transition-colors',
          isDarkMode ? 'text-blue-400 hover:bg-blue-900/40' : 'text-blue-400 hover:bg-blue-200',
        )}
        title={t('groupDiscussionPanel.guideline.closeTooltip', 'Close guide')}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
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

  // ── Filtered suggestions
  const filteredSuggestions = useMemo(() => {
    if (!showSuggestions) return [];
    const q = slashQuery.toLowerCase().trim();
    return allQuestions
      .filter((question) => {
        if (!q) return true;
        const text = String(question.content || '').toLowerCase();
        const idx = String(question.index);
        return text.includes(q) || idx.includes(q);
      })
      .slice(0, 8);
  }, [allQuestions, slashQuery, showSuggestions]);

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

    const marker = `[[#${question.index}]]`;
    const before = draft.slice(0, slashRange.start);
    const after = draft.slice(slashRange.end);
    const newDraft = `${before}${marker} ${after}`;

    setDraft(newDraft);
    setDraftTags((prev) => ({
      ...prev,
      [marker]: { questionId: question.questionId, index: question.index },
    }));
    setShowSuggestions(false);
    setSlashRange(null);
    setSlashQuery('');

    // Restore focus + position cursor after marker
    requestAnimationFrame(() => {
      const ta = textareaRef.current;
      if (!ta) return;
      ta.focus();
      const pos = before.length + marker.length + 1;
      ta.setSelectionRange(pos, pos);
    });
  }, [draft, slashRange]);

  // ── Post message
  const handlePost = useCallback(async () => {
    const rawBody = draft.trim();
    if (!rawBody || posting || !canAccess) return;

    const encodedBody = encodeDraftTags(rawBody, draftTags);
    const authorId = profile?.userId ?? profile?.id ?? 0;
    const authorName = profile?.fullName ?? profile?.name ?? t('groupDiscussionPanel.defaultUserName', 'User');
    const authorUserName = profile?.username ?? null;
    const authorAvatar = profile?.avatarUrl ?? profile?.avatar ?? null;
    const authorRole = isLeader ? 'LEADER' : 'MEMBER';

    setPosting(true);
    try {
      const msg = await postMessage(workspaceId, quizId, null, {
        body: encodedBody,
        authorId,
        authorName,
        authorUserName,
        authorAvatar,
        authorRole,
      });
      setMessages((prev) => [...prev, msg]);
      setDraft('');
      setDraftTags({});
    } catch {
      // upstream handles errors
    } finally {
      setPosting(false);
    }
  }, [draft, draftTags, posting, canAccess, profile, isLeader, workspaceId, quizId, t]);

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
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch {
      // ignore
    }
  }, [workspaceId, quizId]);

  const currentUserId = profile?.userId ?? profile?.id ?? 0;

  // ── Active tag chips shown in the input bar
  const activeTagCount = Object.keys(draftTags).filter((marker) => draft.includes(marker)).length;

  // ── Render ────────────────────────────────────────────────────────────────

  if (!canAccess) {
    return <LockedState isDarkMode={isDarkMode} />;
  }

  return (
    <div className={cn('h-full flex flex-col overflow-hidden rounded-xl', isDarkMode ? 'bg-slate-900' : 'bg-white')}>
      {/* Header */}
      <div className={cn(
        'px-4 py-3 border-b flex items-center justify-between shrink-0',
        isDarkMode ? 'border-slate-700/60' : 'border-blue-100',
      )}>
        <div className="flex items-center gap-2">
          <MessageSquare className={cn('w-4 h-4', isDarkMode ? 'text-blue-400' : 'text-blue-500')} />
          <p className={cn('text-sm font-semibold', isDarkMode ? 'text-slate-200' : 'text-gray-800')}>
            {t('groupDiscussionPanel.header.title', 'General discussion')}
          </p>
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-full',
            isDarkMode ? 'bg-slate-700 text-slate-400' : 'bg-blue-100 text-blue-600',
          )}>
            {messages.length}
          </span>
        </div>

        {/* Hint */}
        <div className={cn(
          'hidden sm:flex items-center gap-1.5 text-[11px]',
          isDarkMode ? 'text-slate-500' : 'text-gray-400',
        )}>
          <AtSign className="w-3 h-3" />
          <span>{t('groupDiscussionPanel.header.hintPrefix', 'Press')} <kbd className={cn(
            'px-1.5 py-0.5 rounded text-[10px] font-mono border',
            isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-gray-200 text-gray-600',
          )}>/</kbd> {t('groupDiscussionPanel.header.hintSuffix', 'to tag a question')}</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loadingMessages ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className={cn('w-5 h-5 animate-spin', isDarkMode ? 'text-blue-400' : 'text-blue-500')} />
          </div>
        ) : messages.length === 0 ? (
          <EmptyThread isDarkMode={isDarkMode} />
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <MessageItem
                key={msg.id}
                msg={msg}
                canDelete={isLeader || Number(msg.authorId) === Number(currentUserId)}
                onDelete={handleDelete}
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
        <div className={cn(
          'mx-4 mb-1 rounded-xl border shadow-lg overflow-hidden',
          isDarkMode
            ? 'bg-slate-800 border-slate-700 shadow-black/40'
            : 'bg-white border-blue-200 shadow-blue-900/10',
        )}>
          {/* Dropdown header */}
          <div className={cn(
            'px-3 py-1.5 border-b flex items-center justify-between',
            isDarkMode ? 'border-slate-700 bg-slate-900/50' : 'border-blue-100 bg-blue-50/60',
          )}>
            <span className={cn('text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5', isDarkMode ? 'text-slate-500' : 'text-gray-400')}>
              <BookOpen className="w-3 h-3" />
              {slashQuery
                ? t('groupDiscussionPanel.suggestions.questionsWithQuery', { query: slashQuery, defaultValue: 'Questions · "{{query}}"' })
                : t('groupDiscussionPanel.suggestions.questions', 'Questions')}
            </span>
            <span className={cn('text-[10px]', isDarkMode ? 'text-slate-600' : 'text-gray-400')}>
              {t('groupDiscussionPanel.suggestions.shortcuts', '↑↓ navigate · Enter confirm · Esc close')}
            </span>
          </div>

          <div className={cn('divide-y max-h-52 overflow-y-auto', isDarkMode ? 'divide-slate-700/60' : 'divide-blue-50')}>
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
              'px-3 py-1.5 text-[10px] text-center',
              isDarkMode ? 'text-slate-600 bg-slate-900/30' : 'text-gray-400 bg-gray-50/50',
            )}>
              {filteredSuggestions.length < allQuestions.length
                ? t('groupDiscussionPanel.suggestions.countFiltered', { shown: filteredSuggestions.length, total: allQuestions.length, defaultValue: '{{shown}} / {{total}} questions' })
                : t('groupDiscussionPanel.suggestions.countTotal', { total: allQuestions.length, defaultValue: '{{total}} questions' })}
            </div>
          )}
        </div>
      )}

      {/* Active tags preview strip */}
      {activeTagCount > 0 && (
        <div className={cn(
          'mx-4 mb-1 px-3 py-1.5 rounded-lg flex items-center gap-2 flex-wrap',
          isDarkMode ? 'bg-blue-900/20 border border-blue-800/40' : 'bg-blue-50 border border-blue-200',
        )}>
          <span className={cn('text-[10px] font-medium shrink-0', isDarkMode ? 'text-blue-400' : 'text-blue-600')}>
            {t('groupDiscussionPanel.tagsPreview.label', 'Inserted tags:')}
          </span>
          {Object.entries(draftTags).map(([marker, tag]) =>
            draft.includes(marker) ? (
              <span
                key={marker}
                className={cn(
                  'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium',
                  isDarkMode ? 'bg-blue-800/50 text-blue-300' : 'bg-blue-100 text-blue-700',
                )}
              >
                <Hash className="w-2.5 h-2.5" />
                #{tag.index}
              </span>
            ) : null,
          )}
        </div>
      )}

      {/* Guideline card */}
      <GuidelineCard isDarkMode={isDarkMode} />

      {/* Input area */}
      <div className={cn(
        'px-4 py-3 border-t shrink-0',
        isDarkMode ? 'border-slate-700/60' : 'border-blue-100',
      )}>
        <div className={cn(
          'flex items-end gap-2 rounded-xl border p-2 transition-colors',
          showSuggestions
            ? isDarkMode ? 'border-blue-600/60 bg-slate-800/70' : 'border-blue-400 bg-blue-50/80'
            : isDarkMode ? 'border-slate-700 bg-slate-800/70' : 'border-blue-200 bg-blue-50/40',
        )}>
          <UserAvatar
            src={getProfileAvatar(profile)}
            name={profile?.fullName ?? profile?.name ?? '?'}
            role={isLeader ? 'LEADER' : 'MEMBER'}
            userId={currentUserId}
            sizeClass="w-7 h-7"
            textClass="text-xs"
            className="mb-0.5"
          />

          <textarea
            ref={textareaRef}
            value={draft}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={t('groupDiscussionPanel.input.placeholder', 'Write a comment… Use / to tag a question · Enter to send')}
            rows={1}
            className={cn(
              'flex-1 bg-transparent resize-none text-sm leading-relaxed outline-none min-h-[36px] max-h-[100px]',
              isDarkMode ? 'text-slate-200 placeholder:text-slate-500' : 'text-gray-800 placeholder:text-gray-400',
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
              'h-8 w-8 rounded-lg shrink-0',
              draft.trim()
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : isDarkMode ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-blue-100 text-blue-300 cursor-not-allowed',
            )}
          >
            {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </Button>
        </div>

        <p className={cn('text-[10px] mt-1 text-right', isDarkMode ? 'text-slate-600' : 'text-gray-400')}>
          {t('groupDiscussionPanel.input.footerPrefix', 'Enter to send · Shift+Enter for new line ·')} {isLeader
            ? t('groupDiscussionPanel.input.leaderCanDelete', 'Leader can delete any comment')
            : t('groupDiscussionPanel.input.memberCanDelete', 'You can only delete your own comments')}
        </p>
      </div>
    </div>
  );
}
