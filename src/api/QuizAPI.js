import api from './api';

// ==================== QUIZ ====================

// Lấy danh sách quiz theo contextType và scopeId
export const getQuizzesByScope = async (contextType, scopeId) => {
  let url = '';
  if (contextType === 'WORKSPACE') url = `/quiz/getByWorkspace/${scopeId}`;
  else if (contextType === 'ROADMAP') url = `/quiz/getByRoadmap/${scopeId}`;
  else if (contextType === 'PHASE') url = `/quiz/getByPhase/${scopeId}`;
  else if (contextType === 'KNOWLEDGE') url = `/quiz/getByKnowledge/${scopeId}`;
  
  if (url) return await api.get(url);
  throw new Error('Invalid contextType');
};

// Lấy danh sách quiz của user đang đăng nhập
export const getQuizzesByUser = async () => {
  const response = await api.get('/quiz/getByUser');
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

// ==================== QUIZ SECTION ====================

// Lấy toàn bộ section thuộc một quiz
export const getSectionsByQuiz = async (quizId) => {
  const response = await api.get(`/quiz-sections/byQuiz/${quizId}`);
  return response;
};

// Tạo section cho quiz (Bước 2)
export const createQuizSection = async (data) => {
  const response = await api.post('/quiz-sections/create', data);
  return response;
};

// Cập nhật quiz section
export const updateQuizSection = async (sectionId, data) => {
  const response = await api.put(`/quiz-sections/${sectionId}`, data);
  return response;
};

// Xóa quiz section
export const deleteQuizSection = async (sectionId) => {
  const response = await api.delete(`/quiz-sections/${sectionId}`);
  return response;
};

// ==================== QUESTION ====================

// Lấy toàn bộ câu hỏi thuộc một section
export const getQuestionsBySection = async (sectionId) => {
  const response = await api.get(`/questions/bySection/${sectionId}`);
  return response;
};

// Tạo câu hỏi cho section (Bước 3)
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

// ==================== QUIZ FULL & ATTEMPT ====================

// Lấy đầy đủ quiz kèm section, question và answer
export const getQuizFull = async (quizId) => {
  const response = await api.get(`/quiz/${quizId}/full`);
  return response;
};

// Tạo attempt mới hoặc trả lại attempt chưa hoàn thành
export const startQuizAttempt = async (quizId, { isCompanionMode = false, isPracticeMode = true } = {}) => {
  const response = await api.post(`/quiz-attempts/start/${quizId}?isCompanionMode=${isCompanionMode}&isPracticeMode=${isPracticeMode}`);
  return response;
};

// Lưu danh sách câu trả lời (upsert theo attempt + question)
export const saveAttemptAnswers = async (attemptId, answers) => {
  const response = await api.put(`/quiz-attempts/${attemptId}/saveAnswer`, answers);
  return response;
};

// Lấy kết quả chi tiết của attempt
export const getAttemptResult = async (attemptId) => {
  const response = await api.get(`/quiz-attempts/${attemptId}/result`);
  return response;
};

// Lấy trạng thái + dữ liệu AI assessment của attempt
export const getAttemptAssessment = async (attemptId) => {
  const response = await api.get(`/quiz-attempts/${attemptId}/assessment`);
  return response;
};

// Lấy danh sách recommendation PENDING của workspace cá nhân
export const getPendingRecommendations = async (workspaceId) => {
  const response = await api.get(`/workspace-assessments/pending-recommendations?workspaceId=${workspaceId}`);
  return response;
};

// Tạo quiz từ workspace assessment (tái sử dụng pipeline AI quiz)
export const generateQuizFromWorkspaceAssessment = async (assessmentId) => {
  const response = await api.post(`/workspace-assessments/${assessmentId}/generate-quiz`);
  return response;
};

// Lấy lịch sử làm bài của 1 quiz
export const getQuizHistory = async (quizId) => {
  const response = await api.get(`/quiz-attempts/history?quizId=${quizId}`);
  return response;
};

// Nộp bài — đóng attempt và trả về kết quả
export const submitAttempt = async (attemptId, answers) => {
  const hasRequestBody = Array.isArray(answers);
  console.debug('[QuizAPI] submitAttempt', {
    attemptId,
    hasRequestBody,
    answersCount: hasRequestBody ? answers.length : null,
  });

  if (hasRequestBody) {
    const response = await api.post(`/quiz-attempts/${attemptId}/submit`, answers, { timeout: 60000 });
    return response;
  }

  const response = await api.post(`/quiz-attempts/${attemptId}/submit`, undefined, { timeout: 60000 });
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
 * 2. Tạo Section → sectionId
 * 3. Tạo từng Question → questionId
 * 4. Tạo Answer cho từng Question
 * 5. Cập nhật quiz sang ACTIVE
 */
export const createFullQuiz = async ({
  workspaceId,
  roadmapId,
  phaseId,
  knowledgeId,
  title,
  duration,
  quizIntent = 'PRE_LEARNING',
  timerMode = true,
  passingScore,
  maxAttempt,
  overallDifficulty,
  questions = [],
  status = 'ACTIVE',
}) => {
  // Bước 1: Tạo quiz
  const quizRes = await createQuiz({
    workspaceId,
    roadmapId,
    phaseId,
    knowledgeId,
    title,
    duration,
    quizIntent,
    timerMode,
    createVia: 'MANUAL',
  });
  const quiz = quizRes.data;
  const quizId = quiz.quizId;

  // Bước 2: Tạo section gốc (ROOT)
  const sectionRes = await createQuizSection({
    quizId,
    parentSectionId: null,
    sectionType: 'ROOT',
    content: title,
    scorePerQuestion: 0,
  });
  const section = sectionRes.data;
  const sectionId = section.sectionId;

  // Bước 3 & 4: Tạo từng câu hỏi và đáp án
  for (const q of questions) {
    const questionTypeId = QUESTION_TYPE_MAP[q.type] || 1;
    const difficulty = DIFFICULTY_MAP[q.difficulty] || DIFFICULTY_MAP[overallDifficulty] || 'MEDIUM';

    const questionRes = await createQuestion({
      quizSectionId: sectionId,
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

  // Bước 5: Cập nhật quiz với status (ACTIVE hoặc DRAFT), passScore và maxAttempt
  const updatedQuiz = await updateQuiz(quizId, {
    workspaceId,
    roadmapId,
    phaseId,
    knowledgeId,
    quizIntent,
    duration,
    status,
    timerMode,
    maxAttempt: maxAttempt || null,
    passScore: passingScore || null,
    createVia: 'MANUAL',
    title,
    overallDifficulty: DIFFICULTY_MAP[overallDifficulty] || null,
  });

  return updatedQuiz.data;
};
