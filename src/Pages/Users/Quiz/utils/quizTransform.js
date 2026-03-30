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

  const rawTimerMode = apiQuiz.timerMode;
  const isTotalTimerMode = rawTimerMode === true
    || rawTimerMode === 'true'
    || rawTimerMode === 1
    || rawTimerMode === '1'
    || rawTimerMode === 'TOTAL';
  const rawDuration = Number(apiQuiz.duration) || 0;
  // Legacy FE bug sent minutes as seconds into durationInMinute, and BE converted again.
  // Example: 15 -> FE sends 900 -> BE stores 54000 seconds.
  const normalizedDurationInSeconds = isTotalTimerMode && rawDuration >= 36000
    ? Math.floor(rawDuration / 60)
    : rawDuration;
  const totalTimeInSeconds = isTotalTimerMode
    ? normalizedDurationInSeconds
    : rawDuration * 60;
  const questions = [];
  const sections = apiQuiz.sections || [];
  for (const section of sections) {
    for (const q of section.questions || []) {
      const cardType = getCardQuestionType(q.questionTypeId);
      const normalizedTimeLimit = isTotalTimerMode
        ? 0
        : Math.max(1, Number(q.duration) || 0);
      questions.push({
        id: q.questionId,
        content: q.content,
        type: cardType,
        difficulty: q.difficulty || 'MEDIUM',
        score: q.score || 0,
        explanation: q.explanation || '',
        timeLimit: normalizedTimeLimit,
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
    workspaceId: apiQuiz.workspaceId || apiQuiz.workSpaceId || apiQuiz.workspace?.workspaceId || null,
    title: apiQuiz.title,
    description: '',
    timerMode: isTotalTimerMode ? 'TOTAL' : 'PER_QUESTION',
    totalTime: totalTimeInSeconds,
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

export function getFirstIncompleteQuestionIndex(questions = [], savedAnswers = []) {
  if (!Array.isArray(questions) || questions.length === 0) {
    return 0;
  }

  const answeredQuestionIds = new Set(
    (savedAnswers || [])
      .filter((savedAnswer) => hasAnswerValue({
        selectedAnswerIds: savedAnswer?.selectedAnswerIds,
        textAnswer: savedAnswer?.textAnswer,
      }))
      .map((savedAnswer) => Number(savedAnswer?.questionId))
      .filter((questionId) => Number.isFinite(questionId)),
  );

  const firstIncompleteIndex = questions.findIndex((question) => !answeredQuestionIds.has(Number(question?.id)));
  return firstIncompleteIndex === -1 ? Math.max(questions.length - 1, 0) : firstIncompleteIndex;
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

export function getCorrectTextAnswers(question) {
  const answers = Array.isArray(question?.answers) ? question.answers : [];
  const correctAnswers = answers
    .filter(answer => answer?.isCorrect)
    .map(answer => (typeof answer?.content === 'string' ? answer.content.trim() : ''))
    .filter(Boolean);

  if (correctAnswers.length > 0) {
    return correctAnswers;
  }

  return answers
    .map(answer => (typeof answer?.content === 'string' ? answer.content.trim() : ''))
    .filter(Boolean);
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
      const normalizedQuestionId = Number(questionId);
      if (!Number.isFinite(normalizedQuestionId)) {
        return payload;
      }

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

      // Keep empty answers in the payload so the backend can clear previously saved data.
      payload.push({
        questionId: normalizedQuestionId,
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

export function buildSingleQuestionPayload(questionId, answerValue) {
  const normalizedQuestionId = Number(questionId);
  if (!Number.isFinite(normalizedQuestionId)) {
    return null;
  }

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
    questionId: normalizedQuestionId,
    selectedAnswerIds,
    textAnswer: normalizedTextAnswer || null,
  };
}
