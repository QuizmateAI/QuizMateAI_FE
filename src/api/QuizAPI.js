import api from './api';

// ==================== QUIZ ====================

// Lấy danh sách quiz theo contextType và contextId
export const getQuizzesByContext = async (contextType, contextId) => {
  const response = await api.get(`/quiz/getByContext/${contextType}/${contextId}`);
  return response;
};

// Tạo quiz mới (Bước 1)
export const createQuiz = async (data) => {
  const response = await api.post('/quiz/create', data);
  return response;
};

// Cập nhật quiz theo quizId
export const updateQuiz = async (quizId, data) => {
  const response = await api.put(`/quiz/${quizId}`, data);
  return response;
};

// Xóa quiz theo quizId
export const deleteQuiz = async (quizId) => {
  const response = await api.delete(`/quiz/${quizId}`);
  return response;
};

// ==================== QUIZ SESSION ====================

// Lấy toàn bộ session thuộc một quiz
export const getSessionsByQuiz = async (quizId) => {
  const response = await api.get(`/quiz-sessions/byQuiz/${quizId}`);
  return response;
};

// Tạo session cho quiz (Bước 2)
export const createQuizSession = async (data) => {
  const response = await api.post('/quiz-sessions/create', data);
  return response;
};

// Cập nhật quiz session
export const updateQuizSession = async (sessionId, data) => {
  const response = await api.put(`/quiz-sessions/${sessionId}`, data);
  return response;
};

// Xóa quiz session
export const deleteQuizSession = async (sessionId) => {
  const response = await api.delete(`/quiz-sessions/${sessionId}`);
  return response;
};

// ==================== QUESTION ====================

// Lấy toàn bộ câu hỏi thuộc một session
export const getQuestionsBySession = async (sessionId) => {
  const response = await api.get(`/questions/bySession/${sessionId}`);
  return response;
};

// Tạo câu hỏi cho session (Bước 3)
export const createQuestion = async (data) => {
  const response = await api.post('/questions/create', data);
  return response;
};

// Cập nhật câu hỏi
export const updateQuestion = async (questionId, data) => {
  const response = await api.put(`/questions/${questionId}`, data);
  return response;
};

// Xóa câu hỏi
export const deleteQuestion = async (questionId) => {
  const response = await api.delete(`/questions/${questionId}`);
  return response;
};

// Đánh dấu/bỏ dấu sao câu hỏi
export const toggleStarQuestion = async (questionId) => {
  const response = await api.patch(`/questions/${questionId}/star/toggle`);
  return response;
};

// ==================== ANSWER ====================

// Lấy danh sách đáp án của một câu hỏi
export const getAnswersByQuestion = async (questionId) => {
  const response = await api.get(`/answers/byQuestion/${questionId}`);
  return response;
};

// Tạo đáp án cho câu hỏi (Bước 4)
export const createAnswer = async (data) => {
  const response = await api.post('/answers/create', data);
  return response;
};

// Cập nhật đáp án
export const updateAnswer = async (answerId, data) => {
  const response = await api.put(`/answers/${answerId}`, data);
  return response;
};

// Xóa đáp án
export const deleteAnswer = async (answerId) => {
  const response = await api.delete(`/answers/${answerId}`);
  return response;
};

// ==================== HELPER: Tạo quiz hoàn chỉnh (multi-step) ====================

// Map loại câu hỏi từ frontend sang questionTypeId backend
const QUESTION_TYPE_MAP = {
  multipleChoice: 1,   // SINGLE_CHOICE
  multipleSelect: 2,   // MULTIPLE_CHOICE
  shortAnswer: 3,      // SHORT_ANSWER
  trueFalse: 4,         // TRUE_FALSE
  fillBlank: 5,         // FILL_IN_BLANK
};

// Map ngược từ questionTypeId sang tên frontend
export const QUESTION_TYPE_ID_MAP = {
  1: 'multipleChoice',
  2: 'multipleSelect',
  3: 'shortAnswer',
  4: 'trueFalse',
  5: 'fillBlank',
};

// Map difficulty frontend sang backend
const DIFFICULTY_MAP = {
  easy: 'EASY',
  medium: 'MEDIUM',
  hard: 'HARD',
};

/**
 * Tạo quiz hoàn chỉnh theo flow multi-step:
 * 1. Tạo Quiz → quizId
 * 2. Tạo Session → sessionId
 * 3. Tạo từng Question → questionId
 * 4. Tạo Answer cho từng Question
 * 5. Cập nhật quiz sang ACTIVE
 */
export const createFullQuiz = async ({
  contextType,
  contextId,
  title,
  duration,
  quizIntent = 'PRE_LEARNING',
  timerMode = true,
  passingScore,
  maxAttempt,
  overallDifficulty,
  questions = [],
}) => {
  // Bước 1: Tạo quiz
  const quizRes = await createQuiz({
    contextType,
    contextId,
    title,
    duration,
    quizIntent,
    timerMode,
    createVia: 'MANUAL',
  });
  const quiz = quizRes.data;
  const quizId = quiz.quizId;

  // Bước 2: Tạo session gốc (ROOT)
  const sessionRes = await createQuizSession({
    quizId,
    parentSessionId: null,
    sessionType: 'ROOT',
    content: title,
    scorePerQuestion: 0,
  });
  const session = sessionRes.data;
  const sessionId = session.sessionId;

  // Bước 3 & 4: Tạo từng câu hỏi và đáp án
  for (const q of questions) {
    const questionTypeId = QUESTION_TYPE_MAP[q.type] || 1;
    const difficulty = DIFFICULTY_MAP[q.difficulty] || DIFFICULTY_MAP[overallDifficulty] || 'MEDIUM';

    const questionRes = await createQuestion({
      quizSessionId: sessionId,
      questionTypeId,
      bloomId: q.bloomId || 1,
      duration: q.duration || 0,
      difficulty,
      content: q.text,
      explanation: q.explanation || '',
    });
    const question = questionRes.data;
    const questionId = question.questionId;

    // Tạo đáp án tùy theo loại câu hỏi
    if (q.type === 'multipleChoice' || q.type === 'multipleSelect') {
      for (const ans of (q.answers || [])) {
        await createAnswer({
          questionId,
          content: ans.text,
          isCorrect: ans.correct,
        });
      }
    } else if (q.type === 'trueFalse') {
      // Tạo 2 đáp án True/False
      await createAnswer({ questionId, content: 'True', isCorrect: q.correctAnswer === 'true' });
      await createAnswer({ questionId, content: 'False', isCorrect: q.correctAnswer === 'false' || q.correctAnswer !== 'true' });
    } else if (q.type === 'fillBlank' || q.type === 'shortAnswer') {
      // Tạo đáp án đúng duy nhất
      await createAnswer({
        questionId,
        content: q.correctAnswer || '',
        isCorrect: true,
      });
    }
  }

  // Bước 5: Cập nhật quiz sang ACTIVE với passScore và maxAttempt
  const updatedQuiz = await updateQuiz(quizId, {
    contextType,
    contextId,
    quizIntent,
    duration,
    status: 'ACTIVE',
    timerMode,
    maxAttempt: maxAttempt || null,
    passScore: passingScore || null,
    createVia: 'MANUAL',
    title,
    overallDifficulty: DIFFICULTY_MAP[overallDifficulty] || null,
  });

  return updatedQuiz.data;
};
