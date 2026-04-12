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

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send, Trash2, Loader2, Info, Lock, CheckCircle2, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserProfile } from '@/context/UserProfileContext';
import {
  getThreadMessages,
  postMessage,
  deleteMessage,
} from '@/api/GroupDiscussionAPI';

// ─── Storage key for dismissed guideline ─────────────────────────────────────
const GUIDE_DISMISSED_KEY = 'qm_q_discussion_guide_dismissed';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relativeTime(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
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

// ─── Guideline card ───────────────────────────────────────────────────────────

function GuidelineCard({ isDarkMode, onDismiss }) {
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
            Hướng dẫn thảo luận câu hỏi
          </span>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className={cn(
            'p-0.5 rounded transition-colors shrink-0',
            isDarkMode ? 'text-blue-500 hover:text-blue-300 hover:bg-blue-900/40' : 'text-blue-400 hover:text-blue-600 hover:bg-blue-100',
          )}
          title="Đóng hướng dẫn"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
      <ul className={cn('space-y-1.5 text-[11px] leading-relaxed', isDarkMode ? 'text-blue-300/80' : 'text-blue-700/80')}>
        <li className="flex items-start gap-2">
          <span className={cn('mt-0.5 shrink-0 w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold', isDarkMode ? 'bg-blue-800/60' : 'bg-blue-200')}>↵</span>
          <span><strong>Enter</strong> để gửi bình luận nhanh</span>
        </li>
        <li className="flex items-start gap-2">
          <span className={cn('mt-0.5 shrink-0 w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold', isDarkMode ? 'bg-blue-800/60' : 'bg-blue-200')}>⇧</span>
          <span><strong>Shift + Enter</strong> để xuống hàng</span>
        </li>
        <li className="flex items-start gap-2">
          <span className={cn('mt-0.5 shrink-0 w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold', isDarkMode ? 'bg-blue-800/60' : 'bg-blue-200')}>💡</span>
          <span>Thảo luận về đáp án, cách giải, hoặc điểm chưa rõ của câu hỏi này</span>
        </li>
        <li className="flex items-start gap-2">
          <span className={cn('mt-0.5 shrink-0 w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold', isDarkMode ? 'bg-blue-800/60' : 'bg-blue-200')}>🗑</span>
          <span>Hover vào bình luận để xóa (chỉ bình luận của bạn)</span>
        </li>
      </ul>
    </div>
  );
}

// ─── Locked state ─────────────────────────────────────────────────────────────

function LockedState({ isDarkMode }) {
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
          Hoàn thành quiz để tham gia thảo luận
        </p>
        <p className={cn('text-[11px] mt-0.5', isDarkMode ? 'text-slate-500' : 'text-gray-400')}>
          Làm bài trước để trao đổi với các thành viên về câu hỏi này.
        </p>
      </div>
    </div>
  );
}

// ─── Message row ──────────────────────────────────────────────────────────────

function MessageRow({ msg, canDelete, onDelete, isDarkMode }) {
  const [pending, setPending] = useState(false);
  const timer = useRef(null);

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
    <div className="flex gap-2.5 group">
      {/* Avatar */}
      <div className={cn(
        'w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5 select-none',
        getAvatarBg(msg.authorRole, msg.authorId),
      )}>
        {getInitials(msg.authorName)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
          <span className={cn('text-xs font-semibold', isDarkMode ? 'text-slate-200' : 'text-gray-800')}>
            {msg.authorName}
          </span>
          {msg.authorRole === 'LEADER' && (
            <span className={cn(
              'text-[9px] font-semibold px-1.5 py-0.5 rounded-full',
              isDarkMode ? 'bg-blue-900/60 text-blue-300' : 'bg-blue-100 text-blue-700',
            )}>
              Leader
            </span>
          )}
          {msg.authorRole === 'CONTRIBUTOR' && (
            <span className={cn(
              'text-[9px] font-semibold px-1.5 py-0.5 rounded-full',
              isDarkMode ? 'bg-violet-900/60 text-violet-300' : 'bg-violet-100 text-violet-700',
            )}>
              Contributor
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
              Xóa
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
              title="Xóa bình luận"
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
}) {
  const { profile } = useUserProfile();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [showGuide, setShowGuide] = useState(
    () => !localStorage.getItem(GUIDE_DISMISSED_KEY),
  );

  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const currentUserId = profile?.userId ?? profile?.id ?? 0;

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

  // ── Dismiss guideline (persisted)
  const handleDismissGuide = () => {
    setShowGuide(false);
    localStorage.setItem(GUIDE_DISMISSED_KEY, '1');
  };

  // ── Send
  const handlePost = useCallback(async () => {
    const body = draft.trim();
    if (!body || posting || !canAccess) return;

    const authorId = profile?.userId ?? profile?.id ?? 0;
    const authorName = profile?.fullName ?? profile?.name ?? 'Người dùng';
    const authorRole = isLeader ? 'LEADER' : 'MEMBER';

    setPosting(true);
    try {
      const msg = await postMessage(workspaceId, quizId, questionId, {
        body, authorId, authorName, authorRole,
      });
      setMessages((prev) => [...prev, msg]);
      setDraft('');
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
  }, [draft, posting, canAccess, profile, isLeader, workspaceId, quizId, questionId]);

  // ── Delete
  const handleDelete = useCallback(async (messageId) => {
    try {
      await deleteMessage(workspaceId, quizId, questionId, messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch {
      //
    }
  }, [workspaceId, quizId, questionId]);

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
      inDialog ? '' : 'mt-2 rounded-xl border overflow-hidden',
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
              Thảo luận câu {questionIndex}
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
                Đã làm bài
              </span>
            </div>
          )}
        </div>
      )}

      <div className="px-3 pt-3 pb-2">
        {/* Guideline card */}
        {showGuide && (
          <GuidelineCard isDarkMode={isDarkMode} onDismiss={handleDismissGuide} />
        )}

        {/* Messages area */}
        <div className="space-y-3 mb-3 max-h-52 overflow-y-auto pr-1">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className={cn('w-4 h-4 animate-spin', isDarkMode ? 'text-blue-400' : 'text-blue-500')} />
            </div>
          ) : messages.length === 0 ? (
            <p className={cn('text-[11px] text-center py-4 italic', isDarkMode ? 'text-slate-600' : 'text-gray-400')}>
              Chưa có bình luận nào. Bắt đầu thảo luận về câu hỏi này!
            </p>
          ) : (
            messages.map((msg) => (
              <MessageRow
                key={msg.id}
                msg={msg}
                canDelete={isLeader || Number(msg.authorId) === Number(currentUserId)}
                onDelete={handleDelete}
                isDarkMode={isDarkMode}
              />
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className={cn(
          'flex items-end gap-2 rounded-xl border px-2.5 py-2 transition-colors',
          isDarkMode
            ? 'border-slate-700 bg-slate-800/70 focus-within:border-blue-700/70'
            : 'border-blue-200 bg-white focus-within:border-blue-400',
        )}>
          {/* Avatar */}
          <div className={cn(
            'w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0 mb-0.5 select-none',
            getAvatarBg(isLeader ? 'LEADER' : 'MEMBER', currentUserId),
          )}>
            {getInitials(profile?.fullName ?? profile?.name ?? '?')}
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder="Nhập bình luận… Enter gửi · Shift+Enter xuống hàng"
            rows={1}
            className={cn(
              'flex-1 bg-transparent resize-none text-xs leading-relaxed outline-none min-h-[22px] max-h-20',
              isDarkMode ? 'text-slate-200 placeholder:text-slate-600' : 'text-gray-800 placeholder:text-gray-400',
            )}
            style={{ scrollbarWidth: 'none' }}
          />

          {/* Send */}
          <button
            type="button"
            disabled={!draft.trim() || posting}
            onClick={handlePost}
            className={cn(
              'p-1 rounded-lg transition-colors shrink-0 mb-0.5',
              draft.trim()
                ? isDarkMode
                  ? 'text-blue-400 hover:bg-blue-900/30'
                  : 'text-blue-600 hover:bg-blue-100'
                : isDarkMode
                  ? 'text-slate-700 cursor-not-allowed'
                  : 'text-gray-300 cursor-not-allowed',
            )}
            title="Gửi (Enter)"
          >
            {posting
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Send className="w-3.5 h-3.5" />
            }
          </button>
        </div>

        {/* Shortcut hint */}
        <p className={cn('text-[10px] mt-1.5 text-right', isDarkMode ? 'text-slate-700' : 'text-gray-300')}>
          Enter gửi · Shift+Enter xuống hàng
        </p>
      </div>
    </div>
  );
}
