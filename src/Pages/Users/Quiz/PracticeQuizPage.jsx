import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/Components/ui/button';
import { Switch } from '@/Components/ui/switch';
import QuestionCard from './components/QuestionCard';
import { useQuizProgress } from './hooks/useQuizProgress';
import { getQuizFull, startQuizAttempt, submitAttempt } from '@/api/QuizAPI';
import { normalizeQuizData } from './utils/quizTransform';

export default function PracticeQuizPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attemptId, setAttemptId] = useState(null);
  const [isStarted, setIsStarted] = useState(false);
  const [trackProgress, setTrackProgress] = useState(true);
  const [showResult, setShowResult] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const { answers, currentIndex, selectAnswer, goNext, goBack, initFromSaved } = useQuizProgress(attemptId);

  // Fetch full quiz data
  useEffect(() => {
    (async () => {
      try {
        const res = await getQuizFull(quizId);
        setQuiz(normalizeQuizData(res.data));
      } catch (err) {
        console.error('Failed to load quiz:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [quizId]);

  const currentQuestion = quiz?.questions[currentIndex];
  const total = quiz?.questions.length || 0;

  const handleStart = useCallback(async () => {
    try {
      const res = await startQuizAttempt(quizId, { isPracticeMode: true });
      const attempt = res.data;
      setAttemptId(attempt.attemptId);
      if (attempt.savedAnswers?.length) initFromSaved(attempt.savedAnswers);
      setIsStarted(true);
    } catch (err) {
      console.error('Failed to start attempt:', err);
    }
  }, [quizId, initFromSaved]);

  const handleSubmit = useCallback(async () => {
    if (!attemptId) return;
    try {
      await submitAttempt(attemptId);
      navigate(`/quiz/result/${attemptId}`, { state: { quizId }, replace: true });
    } catch (err) {
      console.error('Failed to submit:', err);
    }
  }, [attemptId, navigate, quizId]);

  const handleNext = useCallback(() => {
    setShowResult(false);
    setShowExplanation(false);
    goNext(total, trackProgress, answers);
  }, [goNext, total, trackProgress, answers]);

  const handleBack = useCallback(() => {
    setShowResult(false);
    setShowExplanation(false);
    goBack(trackProgress, answers);
  }, [goBack, trackProgress, answers]);

  if (loading) {
    return (
      <div className={cn('min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center', fontClass)}>
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className={cn('min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center', fontClass)}>
        <h2 className="text-xl text-slate-600 dark:text-slate-300">Quiz not found</h2>
      </div>
    );
  }

  if (!isStarted) {
    return (
      <div className={cn('min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4', fontClass)}>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-lg shadow-slate-900/10 dark:shadow-blue-900/50 max-w-md w-full border border-slate-200 dark:border-slate-700">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">{quiz.title}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">{total} questions • Practice Mode</p>
          {quiz.maxAttempt && <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">Max attempts: {quiz.maxAttempt}</p>}
          <div className="flex items-center justify-between mb-6 p-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Track Progress</span>
            <Switch checked={trackProgress} onCheckedChange={setTrackProgress} />
          </div>
          <Button onClick={handleStart} className="w-full min-w-[100px] bg-blue-600 hover:bg-blue-700 text-white">
            Start Quiz
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8', fontClass)}>
      <div className="max-w-2xl mx-auto">
        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">{quiz.title}</h1>
            <span className="text-sm text-slate-500 dark:text-slate-400">{currentIndex + 1} / {total}</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full transition-all duration-500" style={{ width: `${((currentIndex + 1) / total) * 100}%` }} />
          </div>
        </div>

        <QuestionCard
          question={currentQuestion}
          questionNumber={currentIndex + 1}
          totalQuestions={total}
          selectedAnswers={answers[currentQuestion.id] || []}
          onSelectAnswer={(answerId) => selectAnswer(currentQuestion.id, answerId, currentQuestion.type === 'MULTIPLE_CHOICE')}
          showResult={showResult}
          showExplanation={showExplanation}
        />

        {/* Action buttons */}
        <div className="flex gap-3 mt-4">
          <Button variant="outline" onClick={() => setShowResult(!showResult)} className="min-w-[120px]">
            {showResult ? 'Hide Result' : 'View Result'}
          </Button>
          <Button variant="outline" onClick={() => setShowExplanation(!showExplanation)} className="min-w-[140px]">
            {showExplanation ? 'Hide Explanation' : 'View Explanation'}
          </Button>
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={handleBack} disabled={currentIndex === 0} className="min-w-[100px]">
            ← Back
          </Button>
          {currentIndex >= total - 1 ? (
            <Button onClick={handleSubmit} className="min-w-[100px] bg-green-600 hover:bg-green-700 text-white">
              Submit
            </Button>
          ) : (
            <Button onClick={handleNext} className="min-w-[100px] bg-blue-600 hover:bg-blue-700 text-white">
              Next →
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
