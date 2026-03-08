import { useState, useEffect, useCallback, useRef } from 'react';
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

export default function ExamPerQuestion({ quiz, answers, onSelectAnswer, onSubmit, attemptId, fontClass }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(quiz.questions[0]?.timeLimit || 0);
  const [isFinished, setIsFinished] = useState(false);
  const handledTimeUpRef = useRef(false);
  const submittingRef = useRef(false);

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

  // Reset timer on question change
  useEffect(() => {
    handledTimeUpRef.current = false;
    setTimeLeft(currentQuestion?.timeLimit || 0);
  }, [currentIndex, currentQuestion?.timeLimit]);

  // Countdown
  useEffect(() => {
    if (timeLeft <= 0 || isFinished) return;
    const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, isFinished]);

  // Auto-advance when time expires
  useEffect(() => {
    if (timeLeft > 0 || isFinished || !currentQuestion?.timeLimit || handledTimeUpRef.current) return;
    handledTimeUpRef.current = true;
    const timeout = setTimeout(async () => {
      await saveCurrentQuestion();
      if (currentIndex >= total - 1) {
        if (!submittingRef.current) {
          submittingRef.current = true;
          setIsFinished(true);
          onSubmit?.();
        }
      } else {
        setCurrentIndex(i => i + 1);
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
    setCurrentIndex(i => i + 1);
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
        selectedAnswers={answers[currentQuestion.id] || []}
        onSelectAnswer={(answerId) => onSelectAnswer(currentQuestion.id, answerId, currentQuestion.type === 'MULTIPLE_CHOICE')}
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
