import api from './api';

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

export const generateMockTestV2 = async (payload) => {
  const response = await api.post('/mocktest/generate', payload, { timeout: 0 });
  return response;
};

export const generateQuizFromMockTestTemplate = async (payload) => {
  const response = await api.post('/mocktest/generate-from-template', payload, {
    timeout: 180000, // 3 min — per-section parallel typically ~10-20s
  });
  return response;
};


export const listMyMockTestPrompts = async (workspaceId) => {
  if (workspaceId == null) {
    throw new Error('workspaceId is required for listMyMockTestPrompts');
  }
  const response = await api.get('/mocktest/my-prompts', { params: { workspaceId } });
  return response;
};

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
