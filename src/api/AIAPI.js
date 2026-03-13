import api from './api';

// Tạo Mock Test thông qua AI
export const generateMockTest = async (data) => {
  const response = await api.post('/mocktest:generated', data);
  return response;
};

// Lấy danh sách Question Types
export const getQuestionTypes = async () => {
  const response = await api.get('/question-types');
  return response;
};

// Lấy danh sách Difficulty Definitions
export const getDifficultyDefinitions = async () => {
  const response = await api.get('/difficulty-definitions');
  return response;
};

// Lấy danh sách Bloom Skill Tests
export const getBloomSkills = async () => {
  const response = await api.get('/bloom-skill-tests');
  return response;
};

// Tạo Quiz AI
export const generateAIQuiz = async (data) => {
  const response = await api.post('/ai/quiz:generated', data);
  return response;
};

