import api from './api';

const AI_TIMEOUT = 65000;

export const analyzeKnowledge = async (knowledge, { signal } = {}) => {
  const response = await api.post(
    '/ai/study-profile/knowledge:analyze',
    { knowledge },
    { timeout: AI_TIMEOUT, signal }
  );
  return response;
};

export const suggestProfileFields = async (
  { knowledge, domain, learningMode, currentLevel, strongAreas, weakAreas },
  { signal } = {}
) => {
  const response = await api.post(
    '/ai/study-profile/fields:suggest',
    { knowledge, domain, learningMode, currentLevel, strongAreas, weakAreas },
    { timeout: AI_TIMEOUT, signal }
  );
  return response;
};

export const validateProfileConsistency = async (data, { signal } = {}) => {
  const response = await api.post(
    '/ai/study-profile/consistency:validate',
    data,
    { timeout: AI_TIMEOUT, signal }
  );
  return response;
};
