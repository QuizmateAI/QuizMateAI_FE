import api from './api';

// Aligned with BE openai.responses.timeout-seconds=60. Reasoning models (e.g. gpt-5)
// can take 30-60s on field-suggestion / consistency-validation prompts; a 30s FE
// timeout was racing the BE and surfacing false "AI failed" errors while BE kept
// running and burning tokens. Add a small 5s buffer to absorb network jitter.
const AI_TIMEOUT = 65000;

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
