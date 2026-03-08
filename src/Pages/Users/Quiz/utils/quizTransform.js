import { QUESTION_TYPE_ID_MAP } from '@/api/QuizAPI';

const QUESTION_TYPE_TO_CARD = {
  multipleChoice: 'SINGLE_CHOICE',
  multipleSelect: 'MULTIPLE_CHOICE',
  shortAnswer: 'SHORT_ANSWER',
  trueFalse: 'TRUE_FALSE',
  fillBlank: 'FILL_IN_BLANK',
};

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
      const frontendType = QUESTION_TYPE_ID_MAP[q.questionTypeId] || 'multipleChoice';
      const cardType = QUESTION_TYPE_TO_CARD[frontendType] || 'SINGLE_CHOICE';
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

/**
 * Transform local answers map { questionId: [answerId, ...] }
 * → API request format for saveAnswer endpoint
 */
export function buildSavePayload(answers) {
  return Object.entries(answers)
    .filter(([, ids]) => ids.length > 0)
    .map(([questionId, selectedAnswerIds]) => ({
      questionId: Number(questionId),
      selectedAnswerIds,
      textAnswer: null,
    }));
}
