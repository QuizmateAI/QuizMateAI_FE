import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/Components/ui/button';
import { Switch } from '@/Components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/Components/ui/dialog';
import QuestionCard from './components/QuestionCard';
import { useQuizAutoSave } from './hooks/useQuizAutoSave';
import { useQuizProgress } from './hooks/useQuizProgress';
import { getQuizFull, startQuizAttempt, submitAttempt, updateQuiz } from '@/api/QuizAPI';
import { buildSubmitPayload, mapSavedAnswersToState, normalizeQuizData } from './utils/quizTransform';
import { useToast } from '@/context/ToastContext';
import { markQuizAttempted, markQuizCompleted } from '@/Utils/quizAttemptTracker';

export default function PracticeQuizPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { i18n } = useTranslation();
  const { showError } = useToast();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attemptId, setAttemptId] = useState(null);
  const [isStarted, setIsStarted] = useState(false);
  const [trackProgress, setTrackProgress] = useState(true);
  const [showResult, setShowResult] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [confirmStartOpen, setConfirmStartOpen] = useState(false);
  const returnToQuizPath = location.state?.returnToQuizPath || '/home';

  const { answers, currentIndex, selectAnswer, updateTextAnswer, goNext, goBack, initFromSaved } = useQuizProgress(attemptId);
  const { syncSnapshot } = useQuizAutoSave(attemptId, answers, {
    interval: 5000,
    enabled: isStarted && trackProgress,
  });

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
      let res;
      try {
        res = await startQuizAttempt(quizId, { isPracticeMode: true });
      } catch (startErr) {
        const message = String(startErr?.message || '').toLowerCase();
        const notActiveStatus = startErr?.data?.statusCode;
        const shouldActivateAndRetry = message.includes('chưa được kích hoạt') || notActiveStatus === 1083;

        if (!shouldActivateAndRetry) {
          throw startErr;
        }

        await updateQuiz(Number(quizId), { status: 'ACTIVE' });
        res = await startQuizAttempt(quizId, { isPracticeMode: true });
      }

      const attempt = res.data;
      const hydratedAnswers = mapSavedAnswersToState(attempt.savedAnswers);

      setAttemptId(attempt.attemptId);
      markQuizAttempted(quizId);
      if (attempt.savedAnswers?.length) {
        initFromSaved(attempt.savedAnswers);
      }
      syncSnapshot(hydratedAnswers);
      setIsStarted(true);
    } catch (err) {
      console.error('Failed to start attempt:', err);
      showError(err?.message || 'Failed to start quiz attempt');
    }
  }, [quizId, initFromSaved, showError, syncSnapshot]);

  const handleSubmit = useCallback(async () => {
    if (!attemptId) return;
    try {
      const submitPayload = buildSubmitPayload(quiz?.questions, answers);
      await submitAttempt(attemptId, submitPayload);
      markQuizCompleted(quizId);
      navigate(`/quiz/result/${attemptId}`, { state: { quizId, returnToQuizPath }, replace: true });
    } catch (err) {
      console.error('Failed to submit:', err);
    }
  }, [answers, attemptId, navigate, quiz?.questions, quizId, returnToQuizPath]);

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
          <p className="text-xs text-amber-600 dark:text-amber-400 mb-4">
            Starting this quiz will create an attempt and may lock future edits/deletion.
          </p>
          <Button onClick={() => setConfirmStartOpen(true)} className="w-full min-w-[100px] bg-blue-600 hover:bg-blue-700 text-white">
            Start Quiz
          </Button>
        </div>

        <Dialog open={confirmStartOpen} onOpenChange={setConfirmStartOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start Practice Quiz?</DialogTitle>
              <DialogDescription>
                A new attempt will be created as soon as you continue.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmStartOpen(false)}>Cancel</Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={async () => {
                  setConfirmStartOpen(false);
                  await handleStart();
                }}
              >
                Continue
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
          answerValue={answers[currentQuestion.id]}
          onSelectAnswer={(answerId) => selectAnswer(currentQuestion.id, answerId, currentQuestion.type === 'MULTIPLE_CHOICE')}
          onTextAnswerChange={(value) => updateTextAnswer(currentQuestion.id, value)}
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
