import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/Components/ui/button';
import { Clock3, Loader2, Star } from 'lucide-react';
import { hasAnswerValue } from '../utils/quizTransform';

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function QuestionNavPanel({
  questions,
  answers,
  timeLeft,
  onJumpToQuestion,
  onSave,
  onSubmit,
  onRequestSubmit,
  currentPage = 1,
  onPageChange,
  flaggedQuestionIds = [],
  isSaveLoading = false,
  saveStatus = 'idle',
  saveMessage = '',
  isSubmitLoading = false,
  submitError = '',
  t,
}) {
  const answeredCount = useMemo(
    () => questions.filter(q => hasAnswerValue(answers[q.id])).length,
    [questions, answers],
  );
  const flaggedQuestionSet = useMemo(
    () => new Set(Array.isArray(flaggedQuestionIds) ? flaggedQuestionIds : []),
    [flaggedQuestionIds],
  );
  const flaggedCount = flaggedQuestionSet.size;
  const itemsPerPage = 20;
  const totalPages = Math.max(1, Math.ceil(questions.length / itemsPerPage));
  const safeNavPage = Math.min(Math.max(1, currentPage), totalPages);
  const navStartIndex = (safeNavPage - 1) * itemsPerPage;
  const navQuestions = questions.slice(navStartIndex, navStartIndex + itemsPerPage);
  const submitHandler = onRequestSubmit || onSubmit;

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.10)] dark:border-slate-700 dark:bg-slate-800/95 dark:shadow-blue-950/20 lg:sticky lg:top-4">
      <div className="mb-4 overflow-hidden rounded-[24px] border border-slate-200/80 bg-slate-50/90 p-4 dark:border-slate-700 dark:bg-slate-900/70">
        <div className="mb-3 flex items-center justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
            <Clock3 className="h-7 w-7" />
          </div>
        </div>
        <div className={cn(
          'text-center text-3xl font-bold font-mono tracking-tight',
          timeLeft <= 60 ? 'text-red-500 dark:text-red-400' : 'text-slate-800 dark:text-slate-100',
        )}>
          {formatTime(timeLeft)}
        </div>
        <p className="mt-1 text-center text-sm text-slate-500 dark:text-slate-400">
          {answeredCount}/{questions.length} answered
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
              {t?.('workspace.quiz.result.answered', 'Answered') || 'Answered'}
            </p>
            <p className="mt-1 text-lg font-bold text-slate-800 dark:text-slate-100">{answeredCount}</p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-800/60 dark:bg-amber-950/20">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-500 dark:text-amber-300">
              {t?.('workspace.quiz.examActions.markedCount', 'Marked') || 'Marked'}
            </p>
            <p className="mt-1 text-lg font-bold text-amber-700 dark:text-amber-200">{flaggedCount}</p>
          </div>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
          {t?.('workspace.quiz.result.questionList', 'Question list') || 'Question list'}
        </p>
        {questions.length > itemsPerPage && (
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            {(t?.('workspace.quiz.pagination.page', 'Page') || 'Page')} {safeNavPage}/{totalPages}
          </span>
        )}
      </div>

      <div className="mb-4 grid grid-cols-5 gap-2.5">
        {navQuestions.map((q, idx) => {
          const globalIdx = navStartIndex + idx;
          const isAnswered = hasAnswerValue(answers[q.id]);
          const isFlagged = flaggedQuestionSet.has(q.id);
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => onJumpToQuestion(globalIdx)}
              className={cn(
                'relative flex aspect-square w-full items-center justify-center rounded-[18px] border text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm',
                isFlagged
                  ? 'border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-200 dark:border-amber-700 dark:bg-amber-900/35 dark:text-amber-200 dark:hover:bg-amber-900/50'
                  : isAnswered
                  ? 'border-blue-500 bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600',
              )}
            >
              {isFlagged && (
                <Star className="absolute right-1.5 top-1.5 h-3.5 w-3.5 fill-current text-amber-500 dark:text-amber-300" />
              )}
              {globalIdx + 1}
            </button>
          );
        })}
      </div>

      {questions.length > itemsPerPage && (
        <div className="flex items-center justify-between gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            disabled={safeNavPage === 1}
            onClick={() => onPageChange?.(Math.max(1, safeNavPage - 1))}
          >
            {t?.('workspace.quiz.pagination.prev', 'Previous page') || 'Previous page'}
          </Button>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {(t?.('workspace.quiz.pagination.page', 'Page') || 'Page')} {safeNavPage}/{totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={safeNavPage === totalPages}
            onClick={() => onPageChange?.(Math.min(totalPages, safeNavPage + 1))}
          >
            {t?.('workspace.quiz.pagination.next', 'Next page') || 'Next page'}
          </Button>
        </div>
      )}

      <div className="space-y-2">
        <Button onClick={onSave} variant="outline" className="h-11 w-full min-w-[100px] rounded-2xl" disabled={isSaveLoading}>
          {isSaveLoading
            ? <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />{t?.('workspace.quiz.examActions.saving', 'Saving...') || 'Saving...'}</span>
            : (t?.('workspace.quiz.examActions.saveProgressButton', 'Save Progress') || 'Save Progress')}
        </Button>
        {saveMessage && (
          <p className={`text-xs ${saveStatus === 'error' ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {saveMessage}
          </p>
        )}
        <Button onClick={submitHandler} className="h-12 w-full min-w-[100px] rounded-2xl bg-blue-600 text-white hover:bg-blue-700" disabled={isSubmitLoading}>
          {isSubmitLoading
            ? <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />{t?.('workspace.quiz.examActions.submitting', 'Submitting...') || 'Submitting...'}</span>
            : (t?.('workspace.quiz.examActions.submitButton', 'Submit Exam') || 'Submit Exam')}
        </Button>
        {submitError && (
          <p className="text-xs text-red-600 dark:text-red-400">{submitError}</p>
        )}
      </div>
    </div>
  );
}
