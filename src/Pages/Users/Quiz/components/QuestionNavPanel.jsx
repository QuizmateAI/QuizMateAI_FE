import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/Components/ui/button';
import { Loader2 } from 'lucide-react';
import HourglassLoader from './HourglassLoader';
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
  const itemsPerPage = 20;
  const totalPages = Math.max(1, Math.ceil(questions.length / itemsPerPage));
  const safeNavPage = Math.min(Math.max(1, currentPage), totalPages);
  const navStartIndex = (safeNavPage - 1) * itemsPerPage;
  const navQuestions = questions.slice(navStartIndex, navStartIndex + itemsPerPage);
  const submitHandler = onRequestSubmit || onSubmit;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-md shadow-slate-900/10 dark:shadow-blue-900/50 border border-slate-200 dark:border-slate-700 sticky top-4">
      {/* Timer */}
      <div className="flex flex-col items-center mb-4">
        <HourglassLoader size="3.5em" />
        <div className={cn(
          'text-2xl font-bold font-mono mt-2',
          timeLeft <= 60 ? 'text-red-500 dark:text-red-400 animate-pulse' : 'text-slate-800 dark:text-slate-100',
        )}>
          {formatTime(timeLeft)}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {answeredCount}/{questions.length} answered
        </p>
      </div>

      {/* Question grid */}
      <div className="grid grid-cols-5 gap-2 mb-4">
        {navQuestions.map((q, idx) => {
          const globalIdx = navStartIndex + idx;
          const isAnswered = hasAnswerValue(answers[q.id]);
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => onJumpToQuestion(globalIdx)}
              className={cn(
                'w-full aspect-square rounded-lg text-sm font-semibold transition-all flex items-center justify-center',
                isAnswered
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600',
              )}
            >
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

      {/* Actions */}
      <div className="space-y-2">
        <Button onClick={onSave} variant="outline" className="w-full min-w-[100px]" disabled={isSaveLoading}>
          {isSaveLoading
            ? <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />{t?.('workspace.quiz.examActions.saving', 'Saving...') || 'Saving...'}</span>
            : (t?.('workspace.quiz.examActions.saveProgressButton', 'Save Progress') || 'Save Progress')}
        </Button>
        {saveMessage && (
          <p className={`text-xs ${saveStatus === 'error' ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {saveMessage}
          </p>
        )}
        <Button onClick={submitHandler} className="w-full min-w-[100px] bg-blue-600 hover:bg-blue-700 text-white" disabled={isSubmitLoading}>
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
