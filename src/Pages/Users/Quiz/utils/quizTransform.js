import { QUESTION_TYPE_ID_MAP } from '@/api/QuizAPI';

const QUESTION_TYPE_TO_CARD = {
  multipleChoice: 'SINGLE_CHOICE',
  multipleSelect: 'MULTIPLE_CHOICE',
  shortAnswer: 'SHORT_ANSWER',
  trueFalse: 'TRUE_FALSE',
  fillBlank: 'FILL_IN_BLANK',
};

export function getCardQuestionType(questionTypeId) {
  const frontendType = QUESTION_TYPE_ID_MAP[questionTypeId] || 'multipleChoice';
  return QUESTION_TYPE_TO_CARD[frontendType] || 'SINGLE_CHOICE';
}

/**
 * Transform API full-quiz response → normalized format for QuestionCard.
 * Flattens all questions from all sections into a single ordered list.
 */
export function normalizeQuizData(apiQuiz) {
  if (!apiQuiz) return null;

  const questions = [];
  const sections = apiQuiz.sections || [];
  for (const section of sections) {
    for (const q of section.questions || []) {
      const cardType = getCardQuestionType(q.questionTypeId);
      questions.push({
        id: q.questionId,
        content: q.content,
        type: cardType,
        difficulty: q.difficulty || 'MEDIUM',
        score: q.score || 0,
        explanation: q.explanation || '',
        timeLimit: q.duration || 0,
        answers: (q.answers || []).map(a => ({
          id: a.answerId,
          content: a.content,
          isCorrect: a.isCorrect,
        })),
      });
    }
  }

  return {
    quizId: apiQuiz.quizId,
    title: apiQuiz.title,
    description: '',
    timerMode: apiQuiz.timerMode === true ? 'TOTAL' : 'PER_QUESTION',
    totalTime: (apiQuiz.duration || 0) * 60,
    maxAttempt: apiQuiz.maxAttempt,
    passScore: apiQuiz.passScore,
    maxScore: apiQuiz.maxScore,
    status: apiQuiz.status,
    questions,
  };
}

export function mapSavedAnswersToState(savedAnswers = []) {
  return savedAnswers.reduce((result, savedAnswer) => {
    const selectedAnswerIds = Array.isArray(savedAnswer?.selectedAnswerIds)
      ? savedAnswer.selectedAnswerIds.filter(answerId => answerId != null)
      : [];
    const textAnswer = typeof savedAnswer?.textAnswer === 'string'
      ? savedAnswer.textAnswer
      : '';

    if (selectedAnswerIds.length > 0) {
      result[savedAnswer.questionId] = selectedAnswerIds;
    } else if (textAnswer.trim()) {
      result[savedAnswer.questionId] = textAnswer;
    }

    return result;
  }, {});
}

export function hasAnswerValue(answerValue) {
  if (Array.isArray(answerValue)) {
    return answerValue.length > 0;
  }

  if (typeof answerValue === 'string') {
    return answerValue.trim().length > 0;
  }

  if (answerValue && typeof answerValue === 'object') {
    return hasAnswerValue(answerValue.selectedAnswerIds) || hasAnswerValue(answerValue.textAnswer);
  }

  return false;
}

export function getCorrectTextAnswer(question) {
  return question?.answers?.find(answer => answer.isCorrect)?.content || '';
}

export function getAttemptRemainingSeconds(timeoutAt, fallbackSeconds = 0) {
  if (!timeoutAt) {
    return Math.max(0, fallbackSeconds);
  }

  const timeoutTime = new Date(timeoutAt).getTime();
  if (Number.isNaN(timeoutTime)) {
    return Math.max(0, fallbackSeconds);
  }

  return Math.max(0, Math.ceil((timeoutTime - Date.now()) / 1000));
}

/**
 * Transform local answers map { questionId: [answerId, ...] }
 * → API request format for saveAnswer endpoint
 */
export function buildSavePayload(answers) {
  return Object.entries(answers)
    .reduce((payload, [questionId, answerValue]) => {
      const selectedAnswerIds = Array.isArray(answerValue)
        ? answerValue.filter(answerId => answerId != null)
        : [];
      const textAnswer = typeof answerValue === 'string'
        ? answerValue.trim()
        : typeof answerValue?.textAnswer === 'string'
          ? answerValue.textAnswer.trim()
          : null;
      const normalizedSelectedAnswerIds = Array.isArray(answerValue?.selectedAnswerIds)
        ? answerValue.selectedAnswerIds.filter(answerId => answerId != null)
        : selectedAnswerIds;

      if (normalizedSelectedAnswerIds.length === 0 && !textAnswer) {
        return payload;
      }

      payload.push({
        questionId: Number(questionId),
        selectedAnswerIds: normalizedSelectedAnswerIds,
        textAnswer: textAnswer || null,
      });

      return payload;
    }, []);
}

/**
 * Build submit payload that includes all quiz questions.
 * Unanswered questions are still sent with empty selectedAnswerIds and null textAnswer.
 */
export function buildSubmitPayload(questions = [], answers = {}) {
  return (questions || []).map((question) => {
    const questionId = Number(question?.id);
    const answerValue = answers?.[question?.id];

    const selectedAnswerIds = Array.isArray(answerValue)
      ? answerValue.filter(answerId => answerId != null)
      : Array.isArray(answerValue?.selectedAnswerIds)
        ? answerValue.selectedAnswerIds.filter(answerId => answerId != null)
        : [];

    const normalizedTextAnswer = typeof answerValue === 'string'
      ? answerValue.trim()
      : typeof answerValue?.textAnswer === 'string'
        ? answerValue.textAnswer.trim()
        : '';

    return {
      questionId,
      selectedAnswerIds,
      textAnswer: normalizedTextAnswer || null,
    };
  }).filter(item => Number.isFinite(item.questionId));
}
