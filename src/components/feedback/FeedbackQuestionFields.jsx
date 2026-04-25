import { CheckCircle2, Square, Star, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
  getFeedbackQuestionTypeLabel,
  getFeedbackQuestionOptions,
  getFeedbackRatingBounds,
  parseFeedbackQuestionConfig,
} from '@/lib/feedback';

function FeedbackQuestionFields({
  questions = [],
  answersByQuestionId = {},
  onAnswerChange,
  isDarkMode = false,
  disabled = false,
}) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const textareaClass = cn(
    'min-h-[110px] w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-colors',
    isDarkMode
      ? 'border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:border-blue-500'
      : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500',
  );

  return (
    <div className="flex flex-col gap-4">
      {questions.map((question, index) => {
        const questionType = String(question?.questionType || '').toUpperCase();
        const answerValue = answersByQuestionId?.[question.questionId];
        const questionNumber = index + 1;
        const options = getFeedbackQuestionOptions(question);
        const { min, max } = getFeedbackRatingBounds(question);
        const configValues = parseFeedbackQuestionConfig(questionType, question?.configJson);
        const selectedValues = Array.isArray(answerValue) ? answerValue : [];

        return (
          <div
            key={question.questionId}
            className={cn(
              'rounded-[24px] border p-4',
              isDarkMode ? 'border-slate-800 bg-slate-950/70' : 'border-slate-200 bg-slate-50/80',
            )}
          >
            <div className="mb-3 flex items-start gap-3">
              <span
                className={cn(
                  'mt-0.5 inline-flex size-7 items-center justify-center rounded-full text-xs font-semibold',
                  isDarkMode ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700',
                )}
              >
                {questionNumber}
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn('text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                  {question.questionText}
                  {question.required ? <span className="ml-1 text-rose-500">*</span> : null}
                </p>
                <p className={cn('mt-1 text-xs uppercase tracking-[0.18em]', isDarkMode ? 'text-slate-500' : 'text-slate-500')}>
                  {getFeedbackQuestionTypeLabel(questionType, currentLang)}
                </p>
              </div>
            </div>

            {questionType === 'STAR_RATING' ? (
              <div className="flex flex-wrap items-center gap-2">
                {Array.from({ length: max - min + 1 }, (_, offset) => min + offset).map((ratingValue) => {
                  const isActive = Number(answerValue) >= ratingValue;
                  return (
                    <button
                      key={ratingValue}
                      type="button"
                      disabled={disabled}
                      onClick={() => onAnswerChange?.(question.questionId, ratingValue)}
                      className={cn(
                        'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-colors',
                        isActive
                          ? 'border-amber-300 bg-amber-50 text-amber-700'
                          : isDarkMode
                            ? 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                      )}
                    >
                      <Star className={cn('h-4 w-4', isActive ? 'fill-current' : '')} />
                      <span>{ratingValue}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}

            {questionType === 'YES_NO' ? (
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onAnswerChange?.(question.questionId, true)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors',
                    answerValue === true
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                      : isDarkMode
                        ? 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                  )}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{currentLang === 'en' ? 'Yes' : 'Có'}</span>
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onAnswerChange?.(question.questionId, false)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors',
                    answerValue === false
                      ? 'border-rose-300 bg-rose-50 text-rose-700'
                      : isDarkMode
                        ? 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                  )}
                >
                  <XCircle className="h-4 w-4" />
                  <span>{currentLang === 'en' ? 'No' : 'Không'}</span>
                </button>
              </div>
            ) : null}

            {questionType === 'SINGLE_CHOICE' ? (
              <div className="flex flex-col gap-3">
                {options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    disabled={disabled}
                    onClick={() => onAnswerChange?.(question.questionId, option.value)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition-colors',
                      answerValue === option.value
                        ? 'border-blue-300 bg-blue-50 text-blue-700'
                        : isDarkMode
                          ? 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                    )}
                  >
                    {answerValue === option.value ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                    ) : (
                      <Square className="h-4 w-4 shrink-0" />
                    )}
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}

            {questionType === 'MULTIPLE_CHOICE' ? (
              <div className="flex flex-col gap-3">
                {options.map((option) => {
                  const checked = selectedValues.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        const nextValues = checked
                          ? selectedValues.filter((value) => value !== option.value)
                          : [...selectedValues, option.value];
                        onAnswerChange?.(question.questionId, nextValues);
                      }}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition-colors',
                        checked
                          ? 'border-blue-300 bg-blue-50 text-blue-700'
                          : isDarkMode
                            ? 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        className="pointer-events-none"
                      />
                      <span>{option.label}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}

            {questionType === 'TEXT' ? (
              <textarea
                value={typeof answerValue === 'string' ? answerValue : ''}
                onChange={(event) => onAnswerChange?.(question.questionId, event.target.value)}
                disabled={disabled}
                placeholder={configValues.placeholder || t('feedbackDialog.placeholders.share', 'Share your thoughts...')}
                className={textareaClass}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export default FeedbackQuestionFields;
