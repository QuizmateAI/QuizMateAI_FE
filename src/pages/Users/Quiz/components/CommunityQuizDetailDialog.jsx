import React from 'react';
import { ChevronDown, ChevronUp, Download, Loader2, MessageSquare, Reply, SendHorizontal, Sparkles, Star } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getCommunityQuizDetail, submitCommunityQuizComment } from '@/api/QuizAPI';
import { useToast } from '@/context/ToastContext';
import CommunityQuizSignals from '@/pages/Users/Quiz/components/CommunityQuizSignals';

function extractApiData(response) {
  return response?.data?.data ?? response?.data ?? response ?? null;
}

function normalizeDurationMinutes(rawDuration) {
  const duration = Number(rawDuration);
  if (!Number.isFinite(duration) || duration <= 0) return null;
  if (duration >= 600) {
    return Math.max(1, Math.round(duration / 60));
  }
  return duration;
}

function formatDateLabel(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

function resolveAuthorInitial(name) {
  return String(name || '?').trim().charAt(0).toUpperCase() || '?';
}

function formatDifficulty(value, t) {
  if (!value) return null;
  return t(`workspace.quiz.difficultyLevels.${String(value).toLowerCase()}`, value);
}

function flattenPreviewQuestions(sections = [], trail = []) {
  return (sections || []).flatMap((section) => {
    const nextTrail = section?.content ? [...trail, section.content] : trail;
    const ownQuestions = Array.isArray(section?.questions)
      ? section.questions.map((question, index) => ({
        ...question,
        sectionTrail: nextTrail,
        questionOrderKey: `${section?.sectionId || 'section'}-${question?.questionId || index}`,
      }))
      : [];
    const childQuestions = flattenPreviewQuestions(section?.children || [], nextTrail);
    return [...ownQuestions, ...childQuestions];
  });
}

function AuthorAvatar({ name, avatar, isDarkMode }) {
  if (avatar) {
    return <img src={avatar} alt="" className="h-10 w-10 rounded-full object-cover" />;
  }
  return (
    <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
      isDarkMode ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'
    }`}>
      {resolveAuthorInitial(name)}
    </div>
  );
}

function ReviewCard({ review, isDarkMode, t }) {
  return (
    <article className={`rounded-2xl border p-4 ${
      isDarkMode ? 'border-slate-800 bg-slate-900/70' : 'border-slate-200 bg-white'
    }`}>
      <div className="flex items-start gap-3">
        <AuthorAvatar name={review?.reviewerName} avatar={review?.reviewerAvatar} isDarkMode={isDarkMode} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className={`text-sm font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
              {review?.reviewerName || t('workspace.quiz.communityDetail.unknownUser', 'Learner')}
            </p>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              isDarkMode ? 'bg-amber-950/40 text-amber-300' : 'bg-amber-100 text-amber-700'
            }`}>
              <Star className="h-3.5 w-3.5 fill-current" />
              {review?.rating ?? '-'}
            </span>
            {review?.createdAt ? (
              <span className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                {formatDateLabel(review.createdAt)}
              </span>
            ) : null}
          </div>
          <p className={`mt-2 text-sm leading-6 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            {review?.comment || t('workspace.quiz.communityDetail.reviewNoComment', 'User left a rating without a comment.')}
          </p>
        </div>
      </div>
    </article>
  );
}

function CommentThread({
  comment,
  depth = 0,
  activeReplyToId,
  onOpenReply,
  onCloseReply,
  onChangeReplyDraft,
  onSubmitReply,
  replyDrafts,
  submittingCommentId,
  readOnly = false,
  isDarkMode,
  t,
}) {
  const isReplyOpen = Number(activeReplyToId) === Number(comment?.commentId);
  const replyDraft = replyDrafts[String(comment?.commentId)] || '';
  const replyList = Array.isArray(comment?.replies) ? comment.replies : [];
  return (
    <div className={`${depth > 0 ? 'ml-5 border-l border-slate-200 pl-4 dark:border-slate-800' : ''}`}>
      <article className={`rounded-2xl border p-4 ${
        isDarkMode ? 'border-slate-800 bg-slate-900/70' : 'border-slate-200 bg-white'
      }`}>
        <div className="flex items-start gap-3">
          <AuthorAvatar name={comment?.authorName} avatar={comment?.authorAvatar} isDarkMode={isDarkMode} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className={`text-sm font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                {comment?.authorName || t('workspace.quiz.communityDetail.unknownUser', 'Learner')}
              </p>
              {comment?.createdAt ? (
                <span className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                  {formatDateLabel(comment.createdAt)}
                </span>
              ) : null}
            </div>
            <p className={`mt-2 whitespace-pre-wrap text-sm leading-6 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              {comment?.body}
            </p>
            {!readOnly ? (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => (isReplyOpen ? onCloseReply() : onOpenReply(comment?.commentId))}
                  className={`inline-flex items-center gap-1 text-xs font-semibold ${
                    isDarkMode ? 'text-blue-300' : 'text-blue-700'
                  }`}
                >
                  <Reply className="h-3.5 w-3.5" />
                  <span>{t('workspace.quiz.communityDetail.replyAction', 'Reply')}</span>
                </button>
              </div>
            ) : null}

            {!readOnly && isReplyOpen ? (
              <div className="mt-3 space-y-2">
                <textarea
                  value={replyDraft}
                  onChange={(event) => onChangeReplyDraft(comment?.commentId, event.target.value)}
                  rows={3}
                  placeholder={t('workspace.quiz.communityDetail.replyPlaceholder', 'Write a reply')}
                  className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-colors ${
                    isDarkMode
                      ? 'border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:border-blue-500'
                      : 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-blue-500'
                  }`}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={onCloseReply}>
                    {t('workspace.quiz.communityDetail.cancelReply', 'Cancel')}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => onSubmitReply(comment?.commentId)}
                    disabled={!replyDraft.trim() || Number(submittingCommentId) === Number(comment?.commentId)}
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    {Number(submittingCommentId) === Number(comment?.commentId) ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
                    <span>{t('workspace.quiz.communityDetail.sendReply', 'Send')}</span>
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </article>

      {replyList.length > 0 ? (
        <div className="mt-3 space-y-3">
          {replyList.map((reply) => (
            <CommentThread
              key={reply.commentId}
              comment={reply}
              depth={depth + 1}
              activeReplyToId={activeReplyToId}
              onOpenReply={onOpenReply}
              onCloseReply={onCloseReply}
              onChangeReplyDraft={onChangeReplyDraft}
              onSubmitReply={onSubmitReply}
              replyDrafts={replyDrafts}
              submittingCommentId={submittingCommentId}
              readOnly={readOnly}
              isDarkMode={isDarkMode}
              t={t}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function CommunityQuizDetailDialog({
  open,
  onOpenChange,
  quizId,
  isDarkMode = false,
  fontClass = '',
  title,
  description,
  onClone,
  cloneLoading = false,
  showCloneAction = false,
  cloneActionLabel,
  readOnly = false,
}) {
  const { showError, showSuccess } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [detail, setDetail] = React.useState(null);
  const [error, setError] = React.useState('');
  const [showAllQuestions, setShowAllQuestions] = React.useState(false);
  const [commentDraft, setCommentDraft] = React.useState('');
  const [replyDrafts, setReplyDrafts] = React.useState({});
  const [activeReplyToId, setActiveReplyToId] = React.useState(null);
  const [submittingCommentId, setSubmittingCommentId] = React.useState(null);

  const loadDetail = React.useCallback(async () => {
    const normalizedQuizId = Number(quizId);
    if (!Number.isInteger(normalizedQuizId) || normalizedQuizId <= 0) {
      setDetail(null);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await getCommunityQuizDetail(normalizedQuizId);
      setDetail(extractApiData(response));
    } catch (loadError) {
      setError(loadError?.message || 'Unable to load community quiz.');
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  React.useEffect(() => {
    if (!open) return;
    void loadDetail();
  }, [loadDetail, open]);

  React.useEffect(() => {
    if (!open) {
      setCommentDraft('');
      setReplyDrafts({});
      setActiveReplyToId(null);
      setShowAllQuestions(false);
    }
  }, [open]);

  const previewQuestions = React.useMemo(
    () => flattenPreviewQuestions(detail?.preview?.sections || []),
    [detail?.preview?.sections],
  );
  const visibleQuestions = showAllQuestions ? previewQuestions : previewQuestions.slice(0, 10);
  const summary = detail?.quiz || null;
  const reviews = Array.isArray(detail?.reviews) ? detail.reviews : [];
  const comments = Array.isArray(detail?.comments) ? detail.comments : [];
  const duration = normalizeDurationMinutes(summary?.duration);

  const handleSubmitComment = React.useCallback(async (parentCommentId = null) => {
    const draftValue = parentCommentId == null
      ? commentDraft
      : replyDrafts[String(parentCommentId)] || '';
    if (!draftValue.trim()) return;
    setSubmittingCommentId(parentCommentId ?? 0);
    try {
      await submitCommunityQuizComment(quizId, {
        parentCommentId,
        body: draftValue.trim(),
      });
      showSuccess('Đã gửi comment community.');
      if (parentCommentId == null) {
        setCommentDraft('');
      } else {
        setReplyDrafts((prev) => ({ ...prev, [String(parentCommentId)]: '' }));
        setActiveReplyToId(null);
      }
      await loadDetail();
    } catch (submitError) {
      showError(submitError?.message || 'Không thể gửi comment community.');
    } finally {
      setSubmittingCommentId(null);
    }
  }, [commentDraft, loadDetail, quizId, replyDrafts, showError, showSuccess]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`h-[90vh] max-w-6xl overflow-hidden rounded-[28px] border-0 p-0 shadow-2xl ${
        isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-[#f8fbff] text-slate-900'
      }`}>
        <div className={`border-b px-6 py-5 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-500" />
                <p className={`text-lg font-semibold ${fontClass}`}>
                  {title || summary?.title || 'Community quiz'}
                </p>
              </div>
              <p className={`mt-2 text-sm leading-6 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} ${fontClass}`}>
                {description || summary?.creatorName || ''}
              </p>
              {summary ? (
                <div className={`mt-3 flex flex-wrap items-center gap-3 text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  {duration ? <span>{duration} {duration > 1 ? 'min' : 'min'}</span> : null}
                  {summary?.totalQuestion ? <span>{summary.totalQuestion} câu hỏi</span> : null}
                  {summary?.overallDifficulty ? <span>{String(summary.overallDifficulty)}</span> : null}
                </div>
              ) : null}
              <CommunityQuizSignals
                cloneCount={summary?.cloneCount}
                averageRating={summary?.averageRating}
                ratingCount={summary?.ratingCount}
                commentCount={summary?.discussionCommentCount}
                isDarkMode={isDarkMode}
                t={(key, fallback, params) => {
                  if (typeof fallback === 'string') return fallback.replace(/\{\{(\w+)\}\}/g, (_, token) => params?.[token] ?? '');
                  return fallback;
                }}
                className="mt-4"
              />
            </div>

            {showCloneAction && typeof onClone === 'function' ? (
              <Button
                type="button"
                onClick={onClone}
                disabled={cloneLoading}
                className="rounded-full bg-blue-600 px-5 text-white hover:bg-blue-700"
              >
                {cloneLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                <span>{cloneActionLabel || 'Clone to workspace'}</span>
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-0 xl:grid-cols-[minmax(0,1.1fr)_minmax(350px,0.9fr)]">
          <div className={`min-h-0 overflow-y-auto px-6 py-5 ${isDarkMode ? 'border-slate-800' : 'border-slate-200 xl:border-r'}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className={`text-sm font-semibold ${fontClass}`}>Question Preview</p>
                <p className={`mt-1 text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                  Xem nhanh cấu trúc câu hỏi trước khi clone.
                </p>
              </div>
              {previewQuestions.length > 10 ? (
                <button
                  type="button"
                  onClick={() => setShowAllQuestions((current) => !current)}
                  className={`inline-flex items-center gap-1 text-xs font-semibold ${
                    isDarkMode ? 'text-blue-300' : 'text-blue-700'
                  }`}
                >
                  {showAllQuestions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  <span>{showAllQuestions ? 'Thu gọn' : 'Xem thêm'}</span>
                </button>
              ) : null}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
              </div>
            ) : error ? (
              <div className={`mt-4 rounded-2xl border px-4 py-4 text-sm ${
                isDarkMode ? 'border-rose-900/60 bg-rose-950/30 text-rose-200' : 'border-rose-200 bg-rose-50 text-rose-700'
              }`}>
                {error}
              </div>
            ) : visibleQuestions.length === 0 ? (
              <div className={`mt-4 rounded-2xl border px-4 py-5 text-sm ${
                isDarkMode ? 'border-slate-800 bg-slate-900/70 text-slate-400' : 'border-slate-200 bg-white text-slate-600'
              }`}>
                Chưa có question preview cho quiz này.
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {visibleQuestions.map((question, index) => (
                  <article
                    key={question.questionOrderKey}
                    className={`rounded-3xl border p-4 ${
                      isDarkMode ? 'border-slate-800 bg-slate-900/70' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        isDarkMode ? 'bg-blue-950/40 text-blue-300' : 'bg-blue-100 text-blue-700'
                      }`}>
                        Q{index + 1}
                      </span>
                      {question?.sectionTrail?.length > 0 ? (
                        <span className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                          {question.sectionTrail.join(' / ')}
                        </span>
                      ) : null}
                    </div>
                    <p className={`mt-3 text-sm font-medium leading-6 ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                      {question?.content}
                    </p>
                    {Array.isArray(question?.answers) && question.answers.length > 0 ? (
                      <div className="mt-4 space-y-2">
                        {question.answers.map((answer, answerIndex) => (
                          <div
                            key={answer?.answerId ?? `${question.questionOrderKey}-answer-${answerIndex}`}
                            className={`rounded-2xl border px-3 py-2 text-sm ${
                              isDarkMode ? 'border-slate-800 bg-slate-950 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700'
                            }`}
                          >
                            {answer?.content}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="min-h-0 overflow-y-auto px-6 py-5">
            <section>
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" />
                <p className={`text-sm font-semibold ${fontClass}`}>Learner Reviews</p>
              </div>
              <div className="mt-4 space-y-3">
                {reviews.length === 0 ? (
                  <div className={`rounded-2xl border px-4 py-5 text-sm ${
                    isDarkMode ? 'border-slate-800 bg-slate-900/70 text-slate-400' : 'border-slate-200 bg-white text-slate-600'
                  }`}>
                    Chưa có feedback nào cho quiz này.
                  </div>
                ) : reviews.slice(0, 6).map((review) => (
                  <ReviewCard key={review.reviewId} review={review} isDarkMode={isDarkMode} t={(key, fallback) => fallback} />
                ))}
              </div>
            </section>

            <section className="mt-8">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-500" />
                <p className={`text-sm font-semibold ${fontClass}`}>Public Discussion</p>
              </div>

              {!readOnly ? (
                <div className="mt-4 space-y-3">
                  <textarea
                    value={commentDraft}
                    onChange={(event) => setCommentDraft(event.target.value)}
                    rows={4}
                    placeholder="Comment công khai để mọi người cùng thấy."
                    className={`w-full rounded-3xl border px-4 py-3 text-sm outline-none transition-colors ${
                      isDarkMode
                        ? 'border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:border-blue-500'
                        : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500'
                    }`}
                  />
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      onClick={() => handleSubmitComment(null)}
                      disabled={!commentDraft.trim() || submittingCommentId === 0}
                      className="bg-blue-600 text-white hover:bg-blue-700"
                    >
                      {submittingCommentId === 0 ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
                      <span>Gửi comment</span>
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="mt-5 space-y-3">
                {comments.length === 0 ? (
                  <div className={`rounded-2xl border px-4 py-5 text-sm ${
                    isDarkMode ? 'border-slate-800 bg-slate-900/70 text-slate-400' : 'border-slate-200 bg-white text-slate-600'
                  }`}>
                    Chưa có discussion nào. Hãy mở luồng đầu tiên.
                  </div>
                ) : comments.map((comment) => (
                  <CommentThread
                    key={comment.commentId}
                    comment={comment}
                    activeReplyToId={activeReplyToId}
                    onOpenReply={setActiveReplyToId}
                    onCloseReply={() => setActiveReplyToId(null)}
                    onChangeReplyDraft={(commentId, value) => {
                      setReplyDrafts((prev) => ({ ...prev, [String(commentId)]: value }));
                    }}
                    onSubmitReply={(commentId) => handleSubmitComment(commentId)}
                    replyDrafts={replyDrafts}
                    submittingCommentId={submittingCommentId}
                    readOnly={readOnly}
                    isDarkMode={isDarkMode}
                    t={(key, fallback) => fallback}
                  />
                ))}
              </div>
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
