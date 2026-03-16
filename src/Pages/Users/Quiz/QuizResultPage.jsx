import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, ArrowLeft, Eye, Trophy, XCircle, CheckCircle2, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/Components/ui/button';
import QuestionCard from './components/QuestionCard';
import { getAttemptResult, getQuizFull } from '@/api/QuizAPI';
import { normalizeQuizData } from './utils/quizTransform';

export default function QuizResultPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { i18n } = useTranslation();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';

  const [result, setResult] = useState(null);
  const [quizDetails, setQuizDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewMode, setReviewMode] = useState(false);

  // quizId passed via navigation state for "back to quiz" button
  const quizId = location.state?.quizId;
  const returnToQuizPath = location.state?.returnToQuizPath;

  useEffect(() => {
    (async () => {
      try {
        const res = await getAttemptResult(attemptId);
        const attemptResult = res.data;
        setResult(attemptResult);

        if (attemptResult?.quizId) {
          try {
            const quizRes = await getQuizFull(attemptResult.quizId);
            setQuizDetails(normalizeQuizData(quizRes.data));
          } catch (quizErr) {
            console.error('Failed to load quiz details for review:', quizErr);
            setQuizDetails(null);
          }
        }
      } catch (err) {
        console.error('Failed to load result:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [attemptId]);

  // Normalize result questions for QuestionCard format
  const reviewQuestions = useMemo(() => {
    if (!result?.questions?.length) return [];

    const questionMap = new Map((quizDetails?.questions || []).map(question => [question.id, question]));

    return result.questions.map((attemptQuestion, index) => {
      const detailQuestion = questionMap.get(attemptQuestion.questionId);

      return {
        id: attemptQuestion.questionId,
        content: detailQuestion?.content || `Question ${index + 1}`,
        type: detailQuestion?.type || attemptQuestion.questionType || 'SINGLE_CHOICE',
        difficulty: detailQuestion?.difficulty || 'MEDIUM',
        explanation: detailQuestion?.explanation || '',
        answers: detailQuestion?.answers || [],
        selectedAnswerIds: attemptQuestion.selectedAnswerIds || [],
        textAnswer: attemptQuestion.textAnswer || '',
        isCorrect: attemptQuestion.correct,
        questionScore: attemptQuestion.questionScore || 0,
      };
    });
  }, [result, quizDetails]);

  const handleBack = useCallback(() => {
    if (returnToQuizPath) {
      navigate(returnToQuizPath, { replace: true });
      return;
    }
    if (quizId || result?.quizId) {
      navigate('/home', { replace: true });
      return;
    }
    navigate('/');
  }, [navigate, quizId, returnToQuizPath, result?.quizId]);

  if (loading) {
    return (
      <div className={cn('min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center', fontClass)}>
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className={cn('min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center', fontClass)}>
        <h2 className="text-xl text-slate-600 dark:text-slate-300">Result not found</h2>
      </div>
    );
  }

  const passed = typeof result.passed === 'boolean' ? result.passed : null;
  const scoreValue = Number(result.maxScore) > 0 ? `${result.score ?? 0}/${result.maxScore}` : `${result.score ?? 0}`;
  const correctValue = `${result.correctQuestion ?? reviewQuestions.filter(q => q.isCorrect).length}/${result.totalQuestion ?? reviewQuestions.length}`;
  const answeredValue = `${result.answeredQuestion ?? 0}/${result.totalQuestion ?? reviewQuestions.length}`;
  const timeTakenSeconds = getTimeTakenSeconds(result.startedAt, result.completedAt, result.timeoutAt);
  const resultTitle = passed == null
    ? 'Quiz Completed'
    : passed
      ? 'Congratulations!'
      : 'Keep Trying!';

  return (
    <div className={cn('min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8', fontClass)}>
      <div className="max-w-3xl mx-auto">
        {/* Score card */}
        {!reviewMode && (
          <div className={cn(
            'rounded-2xl p-8 mb-6 text-center border shadow-lg',
            passed == null
              ? 'bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-blue-200 dark:border-blue-800 shadow-blue-900/10 dark:shadow-blue-900/30'
              : passed
              ? 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-800 shadow-emerald-900/10 dark:shadow-emerald-900/30'
              : 'bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 border-red-200 dark:border-red-800 shadow-red-900/10 dark:shadow-red-900/30'
          )}>
            <div className="mb-4">
              {passed == null
                ? <BarChart3 className="w-16 h-16 mx-auto text-blue-500 dark:text-blue-400" />
                : passed
                ? <Trophy className="w-16 h-16 mx-auto text-emerald-500 dark:text-emerald-400" />
                : <XCircle className="w-16 h-16 mx-auto text-red-500 dark:text-red-400" />}
            </div>

            <h1 className={cn(
              'text-3xl font-bold mb-2',
              passed == null
                ? 'text-blue-700 dark:text-blue-300'
                : passed
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-red-700 dark:text-red-300',
            )}>
              {resultTitle}
            </h1>

            <p className="text-slate-600 dark:text-slate-300 mb-6">Attempt #{result.attemptId} • Quiz #{result.quizId}</p>

            {/* Score display */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-xl mx-auto mb-6">
              <ScoreStat label="Score" value={scoreValue} icon={BarChart3} />
              <ScoreStat label="Correct" value={correctValue} icon={CheckCircle2} />
              <ScoreStat label="Answered" value={answeredValue} icon={Eye} />
              <ScoreStat label="Time" value={formatDuration(timeTakenSeconds)} icon={null} />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 mb-6 text-xs text-slate-500 dark:text-slate-400">
              <span className="px-2.5 py-1 rounded-full bg-white/60 dark:bg-slate-800/60">Status: {result.status || 'UNKNOWN'}</span>
              <span className="px-2.5 py-1 rounded-full bg-white/60 dark:bg-slate-800/60">Mode: {result.isPracticeMode ? 'Practice' : 'Exam'}</span>
              {result.passScore != null && <span className="px-2.5 py-1 rounded-full bg-white/60 dark:bg-slate-800/60">Pass Score: {result.passScore}</span>}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button onClick={() => setReviewMode(true)} variant="outline" className="min-w-[160px] gap-2" disabled={reviewQuestions.length === 0}>
                <Eye className="w-4 h-4" /> Review Answers
              </Button>
              <Button onClick={handleBack} className="min-w-[160px] gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                <ArrowLeft className="w-4 h-4" /> Back to Quiz
              </Button>
            </div>
          </div>
        )}

        {/* Review mode */}
        {reviewMode && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Review Answers</h2>
              <Button variant="outline" onClick={() => setReviewMode(false)} className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Back to Score
              </Button>
            </div>

            <div className="space-y-4">
              {reviewQuestions.map((q, idx) => (
                <div key={q.id} className="relative">
                  {/* Correct/incorrect badge */}
                  <div className={cn(
                    'absolute -left-2 -top-2 z-10 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold',
                    q.isCorrect ? 'bg-emerald-500' : 'bg-red-500'
                  )}>
                    {q.isCorrect ? '✓' : '✗'}
                  </div>
                  <QuestionCard
                    question={q}
                    questionNumber={idx + 1}
                    totalQuestions={reviewQuestions.length}
                    answerValue={q.type === 'SHORT_ANSWER' || q.type === 'FILL_IN_BLANK' ? q.textAnswer : q.selectedAnswerIds}
                    showResult
                    showExplanation
                    disabled
                  />
                </div>
              ))}

              {reviewQuestions.length === 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                  Khong co du lieu chi tiet de review bai lam.
                </div>
              )}
            </div>

            <div className="flex justify-center mt-8 gap-3">
              <Button variant="outline" onClick={() => setReviewMode(false)} className="min-w-[160px]">Back to Score</Button>
              <Button onClick={handleBack} className="min-w-[160px] bg-blue-600 hover:bg-blue-700 text-white gap-2">
                <ArrowLeft className="w-4 h-4" /> Back to Quiz
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ScoreStat({ label, value, icon: Icon }) {
  return (
    <div className="flex flex-col items-center p-3 bg-white/60 dark:bg-slate-800/60 rounded-xl">
      {Icon && <Icon className="w-5 h-5 text-slate-500 dark:text-slate-400 mb-1" />}
      <span className="text-lg font-bold text-slate-800 dark:text-slate-100">{value}</span>
      <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
    </div>
  );
}

function formatDuration(seconds) {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function getTimeTakenSeconds(startedAt, completedAt, timeoutAt) {
  if (!startedAt) return 0;

  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt || timeoutAt || startedAt).getTime();

  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return 0;
  }

  return Math.floor((end - start) / 1000);
}
