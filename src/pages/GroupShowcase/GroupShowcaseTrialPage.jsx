import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Award,
  Clock,
  ChevronLeft,
  ChevronRight,
  Send,
  Sparkles,
  AlertTriangle,
  ArrowLeft,
  Check,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/context/ToastContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { unwrapApiData } from '@/utils/apiResponse';
import {
  getShowcaseQuizTrialResult,
  submitShowcaseQuizTrial
} from '@/api/GroupShowcaseAPI';
import {
  normalizeQuizData,
  buildSubmitPayload,
  hasAnswerValue
} from '@/pages/Users/Quiz/utils/quizTransform';

export default function GroupShowcaseTrialPage() {
  const { workspaceId, attemptId } = useParams();
  const navigate = useNavigate();
  const { showError, showSuccess, showInfo } = useToast();

  // Apply theme on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      const isDark = stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
      const root = window.document.documentElement;
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, []);

  // Screen state: 'TAKING' or 'RESULT'
  const [viewState, setViewState] = useState('LOADING'); // LOADING, TAKING, RESULT, ERROR
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [rawResult, setRawResult] = useState(null);

  // Active question navigation
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  // Time tracking
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const timerRef = useRef(null);
  const startTimeRef = useRef(Date.now());

  // Confirm submit dialog
  const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load attempt data (or result if completed)
  useEffect(() => {
    const loadAttempt = async () => {
      try {
        setViewState('LOADING');
        const res = await getShowcaseQuizTrialResult(workspaceId, attemptId);
        const data = unwrapApiData(res);

        if (!data) {
          throw new Error('Không thể tải thông tin lượt thi.');
        }

        // Check if completed
        const isCompleted = data.status === 'COMPLETED' || data.score !== undefined || data.gradedAnswers !== undefined;

        // Extract quiz data
        const rawQuiz = data.quiz || data.attemptQuiz || data;
        const normalized = normalizeQuizData(rawQuiz);
        setQuiz(normalized);

        if (isCompleted) {
          setRawResult(data);
          setViewState('RESULT');
        } else {
          // Setup taking state
          setViewState('TAKING');

          // Initialize timer if applicable
          const duration = normalized.totalTime || 0;
          if (duration > 0) {
            setRemainingSeconds(duration);
          }

          // Restore saved answers from localStorage if present
          const saved = localStorage.getItem(`trial_answers_${attemptId}`);
          if (saved) {
            try {
              setAnswers(JSON.parse(saved));
            } catch (e) {
              console.error('Failed to parse saved answers', e);
            }
          }
          startTimeRef.current = Date.now();
        }
      } catch (err) {
        console.error(err);
        setViewState('ERROR');
        showError('Không thể tải dữ liệu bài làm thử.');
      }
    };

    if (workspaceId && attemptId) {
      loadAttempt();
    }
  }, [workspaceId, attemptId, showError]);

  // Countdown timer effect
  useEffect(() => {
    if (viewState === 'TAKING' && remainingSeconds > 0) {
      timerRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [viewState, remainingSeconds]);

  // Auto-submit on time expiration
  const handleAutoSubmit = async () => {
    showInfo('Hết thời gian làm bài! Hệ thống đang tự động nộp...');
    await performSubmit();
  };

  // Perform submission logic
  const performSubmit = async () => {
    try {
      setIsSubmitting(true);
      if (timerRef.current) clearInterval(timerRef.current);

      const submitPayload = buildSubmitPayload(quiz.questions, answers);
      const res = await submitShowcaseQuizTrial(workspaceId, attemptId, submitPayload);
      const data = unwrapApiData(res);

      if (data) {
        setRawResult(data);
        setViewState('RESULT');
        showSuccess('Nộp bài thành công!');
        localStorage.removeItem(`trial_answers_${attemptId}`);
      } else {
        throw new Error('Nộp bài không thành công.');
      }
    } catch (err) {
      console.error(err);
      showError('Nộp bài thất bại. Vui lòng kiểm tra lại kết nối mạng.');
    } finally {
      setIsSubmitting(false);
      setIsSubmitConfirmOpen(false);
    }
  };

  // User manual submit
  const handleUserSubmit = () => {
    setIsSubmitConfirmOpen(true);
  };

  // Parse questions & matching options helper
  const currentQuestion = useMemo(() => {
    if (!quiz?.questions || quiz.questions.length === 0) return null;
    return quiz.questions[activeQuestionIndex];
  }, [quiz, activeQuestionIndex]);

  // Save answers locally when changed
  const saveAnswer = (questionId, value) => {
    const updated = {
      ...answers,
      [questionId]: value
    };
    setAnswers(updated);
    localStorage.setItem(`trial_answers_${attemptId}`, JSON.stringify(updated));
  };

  // Single/Multiple Choice answer selectors
  const handleOptionSelect = (questionId, optionId, isMultiple = false) => {
    const current = answers[questionId] || [];
    if (isMultiple) {
      if (current.includes(optionId)) {
        saveAnswer(questionId, current.filter(id => id !== optionId));
      } else {
        saveAnswer(questionId, [...current, optionId]);
      }
    } else {
      saveAnswer(questionId, [optionId]);
    }
  };

  // Matching handler
  const handleMatchingSelect = (questionId, leftKey, rightKey) => {
    const current = answers[questionId] || { matchingPairs: [] };
    const pairs = current.matchingPairs || [];
    const updatedPairs = pairs.filter(p => p.leftKey !== leftKey);

    if (rightKey) {
      updatedPairs.push({ leftKey, rightKey });
    }

    saveAnswer(questionId, { matchingPairs: updatedPairs });
  };

  // Countdown timer format (HH:MM:SS)
  const formatTime = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return [
      h > 0 ? String(h).padStart(2, '0') : null,
      String(m).padStart(2, '0'),
      String(s).padStart(2, '0')
    ].filter(Boolean).join(':');
  };

  // Verify unanswered questions count
  const unansweredCount = useMemo(() => {
    if (!quiz?.questions) return 0;
    return quiz.questions.filter(q => !hasAnswerValue(answers[q.id])).length;
  }, [quiz, answers]);

  // Graded computations for Result Screen
  const parsedResult = useMemo(() => {
    if (!rawResult) return null;
    const score = rawResult.score ?? 0;
    const maxScore = rawResult.maxScore ?? 10;
    const correctCount = rawResult.correctCount ?? rawResult.correctAnswersCount ?? 0;
    const totalCount = rawResult.totalCount ?? rawResult.totalQuestions ?? (quiz?.questions?.length || 1);
    const timeSpent = rawResult.timeSpent ?? rawResult.timeTaken ?? 0;
    const gradedAnswers = rawResult.gradedAnswers || rawResult.answers || [];

    // Map evaluation per question
    const gradedMap = {};
    gradedAnswers.forEach((ans) => {
      gradedMap[ans.questionId] = ans;
    });

    return {
      score,
      maxScore,
      correctCount,
      totalCount,
      timeSpent,
      gradedMap
    };
  }, [rawResult, quiz]);

  // Render question inputs
  const renderQuestionInputs = (q) => {
    const value = answers[q.id];
    switch (q.type) {
      case 'SINGLE_CHOICE':
      case 'TRUE_FALSE':
        return (
          <div className="space-y-2 mt-4">
            {q.answers.map((opt) => {
              const isSelected = Array.isArray(value) && value.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  onClick={() => handleOptionSelect(q.id, opt.id, false)}
                  className={`w-full text-left p-3.5 rounded-xl border text-sm font-medium transition-all flex items-center justify-between ${
                    isSelected
                      ? 'border-blue-600 bg-blue-500/10 text-blue-700 dark:text-blue-200'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50'
                  }`}
                >
                  <span>{opt.content}</span>
                  <div className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                    isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 dark:border-slate-700'
                  }`}>
                    {isSelected && <div className="h-1.5 w-1.5 bg-white rounded-full" />}
                  </div>
                </button>
              );
            })}
          </div>
        );

      case 'MULTIPLE_CHOICE':
        return (
          <div className="space-y-2 mt-4">
            {q.answers.map((opt) => {
              const isSelected = Array.isArray(value) && value.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  onClick={() => handleOptionSelect(q.id, opt.id, true)}
                  className={`w-full text-left p-3.5 rounded-xl border text-sm font-medium transition-all flex items-center justify-between ${
                    isSelected
                      ? 'border-blue-600 bg-blue-500/10 text-blue-700 dark:text-blue-200'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50'
                  }`}
                >
                  <span>{opt.content}</span>
                  <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                    isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 dark:border-slate-700'
                  }`}>
                    {isSelected && <Check className="h-3 w-3" />}
                  </div>
                </button>
              );
            })}
          </div>
        );

      case 'SHORT_ANSWER':
      case 'FILL_IN_BLANK':
        return (
          <div className="mt-4 space-y-2">
            <textarea
              value={typeof value === 'string' ? value : ''}
              onChange={(e) => saveAnswer(q.id, e.target.value)}
              placeholder="Nhập câu trả lời của bạn vào đây..."
              className="w-full min-h-[100px] p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        );

      case 'MATCHING': {
        const pairs = value?.matchingPairs || [];
        return (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-slate-500 font-semibold mb-2">Hãy nối các vế tương ứng ở cột bên trái với cột bên phải:</p>
            {q.correctMatchingPairs.map((pair, idx) => {
              const currentMatch = pairs.find(p => p.leftKey === pair.leftKey)?.rightKey || '';
              return (
                <div key={idx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 rounded-xl border dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
                  <div className="flex-1 text-sm font-semibold p-2 bg-white dark:bg-slate-950 rounded-lg border dark:border-slate-800">
                    {pair.leftKey}
                  </div>
                  <div className="text-slate-400 text-center text-xs shrink-0">&harr;</div>
                  <select
                    value={currentMatch}
                    onChange={(e) => handleMatchingSelect(q.id, pair.leftKey, e.target.value)}
                    className="flex-1 text-sm p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="">-- Chọn ghép nối --</option>
                    {q.matchingRightOptions.map((opt, oIdx) => (
                      <option key={oIdx} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        );
      }

      default:
        return null;
    }
  };

  // Render question detailed evaluations on Result Screen
  const renderGradedQuestion = (q, index) => {
    const graded = parsedResult?.gradedMap[q.id];
    const isCorrect = graded?.isCorrect ?? false;
    const userAnswer = graded?.userAnswer || [];
    const correctAnswer = graded?.correctAnswer || [];

    const isQuizMultiple = q.type === 'MULTIPLE_CHOICE';
    const isQuizSingle = q.type === 'SINGLE_CHOICE' || q.type === 'TRUE_FALSE';

    return (
      <div key={q.id} className="p-5 border-b border-slate-200 dark:border-slate-800 space-y-4">
        {/* Question Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold flex items-center gap-2">
              <span>Câu {index + 1}:</span>
              {isCorrect ? (
                <Badge className="bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 flex items-center gap-1">
                  <Check className="h-3 w-3" /> Đúng
                </Badge>
              ) : (
                <Badge className="bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-300 hover:bg-red-100 flex items-center gap-1">
                  <X className="h-3 w-3" /> Sai
                </Badge>
              )}
            </h4>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mt-1.5">{q.content}</p>
          </div>
        </div>

        {/* Options display and grading marks */}
        {(isQuizSingle || isQuizMultiple) && (
          <div className="space-y-2 pl-2">
            {q.answers.map((opt) => {
              const userChose = userAnswer.includes(opt.id);
              const correctOption = opt.isCorrect ?? correctAnswer.includes(opt.id);

              let optionClass = 'border-slate-200 dark:border-slate-800';
              if (correctOption) {
                optionClass = 'border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200';
              } else if (userChose && !correctOption) {
                optionClass = 'border-red-500 bg-red-500/10 text-red-800 dark:text-red-200';
              }

              return (
                <div
                  key={opt.id}
                  className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between ${optionClass}`}
                >
                  <span>{opt.content}</span>
                  <div className="flex items-center gap-1.5">
                    {correctOption && (
                      <Badge className="bg-emerald-600 text-white text-[9px] hover:bg-emerald-600">Đáp án đúng</Badge>
                    )}
                    {userChose && !correctOption && (
                      <Badge className="bg-red-600 text-white text-[9px] hover:bg-red-600">Lựa chọn của bạn</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Short Answer evaluation */}
        {(q.type === 'SHORT_ANSWER' || q.type === 'FILL_IN_BLANK') && (
          <div className="space-y-2.5 pl-2 text-xs font-semibold">
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <span className="text-slate-500 block mb-1">Câu trả lời của bạn:</span>
              <p className="italic text-slate-800 dark:text-slate-100">{userAnswer[0] || '(Không có câu trả lời)'}</p>
            </div>
            <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-500/5">
              <span className="text-emerald-600 dark:text-emerald-400 block mb-1">Đáp án mẫu chuẩn:</span>
              <p className="italic text-emerald-800 dark:text-emerald-100">{correctAnswer[0] || 'Vui lòng đọc lời giải chi tiết bên dưới.'}</p>
            </div>
          </div>
        )}

        {/* Matching evaluation */}
        {q.type === 'MATCHING' && (
          <div className="space-y-2 pl-2 text-xs font-semibold">
            <div className="grid grid-cols-1 gap-2">
              {q.correctMatchingPairs.map((pair, idx) => {
                const userMatch = (userAnswer || []).find(p => p.leftKey === pair.leftKey)?.rightKey || '';
                const matchCorrect = userMatch === pair.rightKey;

                return (
                  <div key={idx} className={`p-2.5 rounded-lg border flex items-center justify-between ${
                    matchCorrect 
                      ? 'border-emerald-500 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300' 
                      : 'border-red-400 bg-red-500/5 text-red-800 dark:text-red-300'
                  }`}>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold">{pair.leftKey}</span>
                      <span>&harr;</span>
                      <span className="italic">{userMatch || '(Chưa chọn ghép nối)'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {!matchCorrect && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                          Đáp án đúng: {pair.rightKey}
                        </span>
                      )}
                      {matchCorrect ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <X className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Detailed Explanation */}
        {q.explanation && (
          <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/10 text-xs">
            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold mb-1">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              <span>Giải thích chi tiết:</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-medium">{q.explanation}</p>
          </div>
        )}
      </div>
    );
  };

  // Rendering by main ViewState
  if (viewState === 'LOADING') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mb-4" />
        <p className="text-sm font-semibold">Đang tải cấu trúc đề thi...</p>
      </div>
    );
  }

  if (viewState === 'ERROR') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-slate-950 text-slate-100">
        <AlertTriangle className="h-16 w-16 text-amber-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Đã Có Lỗi Xảy Ra</h1>
        <p className="text-sm text-slate-400 max-w-md mb-6">
          Không thể tìm thấy hoặc khởi tạo phiên làm bài trắc nghiệm thử này. Liên kết có thể đã hết hạn hoặc bị gỡ bỏ.
        </p>
        <Button onClick={() => navigate(`/group-showcase/${workspaceId}`)} className="bg-blue-600 text-white">
          Quay lại Showcase
        </Button>
      </div>
    );
  }

  // --- RESULT VIEW STATE ---
  if (viewState === 'RESULT') {
    const accuracy = parsedResult ? Math.round((parsedResult.correctCount / parsedResult.totalCount) * 100) : 0;
    const timeSpentStr = parsedResult ? formatTime(parsedResult.timeSpent) : '00:00';

    return (
      <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
        {/* Navbar */}
        <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800">
          <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
            <button
              onClick={() => navigate(`/group-showcase/${workspaceId}`)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition font-semibold"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Quay lại Showcase</span>
            </button>
            <span className="font-extrabold text-sm text-slate-200 truncate max-w-sm">
              Kết quả: {quiz?.title}
            </span>
            <div className="w-20" /> {/* Spacer */}
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 space-y-6">
          {/* Result Banner Summary */}
          <Card className="bg-slate-900/60 border-slate-800 shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 h-32 w-32 bg-blue-500/10 rounded-full blur-2xl" />
            <div className="absolute bottom-0 left-0 h-32 w-32 bg-purple-500/10 rounded-full blur-2xl" />
            <CardContent className="pt-8 text-center space-y-6">
              <div className="inline-flex h-20 w-20 rounded-full bg-blue-500/10 border border-blue-500/20 items-center justify-center">
                <Award className="h-10 w-10 text-blue-500" />
              </div>

              <div className="space-y-1">
                <h2 className="text-xl md:text-2xl font-black">Hoàn Thành Bài Kiểm Tra Thử</h2>
                <p className="text-xs text-slate-400">Hệ thống đã chấm điểm tự động bài làm của bạn.</p>
              </div>

              {/* Stat grid */}
              <div className="grid grid-cols-3 gap-2.5 max-w-md mx-auto">
                <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800">
                  <span className="block text-2xl font-black text-blue-500">{accuracy}%</span>
                  <span className="text-[10px] uppercase font-bold text-slate-500">Độ chính xác</span>
                </div>
                <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800">
                  <span className="block text-2xl font-black text-emerald-500">
                    {parsedResult?.correctCount} / {parsedResult?.totalCount}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-slate-500">Số câu đúng</span>
                </div>
                <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800">
                  <span className="block text-2xl font-black text-rose-500">{timeSpentStr}</span>
                  <span className="text-[10px] uppercase font-bold text-slate-500">Thời gian làm</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Graded Questions review */}
          <Card className="bg-slate-900/30 border-slate-800 shadow-xl overflow-hidden">
            <CardHeader className="border-b border-slate-800">
              <CardTitle className="text-base font-bold">Xem lại câu hỏi & Lời giải chi tiết</CardTitle>
            </CardHeader>
            <div className="divide-y divide-slate-800">
              {quiz?.questions.map((q, idx) => renderGradedQuestion(q, idx))}
            </div>
          </Card>

          {/* Back Action */}
          <div className="flex justify-center pt-2">
            <Button
              onClick={() => navigate(`/group-showcase/${workspaceId}`)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3 rounded-2xl shadow-lg shadow-blue-500/10"
            >
              Quay lại Trang chủ Showcase
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // --- TAKING SCREEN STATE ---
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 select-none">
      {/* Quiz Top bar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Badge className="bg-blue-600 text-white text-[10px] font-black shrink-0 hover:bg-blue-600">Làm thử</Badge>
            <span className="font-extrabold text-sm truncate pr-2">
              {quiz?.title}
            </span>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {/* Timer countdown */}
            {quiz?.totalTime > 0 && (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
                remainingSeconds < 60 
                  ? 'border-red-500 bg-red-500/10 text-red-400 animate-pulse'
                  : remainingSeconds < 300
                    ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                    : 'border-slate-800 bg-slate-900 text-slate-300'
              }`}>
                <Clock className="h-4 w-4" />
                <span>{formatTime(remainingSeconds)}</span>
              </div>
            )}
            <Button
              onClick={handleUserSubmit}
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 flex items-center gap-1 rounded-xl shadow-md shadow-emerald-500/10"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Nộp bài</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main taking dashboard */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 flex flex-col md:flex-row gap-6 items-stretch">
        {/* Navigation Sidebar (Left) */}
        <div className="w-full md:w-[220px] shrink-0 space-y-4">
          <Card className="bg-slate-900/60 border-slate-800">
            <CardHeader className="p-4 border-b border-slate-800">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">Mục lục câu hỏi</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-5 gap-1.5">
                {quiz?.questions.map((q, idx) => {
                  const hasAns = hasAnswerValue(answers[q.id]);
                  const isActive = activeQuestionIndex === idx;

                  let btnClass = 'border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-900';
                  if (isActive) {
                    btnClass = 'border-blue-600 bg-blue-600/20 text-blue-400 ring-2 ring-blue-500/50';
                  } else if (hasAns) {
                    btnClass = 'border-slate-700 bg-blue-500/10 text-blue-400';
                  }

                  return (
                    <button
                      key={q.id}
                      onClick={() => setActiveQuestionIndex(idx)}
                      className={`h-9 rounded-xl border text-xs font-bold transition flex items-center justify-center ${btnClass}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Status info */}
              <div className="mt-4 pt-4 border-t border-slate-800 space-y-2 text-[10px] text-slate-500">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500/10 border border-slate-700" />
                  <span>Chưa trả lời</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500/10 border border-slate-500 text-blue-400 bg-blue-500/10" />
                  <span>Đã trả lời</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Current Question panel (Right) */}
        <div className="flex-1 min-w-0">
          {currentQuestion && (
            <Card className="bg-slate-900/40 border-slate-800 shadow-xl min-h-[420px] flex flex-col justify-between">
              <div>
                <CardHeader className="border-b border-slate-800 pb-4">
                  <div className="flex justify-between items-center gap-2">
                    <Badge variant="outline" className="text-slate-400 border-slate-800 text-[10px]">
                      Câu {activeQuestionIndex + 1} trên {quiz?.questions.length}
                    </Badge>
                    <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 text-[10px]">
                      {currentQuestion.type === 'SINGLE_CHOICE' && 'Chọn một đáp án'}
                      {currentQuestion.type === 'MULTIPLE_CHOICE' && 'Chọn nhiều đáp án'}
                      {currentQuestion.type === 'TRUE_FALSE' && 'Đúng hoặc Sai'}
                      {currentQuestion.type === 'SHORT_ANSWER' && 'Tự luận viết câu trả lời'}
                      {currentQuestion.type === 'FILL_IN_BLANK' && 'Điền ô trống'}
                      {currentQuestion.type === 'MATCHING' && 'Ghép đôi tương ứng'}
                    </Badge>
                  </div>
                  <CardTitle className="text-base font-semibold leading-relaxed mt-4">
                    {currentQuestion.content}
                  </CardTitle>
                </CardHeader>

                <CardContent className="pt-4">
                  {renderQuestionInputs(currentQuestion)}
                </CardContent>
              </div>

              {/* Prev / Next controls */}
              <div className="p-4 border-t border-slate-800 flex justify-between gap-4 mt-auto">
                <Button
                  variant="outline"
                  className="border-slate-800 hover:bg-slate-900 text-slate-300 rounded-xl"
                  onClick={() => setActiveQuestionIndex(prev => Math.max(0, prev - 1))}
                  disabled={activeQuestionIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-1.5" />
                  <span>Quay lại</span>
                </Button>

                {activeQuestionIndex === quiz.questions.length - 1 ? (
                  <Button
                    onClick={handleUserSubmit}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/10"
                  >
                    <span>Hoàn thành & Nộp bài</span>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="border-slate-800 hover:bg-slate-900 text-slate-300 rounded-xl"
                    onClick={() => setActiveQuestionIndex(prev => Math.min(quiz.questions.length - 1, prev + 1))}
                  >
                    <span>Tiếp theo</span>
                    <ChevronRight className="h-4 w-4 ml-1.5" />
                  </Button>
                )}
              </div>
            </Card>
          )}
        </div>
      </main>

      {/* Confirmation Dialog for Submission */}
      <Dialog open={isSubmitConfirmOpen} onOpenChange={setIsSubmitConfirmOpen}>
        <DialogContent className="max-w-sm bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-500">
              <AlertTriangle className="h-5 w-5" />
              <span>Nộp bài trắc nghiệm?</span>
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Bạn có chắc chắn muốn nộp bài để xem điểm chuẩn tự động không?
              {unansweredCount > 0 && (
                <span className="block text-rose-500 font-bold text-xs mt-2">
                  Chú ý: Bạn còn {unansweredCount} câu hỏi chưa hoàn thành.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex gap-2 sm:justify-end mt-4">
            <Button
              variant="ghost"
              onClick={() => setIsSubmitConfirmOpen(false)}
              disabled={isSubmitting}
            >
              Hủy làm tiếp
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
              onClick={() => performSubmit(false)}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Đang nộp bài...' : 'Nộp bài ngay'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
