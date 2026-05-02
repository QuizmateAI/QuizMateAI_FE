import api from './api';

/**
 * MockTest v2 API client — replaces legacy /api/ai/mocktest:* endpoints.
 *
 * v1 endpoints (deprecated): /api/ai/mocktest:suggest-structure, /api/ai/mocktest:generated
 * v2 endpoints (current):    /api/mocktest/recommend-template, /api/mocktest/templates/{id},
 *                             /api/mocktest/generate, /api/mocktest/popular-exams,
 *                             /api/mocktest/my-prompts
 */

// ---------- TEMPLATE LIST + DETAIL ----------

/**
 * GET /api/mocktest/templates
 * Filter optional: examType, contentLanguage, keyword.
 * Returns lightweight summary (no structure/scoring jsonb).
 */
export const listMockTestTemplates = async ({ examType, contentLanguage, keyword } = {}) => {
  const params = {};
  if (examType) params.examType = examType;
  if (contentLanguage) params.contentLanguage = contentLanguage;
  if (keyword) params.keyword = keyword;
  const response = await api.get('/mocktest/templates', { params });
  return response;
};

/** GET /api/mocktest/templates/{id} — full detail with structure + scoring jsonb. */
export const getMockTestTemplate = async (templateId) => {
  const response = await api.get(`/mocktest/templates/${templateId}`);
  return response;
};

// ---------- RECOMMENDER ----------

/**
 * POST /api/mocktest/recommend-template
 * Strategy field in response:
 *   - "DB_LOOKUP" — db cache hit (no material).
 *   - "MATERIAL_RAG_SYNTHESIZED" — Python RAG read material content -> AI synth (slow, 30-90s).
 *   - "AI_SYNTHESIZED" — Spring AI canonical exam synth (no material, ~5-15s).
 *   - "FALLBACK_GENERIC" — single programmatic fallback when AI fails.
 *
 * Khi user chon material, BE forward sang Python RAG endpoint -> mat 30-90s.
 * Set timeout 120s de chu RAG ket thuc thay vi axios default 10s.
 */
export const recommendMockTestTemplate = async ({ examName, contentLanguage, workspaceId, materialIds, limit }) => {
  const hasMaterial = Array.isArray(materialIds) && materialIds.length > 0;
  const response = await api.post('/mocktest/recommend-template', {
    examName,
    contentLanguage,
    workspaceId,
    materialIds,
    limit,
  }, {
    // RAG path can take up to ~90s. Cap at 2min so a hung BE still surfaces an
    // error eventually instead of waiting forever.
    timeout: hasMaterial ? 120000 : 30000,
  });
  return response;
};

/** GET /api/mocktest/popular-exams — chip suggestions sorted by use_count. */
export const getPopularMockTestExams = async ({ limit } = {}) => {
  const params = limit ? { limit } : {};
  const response = await api.get('/mocktest/popular-exams', { params });
  return response;
};

// ---------- GENERATE ----------

/**
 * POST /api/mocktest/generate
 * Accepts EITHER templateId OR customStructure jsonb. Returns the created Quiz
 * (status=PROCESSING) with taskId for async tracking.
 */
export const generateMockTestV2 = async (payload) => {
  const response = await api.post('/mocktest/generate', payload, { timeout: 0 });
  return response;
};

// ---------- USER PROMPTS ----------

/** GET /api/mocktest/my-prompts — list prompts saved by current user. */
export const listMyMockTestPrompts = async () => {
  const response = await api.get('/mocktest/my-prompts');
  return response;
};

/** POST /api/mocktest/my-prompts — save prompt for reuse (max 50/user). */
export const saveMockTestPrompt = async ({ name, promptText, derivedFromTemplateId }) => {
  const response = await api.post('/mocktest/my-prompts', {
    name,
    promptText,
    derivedFromTemplateId,
  });
  return response;
};

/** DELETE /api/mocktest/my-prompts/{id} */
export const deleteMockTestPrompt = async (promptId) => {
  const response = await api.delete(`/mocktest/my-prompts/${promptId}`);
  return response;
};

// ---------- SAVED TEMPLATES (PRIVATE owned by user) ----------

/** GET /api/mocktest/my-templates — list saved templates of current user. */
export const listMySavedMockTestTemplates = async () => {
  const response = await api.get('/mocktest/my-templates');
  return response;
};

/** GET /api/mocktest/my-templates/{id} — full detail of own saved template. */
export const getMySavedMockTestTemplate = async (templateId) => {
  const response = await api.get(`/mocktest/my-templates/${templateId}`);
  return response;
};

/** POST /api/mocktest/my-templates — save user-edited template (max 100/user). */
export const saveMockTestTemplate = async (payload) => {
  const response = await api.post('/mocktest/my-templates', payload);
  return response;
};

/** PATCH /api/mocktest/my-templates/{id} — update saved template (owner-only). */
export const updateMockTestTemplate = async (templateId, payload) => {
  const response = await api.patch(`/mocktest/my-templates/${templateId}`, payload);
  return response;
};

/** DELETE /api/mocktest/my-templates/{id} — soft delete saved template. */
export const deleteMockTestTemplate = async (templateId) => {
  const response = await api.delete(`/mocktest/my-templates/${templateId}`);
  return response;
};
