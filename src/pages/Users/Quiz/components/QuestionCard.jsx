import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { getCorrectMatchingPairs, getCorrectTextAnswers, normalizeMatchingPairs } from '../utils/quizTransform';
import MatchingDragDrop from './MatchingDragDrop';
import MixedMathText from '@/components/math/MixedMathText';
import { getQuestionDisplayText, getQuestionImageList } from '@/lib/questionContentMedia';
import './QuestionCard.css';

function CheckboxIndicator({ id }) {
  const maskId = `cbx-${id}`;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 200 200" className="quiz-checkbox-svg">
      <mask fill="white" id={maskId}><rect height="200" width="200" /></mask>
      <rect mask={`url(#${maskId})`} strokeWidth="40" className="quiz-checkbox-box" height="200" width="200" />
      <path strokeWidth="15" d="M52 111.018L76.9867 136L149 64" className="quiz-checkbox-tick" />
    </svg>
  );
}

function RadioIndicator() {
  return (
    <div className="quiz-radio-indicator">
      <div className="quiz-radio-dot" />
    </div>
  );
}

function normalizeTextValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function isSamePrimitiveArray(left, right) {
  const leftValues = Array.isArray(left) ? left : [];
  const rightValues = Array.isArray(right) ? right : [];
  if (leftValues.length !== rightValues.length) return false;
  return leftValues.every((value, index) => value === rightValues[index]);
}

function isSameMatchingPairs(left, right) {
  const leftPairs = normalizeMatchingPairs(left);
  const rightPairs = normalizeMatchingPairs(right);
  if (leftPairs.length !== rightPairs.length) return false;

  return leftPairs.every((pair, index) => (
    pair.leftKey === rightPairs[index]?.leftKey
    && pair.rightKey === rightPairs[index]?.rightKey
  ));
}

function isSameAnswerValue(left, right) {
  if (Array.isArray(left) || Array.isArray(right)) {
    const leftValues = Array.isArray(left) ? left : [];
    const rightValues = Array.isArray(right) ? right : [];
    const containsObjectValue = [...leftValues, ...rightValues].some((value) => value && typeof value === 'object');

    return containsObjectValue
      ? isSameMatchingPairs(leftValues, rightValues)
      : isSamePrimitiveArray(leftValues, rightValues);
  }

  if (
    (left && typeof left === 'object')
    || (right && typeof right === 'object')
  ) {
    const leftObject = left && typeof left === 'object' && !Array.isArray(left) ? left : {};
    const rightObject = right && typeof right === 'object' && !Array.isArray(right) ? right : {};

    return (
      isSameAnswerValue(leftObject.selectedAnswerIds, rightObject.selectedAnswerIds)
      && String(leftObject.textAnswer ?? '') === String(rightObject.textAnswer ?? '')
      && isSameMatchingPairs(leftObject.matchingPairs, rightObject.matchingPairs)
    );
  }

  return String(left ?? '') === String(right ?? '');
}

function isSameStringArray(left, right) {
  return isSamePrimitiveArray(left, right);
}

function isSameReviewState(left, right) {
  if (left === right) return true;
  if (!left && !right) return true;
  if (!left || !right) return false;

  return (
    left.revealed === right.revealed
    && left.locked === right.locked
    && left.isCorrect === right.isCorrect
    && left.gradingStatus === right.gradingStatus
    && left.explanation === right.explanation
    && isSameAnswerValue(left.answerValue, right.answerValue)
    && isSameStringArray(left.correctTextAnswers, right.correctTextAnswers)
    && isSameAnswerValue(left.correctAnswerIds, right.correctAnswerIds)
    && isSameMatchingPairs(left.correctMatchingPairs, right.correctMatchingPairs)
  );
}

function areQuestionCardPropsEqual(prevProps, nextProps) {
  return (
    prevProps.question === nextProps.question
    && prevProps.questionNumber === nextProps.questionNumber
    && prevProps.showHeaderMeta === nextProps.showHeaderMeta
    && prevProps.isFlagged === nextProps.isFlagged
    && prevProps.onToggleFlag === nextProps.onToggleFlag
    && prevProps.showResult === nextProps.showResult
    && prevProps.showExplanation === nextProps.showExplanation
    && prevProps.disabled === nextProps.disabled
    && isSameReviewState(prevProps.reviewState, nextProps.reviewState)
    && isSameAnswerValue(prevProps.answerValue, nextProps.answerValue)
    && isSameAnswerValue(prevProps.selectedAnswers, nextProps.selectedAnswers)
  );
}

const QuestionCard = memo(function QuestionCard({
  question, questionNumber, totalQuestions,
  answerValue, selectedAnswers = [], onSelectAnswer, onTextAnswerChange, onMatchingAnswerChange,
  showResult = false, showExplanation = false, disabled = false, reviewState = null, showHeaderMeta = true,
  isFlagged = false, onToggleFlag = null,
}) {
  const { t } = useTranslation();
  const isMultiple = question.type === 'MULTIPLE_CHOICE';
  const isTextQuestion = question.type === 'SHORT_ANSWER' || question.type === 'FILL_IN_BLANK';
  const isMatchingQuestion = question.type === 'MATCHING';
  const isReviewRevealed = showResult || reviewState?.revealed === true;
  const isExplanationRevealed = showExplanation || reviewState?.revealed === true;
  const isLocked = disabled || reviewState?.locked === true || isReviewRevealed;
  const normalizedSelectedAnswers = Array.isArray(answerValue)
    ? answerValue
    : Array.isArray(answerValue?.selectedAnswerIds)
      ? answerValue.selectedAnswerIds
      : Array.isArray(selectedAnswers)
        ? selectedAnswers
        : [];
  const textAnswer = typeof answerValue === 'string'
    ? answerValue
    : typeof answerValue?.textAnswer === 'string'
      ? answerValue.textAnswer
      : '';
  const normalizedMatchingPairs = useMemo(
    () => normalizeMatchingPairs(answerValue?.matchingPairs),
    [answerValue],
  );
  const correctTextAnswers = Array.isArray(reviewState?.correctTextAnswers) && reviewState.correctTextAnswers.length > 0
    ? reviewState.correctTextAnswers
    : getCorrectTextAnswers(question);
  const correctMatchingPairs = useMemo(() => {
    const reviewPairs = normalizeMatchingPairs(reviewState?.correctMatchingPairs);
    if (reviewPairs.length > 0) {
      return reviewPairs;
    }
    return getCorrectMatchingPairs(question);
  }, [question, reviewState?.correctMatchingPairs]);
  const matchingPairByLeft = useMemo(
    () => new Map(normalizedMatchingPairs.map((pair) => [pair.leftKey, pair.rightKey])),
    [normalizedMatchingPairs],
  );
  const correctMatchingPairByLeft = useMemo(
    () => new Map(correctMatchingPairs.map((pair) => [pair.leftKey, pair.rightKey])),
    [correctMatchingPairs],
  );
  const matchingLeftItems = useMemo(() => {
    const leftItems = correctMatchingPairs.length > 0
      ? correctMatchingPairs.map((pair) => pair.leftKey)
      : normalizedMatchingPairs.map((pair) => pair.leftKey);
    return Array.from(new Set(leftItems.filter(Boolean)));
  }, [correctMatchingPairs, normalizedMatchingPairs]);
  const matchingRightOptions = useMemo(() => {
    const combined = [
      ...(Array.isArray(question.matchingRightOptions) ? question.matchingRightOptions : []),
      ...correctMatchingPairs.map((pair) => pair.rightKey),
      ...normalizedMatchingPairs.map((pair) => pair.rightKey),
    ];
    return Array.from(new Set(combined.filter(Boolean)));
  }, [correctMatchingPairs, normalizedMatchingPairs, question.matchingRightOptions]);
  const gradingStatus = String(reviewState?.gradingStatus || question?.gradingStatus || '').toUpperCase();
  const questionImages = useMemo(() => getQuestionImageList(question), [question]);
  const questionContent = question?.content;
  const questionDisplayText = useMemo(() => getQuestionDisplayText(questionContent), [questionContent]);
  const isPendingGrading = gradingStatus === 'PENDING';
  const showFlagToggle = !isReviewRevealed && typeof onToggleFlag === 'function';
  const correctAnswerIds = Array.isArray(reviewState?.correctAnswerIds) && reviewState.correctAnswerIds.length > 0
    ? reviewState.correctAnswerIds
    : (Array.isArray(question.answers) ? question.answers.filter((answer) => answer.isCorrect).map((answer) => answer.id) : []);

  const isFullyCorrect = useMemo(() => {
    if (isPendingGrading) {
      return false;
    }

    if (typeof reviewState?.isCorrect === 'boolean') {
      return reviewState.isCorrect;
    }

    if (typeof question.isCorrect === 'boolean') {
      return question.isCorrect;
    }

    if (isMatchingQuestion) {
      if (normalizedMatchingPairs.length === 0 || correctMatchingPairs.length === 0) {
        return false;
      }
      if (normalizedMatchingPairs.length !== correctMatchingPairs.length) {
        return false;
      }
      return normalizedMatchingPairs.every((pair) => correctMatchingPairByLeft.get(pair.leftKey) === pair.rightKey);
    }

    if (isTextQuestion) {
      const normalizedUserAnswer = normalizeTextValue(textAnswer);
      if (!normalizedUserAnswer) return false;
      return correctTextAnswers
        .map(normalizeTextValue)
        .some((answer) => answer && answer === normalizedUserAnswer);
    }

    return correctAnswerIds.length === normalizedSelectedAnswers.length && correctAnswerIds.every(id => normalizedSelectedAnswers.includes(id));
  }, [
    correctAnswerIds,
    correctMatchingPairByLeft,
    correctMatchingPairs,
    question.isCorrect,
    isMatchingQuestion,
    isPendingGrading,
    isTextQuestion,
    normalizedMatchingPairs,
    normalizedSelectedAnswers,
    reviewState?.isCorrect,
    textAnswer,
    correctTextAnswers,
  ]);

  const getStateClass = (answer) => {
    if (isReviewRevealed) {
      if (correctAnswerIds.includes(answer.id)) return 'quiz-answer-correct';
      if (normalizedSelectedAnswers.includes(answer.id)) return 'quiz-answer-incorrect';
      return '';
    }
    return normalizedSelectedAnswers.includes(answer.id) ? 'quiz-answer-selected' : '';
  };

  const getAnswerTailwind = (answer) => {
    const stateClass = getStateClass(answer);
    if (stateClass === 'quiz-answer-correct') return 'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400';
    if (stateClass === 'quiz-answer-incorrect') return 'border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400';
    if (stateClass === 'quiz-answer-selected') return 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400';
    return 'border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:border-slate-300 dark:hover:border-slate-500';
  };

  const handleMatchingPairChange = (leftKey, nextRightKey) => {
    const nextPairs = matchingLeftItems.reduce((pairs, itemLeftKey) => {
      const existingRightKey = itemLeftKey === leftKey
        ? nextRightKey
        : matchingPairByLeft.get(itemLeftKey);
      if (existingRightKey) {
        pairs.push({ leftKey: itemLeftKey, rightKey: existingRightKey });
      }
      return pairs;
    }, []);

    onMatchingAnswerChange?.({ matchingPairs: nextPairs });
  };

  const cardToneClass = isReviewRevealed
    ? (isPendingGrading
        ? 'border-amber-200 bg-amber-50/80 dark:border-amber-900/50 dark:bg-amber-950/20'
        : (isFullyCorrect
            ? 'border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/50 dark:bg-emerald-950/20'
            : 'border-rose-200 bg-rose-50/80 dark:border-rose-900/50 dark:bg-rose-950/20'))
    : (isFlagged
        ? 'border-amber-200 bg-amber-50/50 dark:border-amber-800/60 dark:bg-amber-950/10'
        : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800');

  const questionNumberToneClass = isReviewRevealed
    ? (isPendingGrading
        ? 'border-amber-200 bg-amber-100/80 text-amber-700 dark:border-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
        : (isFullyCorrect
            ? 'border-emerald-200 bg-emerald-100/80 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
            : 'border-rose-200 bg-rose-100/80 text-rose-700 dark:border-rose-800 dark:bg-rose-900/40 dark:text-rose-200'))
    : (isFlagged
        ? 'border-amber-200 bg-amber-100/80 text-amber-700 dark:border-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
        : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200');

  return (
    <div className={cn(
      'rounded-xl border p-5 shadow-md shadow-slate-900/10 transition-colors dark:shadow-blue-900/30',
      cardToneClass,
    )}>
      <div className={cn('mb-4 flex items-start gap-3', showHeaderMeta || showFlagToggle ? 'justify-between' : 'justify-start')}>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {Number.isInteger(questionNumber) && questionNumber > 0 && (
            <span className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-sm font-bold transition-colors',
              questionNumberToneClass,
            )}>
              {questionNumber}
            </span>
          )}
          <div className="min-w-0 flex-1">
            {questionImages.length > 0 && (
              <div className="mb-3 space-y-2">
                {questionImages.map((image, index) => (
                  <img
                    key={`${image.url}-${index}`}
                    src={image.url}
                    alt={image.alt || t('workspace.quiz.questionImageAlt', 'Question illustration')}
                    loading="lazy"
                    className="w-full max-h-[28rem] rounded-xl border border-slate-200 object-contain bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
                  />
                ))}
              </div>
            )}
            <h3 className="min-w-0 text-base font-bold leading-snug whitespace-pre-wrap text-slate-800 dark:text-slate-100">
              <MixedMathText>{questionDisplayText}</MixedMathText>
            </h3>
          </div>
        </div>
        {(showHeaderMeta || showFlagToggle) && (
          <div className="flex shrink-0 items-center gap-2">
            {showFlagToggle && (
              <button
                type="button"
                onClick={onToggleFlag}
                className={cn(
                  'inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-colors',
                  isFlagged
                    ? 'border-amber-300 bg-amber-100 text-amber-700 hover:bg-amber-200 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-200 dark:hover:bg-amber-900/60'
                    : 'border-slate-200 bg-slate-50 text-slate-400 hover:border-amber-200 hover:text-amber-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500 dark:hover:border-amber-700 dark:hover:text-amber-300',
                )}
                aria-label={isFlagged
                  ? t('workspace.quiz.reviewCard.unmarkForReview', 'Unmark question for review')
                  : t('workspace.quiz.reviewCard.markForReview', 'Mark question for review')}
                title={isFlagged
                  ? t('workspace.quiz.reviewCard.unmarkForReview', 'Unmark question for review')
                  : t('workspace.quiz.reviewCard.markForReview', 'Mark question for review')}
              >
                <Star className={cn('h-4 w-4', isFlagged ? 'fill-current' : '')} />
              </button>
            )}
            <span className="whitespace-nowrap rounded bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white dark:bg-slate-600">{questionNumber}/{totalQuestions}</span>
          </div>
        )}
      </div>

      {isMultiple && (
        <p className="mb-3 text-xs italic text-slate-500 dark:text-slate-400">
          {t('workspace.quiz.reviewCard.multipleSelectHint', 'Select all that apply')}
        </p>
      )}

      {isMatchingQuestion ? (
        isReviewRevealed ? (
          <div className="space-y-3">
            <p className="text-xs italic text-slate-500 dark:text-slate-400">
              {t(
                'workspace.quiz.reviewCard.matchingReviewInstruction',
                'Match each left item with the correct answer.',
              )}
            </p>

            {matchingLeftItems.map((leftKey, index) => {
              const selectedRightKey = matchingPairByLeft.get(leftKey) || '';
              const correctRightKey = correctMatchingPairByLeft.get(leftKey) || '';
              const isPairCorrect = Boolean(selectedRightKey) && selectedRightKey === correctRightKey;
              const pairStateClass = isPairCorrect
                ? 'border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-950/20'
                : (selectedRightKey
                  ? 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20'
                  : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40');

              return (
                <div key={leftKey} className={cn('rounded-xl border p-3 transition-colors', pairStateClass)}>
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                      {index + 1}
                    </span>
                    <span className="flex-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
                      <MixedMathText>{leftKey}</MixedMathText>
                    </span>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-slate-300 dark:text-slate-600">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                    <span className={cn(
                      'flex-1 text-sm font-medium',
                      isPairCorrect ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400',
                    )}>
                      {selectedRightKey ? (
                        <MixedMathText>{selectedRightKey}</MixedMathText>
                      ) : (
                        <span className="italic text-slate-400">
                          {t('workspace.quiz.reviewCard.unanswered', 'Not answered')}
                        </span>
                      )}
                    </span>
                  </div>

                  {!isPairCorrect && correctRightKey && (
                    <div className="mt-2 ml-9 text-xs font-medium text-green-700 dark:text-green-400">
                      {t('workspace.quiz.correctAnswerLabel', 'Correct answer')}: <MixedMathText>{correctRightKey}</MixedMathText>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <MatchingDragDrop
            leftItems={matchingLeftItems}
            rightOptions={matchingRightOptions}
            matchedPairs={normalizedMatchingPairs}
            onPairChange={onMatchingAnswerChange}
            disabled={isLocked}
          />
        )
      ) : isTextQuestion ? (
        <div className="space-y-3">
          <Input
            value={textAnswer}
            disabled={isLocked}
            onChange={(event) => onTextAnswerChange?.(event.target.value)}
            placeholder={question.type === 'FILL_IN_BLANK'
              ? t('workspace.quiz.reviewCard.fillBlankPlaceholder', 'Enter your answer')
              : t('workspace.quiz.reviewCard.shortAnswerPlaceholder', 'Enter a short answer')}
            className="h-11 border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 focus-visible:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
          />

          {isReviewRevealed && (
            <div className={cn(
              'rounded-lg border px-3 py-2 text-sm',
              isPendingGrading
                ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-300'
                : (isFullyCorrect
                  ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/50 dark:bg-green-950/20 dark:text-green-400'
                  : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-400'),
            )}>
              <p>
                <span className="font-semibold">
                  {t('workspace.quiz.reviewCard.yourAnswerLabel', 'Your answer')}:
                </span>{' '}
                {textAnswer.trim()
                  ? <MixedMathText>{textAnswer.trim()}</MixedMathText>
                  : t('workspace.quiz.reviewCard.unanswered', 'Not answered')}
              </p>
              {isPendingGrading
                ? (
                  <p>
                    <span className="font-semibold">
                      {t('workspace.quiz.reviewCard.statusLabel', 'Status')}:
                    </span>{' '}
                    {t('workspace.quiz.reviewCard.gradingByAI', 'Grading by AI...')}
                  </p>
                )
                : (
                  <p>
                    <span className="font-semibold">
                      {t('workspace.quiz.correctAnswerLabel', 'Correct answer')}:
                    </span>{' '}
                    {correctTextAnswers.length ? (
                      <MixedMathText>{correctTextAnswers.join(' / ')}</MixedMathText>
                    ) : (
                      t('workspace.quiz.reviewCard.noData', 'No data available')
                    )}
                  </p>
                )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {question.answers.map((answer) => (
            <button
              key={answer.id}
              type="button"
              disabled={isLocked}
              onClick={() => onSelectAnswer?.(answer.id)}
              className={cn(
                'quiz-answer w-full flex items-center gap-3 p-3.5 rounded-lg border text-sm font-semibold text-left transition-all duration-300',
                'text-slate-700 dark:text-slate-300',
                getStateClass(answer),
                getAnswerTailwind(answer),
                isLocked ? 'cursor-default' : 'cursor-pointer',
              )}
            >
              {isMultiple ? <CheckboxIndicator id={answer.id} /> : <RadioIndicator />}
              <span>
                <MixedMathText>{answer.content}</MixedMathText>
              </span>
            </button>
          ))}
        </div>
      )}

      {isReviewRevealed && (
        <div className="mt-3">
          {isPendingGrading
            ? <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">{t('workspace.quiz.reviewCard.gradingByAI', 'Grading by AI...')}</span>
            : isMatchingQuestion
              ? (normalizedMatchingPairs.length === 0
                  ? <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{t('workspace.quiz.reviewCard.noAnswerProvided', 'No answer provided')}</span>
                  : isFullyCorrect
                    ? <span className="text-sm font-semibold text-green-600 dark:text-green-400">✓ {t('workspace.quiz.reviewCard.correct', 'Correct!')}</span>
                    : <span className="text-sm font-semibold text-red-600 dark:text-red-400">✗ {t('workspace.quiz.reviewCard.incorrect', 'Incorrect')}</span>)
              : isTextQuestion
                ? (!textAnswer.trim()
                    ? <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{t('workspace.quiz.reviewCard.noAnswerProvided', 'No answer provided')}</span>
                    : isFullyCorrect
                      ? <span className="text-sm font-semibold text-green-600 dark:text-green-400">✓ {t('workspace.quiz.reviewCard.correct', 'Correct!')}</span>
                      : <span className="text-sm font-semibold text-red-600 dark:text-red-400">✗ {t('workspace.quiz.reviewCard.incorrect', 'Incorrect')}</span>)
                : normalizedSelectedAnswers.length === 0
                  ? <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{t('workspace.quiz.reviewCard.noAnswerSelected', 'No answer selected')}</span>
                  : isFullyCorrect
                    ? <span className="text-sm font-semibold text-green-600 dark:text-green-400">✓ {t('workspace.quiz.reviewCard.correct', 'Correct!')}</span>
                    : <span className="text-sm font-semibold text-red-600 dark:text-red-400">✗ {t('workspace.quiz.reviewCard.incorrect', 'Incorrect')}</span>}
        </div>
      )}

      {isExplanationRevealed && (reviewState?.explanation || question.explanation) && (
        <div className="mt-3 rounded-lg bg-slate-100 p-3 dark:bg-slate-700/50">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            <span className="font-semibold">{t('workspace.quiz.explanation', 'Explanation')}: </span>
            <MixedMathText>{reviewState?.explanation || question.explanation}</MixedMathText>
          </p>
        </div>
      )}
    </div>
  );
}, areQuestionCardPropsEqual);

export default QuestionCard;
