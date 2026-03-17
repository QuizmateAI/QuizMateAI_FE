import api from './api';

const AI_TIMEOUT = 30000;

/**
 * POST /ai/study-profile/knowledge:analyze
 * Phân tích kiến thức người dùng nhập, gợi ý lĩnh vực liên quan.
 */
export const analyzeKnowledge = async (knowledge, { signal } = {}) => {
  const response = await api.post(
    '/ai/study-profile/knowledge:analyze',
    { knowledge },
    { timeout: AI_TIMEOUT, signal }
  );
  return response;
};

/**
 * POST /ai/study-profile/fields:suggest
 * Gợi ý các trường form (currentLevel, learningGoal, strongAreas, weakAreas, examName).
 */
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

/**
 * POST /ai/study-profile/consistency:validate
 * Kiểm tra tính liên kết giữa các trường đã điền.
 */
export const validateProfileConsistency = async (data, { signal } = {}) => {
  const response = await api.post(
    '/ai/study-profile/consistency:validate',
    data,
    { timeout: AI_TIMEOUT, signal }
  );
  return response;
};
