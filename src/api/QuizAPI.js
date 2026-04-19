import api from './api';

// ==================== QUIZ ====================

// Lấy danh sách quiz theo contextType và scopeId.
// Optional: truyền quizIntent (vd "MOCK_TEST") để BE filter — hiện chỉ hỗ trợ cho WORKSPACE/GROUP;
// các scope khác (ROADMAP/PHASE/KNOWLEDGE) FE tự filter client-side.
export const getQuizzesByScope = async (contextType, scopeId, { quizIntent } = {}) => {
  let url = '';
  // Group workspace dùng cùng endpoint danh sách theo workspaceId
  if (contextType === 'WORKSPACE' || contextType === 'GROUP') {
    url = quizIntent
      ? `/quiz/getByWorkspace/${scopeId}/intent/${quizIntent}`
      : `/quiz/getByWorkspace/${scopeId}`;
  } else if (contextType === 'ROADMAP') url = `/quiz/getByRoadmap/${scopeId}`;
  else if (contextType === 'PHASE') url = `/quiz/getByPhase/${scopeId}`;
  else if (contextType === 'KNOWLEDGE') url = `/quiz/getByKnowledge/${scopeId}`;

  if (!url) throw new Error('Invalid contextType');

  const response = await api.get(url);

  // Client-side filter cho các scope chưa có endpoint theo intent.
  if (quizIntent && (contextType === 'ROADMAP' || contextType === 'PHASE' || contextType === 'KNOWLEDGE')) {
    const rawList = response?.data;
    if (Array.isArray(rawList)) {
      const filtered = rawList.filter((q) => String(q?.quizIntent || '').toUpperCase() === String(quizIntent).toUpperCase());
      return { ...response, data: filtered };
    }
  }
  return response;
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

export const shareQuizToCommunity = async (quizId, shared = true) => {
  const response = await api.post(`/quiz/${quizId}/community-share?shared=${shared}`);
  return response;
};

export const cloneCommunityQuizToWorkspace = async (quizId, workspaceId, metadata = {}) => {
  const params = new URLSearchParams();
  params.set('workspaceId', workspaceId);

  if (metadata?.recommendationRequestId) {
    params.set('recommendationRequestId', metadata.recommendationRequestId);
  }
  if (metadata?.recommendationBucket) {
    params.set('recommendationBucket', metadata.recommendationBucket);
  }
  if (Number.isInteger(Number(metadata?.recommendationRank)) && Number(metadata.recommendationRank) > 0) {
    params.set('recommendationRank', Number(metadata.recommendationRank));
  }
  if (Number.isFinite(Number(metadata?.recommendationScore))) {
    params.set('recommendationScore', Number(metadata.recommendationScore));
  }

  const response = await api.post(`/quiz/${quizId}/clone-to-workspace?${params.toString()}`);
  return response;
};

// Xóa quiz theo quizId
export const deleteQuiz = async (quizId) => {
  const response = await api.delete(`/quiz/${quizId}`);
  return response;
};

/** Leader: xuất bản quiz nhóm từ DRAFT → ACTIVE.
 *  options.leaderJoinsRanking = true → leader phải hoàn thành trước khi members làm được.
 */
export const publishGroupQuiz = async (quizId, options = {}) => {
  const response = await api.post(`/quiz/${quizId}/group/publish`, Object.keys(options).length ? options : undefined);
  return response;
};

/** Leader: cấu hình quiz chung cho nhóm hoặc gán thành viên cụ thể. */
export const setGroupQuizAudience = async (quizId, body) => {
  const response = await api.put(`/quiz/${quizId}/group/audience`, body);
  return response;
};

// Lấy thông tin quiz theo quizId
export const getQuizById = async (quizId) => {
  const response = await api.get(`/quiz/${quizId}`);
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

// Lấy chi tiết một câu hỏi
export const getQuestionById = async (questionId) => {
  const response = await api.get(`/questions/${questionId}`);
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

// Lấy đầy đủ quiz kèm section, question và answer.
// Truyền options.attemptView=true khi user đang làm bài để BE ẩn isCorrect/explanation
// đối với mock test (chống leak đáp án qua DevTools).
export const getQuizFull = async (quizId, options = {}) => {
  const params = options.attemptView ? { attemptView: true } : undefined;
  const response = await api.get(`/quiz/${quizId}/full`, params ? { params } : undefined);
  return response;
};

function buildQuizFullFromParts(quiz, sections = [], questionsBySection = new Map(), answersByQuestion = new Map()) {
  const buildSectionTree = (parentSectionId = null) => (
    (sections || [])
      .filter((section) => (section?.parentSectionId ?? null) === parentSectionId)
      .sort((left, right) => {
        const orderDiff = (left?.orderIndex ?? 0) - (right?.orderIndex ?? 0);
        if (orderDiff !== 0) {
          return orderDiff;
        }
        return (left?.sectionId ?? 0) - (right?.sectionId ?? 0);
      })
      .map((section) => ({
        ...section,
        questions: (questionsBySection.get(section.sectionId) || []).map((question) => ({
          ...question,
          answers: answersByQuestion.get(question.questionId) || [],
        })),
        children: buildSectionTree(section.sectionId),
      }))
  );

  return {
    ...quiz,
    quizId: quiz?.quizId ?? quiz?.id,
    sections: buildSectionTree(null),
  };
}

// Lấy full quiz cho luồng review/attempt-context. Mặc định KHÔNG ẩn đáp án —
// dùng cho result page hoặc edit. ExamQuizPage trong khi đang làm bài
// nên dùng getQuizFullForAttemptInProgress để BE ẩn isCorrect/explanation.
export const getQuizFullForAttempt = async (quizId) => {
  try {
    return await getQuizFull(quizId);
  } catch (error) {
    if (Number(error?.statusCode) !== 409) {
      throw error;
    }

    const [quizRes, sectionsRes] = await Promise.all([
      getQuizById(quizId),
      getSectionsByQuiz(quizId),
    ]);

    const quiz = quizRes?.data || null;
    const sections = sectionsRes?.data || [];

    if (!quiz || sections.length === 0) {
      throw error;
    }

    const questionsBySection = new Map();
    const answersByQuestion = new Map();

    const sectionQuestionEntries = await Promise.all(
      sections.map(async (section) => {
        try {
          const questionsRes = await getQuestionsBySection(section.sectionId);
          return [section.sectionId, questionsRes?.data || []];
        } catch (sectionError) {
          console.error('[QuizAPI] Failed to load questions for section:', section.sectionId, sectionError);
          return [section.sectionId, []];
        }
      }),
    );

    sectionQuestionEntries.forEach(([sectionId, questions]) => {
      questionsBySection.set(sectionId, questions);
    });

    const allQuestions = sectionQuestionEntries.flatMap(([, questions]) => questions || []);

    const answerEntries = await Promise.all(
      allQuestions.map(async (question) => {
        try {
          const answersRes = await getAnswersByQuestion(question.questionId);
          return [question.questionId, answersRes?.data || []];
        } catch (answerError) {
          console.error('[QuizAPI] Failed to load answers for question:', question.questionId, answerError);
          return [question.questionId, []];
        }
      }),
    );

    answerEntries.forEach(([questionId, answers]) => {
      answersByQuestion.set(questionId, answers);
    });

    if (allQuestions.length === 0) {
      throw error;
    }

    return {
      data: buildQuizFullFromParts(quiz, sections, questionsBySection, answersByQuestion),
      message: 'Fallback quiz full payload loaded from sections/questions',
    };
  }
};

// Variant cho ExamQuizPage / MockTestExamPage khi user ĐANG làm bài.
// Truyền attemptView=true để BE ẩn isCorrect/explanation cho mock test
// (chống leak đáp án qua DevTools). Không có fallback section-by-section
// vì khi đang làm bài quiz không thể fallback an toàn — trả lỗi để user retry.
export const getQuizFullForAttemptInProgress = async (quizId) => {
  return await getQuizFull(quizId, { attemptView: true });
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

// Nộp một câu hỏi trong practice mode và nhận kết quả chấm ngay cho câu đó
export const submitPracticeQuestion = async (attemptId, answer) => {
  const response = await api.post(`/quiz-attempts/${attemptId}/practice/submit-question`, answer, { timeout: 60000 });
  return response;
};

// Lấy kết quả chi tiết của attempt
export const getAttemptResult = async (attemptId) => {
  const response = await api.get(`/quiz-attempts/${attemptId}/result`);
  return response;
};

// Lấy thống kê cohort cho mock test trong group workspace.
// Chỉ trả data có ý nghĩa khi quiz.quizIntent === 'MOCK_TEST' và workspace là GROUP.
export const getMockTestCohortStats = async (quizId) => {
  const response = await api.get(`/quiz/${quizId}/cohort-stats`);
  return response;
};

// Lấy trạng thái + dữ liệu AI assessment của attempt
export const getAttemptAssessment = async (attemptId) => {
  const response = await api.get(`/quiz-attempts/${attemptId}/assessment`);
  return response;
};

export const getActiveTask = async () => {
  const response = await api.get('/v1/quiz/active-task');
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

// Bỏ qua một recommendation (chuyển sang DISMISSED)
export const dismissRecommendation = async (assessmentId) => {
  const response = await api.patch(`/workspace-assessments/${assessmentId}/dismiss`);
  return response;
};

// Lấy lịch sử làm bài của 1 quiz (chỉ của user hiện tại)
export const getQuizHistory = async (quizId) => {
  const response = await api.get(`/quiz-attempts/history?quizId=${quizId}`);
  return response;
};

// Lấy lịch sử làm bài của tất cả members trong nhóm (dành cho leader)
export const getGroupQuizHistory = async (workspaceId, quizId) => {
  const response = await api.get(`/group/${workspaceId}/quiz-attempts/history?quizId=${quizId}`);
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

// ==================== MANUAL QUIZ ====================

// Duplicate quiz → trả quiz mới (MANUAL, DRAFT)
export const duplicateQuiz = async (quizId) => {
  const response = await api.post(`/quiz/${quizId}/duplicate`);
  return response;
};

// Tạo manual quiz toàn bộ trong 1 request
export const createManualQuizBulk = async (payload) => {
  const response = await api.post('/quiz/manual:create-bulk', payload);
  return response;
};

// Lấy danh sách câu hỏi từ các quiz trong workspace (để import)
// params: { excludeQuizId?, quizId?, search?, questionType?, difficulty? }
export const getWorkspaceQuestionsCatalog = async (workspaceId, params = {}) => {
  const response = await api.get(`/quiz/workspace/${workspaceId}/questions-catalog`, { params });
  return response;
};

// Import (deep-copy) câu hỏi từ quiz khác vào quiz đang chỉnh sửa
export const importQuestionsToQuiz = async (quizId, { targetSectionId, sourceQuestionIds }) => {
  const response = await api.post(`/quiz/${quizId}/questions:import`, { targetSectionId, sourceQuestionIds });
  return response;
};

// Bulk update toàn bộ nội dung manual quiz (full-state replace, BE tự diff add/update/delete)
export const updateManualQuizBulk = async (quizId, payload) => {
  const response = await api.put(`/quiz/${quizId}/manual:update-bulk`, payload);
  return response;
};
