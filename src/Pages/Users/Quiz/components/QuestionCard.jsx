import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/Components/ui/input';
import { getCorrectTextAnswer } from '../utils/quizTransform';
import './QuestionCard.css';

const DIFFICULTY_STYLES = {
  EASY: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  MEDIUM: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  HARD: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

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

export default function QuestionCard({
  question, questionNumber, totalQuestions,
  answerValue, selectedAnswers = [], onSelectAnswer, onTextAnswerChange,
  showResult = false, showExplanation = false, disabled = false,
}) {
  const isMultiple = question.type === 'MULTIPLE_CHOICE';
  const isTextQuestion = question.type === 'SHORT_ANSWER' || question.type === 'FILL_IN_BLANK';
  const normalizedSelectedAnswers = Array.isArray(answerValue)
    ? answerValue
    : Array.isArray(selectedAnswers)
      ? selectedAnswers
      : [];
  const textAnswer = typeof answerValue === 'string' ? answerValue : '';
  const correctTextAnswer = getCorrectTextAnswer(question);

  const isFullyCorrect = useMemo(() => {
    if (typeof question.isCorrect === 'boolean') {
      return question.isCorrect;
    }

    if (isTextQuestion) {
      if (!textAnswer.trim()) return false;
      return textAnswer.trim().toLowerCase() === correctTextAnswer.trim().toLowerCase();
    }

    const correctIds = question.answers.filter(a => a.isCorrect).map(a => a.id);
    return correctIds.length === normalizedSelectedAnswers.length && correctIds.every(id => normalizedSelectedAnswers.includes(id));
  }, [question.answers, question.isCorrect, isTextQuestion, textAnswer, correctTextAnswer, normalizedSelectedAnswers]);

  const getStateClass = (answer) => {
    if (showResult) {
      if (answer.isCorrect) return 'quiz-answer-correct';
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

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-md shadow-slate-900/10 dark:shadow-blue-900/50 border border-slate-200 dark:border-slate-700">
      <div className="flex items-start justify-between mb-4 gap-3">
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 leading-relaxed">{question.content}</h3>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={cn('px-2 py-0.5 rounded text-xs font-semibold', DIFFICULTY_STYLES[question.difficulty])}>{question.difficulty}</span>
          <span className="bg-slate-900 dark:bg-slate-600 text-white px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap">{questionNumber}/{totalQuestions}</span>
        </div>
      </div>

      {isMultiple && <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 italic">Select all that apply</p>}

      {isTextQuestion ? (
        <div className="space-y-3">
          <Input
            value={textAnswer}
            disabled={disabled || showResult}
            onChange={(event) => onTextAnswerChange?.(event.target.value)}
            placeholder={question.type === 'FILL_IN_BLANK' ? 'Điền câu trả lời của bạn' : 'Nhập câu trả lời ngắn'}
            className="h-11 border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 focus-visible:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
          />

          {showResult && (
            <div className={cn(
              'rounded-lg border px-3 py-2 text-sm',
              isFullyCorrect
                ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/50 dark:bg-green-950/20 dark:text-green-400'
                : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-400',
            )}>
              <p><span className="font-semibold">Câu trả lời của bạn:</span> {textAnswer.trim() || 'Chưa trả lời'}</p>
              <p><span className="font-semibold">Đáp án đúng:</span> {correctTextAnswer || 'Không có dữ liệu'}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {question.answers.map((answer) => (
            <button
              key={answer.id}
              type="button"
              disabled={disabled || showResult}
              onClick={() => onSelectAnswer?.(answer.id)}
              className={cn(
                'quiz-answer w-full flex items-center gap-3 p-3.5 rounded-lg border text-sm font-semibold text-left transition-all duration-300',
                'text-slate-700 dark:text-slate-300',
                getStateClass(answer),
                getAnswerTailwind(answer),
                (disabled || showResult) ? 'cursor-default' : 'cursor-pointer',
              )}
            >
              {isMultiple ? <CheckboxIndicator id={answer.id} /> : <RadioIndicator />}
              <span>{answer.content}</span>
            </button>
          ))}
        </div>
      )}

      {showResult && (
        <div className="mt-3">
          {isTextQuestion
            ? (!textAnswer.trim()
                ? <span className="text-slate-500 dark:text-slate-400 font-semibold text-sm">No answer provided</span>
                : isFullyCorrect
                  ? <span className="text-green-600 dark:text-green-400 font-semibold text-sm">✓ Correct!</span>
                  : <span className="text-red-600 dark:text-red-400 font-semibold text-sm">✗ Incorrect</span>)
            : normalizedSelectedAnswers.length === 0
              ? <span className="text-slate-500 dark:text-slate-400 font-semibold text-sm">No answer selected</span>
              : isFullyCorrect
                ? <span className="text-green-600 dark:text-green-400 font-semibold text-sm">✓ Correct!</span>
                : <span className="text-red-600 dark:text-red-400 font-semibold text-sm">✗ Incorrect</span>
          }
        </div>
      )}

      {showExplanation && (
        <div className="mt-3 p-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            <span className="font-semibold">Explanation: </span>{question.explanation}
          </p>
        </div>
      )}
    </div>
  );
}
