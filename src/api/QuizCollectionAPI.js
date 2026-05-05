import api from './api';

export const getQuizCollectionsByWorkspace = async (workspaceId) => {
  const response = await api.get(`/quiz-collections/byWorkspace/${workspaceId}`);
  return response;
};

export const getMyQuizCollections = async () => {
  const response = await api.get('/quiz-collections/my');
  return response;
};

export const getQuizCollectionById = async (collectionId) => {
  const response = await api.get(`/quiz-collections/${collectionId}`);
  return response;
};

export const createQuizCollection = async (payload) => {
  const response = await api.post('/quiz-collections', payload);
  return response;
};

export const updateQuizCollection = async (collectionId, payload) => {
  const response = await api.put(`/quiz-collections/${collectionId}`, payload);
  return response;
};

export const deleteQuizCollection = async (collectionId) => {
  const response = await api.delete(`/quiz-collections/${collectionId}`);
  return response;
};

export const getQuizCollectionQuestions = async (collectionId) => {
  const response = await api.get(`/quiz-collections/${collectionId}/questions`);
  return response;
};

export const deleteQuizCollectionQuestion = async (collectionId, questionId) => {
  const response = await api.delete(`/quiz-collections/${collectionId}/questions/${questionId}`);
  return response;
};

export const importQuizzesToCollection = async (collectionId, sourceQuizIds = []) => {
  const response = await api.post(`/quiz-collections/${collectionId}/quizzes:import`, {
    sourceQuizIds,
  });
  return response;
};

export const importQuestionsToCollection = async (collectionId, sourceQuestionIds = []) => {
  const response = await api.post(`/quiz-collections/${collectionId}/questions:import`, {
    sourceQuestionIds,
  });
  return response;
};

export const getQuizCollectionPracticeFull = async (collectionId) => {
  const response = await api.get(`/quiz-collections/${collectionId}/practice/full`);
  return response;
};

export const startQuizCollectionPractice = async (
  collectionId,
  { isCompanionMode = false, isPracticeMode = true } = {},
) => {
  const response = await api.post(
    `/quiz-collections/${collectionId}/practice/start?isCompanionMode=${isCompanionMode}&isPracticeMode=${isPracticeMode}`,
  );
  return response;
};

export const startQuizCollectionRandomPractice = async (
  collectionId,
  count,
  { isCompanionMode = false, isPracticeMode = true } = {},
) => {
  const response = await api.post(
    `/quiz-collections/${collectionId}/practice/random?count=${count}&isCompanionMode=${isCompanionMode}&isPracticeMode=${isPracticeMode}`,
  );
  return response;
};

export const startQuizCollectionAdvancedPractice = async (
  collectionId,
  payload,
  { isCompanionMode = false, isPracticeMode = true } = {},
) => {
  const response = await api.post(
    `/quiz-collections/${collectionId}/advanced-practice:start?isCompanionMode=${isCompanionMode}&isPracticeMode=${isPracticeMode}`,
    payload,
  );
  return response;
};
