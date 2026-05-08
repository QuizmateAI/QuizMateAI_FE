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

/**
 * POST /api/mocktest/generate-from-template — Fast preview path.
 *
 * Per-section parallel sinh quiz tu MockTestTemplate da chon (Python:
 * /ai/generate-quiz-from-mocktest-template). Latency giam ~50-65% cho
 * template >=3 sections so voi /generate (sequential).
 *
 * KHONG persist DB — chi tra raw AI response (sections + questions). Dung cho:
 * - Preview truoc khi commit save qua /generate.
 * - A/B testing parallel vs sequential generation.
 *
 * Payload shape (khop GenerateQuizFromMockTestTemplateRequestSchema o Python):
 *   {
 *     taskId, userId, workspaceId,
 *     template: <MaterialMockTestTemplateSchema>,
 *     materialIds: number[],
 *     outputLanguage: string,
 *     workspaceProfile?: {...},
 *     questionTypes: [{ questionTypeId, name }, ...],
 *     bloomSkills: [{ bloomId, bloomName }, ...],
 *   }
 *
 * Response: { sections: [...], description: string }
 */
export const generateQuizFromMockTestTemplate = async (payload) => {
  const response = await api.post('/mocktest/generate-from-template', payload, {
    timeout: 180000, // 3 min — per-section parallel typically ~10-20s
  });
  return response;
};

// ---------- USER PROMPTS ----------

/**
 * GET /api/mocktest/my-prompts?workspaceId=<id>
 * BE V2026_05_15+ yêu cầu workspaceId (per-workspace scoping).
 */
export const listMyMockTestPrompts = async (workspaceId) => {
  if (workspaceId == null) {
    throw new Error('workspaceId is required for listMyMockTestPrompts');
  }
  const response = await api.get('/mocktest/my-prompts', { params: { workspaceId } });
  return response;
};

/**
 * POST /api/mocktest/my-prompts — save prompt cho reuse (max 50/workspace).
 * BE V2026_05_15+ yêu cầu workspaceId trong body.
 */
export const saveMockTestPrompt = async ({ workspaceId, name, promptText, derivedFromTemplateId }) => {
  if (workspaceId == null) {
    throw new Error('workspaceId is required for saveMockTestPrompt');
  }
  const response = await api.post('/mocktest/my-prompts', {
    workspaceId,
    name,
    promptText,
    derivedFromTemplateId,
  });
  return response;
};

/** DELETE /api/mocktest/my-prompts/{id} — owner check + workspace membership BE-side. */
export const deleteMockTestPrompt = async (promptId) => {
  const response = await api.delete(`/mocktest/my-prompts/${promptId}`);
  return response;
};

// ---------- SAVED TEMPLATES (PRIVATE owned by user) ----------

/**
 * GET /api/mocktest/my-templates?workspaceId=<id>
 * BE V2026_05_14+ yêu cầu workspaceId (per-workspace scoping).
 * Trả về templates user đã save trong workspace + legacy NULL rows (backward compat).
 */
export const listMySavedMockTestTemplates = async (workspaceId) => {
  if (workspaceId == null) {
    throw new Error('workspaceId is required for listMySavedMockTestTemplates');
  }
  const response = await api.get('/mocktest/my-templates', { params: { workspaceId } });
  return response;
};

/** GET /api/mocktest/my-templates/{id} — full detail of own saved template. */
export const getMySavedMockTestTemplate = async (templateId) => {
  const response = await api.get(`/mocktest/my-templates/${templateId}`);
  return response;
};

/**
 * POST /api/mocktest/my-templates — save user-edited template (max 100/workspace).
 * Payload PHẢI có `workspaceId` (BE V2026_05_14+).
 */
export const saveMockTestTemplate = async (payload) => {
  if (payload?.workspaceId == null) {
    throw new Error('workspaceId is required in saveMockTestTemplate payload');
  }
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
