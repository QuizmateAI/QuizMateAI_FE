import { useReducer, useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/Components/ui/button';
import QuestionCard from './QuestionCard';
import HourglassLoader from './HourglassLoader';
import { saveAttemptAnswers } from '@/api/QuizAPI';
import { buildSavePayload } from '../utils/quizTransform';

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function makeReducer(questions) {
  return (state, action) => {
    switch (action.type) {
      case 'NEXT': {
        const next = state.currentIndex + 1;
        return { currentIndex: next, timeLeft: questions[next]?.timeLimit || 0 };
      }
      case 'TICK':
        return { ...state, timeLeft: Math.max(0, state.timeLeft - 1) };
      default:
        return state;
    }
  };
}

export default function ExamPerQuestion({ quiz, answers, onSelectAnswer, onTextAnswerChange, onSubmit, attemptId, fontClass }) {
  const [state, dispatch] = useReducer(
    makeReducer(quiz.questions),
    { currentIndex: 0, timeLeft: quiz.questions[0]?.timeLimit || 0 },
  );
  const [isFinished, setIsFinished] = useState(false);
  // Track which question index has already been handled on timeout
  const handledTimeUpForIndexRef = useRef(-1);
  const submittingRef = useRef(false);

  const { currentIndex, timeLeft } = state;
  const currentQuestion = quiz.questions[currentIndex];
  const total = quiz.questions.length;

  // Save current question's answer to API
  const saveCurrentQuestion = useCallback(async () => {
    if (!attemptId || !currentQuestion) return;
    const qId = currentQuestion.id;
    const selected = answers[qId];
    if (!selected?.length) return;
    const payload = buildSavePayload({ [qId]: selected });
    if (payload.length === 0) return;
    try {
      await saveAttemptAnswers(attemptId, payload);
    } catch (err) {
      console.error('[PerQuestion] Save failed:', err);
    }
  }, [attemptId, currentQuestion, answers]);

  // Countdown — dispatch TICK every second
  useEffect(() => {
    if (timeLeft <= 0 || isFinished) return;
    const timer = setTimeout(() => dispatch({ type: 'TICK' }), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, isFinished]);

  // Auto-advance when time expires (fire once per question via index tracking)
  useEffect(() => {
    if (timeLeft > 0 || isFinished || !currentQuestion?.timeLimit) return;
    if (handledTimeUpForIndexRef.current === currentIndex) return;
    handledTimeUpForIndexRef.current = currentIndex;

    const timeout = setTimeout(async () => {
      await saveCurrentQuestion();
      if (currentIndex >= total - 1) {
        if (!submittingRef.current) {
          submittingRef.current = true;
          setIsFinished(true);
          onSubmit?.();
        }
      } else {
        dispatch({ type: 'NEXT' });
      }
    }, 800);
    return () => clearTimeout(timeout);
  }, [timeLeft, isFinished, currentIndex, total, onSubmit, currentQuestion?.timeLimit, saveCurrentQuestion]);

  const handleNext = useCallback(async () => {
    await saveCurrentQuestion();
    if (currentIndex >= total - 1) {
      if (!submittingRef.current) {
        submittingRef.current = true;
        setIsFinished(true);
        onSubmit?.();
      }
      return;
    }
    dispatch({ type: 'NEXT' });
  }, [currentIndex, total, onSubmit, saveCurrentQuestion]);

  if (isFinished) return null;

  return (
    <div className={cn('max-w-2xl mx-auto', fontClass)}>
      {/* Timer + Hourglass */}
      <div className="flex flex-col items-center mb-6">
        <div className="bg-slate-200 dark:bg-slate-800 rounded-2xl p-5 inline-flex flex-col items-center border border-slate-300 dark:border-slate-600 shadow-md shadow-slate-900/10 dark:shadow-blue-900/50">
          <HourglassLoader size="5em" />
          <div className={cn(
            'text-2xl font-bold font-mono mt-3',
            timeLeft <= 10 ? 'text-red-500 dark:text-red-400 animate-pulse' : 'text-slate-800 dark:text-slate-100',
          )}>
            {formatTime(timeLeft)}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{currentIndex + 1} / {total}</p>
        </div>
      </div>

      <QuestionCard
        question={currentQuestion}
        questionNumber={currentIndex + 1}
        totalQuestions={total}
        answerValue={answers[currentQuestion.id]}
        onSelectAnswer={(answerId) => onSelectAnswer(currentQuestion.id, answerId, currentQuestion.type === 'MULTIPLE_CHOICE')}
        onTextAnswerChange={(value) => onTextAnswerChange?.(currentQuestion.id, value)}
        disabled={timeLeft <= 0}
      />

      <div className="flex justify-end mt-4">
        <Button onClick={handleNext} disabled={timeLeft <= 0} className="min-w-[160px] bg-blue-600 hover:bg-blue-700 text-white">
          {currentIndex >= total - 1 ? 'Submit Exam' : 'Next Question →'}
        </Button>
      </div>
    </div>
  );
}
