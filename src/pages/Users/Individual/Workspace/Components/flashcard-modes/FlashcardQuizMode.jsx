import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import MixedMathText from '@/components/math/MixedMathText';
import { getContentDisplayText } from '@/lib/questionContentMedia';
import { buildQuizChoiceForItem, shuffleArray } from './flashcardShuffle';

function buildQuizDeck(items, randomFn = Math.random) {
  if (!Array.isArray(items) || items.length === 0) return [];
  const shuffled = shuffleArray(items, randomFn);
  return shuffled.map((item) => ({
    item,
    choice: buildQuizChoiceForItem(item, items, { distractorCount: 3, randomFn }),
  }));
}

function summarize(answers) {
  const total = Object.keys(answers).length;
  const correct = Object.values(answers).filter((entry) => entry?.correct === true).length;
  return { total, correct };
}

export default function FlashcardQuizMode({ items, fontClass = '' }) {
  const { t } = useTranslation();
  const hasEnoughItems = Array.isArray(items) && items.length >= 2;

  const [deckSeed, setDeckSeed] = useState(0);
  // deckSeed buộc useMemo tính lại deck khi user bấm "Học lại"
  const deck = useMemo(
    () => (hasEnoughItems ? buildQuizDeck(items) : []),
    [items, hasEnoughItems, deckSeed],
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { [itemId]: { selectedIndex, correct } }

  const activeEntry = deck[activeIndex] || null;
  const activeAnswer = activeEntry ? answers[activeEntry.item.flashcardItemId] : null;
  const isAnswered = Boolean(activeAnswer);
  const isFinished = deck.length > 0 && activeIndex >= deck.length;

  const handleSelect = useCallback((selectedIndex) => {
    if (!activeEntry || isAnswered) return;
    const correct = selectedIndex === activeEntry.choice.correctIndex;
    setAnswers((prev) => ({
      ...prev,
      [activeEntry.item.flashcardItemId]: { selectedIndex, correct },
    }));
  }, [activeEntry, isAnswered]);

  const handleNext = useCallback(() => {
    setActiveIndex((index) => index + 1);
  }, []);

  const handleRestart = useCallback(() => {
    setAnswers({});
    setActiveIndex(0);
    setDeckSeed((seed) => seed + 1);
  }, []);

  if (!hasEnoughItems) {
    return (
      <div className="flex h-[280px] flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
        <p>
          {t(
            'workspace.flashcard.modes.quiz.notEnoughItems',
            'Quiz mode needs at least 2 cards. Add more cards to play.',
          )}
        </p>
      </div>
    );
  }

  if (isFinished) {
    const { total, correct } = summarize(answers);
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

    return (
      <div className={`flex flex-col items-center gap-4 rounded-[28px] border border-emerald-200 bg-white px-6 py-10 text-center shadow-sm dark:border-emerald-900/40 dark:bg-slate-900 ${fontClass}`}>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600 dark:text-emerald-400">
          {t('workspace.flashcard.modes.quiz.finishedLabel', 'Round complete')}
        </p>
        <p className="text-3xl font-bold text-slate-900 dark:text-white">
          {correct}/{total}
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t('workspace.flashcard.modes.quiz.accuracy', 'Accuracy: {{accuracy}}%', { accuracy })}
        </p>
        <Button onClick={handleRestart} className="rounded-full bg-emerald-600 text-white hover:bg-emerald-700">
          <RefreshCw className="mr-2 h-4 w-4" />
          {t('workspace.flashcard.modes.quiz.restart', 'Play again')}
        </Button>
      </div>
    );
  }

  const progressLabel = t('workspace.flashcard.modes.quiz.progress', 'Card {{current}} / {{total}}', {
    current: activeIndex + 1,
    total: deck.length,
  });
  const questionText = getContentDisplayText(activeEntry.choice.question);

  return (
    <div className={`flex flex-col gap-5 ${fontClass}`}>
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        <span>{progressLabel}</span>
        <span>
          {t('workspace.flashcard.modes.quiz.score', 'Score: {{correct}}/{{answered}}', {
            correct: Object.values(answers).filter((entry) => entry.correct).length,
            answered: Object.keys(answers).length,
          })}
        </span>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
          {t('workspace.flashcard.modes.quiz.questionLabel', 'Question')}
        </p>
        <p className="mt-2 whitespace-pre-wrap break-words text-lg font-semibold text-slate-900 dark:text-white">
          <MixedMathText>{questionText}</MixedMathText>
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {activeEntry.choice.options.map((option, index) => {
          const isSelected = activeAnswer?.selectedIndex === index;
          const isCorrectOption = activeEntry.choice.correctIndex === index;
          const showResult = isAnswered;

          let stateClass = 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800';
          if (showResult) {
            if (isCorrectOption) {
              stateClass = 'border-emerald-400 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200';
            } else if (isSelected) {
              stateClass = 'border-rose-400 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200';
            } else {
              stateClass = 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400';
            }
          } else if (isSelected) {
            stateClass = 'border-emerald-400 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200';
          }

          return (
            <button
              key={`${index}-${option}`}
              type="button"
              onClick={() => handleSelect(index)}
              disabled={isAnswered}
              className={cn(
                'flex items-start gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium transition-colors',
                stateClass,
                isAnswered && 'cursor-default',
              )}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current text-[11px] font-bold">
                {String.fromCharCode(65 + index)}
              </span>
              <span className="min-w-0 whitespace-pre-wrap break-words">
                <MixedMathText>{getContentDisplayText(option)}</MixedMathText>
              </span>
              {showResult && isCorrectOption ? (
                <CheckCircle2 className="ml-auto h-5 w-5 shrink-0 text-emerald-500" />
              ) : null}
              {showResult && isSelected && !isCorrectOption ? (
                <XCircle className="ml-auto h-5 w-5 shrink-0 text-rose-500" />
              ) : null}
            </button>
          );
        })}
      </div>

      {isAnswered ? (
        <div className="flex items-center justify-end">
          <Button onClick={handleNext} className="rounded-full bg-emerald-600 text-white hover:bg-emerald-700">
            {activeIndex >= deck.length - 1
              ? t('workspace.flashcard.modes.quiz.finish', 'See result')
              : t('workspace.flashcard.modes.quiz.next', 'Next')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
